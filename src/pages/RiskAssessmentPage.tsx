import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { StorageFacility, FacilityRiskAssessmentResponse, SensorRiskAssessmentResponse, Sensor } from '../api/types';
import { RiskTierBadge } from '../components/Badges';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { ShieldAlert, RefreshCw, Thermometer, Droplets, Clock, AlertTriangle, ChevronRight, Flame } from 'lucide-react';

export const RiskAssessmentPage: React.FC = () => {
  const [facilities, setFacilities] = useState<StorageFacility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);
  const [windowHours, setWindowHours] = useState(24);
  const [facilityRisk, setFacilityRisk] = useState<FacilityRiskAssessmentResponse | null>(null);

  // Single sensor drill-down state
  const [facilitySensors, setFacilitySensors] = useState<Sensor[]>([]);
  const [selectedSensorId, setSelectedSensorId] = useState<number | null>(null);
  const [sensorRisk, setSensorRisk] = useState<SensorRiskAssessmentResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [sensorLoading, setSensorLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitial = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getFacilities(0, 100);
      setFacilities(res.content);
      if (res.content.length > 0 && !selectedFacilityId) {
        setSelectedFacilityId(res.content[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load facilities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const loadFacilityAssessment = async () => {
    if (!selectedFacilityId) return;
    try {
      setLoading(true);
      setError(null);
      const [risk, sensors] = await Promise.all([
        api.getFacilityRiskAssessment(selectedFacilityId, windowHours),
        api.getSensorsByFacility(selectedFacilityId),
      ]);
      setFacilityRisk(risk);
      setFacilitySensors(sensors);
      if (sensors.length > 0) {
        setSelectedSensorId(sensors[0].id);
      } else {
        setSelectedSensorId(null);
        setSensorRisk(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to calculate facility risk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacilityAssessment();
  }, [selectedFacilityId, windowHours]);

  const loadSensorAssessment = async () => {
    if (!selectedSensorId) return;
    try {
      setSensorLoading(true);
      const risk = await api.getSensorRiskAssessment(selectedSensorId, windowHours);
      setSensorRisk(risk);
    } catch {
      setSensorRisk(null);
    } finally {
      setSensorLoading(false);
    }
  };

  useEffect(() => {
    loadSensorAssessment();
  }, [selectedSensorId, windowHours]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Post-Harvest Loss Risk Assessment
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Deterministic heuristic exposure modeling, numerical degree-hour integration, and microclimate failure isolation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={windowHours}
            onChange={(e) => setWindowHours(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none shadow-2xs"
          >
            <option value={12}>12 Hours Window</option>
            <option value={24}>24 Hours Window</option>
            <option value={48}>48 Hours Window</option>
            <option value={168}>7 Days Window</option>
          </select>
          <button
            onClick={loadFacilityAssessment}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Recalculate
          </button>
        </div>
      </div>

      <DisclaimerBanner />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Facility Selector Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Facility:
          </label>
          <select
            value={selectedFacilityId || ''}
            onChange={(e) => setSelectedFacilityId(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none shadow-2xs"
          >
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} — {f.location} ({f.facilityType})
              </option>
            ))}
          </select>
        </div>
        {facilityRisk && (
          <div className="flex items-center gap-5 text-xs sm:text-sm">
            <span className="text-slate-500">
              Coverage: <strong className="text-slate-900">{facilityRisk.sensorsWithSufficientData}</strong> / {facilityRisk.totalActiveSensors} zones
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Facility Score:</span>
              <span className="font-mono font-extrabold text-slate-900 text-lg">
                {facilityRisk.facilityRiskScore !== null ? Number(facilityRisk.facilityRiskScore).toFixed(1) : '—'}
              </span>
              <RiskTierBadge tier={facilityRisk.facilityRiskTier} />
            </div>
          </div>
        )}
      </div>

      {/* Aggregation Description */}
      {facilityRisk && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs text-slate-600 flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800">Conservative Hotspot Weighting Method: </span>
            <span>{facilityRisk.aggregationMethodDescription}</span>
          </div>
        </div>
      )}

      {/* 2-Column: Sensor Drilldown & Driver Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Sensor Selector in Facility */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
            <span>Facility Sensors ({facilitySensors.length})</span>
          </h3>
          <div className="space-y-2">
            {facilitySensors.map((s) => {
              const isSelected = selectedSensorId === s.id;
              const hotspotMatch = facilityRisk?.hotspotSensors.find((h) => h.sensorId === s.id);

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSensorId(s.id)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/60 shadow-xs ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                    <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-500">{s.sensorCode}</span>
                    {hotspotMatch && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                        <Flame className="h-3 w-3 text-orange-500" /> Hotspot
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Risk Driver Breakdown for Selected Sensor */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2 space-y-6 shadow-xs">
          {sensorRisk ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-blue-600" />
                    {sensorRisk.sensorName} ({sensorRisk.sensorCode})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{sensorRisk.assessment.statusMessage}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-mono font-extrabold text-slate-900">
                    {sensorRisk.assessment.overallRiskScore !== null
                      ? Number(sensorRisk.assessment.overallRiskScore).toFixed(1)
                      : '—'}
                  </span>
                  <RiskTierBadge tier={sensorRisk.assessment.riskTier} />
                </div>
              </div>

              {sensorRisk.assessment.sufficientData && sensorRisk.assessment.drivers ? (
                <>
                  {/* Drivers Subscore Cards */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                      <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                        <Thermometer className="h-3.5 w-3.5 text-blue-600" /> Thermal
                      </span>
                      <p className="mt-2 text-2xl font-bold font-mono text-slate-900">
                        {Number(sensorRisk.assessment.drivers.thermalExcursionScore).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Weight: 35%</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                      <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                        <Droplets className="h-3.5 w-3.5 text-teal-600" /> Humidity
                      </span>
                      <p className="mt-2 text-2xl font-bold font-mono text-slate-900">
                        {Number(sensorRisk.assessment.drivers.humidityExcursionScore).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Weight: 25%</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                      <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-amber-600" /> Duration
                      </span>
                      <p className="mt-2 text-2xl font-bold font-mono text-slate-900">
                        {Number(sensorRisk.assessment.drivers.durationScore).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Weight: 20%</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                      <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> Alert Incident
                      </span>
                      <p className="mt-2 text-2xl font-bold font-mono text-slate-900">
                        {Number(sensorRisk.assessment.drivers.alertPenaltyScore).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Weight: 20%</p>
                    </div>
                  </div>

                  {/* Physical Exposure Metrics */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Physical Exposure Metrics &amp; Numerical Integration
                    </h4>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                      <div className="rounded-lg border border-slate-200 p-3 bg-white">
                        <span className="text-slate-500 font-medium">Degree-Hours:</span>
                        <p className="font-mono font-bold text-slate-900 text-sm mt-1">
                          {sensorRisk.assessment.drivers.accumulatedDegreeHours} °C·h
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3 bg-white">
                        <span className="text-slate-500 font-medium">Max Continuous Excursion:</span>
                        <p className="font-mono font-bold text-slate-900 text-sm mt-1">
                          {sensorRisk.assessment.drivers.maxContinuousExcursionMinutes} mins
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3 bg-white">
                        <span className="text-slate-500 font-medium">Max Temp Observed:</span>
                        <p className="font-mono font-bold text-slate-900 text-sm mt-1">
                          {sensorRisk.assessment.drivers.maxObservedTemperature !== null
                            ? `${sensorRisk.assessment.drivers.maxObservedTemperature} °C`
                            : '—'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3 bg-white">
                        <span className="text-slate-500 font-medium">Min Temp Observed:</span>
                        <p className="font-mono font-bold text-slate-900 text-sm mt-1">
                          {sensorRisk.assessment.drivers.minObservedTemperature !== null
                            ? `${sensorRisk.assessment.drivers.minObservedTemperature} °C`
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sensor Recommendations */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Grounded Sensor Recommendations
                    </h4>
                    <ul className="space-y-1.5">
                      {sensorRisk.assessment.recommendations.map((r, i) => (
                        <li key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 font-medium">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-6 text-center text-xs sm:text-sm text-purple-900">
                  <p className="font-bold">Insufficient Telemetry Detected</p>
                  <p className="mt-1 text-xs text-purple-700">
                    Fewer than 3 readings recorded in this observation window. The system intentionally refuses to assign a zero risk score to prevent false confidence during communication outages.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              {sensorLoading ? 'Evaluating sensor risk...' : 'Select a sensor to inspect risk breakdown.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
