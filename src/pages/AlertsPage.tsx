import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client';
import { Alert, AlertStatus, AlertSeverity } from '../api/types';
import { SeverityBadge, StatusBadge } from '../components/Badges';
import { CheckCircle, Eye, RefreshCw, AlertOctagon, Search, ShieldCheck } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [statusFilter, setStatusFilter] = useState<AlertStatus | ''>('');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAlerts({
        page: 0,
        size: 100,
        status: statusFilter !== '' ? statusFilter : undefined,
        severity: severityFilter !== '' ? severityFilter : undefined,
      });
      setAlerts(res.content);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [statusFilter, severityFilter]);

  const filteredAlerts = useMemo(() => {
    if (!searchQuery.trim()) return alerts;
    const q = searchQuery.toLowerCase();
    return alerts.filter(
      (a) =>
        a.sensorCode.toLowerCase().includes(q) ||
        a.facilityName.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        a.alertType.toLowerCase().includes(q)
    );
  }, [alerts, searchQuery]);

  const handleAcknowledge = async (id: number) => {
    try {
      await api.acknowledgeAlert(id);
      loadAlerts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to acknowledge alert');
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await api.resolveAlert(id);
      loadAlerts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to resolve alert');
    }
  };

  // Status counts for quick stats
  const openCount = alerts.filter((a) => a.status === 'OPEN').length;
  const ackCount = alerts.filter((a) => a.status === 'ACKNOWLEDGED').length;
  const resCount = alerts.filter((a) => a.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Alert Management Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time thermal breach monitoring, incident triage, and technician resolution workflows
          </p>
        </div>
        <button
          onClick={loadAlerts}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Incidents
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* KPI Incident Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Incidents</span>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">{openCount}</p>
          </div>
          <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600">
            <AlertOctagon className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Under Triage</span>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">{ackCount}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
            <Eye className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolved</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{resCount}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, message, or hub..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AlertStatus | '')}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Severity:</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | '')}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-900">{filteredAlerts.length}</span> incidents
        </div>
      </div>

      {/* Alerts Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold">Incident / Severity</th>
              <th className="px-4 py-3 font-semibold">Sensor &amp; Facility</th>
              <th className="px-4 py-3 font-semibold">Measured Value</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Logged At</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredAlerts.map((alert) => (
              <tr key={alert.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={alert.severity} />
                    <span className="font-bold text-slate-900">{alert.alertType}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 max-w-md font-medium">{alert.message}</p>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-semibold text-slate-800">{alert.facilityName}</span>
                  <span className="block font-mono text-xs font-semibold text-blue-700 mt-0.5">{alert.sensorCode}</span>
                </td>
                <td className="px-4 py-3.5 font-mono text-xs">
                  <span className="font-bold text-slate-900 text-sm">
                    {alert.measuredValue !== null ? alert.measuredValue : '—'}
                  </span>
                  {alert.thresholdValue !== null && (
                    <span className="text-slate-400 block text-[11px] mt-0.5">Threshold: {alert.thresholdValue}</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={alert.status} />
                </td>
                <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">
                  {new Date(alert.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {alert.status === 'OPEN' && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors shadow-2xs"
                      >
                        <Eye className="h-3.5 w-3.5" /> Acknowledge
                      </button>
                    )}
                    {alert.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Resolve
                      </button>
                    )}
                    {alert.status === 'RESOLVED' && (
                      <span className="text-xs text-slate-400 font-medium italic">Closed</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredAlerts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                  <AlertOctagon className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">No alerts found</p>
                  <p className="text-xs text-slate-400 mt-0.5">No incidents matching the selected filters.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
