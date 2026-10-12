// Type definitions corresponding exactly to Spring Boot backend DTOs and Enums

export type FacilityType = 'COLD_STORAGE' | 'CONTROLLED_ATMOSPHERE' | 'RIPENING_CHAMBER' | 'DISTRIBUTION_CENTER';

export type SensorType = 'TEMPERATURE' | 'HUMIDITY' | 'TEMPERATURE_HUMIDITY';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export type AlertType = 'HIGH_TEMPERATURE' | 'LOW_TEMPERATURE' | 'HIGH_HUMIDITY' | 'LOW_HUMIDITY';

export type RiskTier = 'LOW' | 'MODERATE' | 'ELEVATED' | 'CRITICAL';

export interface CommodityProfile {
  id: number;
  name: string;
  commodityName: string;
  variety?: string | null;
  targetTemperatureMin: number;
  targetTemperatureMax: number;
  targetHumidityMin: number;
  targetHumidityMax: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StorageFacility {
  id: number;
  name: string;
  location: string;
  capacityInTonnes: number;
  facilityType: FacilityType;
  active: boolean;
  commodityProfileId?: number | null;
  commodityProfileName?: string | null;
  createdAt: string;
  updatedAt: string;
}


export interface Sensor {
  id: number;
  sensorCode: string;
  name: string;
  sensorType: SensorType;
  facilityId: number;
  facilityName: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SensorReading {
  id: number;
  sensorId: number;
  sensorCode: string;
  temperatureCelsius: number | null;
  humidityPercentage: number | null;
  recordedAt: string;
  createdAt: string;
  dataSource: string;
}

export interface Alert {
  id: number;
  sensorId: number;
  sensorCode: string;
  facilityId: number;
  facilityName: string;
  alertType: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  measuredValue: number | null;
  thresholdValue: number | null;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

export interface RiskDriverBreakdown {
  thermalExcursionScore: number;
  humidityExcursionScore: number;
  durationScore: number;
  alertPenaltyScore: number;
  accumulatedDegreeHours: number;
  totalExcursionMinutes: number;
  maxContinuousExcursionMinutes: number;
  maxObservedTemperature: number | null;
  minObservedTemperature: number | null;
  maxObservedHumidity: number | null;
  minObservedHumidity: number | null;
  evaluatedAlertsCount: number;
  suppressedDuplicateIncidentsCount: number;
}

export interface RiskAssessmentResult {
  sufficientData: boolean;
  overallRiskScore: number | null;
  riskTier: RiskTier | null;
  statusMessage: string;
  drivers: RiskDriverBreakdown | null;
  recommendations: string[];
  evaluationWindowStart: string;
  evaluationWindowEnd: string;
  readingsCount: number;
  disclaimer: string;
}

export interface SensorRiskAssessmentResponse {
  sensorId: number;
  sensorCode: string;
  sensorName: string;
  sensorType: SensorType;
  facilityId: number;
  facilityName: string;
  windowHours: number;
  windowStart: string;
  windowEnd: string;
  assessment: RiskAssessmentResult;
}

export interface SensorRiskSummary {
  sensorId: number;
  sensorCode: string;
  sensorName: string;
  sufficientData: boolean;
  riskScore: number | null;
  riskTier: RiskTier | null;
}

export interface FacilityRiskAssessmentResponse {
  facilityId: number;
  facilityName: string;
  facilityType: FacilityType;
  location: string;
  windowHours: number;
  windowStart: string;
  windowEnd: string;
  totalActiveSensors: number;
  sensorsWithSufficientData: number;
  sensorsWithInsufficientData: number;
  facilityRiskScore: number | null;
  facilityRiskTier: RiskTier | null;
  hotspotSensors: SensorRiskSummary[];
  sensorAssessments: SensorRiskAssessmentResponse[];
  facilityRecommendations: string[];
  aggregationMethodDescription: string;
  disclaimer: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface HealthResponse {
  application: string;
  status: string;
  message: string;
}
