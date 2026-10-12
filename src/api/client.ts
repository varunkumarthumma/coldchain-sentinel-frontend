import {
  StorageFacility,
  CommodityProfile,
  Sensor,
  SensorReading,
  Alert,
  AlertStatus,
  AlertSeverity,
  FacilityRiskAssessmentResponse,
  SensorRiskAssessmentResponse,
  PagedResponse,
  HealthResponse,
} from './types';


const BASE_URL = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text();
    let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.message) errorMessage = parsed.message;
    } catch {
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Health
  getHealth: (): Promise<HealthResponse> =>
    fetch(`${BASE_URL}/health`).then(handleResponse<HealthResponse>),

  // Facilities
  getFacilities: (page = 0, size = 50): Promise<PagedResponse<StorageFacility>> =>
    fetch(`${BASE_URL}/facilities?page=${page}&size=${size}`).then(handleResponse<PagedResponse<StorageFacility>>),

  getFacilityById: (id: number): Promise<StorageFacility> =>
    fetch(`${BASE_URL}/facilities/${id}`).then(handleResponse<StorageFacility>),

  createFacility: (data: Partial<StorageFacility>): Promise<StorageFacility> =>
    fetch(`${BASE_URL}/facilities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<StorageFacility>),

  // Sensors
  getSensors: (facilityId?: number, page = 0, size = 50): Promise<PagedResponse<Sensor>> => {
    const url = facilityId
      ? `${BASE_URL}/sensors?facilityId=${facilityId}&page=${page}&size=${size}`
      : `${BASE_URL}/sensors?page=${page}&size=${size}`;
    return fetch(url).then(handleResponse<PagedResponse<Sensor>>);
  },

  getSensorsByFacility: (facilityId: number): Promise<Sensor[]> =>
    fetch(`${BASE_URL}/facilities/${facilityId}/sensors`).then(handleResponse<Sensor[]>),

  getSensorById: (id: number): Promise<Sensor> =>
    fetch(`${BASE_URL}/sensors/${id}`).then(handleResponse<Sensor>),

  createSensor: (data: { sensorCode: string; name: string; sensorType: string; facilityId: number }): Promise<Sensor> =>
    fetch(`${BASE_URL}/sensors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<Sensor>),

  // Sensor Readings
  getReadingsBySensor: (sensorId: number, page = 0, size = 50): Promise<PagedResponse<SensorReading>> =>
    fetch(`${BASE_URL}/sensors/${sensorId}/readings?page=${page}&size=${size}`).then(handleResponse<PagedResponse<SensorReading>>),

  getReadingsByRange: (sensorId: number, from: string, to: string): Promise<SensorReading[]> =>
    fetch(`${BASE_URL}/sensors/${sensorId}/readings/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then(handleResponse<SensorReading[]>),

  recordReading: (sensorId: number, data: { temperatureCelsius?: number; humidityPercentage?: number; recordedAt: string; dataSource?: string }): Promise<SensorReading> =>
    fetch(`${BASE_URL}/sensors/${sensorId}/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<SensorReading>),

  // Alerts
  getAlerts: (params?: { page?: number; size?: number; status?: AlertStatus; severity?: AlertSeverity; facilityId?: number }): Promise<PagedResponse<Alert>> => {
    const query = new URLSearchParams();
    query.set('page', String(params?.page ?? 0));
    query.set('size', String(params?.size ?? 50));
    if (params?.status) query.set('status', params.status);
    if (params?.severity) query.set('severity', params.severity);
    if (params?.facilityId) query.set('facilityId', String(params.facilityId));
    return fetch(`${BASE_URL}/alerts?${query.toString()}`).then(handleResponse<PagedResponse<Alert>>);
  },

  getAlertsBySensor: (sensorId: number): Promise<Alert[]> =>
    fetch(`${BASE_URL}/sensors/${sensorId}/alerts`).then(handleResponse<Alert[]>),

  acknowledgeAlert: (alertId: number): Promise<Alert> =>
    fetch(`${BASE_URL}/alerts/${alertId}/acknowledge`, { method: 'PATCH' }).then(handleResponse<Alert>),

  resolveAlert: (alertId: number): Promise<Alert> =>
    fetch(`${BASE_URL}/alerts/${alertId}/resolve`, { method: 'PATCH' }).then(handleResponse<Alert>),

  // Risk Assessment
  getFacilityRiskAssessment: (facilityId: number, windowHours = 24): Promise<FacilityRiskAssessmentResponse> =>
    fetch(`${BASE_URL}/facilities/${facilityId}/risk-assessment?windowHours=${windowHours}`).then(handleResponse<FacilityRiskAssessmentResponse>),

  getSensorRiskAssessment: (sensorId: number, windowHours = 24): Promise<SensorRiskAssessmentResponse> =>
    fetch(`${BASE_URL}/sensors/${sensorId}/risk-assessment?windowHours=${windowHours}`).then(handleResponse<SensorRiskAssessmentResponse>),

  // Commodity Profiles
  getCommodityProfiles: (page = 0, size = 50, active?: boolean): Promise<PagedResponse<CommodityProfile>> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (active !== undefined) params.set('active', String(active));
    return fetch(`${BASE_URL}/commodity-profiles?${params.toString()}`).then(handleResponse<PagedResponse<CommodityProfile>>);
  },

  getCommodityProfileById: (id: number): Promise<CommodityProfile> =>
    fetch(`${BASE_URL}/commodity-profiles/${id}`).then(handleResponse<CommodityProfile>),

  createCommodityProfile: (data: Partial<CommodityProfile>): Promise<CommodityProfile> =>
    fetch(`${BASE_URL}/commodity-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<CommodityProfile>),

  updateCommodityProfile: (id: number, data: Partial<CommodityProfile>): Promise<CommodityProfile> =>
    fetch(`${BASE_URL}/commodity-profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<CommodityProfile>),

  deactivateCommodityProfile: (id: number): Promise<CommodityProfile> =>
    fetch(`${BASE_URL}/commodity-profiles/${id}/deactivate`, { method: 'PATCH' }).then(handleResponse<CommodityProfile>),

  deleteCommodityProfile: (id: number): Promise<void> =>
    fetch(`${BASE_URL}/commodity-profiles/${id}`, { method: 'DELETE' }).then(async (res) => {
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.message) errorMessage = parsed.message;
        } catch {
          if (errorText) errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }
    }),

  assignCommodityProfile: (facilityId: number, profileId: number): Promise<StorageFacility> =>
    fetch(`${BASE_URL}/facilities/${facilityId}/commodity-profile/${profileId}`, { method: 'PUT' }).then(handleResponse<StorageFacility>),

  removeCommodityProfile: (facilityId: number): Promise<StorageFacility> =>
    fetch(`${BASE_URL}/facilities/${facilityId}/commodity-profile`, { method: 'DELETE' }).then(handleResponse<StorageFacility>),
};

