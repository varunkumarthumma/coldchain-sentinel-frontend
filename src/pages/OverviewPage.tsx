import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { StorageFacility, Alert, FacilityRiskAssessmentResponse, Sensor } from '../api/types';
import { RiskTierBadge, SeverityBadge } from '../components/Badges';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { TelemetryHistoryChart } from '../components/TelemetryHistoryChart';
import {
  Building2,
  Cpu,
  AlertOctagon,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Flame,
  LineChart,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const OverviewPage: React.FC = () => {
  const [facilities, setFacilities] = useState<StorageFacility[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);
  const [facilityRisk, setFacilityRisk] = useState<FacilityRiskAssessmentResponse | null>(null);
  const [facilitySensors, setFacilitySensors] = useState<Sensor[]>([]);
  const [activeHistorySensor, setActiveHistorySensor] = useState<Sensor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [facResponse, alertResponse] = await Promise.all([
        api.getFacilities(0, 100),
        api.getAlerts({ page: 0, size: 10, status: 'OPEN' }),
      ]);
      setFacilities(facResponse.content);
      setAlerts(alertResponse.content);

      const targetId = selectedFacilityId || (facResponse.content.length > 0 ? facResponse.content[0].id : null);
      if (targetId) {
        setSelectedFacilityId(targetId);
        const [risk, sensors] = await Promise.all([
          api.getFacilityRiskAssessment(targetId, 24),
          api.getSensorsByFacility(targetId),
        ]);
        setFacilityRisk(risk);
        setFacilitySensors(sensors);

        if (sensors.length > 0) {
          setActiveHistorySensor((prev) => {
            if (prev && sensors.some((s) => s.id === prev.id)) return prev;
            if (risk?.hotspotSensors && risk.hotspotSensors.length > 0) {
              const hotspot = sensors.find((s) => s.id === risk.hotspotSensors[0].sensorId);
              if (hotspot) return hotspot;
            }
            return sensors[0];
          });
        } else {
          setActiveHistorySensor(null);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load telemetry overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFacilityId]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Surveillance Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Cold Chain Command Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time thermal surveillance, post-harvest risk scoring, and facility triage
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Surveillance
        </button>
      </div>

      <DisclaimerBanner />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Facilities
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{facilities.length}</p>
          <p className="mt-1 text-xs text-slate-500">Monitored cold storage hubs</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Monitored Zones
            </span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Cpu className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            {facilityRisk ? facilityRisk.totalActiveSensors : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {facilityRisk ? `${facilityRisk.sensorsWithSufficientData} active / ${facilityRisk.sensorsWithInsufficientData} sparse` : 'In selected hub'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Open Alerts
            </span>
            <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
              <AlertOctagon className="h-5 w-5" />
            </div>
          </div>
          <p className={`mt-3 text-3xl font-extrabold ${alerts.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {alerts.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Unresolved operational incidents</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Facility Risk Tier
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-slate-900">
              {facilityRisk?.facilityRiskScore !== null && facilityRisk?.facilityRiskScore !== undefined
                ? Number(facilityRisk.facilityRiskScore).toFixed(1)
                : '—'}
            </p>
            <RiskTierBadge tier={facilityRisk?.facilityRiskTier} />
          </div>
          <p className="mt-1 text-xs text-slate-500">24-hour conservative aggregation</p>
        </div>
      </div>

      {/* Facility Surveillance Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Facility Risk and Recommendations */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Facility Risk Surveillance &amp; Recommendations
              </h3>
              <p className="text-xs text-slate-500">
                Conservative 60% hotspot + 40% average aggregation with evidence-grounded recommendations
              </p>
            </div>
            {facilities.length > 0 && (
              <select
                value={selectedFacilityId || ''}
                onChange={(e) => setSelectedFacilityId(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs"
              >
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.facilityType})
                  </option>
                ))}
              </select>
            )}
          </div>

          {facilityRisk ? (
            <div className="space-y-6">
              {/* Evidence-grounded Recommendations */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actionable Facility Recommendations
                </h4>
                {facilityRisk.facilityRecommendations.length > 0 ? (
                  <ul className="space-y-2">
                    {facilityRisk.facilityRecommendations.map((rec, idx) => {
                      const isBreach = rec.includes('Active temperature breach') || rec.includes('Active chilling breach') || rec.includes('Active humidity breach');
                      const isHistorical = rec.includes('Historical excursion detected');
                      const isAlert = rec.includes('Active alert status') || rec.includes('Historical alert status');
                      const isInsufficient = rec.includes('insufficient telemetry');

                      let itemColor = 'border-slate-200 bg-slate-50 text-slate-800';
                      if (isBreach) itemColor = 'border-rose-200 bg-rose-50 text-rose-900';
                      else if (isHistorical) itemColor = 'border-amber-200 bg-amber-50 text-amber-900';
                      else if (isAlert) itemColor = 'border-blue-200 bg-blue-50 text-blue-900';
                      else if (isInsufficient) itemColor = 'border-purple-200 bg-purple-50 text-purple-900';

                      return (
                        <li key={idx} className={`rounded-lg border p-3 text-xs sm:text-sm flex items-start gap-2.5 ${itemColor}`}>
                          <span className="font-mono text-xs font-bold opacity-60">#{idx + 1}</span>
                          <span className="leading-relaxed">{rec}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Facility parameters are fully stabilized within prescribed thresholds. No active recommendations.</span>
                  </div>
                )}
              </div>

              {/* Hotspot Sensors Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-orange-500" />
                    Hotspots &amp; Surveillance Blind Spots ({facilityRisk.hotspotSensors.length})
                  </h4>
                  <Link
                    to={`/risk-assessment`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    View detailed breakdown <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                {facilityRisk.hotspotSensors.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">Sensor</th>
                          <th className="px-4 py-2.5 font-semibold">Status / Telemetry</th>
                          <th className="px-4 py-2.5 font-semibold">Risk Score</th>
                          <th className="px-4 py-2.5 font-semibold">Risk Tier</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {facilityRisk.hotspotSensors.map((h) => (
                          <tr key={h.sensorId} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-2.5">
                              <span className="font-semibold text-slate-900">{h.sensorName}</span>
                              <span className="block text-xs font-mono text-slate-500">{h.sensorCode}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              {h.sufficientData ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  Sufficient Telemetry
                                </span>
                              ) : (
                                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                  Sparse Telemetry (Blind Spot)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                              {h.riskScore !== null ? Number(h.riskScore).toFixed(1) : '—'}
                            </td>
                            <td className="px-4 py-2.5">
                              <RiskTierBadge tier={h.riskTier} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                    No active hotspots identified in this observation window.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              {loading ? 'Evaluating facility risk...' : 'No facility risk data available.'}
            </div>
          )}
        </div>

        {/* Right: Active Unresolved Alerts Feed */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-rose-600" />
              Active Incident Alerts
            </h3>
            <Link
              to="/alerts"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              All Alerts <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            Real-time threshold violations requiring operator action
          </p>

          <div className="space-y-2.5">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700">{alert.sensorCode}</span>
                    <SeverityBadge severity={alert.severity} />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800">{alert.message}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{alert.facilityName}</span>
                    <span>{new Date(alert.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                Zero active open alerts across all monitored facilities.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compact Facility Telemetry History Section */}
      {facilitySensors.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <LineChart className="h-4 w-4 text-blue-600" />
                Facility Telemetry Trend Monitor
              </h3>
              <p className="text-xs text-slate-500">
                Time-series surveillance with 0°C–8°C temperature and 65%–95% humidity safe threshold bounds
              </p>
            </div>

            {/* Sensor Switcher for Selected Facility */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Sensor:</span>
              <select
                value={activeHistorySensor?.id || ''}
                onChange={(e) => {
                  const s = facilitySensors.find((item) => item.id === Number(e.target.value));
                  if (s) setActiveHistorySensor(s);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs"
              >
                {facilitySensors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.sensorCode}) - {s.sensorType}
                  </option>
                ))}
              </select>
              <Link
                to="/sensors"
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold ml-2 flex items-center gap-1"
              >
                Sensor Suite <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {activeHistorySensor && (
            <TelemetryHistoryChart
              sensor={activeHistorySensor}
              key={activeHistorySensor.id}
              compact={true}
              initialHours={24}
            />
          )}
        </div>
      )}
    </div>
  );
};
