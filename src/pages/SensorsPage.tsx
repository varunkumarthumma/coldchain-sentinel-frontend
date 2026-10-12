import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client';
import { Sensor, StorageFacility, SensorReading, SensorType } from '../api/types';
import { Cpu, Plus, Thermometer, Droplets, RefreshCw, Search } from 'lucide-react';
import { TelemetryHistoryChart } from '../components/TelemetryHistoryChart';
import { TelemetrySimulatorPanel } from '../components/TelemetrySimulatorPanel';

export const SensorsPage: React.FC = () => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [facilities, setFacilities] = useState<StorageFacility[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Form state for new sensor
  const [showSensorModal, setShowSensorModal] = useState(false);
  const [sensorCode, setSensorCode] = useState('');
  const [sensorName, setSensorName] = useState('');
  const [sensorType, setSensorType] = useState<SensorType>('TEMPERATURE_HUMIDITY');
  const [targetFacilityId, setTargetFacilityId] = useState<number | ''>('');

  const [latestSimulatedReading, setLatestSimulatedReading] = useState<SensorReading | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sensorRes, facRes] = await Promise.all([
        api.getSensors(undefined, 0, 100),
        api.getFacilities(0, 100),
      ]);
      setSensors(sensorRes.content);
      setFacilities(facRes.content);

      if (facRes.content.length > 0 && targetFacilityId === '') {
        setTargetFacilityId(facRes.content[0].id);
      }

      if (sensorRes.content.length > 0 && !selectedSensor) {
        selectSensor(sensorRes.content[0]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load sensors');
    } finally {
      setLoading(false);
    }
  };

  const selectSensor = async (sensor: Sensor) => {
    setSelectedSensor(sensor);
    try {
      const readingsRes = await api.getReadingsBySensor(sensor.id, 0, 20);
      setReadings(readingsRes.content);
    } catch {
      setReadings([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSensors = useMemo(() => {
    if (!searchQuery.trim()) return sensors;
    const q = searchQuery.toLowerCase();
    return sensors.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.sensorCode.toLowerCase().includes(q) ||
        s.facilityName.toLowerCase().includes(q) ||
        s.sensorType.toLowerCase().includes(q)
    );
  }, [sensors, searchQuery]);

  const handleCreateSensor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetFacilityId === '') return;
    try {
      await api.createSensor({
        sensorCode,
        name: sensorName,
        sensorType,
        facilityId: Number(targetFacilityId),
      });
      setShowSensorModal(false);
      setSensorCode('');
      setSensorName('');
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to register sensor');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            IoT Sensor Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Deployed environmental telemetry sensors, calibration parameters, and live telemetry feeds
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowSensorModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 shadow-xs transition-all"
          >
            <Plus className="h-4 w-4" />
            Register Sensor
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* 2-Column Layout: Sensor List + Telemetry Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Sensor List */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-600" />
              Sensors ({sensors.length})
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {filteredSensors.length} matching
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, name, facility..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {filteredSensors.map((sensor) => {
              const isSelected = selectedSensor?.id === sensor.id;
              return (
                <div
                  key={sensor.id}
                  onClick={() => selectSensor(sensor)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/60 shadow-xs ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{sensor.name}</span>
                    <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      {sensor.sensorCode}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span className="truncate max-w-[140px] font-medium">{sensor.facilityName}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      {sensor.sensorType}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredSensors.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400">
                No sensors matching filter.
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Telemetry & Ingestion Test Console */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2 space-y-6 shadow-xs">
          {selectedSensor ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-blue-600" />
                    {selectedSensor.name} ({selectedSensor.sensorCode})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assigned to <span className="font-semibold text-slate-700">{selectedSensor.facilityName}</span> • Model: {selectedSensor.sensorType}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Active Stream
                </span>
              </div>

              {/* Telemetry Time-Series History Charts */}
              <TelemetryHistoryChart
                sensor={selectedSensor}
                newReading={latestSimulatedReading}
                onRefreshRequested={() => selectSensor(selectedSensor)}
              />

              {/* Controlled Telemetry Simulator Engine */}
              <TelemetrySimulatorPanel
                sensor={selectedSensor}
                onReadingEmitted={(newReading) => {
                  if (newReading) {
                    setLatestSimulatedReading(newReading);
                    setReadings((prev) => [newReading, ...prev.filter((r) => r.id !== newReading.id).slice(0, 19)]);
                  } else {
                    selectSensor(selectedSensor);
                  }
                }}
              />

              {/* Recent Telemetry Stream */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Recent Telemetry Readings (Ordered Newest First)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Timestamp</th>
                        <th className="px-4 py-2.5 font-semibold">Temperature</th>
                        <th className="px-4 py-2.5 font-semibold">Humidity</th>
                        <th className="px-4 py-2.5 font-semibold">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {readings.map((r) => {
                        const tempBreach = r.temperatureCelsius !== null && (r.temperatureCelsius > 8.0 || r.temperatureCelsius < 0.0);
                        const humBreach = r.humidityPercentage !== null && (r.humidityPercentage > 95.0 || r.humidityPercentage < 65.0);

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                              {new Date(r.recordedAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5 font-mono">
                              <span className={`inline-flex items-center gap-1 font-semibold ${tempBreach ? 'text-rose-600' : 'text-blue-600'}`}>
                                <Thermometer className="h-3.5 w-3.5" />
                                {r.temperatureCelsius !== null ? `${Number(r.temperatureCelsius).toFixed(2)} °C` : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-mono">
                              <span className={`inline-flex items-center gap-1 font-semibold ${humBreach ? 'text-rose-600' : 'text-teal-600'}`}>
                                <Droplets className="h-3.5 w-3.5" />
                                {r.humidityPercentage !== null ? `${Number(r.humidityPercentage).toFixed(2)} %` : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-slate-500">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                {r.dataSource}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {readings.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400">
                            No telemetry readings recorded for this sensor.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">Select a sensor to view telemetry.</div>
          )}
        </div>
      </div>

      {/* New Sensor Modal */}
      {showSensorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Register IoT Sensor</h3>
              <button
                onClick={() => setShowSensorModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSensor} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sensor Identifier Code</label>
                <input
                  type="text"
                  required
                  value={sensorCode}
                  onChange={(e) => setSensorCode(e.target.value)}
                  placeholder="e.g. SN-CHAMBER-01"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sensor Name / Tag</label>
                <input
                  type="text"
                  required
                  value={sensorName}
                  onChange={(e) => setSensorName(e.target.value)}
                  placeholder="e.g. Chamber A Primary Pallet Sensor"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Storage Facility</label>
                <select
                  required
                  value={targetFacilityId}
                  onChange={(e) => setTargetFacilityId(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sensor Measurement Type</label>
                <select
                  value={sensorType}
                  onChange={(e) => setSensorType(e.target.value as SensorType)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="TEMPERATURE_HUMIDITY">Temperature &amp; Humidity</option>
                  <option value="TEMPERATURE">Temperature Only</option>
                  <option value="HUMIDITY">Humidity Only</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSensorModal(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
                >
                  Register Sensor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
