import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SensorReading, Sensor } from '../api/types';
import { api } from '../api/client';
import {
  Thermometer,
  Droplets,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  Activity,
  AlertOctagon,
} from 'lucide-react';

export type TimeWindowHours = 12 | 24 | 48 | 168; // 12h, 24h, 48h, 7d

interface TelemetryHistoryChartProps {
  sensor: Sensor;
  initialHours?: TimeWindowHours;
  compact?: boolean; // For dashboard widget view
  onRefreshRequested?: () => void;
  newReading?: SensorReading | null;
}

interface PointCoords {
  x: number;
  y: number;
  reading: SensorReading;
  value: number;
  isBreach: boolean;
  breachType?: 'HIGH' | 'LOW';
  gapBefore?: boolean;
}

// Convert Date to ISO string compatible with Spring Boot LocalDateTime ("YYYY-MM-DDTHH:mm:ss")
function formatToIsoLocalDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const mins = pad(date.getMinutes());
  const secs = pad(date.getSeconds());
  return `${year}-${month}-${day}T${hours}:${mins}:${secs}`;
}

// Human readable relative time format
function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  if (diffMs < 0) return 'Just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ago`;
}

export const TelemetryHistoryChart: React.FC<TelemetryHistoryChartProps> = ({
  sensor,
  initialHours = 24,
  compact = false,
  onRefreshRequested,
  newReading,
}) => {
  const [timeWindow, setTimeWindow] = useState<TimeWindowHours>(initialHours);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'TEMPERATURE' | 'HUMIDITY'>(
    sensor.sensorType === 'HUMIDITY' ? 'HUMIDITY' : 'TEMPERATURE'
  );

  // Active hover/touch tooltip state
  const [hoveredPoint, setHoveredPoint] = useState<{
    point: PointCoords;
    metric: 'TEMPERATURE' | 'HUMIDITY';
    clientX: number;
    clientY: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Safe limits configured in application.properties
  const TEMP_MIN = 0.0;
  const TEMP_MAX = 8.0;
  const HUM_MIN = 65.0;
  const HUM_MAX = 95.0;
  const MAX_INTERVAL_MS = 120 * 60 * 1000; // 120 minutes gap threshold

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const past = new Date(now.getTime() - timeWindow * 60 * 60 * 1000);

      const fromStr = formatToIsoLocalDateTime(past);
      const toStr = formatToIsoLocalDateTime(now);

      const data = await api.getReadingsByRange(sensor.id, fromStr, toStr);

      const sorted = [...data].sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      );
      setReadings(sorted);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load telemetry history');
      setReadings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [sensor.id, timeWindow]);

  useEffect(() => {
    if (!newReading || newReading.sensorId !== sensor.id) return;
    setReadings((prev) => {
      if (prev.some((r) => r.id === newReading.id)) return prev;
      const updated = [...prev, newReading];
      return updated.sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      );
    });
  }, [newReading, sensor.id]);

  useEffect(() => {
    if (sensor.sensorType === 'HUMIDITY') {
      setActiveTab('HUMIDITY');
    } else {
      setActiveTab('TEMPERATURE');
    }
  }, [sensor.sensorType]);

  const latestReading = useMemo(() => {
    if (readings.length === 0) return null;
    return readings[readings.length - 1];
  }, [readings]);

  const isStale = useMemo(() => {
    if (!latestReading) return false;
    const diffMs = Date.now() - new Date(latestReading.recordedAt).getTime();
    return diffMs > 60 * 60 * 1000;
  }, [latestReading]);

  const coverageInfo = useMemo(() => {
    if (readings.length === 0) return null;
    const firstTime = new Date(readings[0].recordedAt).getTime();
    const lastTime = new Date(readings[readings.length - 1].recordedAt).getTime();
    const durationHours = (lastTime - firstTime) / (1000 * 60 * 60);

    const isPartial = durationHours < timeWindow * 0.75 && readings.length < 5;
    return {
      firstDate: new Date(readings[0].recordedAt),
      lastDate: new Date(readings[readings.length - 1].recordedAt),
      durationHours: Math.max(0.1, durationHours),
      isPartial,
    };
  }, [readings, timeWindow]);

  const chartData = useMemo(() => {
    const isTemp = activeTab === 'TEMPERATURE';
    const minThreshold = isTemp ? TEMP_MIN : HUM_MIN;
    const maxThreshold = isTemp ? TEMP_MAX : HUM_MAX;

    const validReadings = readings.filter((r) => {
      const val = isTemp ? r.temperatureCelsius : r.humidityPercentage;
      return val !== null && val !== undefined;
    });

    const width = 800;
    const height = compact ? 220 : 320;
    const padding = { top: 30, right: 30, bottom: 45, left: 55 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    if (validReadings.length === 0) {
      return {
        points: [],
        segments: [],
        gaps: [],
        yMin: minThreshold,
        yMax: maxThreshold,
        xMin: 0,
        xMax: 1,
        width,
        height,
        padding,
        plotWidth,
        plotHeight,
        maxThreshold,
        minThreshold,
        maxThresholdY: padding.top + plotHeight * 0.2,
        minThresholdY: padding.top + plotHeight * 0.8,
      };
    }

    const values = validReadings.map((r) => (isTemp ? r.temperatureCelsius! : r.humidityPercentage!));
    let yMin = Math.min(...values, minThreshold - (isTemp ? 2 : 10));
    let yMax = Math.max(...values, maxThreshold + (isTemp ? 2 : 10));

    const yPad = (yMax - yMin) * 0.1 || 2;
    yMin = Math.floor(yMin - yPad);
    yMax = Math.ceil(yMax + yPad);

    const xMin = new Date(validReadings[0].recordedAt).getTime();
    const xMax = new Date(validReadings[validReadings.length - 1].recordedAt).getTime();
    const xSpan = Math.max(1, xMax - xMin);

    const points: PointCoords[] = [];
    const gaps: { startX: number; endX: number; startTime: Date; endTime: Date }[] = [];

    const segments: string[] = [];
    let currentSegment: { x: number; y: number }[] = [];

    validReadings.forEach((r, idx) => {
      const val = isTemp ? r.temperatureCelsius! : r.humidityPercentage!;
      const time = new Date(r.recordedAt).getTime();

      const x =
        validReadings.length === 1
          ? padding.left + plotWidth / 2
          : padding.left + ((time - xMin) / xSpan) * plotWidth;

      const y = padding.top + plotHeight - ((val - yMin) / (yMax - yMin)) * plotHeight;

      let breachType: 'HIGH' | 'LOW' | undefined;
      const isBreach = val > maxThreshold || val < minThreshold;
      if (val > maxThreshold) breachType = 'HIGH';
      if (val < minThreshold) breachType = 'LOW';

      let gapBefore = false;
      if (idx > 0) {
        const prevTime = new Date(validReadings[idx - 1].recordedAt).getTime();
        const deltaMs = time - prevTime;
        if (deltaMs > MAX_INTERVAL_MS) {
          gapBefore = true;
          const prevX =
            validReadings.length === 1
              ? padding.left + plotWidth / 2
              : padding.left + ((prevTime - xMin) / xSpan) * plotWidth;

          gaps.push({
            startX: prevX,
            endX: x,
            startTime: new Date(prevTime),
            endTime: new Date(time),
          });

          if (currentSegment.length > 0) {
            segments.push(generatePathString(currentSegment));
            currentSegment = [];
          }
        }
      }

      currentSegment.push({ x, y });

      points.push({
        x,
        y,
        reading: r,
        value: val,
        isBreach,
        breachType,
        gapBefore,
      });
    });

    if (currentSegment.length > 0) {
      segments.push(generatePathString(currentSegment));
    }

    function generatePathString(pts: { x: number; y: number }[]): string {
      if (pts.length === 0) return '';
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y} l 0.1 0`;
      return pts.reduce(
        (acc, curr, i) => (i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`),
        ''
      );
    }

    const maxThresholdY = padding.top + plotHeight - ((maxThreshold - yMin) / (yMax - yMin)) * plotHeight;
    const minThresholdY = padding.top + plotHeight - ((minThreshold - yMin) / (yMax - yMin)) * plotHeight;

    return {
      points,
      segments,
      gaps,
      yMin,
      yMax,
      xMin,
      xMax,
      width,
      height,
      padding,
      plotWidth,
      plotHeight,
      maxThreshold,
      minThreshold,
      maxThresholdY,
      minThresholdY,
    };
  }, [readings, activeTab, compact]);

  const hasTemperature = sensor.sensorType !== 'HUMIDITY';
  const hasHumidity = sensor.sensorType !== 'TEMPERATURE';

  return (
    <div
      ref={containerRef}
      className={`rounded-xl border border-slate-200 bg-white shadow-xs relative overflow-hidden ${
        compact ? 'p-4 sm:p-5' : 'p-6'
      }`}
    >
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              {compact ? 'Telemetry Trend History' : `${sensor.name} (${sensor.sensorCode})`}
            </h3>

            {/* Freshness Badge */}
            {latestReading && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isStale
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isStale ? 'bg-amber-500' : 'bg-emerald-500'}`}
                />
                {isStale ? 'Telemetry Stale' : 'Live Feed'}
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-slate-500 flex items-center gap-2">
            <span>Location: {sensor.facilityName}</span>
            <span>•</span>
            <span>Hardware Model: {sensor.sensorType}</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector Tabs */}
          {hasTemperature && hasHumidity && (
            <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => setActiveTab('TEMPERATURE')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  activeTab === 'TEMPERATURE'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Thermometer className="h-3.5 w-3.5 text-blue-600" />
                Temperature (°C)
              </button>
              <button
                onClick={() => setActiveTab('HUMIDITY')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  activeTab === 'HUMIDITY'
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Droplets className="h-3.5 w-3.5 text-teal-600" />
                Humidity (%)
              </button>
            </div>
          )}

          {/* Time Window Buttons */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            {([12, 24, 48, 168] as TimeWindowHours[]).map((hours) => (
              <button
                key={hours}
                onClick={() => setTimeWindow(hours)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  timeWindow === hours
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {hours === 168 ? '7 Days' : `${hours}h`}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => {
              fetchHistory();
              onRefreshRequested?.();
            }}
            disabled={loading}
            title="Refresh historical telemetry"
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Real-time Status / Telemetry Context Banner */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            Latest Reading:
            <span className="font-mono text-slate-900 font-semibold">
              {latestReading ? new Date(latestReading.recordedAt).toLocaleString() : 'No readings'}
            </span>
            {latestReading && (
              <span className="text-slate-400 font-normal">
                ({formatRelativeTime(latestReading.recordedAt)})
              </span>
            )}
          </span>

          {latestReading?.dataSource && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase border ${
                latestReading.dataSource.toUpperCase() === 'SIMULATED'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {latestReading.dataSource.toUpperCase() === 'SIMULATED'
                ? 'Source: SIMULATED'
                : 'Source: HARDWARE IOT'}
            </span>
          )}
        </div>

        {/* Coverage & Gap Notification */}
        {coverageInfo && (
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            {coverageInfo.isPartial ? (
              <span className="text-amber-700 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Partial History: Only {coverageInfo.durationHours.toFixed(1)}h recorded in requested{' '}
                {timeWindow === 168 ? '7d' : `${timeWindow}h`} window
              </span>
            ) : (
              <span>
                Span: {readings.length} actual points ({coverageInfo.durationHours.toFixed(1)}h)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stale Warning Banner if applicable */}
      {isStale && latestReading && (
        <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Telemetry Stream Stale:</strong> No new telemetry received in the past hour. Last
            transmission was recorded at {new Date(latestReading.recordedAt).toLocaleTimeString()}.
            Verify sensor battery or gateway uplink.
          </span>
        </div>
      )}

      {/* Main Chart Area */}
      <div className="mt-4">
        {loading && readings.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-slate-600">Loading telemetry time-series...</p>
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
            <AlertOctagon className="h-8 w-8 text-rose-600" />
            <div>
              <p className="font-semibold text-rose-900">Telemetry Query Failed</p>
              <p className="text-xs text-rose-700 mt-1">{error}</p>
            </div>
            <button
              onClick={fetchHistory}
              className="mt-2 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs"
            >
              Retry Telemetry Query
            </button>
          </div>
        ) : readings.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center text-slate-500">
            <Calendar className="h-8 w-8 text-slate-400" />
            <div>
              <p className="font-semibold text-slate-700">No Telemetry In Selected Range</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                No recorded telemetry readings found for this sensor in the requested {timeWindow}
                -hour window. Try expanding the time filter to 7 Days or ingest simulated test data.
              </p>
            </div>
          </div>
        ) : (
          /* SVG Responsive Chart */
          <div className="relative">
            {/* Chart Legend and Threshold Badges */}
            <div className="flex flex-wrap items-center justify-between text-xs mb-2 px-1 gap-2">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      activeTab === 'TEMPERATURE' ? 'bg-blue-600' : 'bg-teal-600'
                    }`}
                  />
                  Actual {activeTab === 'TEMPERATURE' ? 'Temperature (°C)' : 'Humidity (%)'}
                </span>
                <span className="flex items-center gap-1.5 text-rose-600 font-medium">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Thermal/Humidity Excursion
                </span>
                {chartData.gaps.length > 0 && (
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="h-2 w-4 border border-dashed border-slate-400 bg-slate-100" />
                    Telemetry Gap (&gt;2h)
                  </span>
                )}
              </div>

              {/* Threshold Indicators */}
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-rose-700 font-medium">
                  Max Safe:{' '}
                  <strong>{activeTab === 'TEMPERATURE' ? `${TEMP_MAX}°C` : `${HUM_MAX}%`}</strong>
                </span>
                <span className="rounded bg-sky-50 border border-sky-200 px-2 py-0.5 text-sky-700 font-medium">
                  Min Safe:{' '}
                  <strong>{activeTab === 'TEMPERATURE' ? `${TEMP_MIN}°C` : `${HUM_MIN}%`}</strong>
                </span>
              </div>
            </div>

            {/* SVG Canvas */}
            <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
              <svg
                viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                className="w-full h-auto select-none"
                style={{ maxHeight: compact ? '240px' : '340px' }}
              >
                <defs>
                  {/* Subtle Grid Hatch for Telemetry Gaps */}
                  <pattern
                    id="gap-pattern"
                    width="8"
                    height="8"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <line x1="0" y1="0" x2="0" y2="8" stroke="#e2e8f0" strokeWidth="1.5" />
                  </pattern>

                  {/* Gradient for safe zone background */}
                  <linearGradient id="safe-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.04" />
                  </linearGradient>
                </defs>

                {/* Plot Background */}
                <rect
                  x={chartData.padding.left}
                  y={chartData.padding.top}
                  width={chartData.plotWidth}
                  height={chartData.plotHeight}
                  fill="#ffffff"
                  rx="4"
                />

                {/* Shaded Safe Threshold Zone */}
                {chartData.minThresholdY > chartData.maxThresholdY && (
                  <rect
                    x={chartData.padding.left}
                    y={chartData.maxThresholdY}
                    width={chartData.plotWidth}
                    height={Math.max(2, chartData.minThresholdY - chartData.maxThresholdY)}
                    fill="url(#safe-gradient)"
                  />
                )}

                {/* Shaded Telemetry Gap Regions */}
                {chartData.gaps.map((gap, i) => (
                  <g key={`gap-${i}`}>
                    <rect
                      x={gap.startX}
                      y={chartData.padding.top}
                      width={Math.max(4, gap.endX - gap.startX)}
                      height={chartData.plotHeight}
                      fill="url(#gap-pattern)"
                      opacity="0.8"
                    />
                    <text
                      x={gap.startX + (gap.endX - gap.startX) / 2}
                      y={chartData.padding.top + 16}
                      fill="#94a3b8"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      GAP ({Math.round((gap.endTime.getTime() - gap.startTime.getTime()) / 3600000)}h)
                    </text>
                  </g>
                ))}

                {/* Horizontal Gridlines & Y-Axis Labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                  const yVal = chartData.yMin + pct * (chartData.yMax - chartData.yMin);
                  const yPos =
                    chartData.padding.top + chartData.plotHeight - pct * chartData.plotHeight;

                  return (
                    <g key={`grid-y-${pct}`}>
                      <line
                        x1={chartData.padding.left}
                        y1={yPos}
                        x2={chartData.padding.left + chartData.plotWidth}
                        y2={yPos}
                        stroke="#f1f5f9"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={chartData.padding.left - 8}
                        y={yPos + 4}
                        fill="#94a3b8"
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor="end"
                      >
                        {yVal.toFixed(0)}
                        {activeTab === 'TEMPERATURE' ? '°' : '%'}
                      </text>
                    </g>
                  );
                })}

                {/* Dashed Maximum Threshold Line */}
                <g>
                  <line
                    x1={chartData.padding.left}
                    y1={chartData.maxThresholdY}
                    x2={chartData.padding.left + chartData.plotWidth}
                    y2={chartData.maxThresholdY}
                    stroke="#e11d48"
                    strokeWidth="1.75"
                    strokeDasharray="5 4"
                  />
                  <text
                    x={chartData.padding.left + chartData.plotWidth - 6}
                    y={chartData.maxThresholdY - 4}
                    fill="#e11d48"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    MAX LIMIT ({chartData.maxThreshold}
                    {activeTab === 'TEMPERATURE' ? '°C' : '%'})
                  </text>
                </g>

                {/* Dashed Minimum Threshold Line */}
                <g>
                  <line
                    x1={chartData.padding.left}
                    y1={chartData.minThresholdY}
                    x2={chartData.padding.left + chartData.plotWidth}
                    y2={chartData.minThresholdY}
                    stroke="#0284c7"
                    strokeWidth="1.75"
                    strokeDasharray="5 4"
                  />
                  <text
                    x={chartData.padding.left + chartData.plotWidth - 6}
                    y={chartData.minThresholdY + 12}
                    fill="#0284c7"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    MIN LIMIT ({chartData.minThreshold}
                    {activeTab === 'TEMPERATURE' ? '°C' : '%'})
                  </text>
                </g>

                {/* Time-Series Line Segments (Unsmoothed / Authentic) */}
                {chartData.segments.map((segPath, idx) => (
                  <path
                    key={`seg-${idx}`}
                    d={segPath}
                    fill="none"
                    stroke={activeTab === 'TEMPERATURE' ? '#2563eb' : '#0d9488'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

                {/* Data Points (Safe vs Excursion Highlighted) */}
                {chartData.points.map((pt, idx) => {
                  return (
                    <g
                      key={`pt-${idx}`}
                      className="cursor-pointer transition-transform hover:scale-125"
                      onMouseEnter={(e) => {
                        const rect = containerRef.current?.getBoundingClientRect();
                        setHoveredPoint({
                          point: pt,
                          metric: activeTab,
                          clientX: e.clientX - (rect?.left || 0),
                          clientY: e.clientY - (rect?.top || 0),
                        });
                      }}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      {/* Outer pulse for breach excursions */}
                      {pt.isBreach && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={compact ? 6 : 8}
                          fill="#e11d48"
                          opacity="0.25"
                          className="animate-ping"
                        />
                      )}

                      {/* Main Data Point Circle */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={compact ? 3.5 : 4.5}
                        fill={pt.isBreach ? '#e11d48' : activeTab === 'TEMPERATURE' ? '#2563eb' : '#0d9488'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    </g>
                  );
                })}

                {/* X-Axis Tick Labels (Local Time) */}
                {chartData.points.length > 0 &&
                  [0, 0.33, 0.66, 1].map((pct, idx) => {
                    const timeMs = chartData.xMin + pct * (chartData.xMax - chartData.xMin);
                    const date = new Date(timeMs);
                    const xPos = chartData.padding.left + pct * chartData.plotWidth;

                    const timeStr = date.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const dateStr =
                      timeWindow > 24
                        ? date.toLocaleDateString([], { month: 'short', day: 'numeric' })
                        : '';

                    return (
                      <g key={`x-tick-${idx}`}>
                        <line
                          x1={xPos}
                          y1={chartData.padding.top + chartData.plotHeight}
                          x2={xPos}
                          y2={chartData.padding.top + chartData.plotHeight + 5}
                          stroke="#cbd5e1"
                        />
                        <text
                          x={xPos}
                          y={chartData.padding.top + chartData.plotHeight + 18}
                          fill="#64748b"
                          fontSize="9.5"
                          fontFamily="monospace"
                          textAnchor={idx === 0 ? 'start' : idx === 3 ? 'end' : 'middle'}
                        >
                          {dateStr ? `${dateStr} ${timeStr}` : timeStr}
                        </text>
                      </g>
                    );
                  })}
              </svg>
            </div>

            {/* Interactive Tooltip Card */}
            {hoveredPoint && (
              <div
                className="absolute z-30 pointer-events-none rounded-xl border border-slate-200 bg-white/98 p-3.5 shadow-xl backdrop-blur transition-all duration-75 text-xs text-slate-800 max-w-xs space-y-1.5"
                style={{
                  left: Math.min(
                    Math.max(10, hoveredPoint.clientX - 100),
                    (containerRef.current?.clientWidth || 400) - 220
                  ),
                  top: Math.max(10, hoveredPoint.clientY - 95),
                }}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 gap-2">
                  <span className="font-mono text-slate-500 text-[11px]">
                    {new Date(hoveredPoint.point.reading.recordedAt).toLocaleString()}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      hoveredPoint.point.reading.dataSource.toUpperCase() === 'SIMULATED'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {hoveredPoint.point.reading.dataSource}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-3 pt-0.5">
                  <span className="text-slate-500 font-medium">Measurement:</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      hoveredPoint.point.isBreach ? 'text-rose-600' : 'text-blue-600'
                    }`}
                  >
                    {hoveredPoint.point.value.toFixed(2)}{' '}
                    {hoveredPoint.metric === 'TEMPERATURE' ? '°C' : '%'}
                  </span>
                </div>

                <div className="flex items-start gap-1.5 pt-0.5">
                  {hoveredPoint.point.isBreach ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  )}
                  <span
                    className={`text-[11px] leading-tight ${
                      hoveredPoint.point.isBreach ? 'text-rose-700 font-medium' : 'text-emerald-700'
                    }`}
                  >
                    {hoveredPoint.point.isBreach
                      ? hoveredPoint.point.breachType === 'HIGH'
                        ? `Excursion Breach: High (+${(
                            hoveredPoint.point.value -
                            (hoveredPoint.metric === 'TEMPERATURE' ? TEMP_MAX : HUM_MAX)
                          ).toFixed(2)} above ${
                            hoveredPoint.metric === 'TEMPERATURE' ? TEMP_MAX : HUM_MAX
                          } threshold)`
                        : `Excursion Breach: Low (-${(
                            (hoveredPoint.metric === 'TEMPERATURE' ? TEMP_MIN : HUM_MIN) -
                            hoveredPoint.point.value
                          ).toFixed(2)} below ${
                            hoveredPoint.metric === 'TEMPERATURE' ? TEMP_MIN : HUM_MIN
                          } threshold)`
                      : `Within Safe Limits (${
                          hoveredPoint.metric === 'TEMPERATURE'
                            ? `${TEMP_MIN}°C - ${TEMP_MAX}°C`
                            : `${HUM_MIN}% - ${HUM_MAX}%`
                        })`}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Notes & Integrity Disclaimer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
        <span className="flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          No interpolation or silent smoothing applied. Historical telemetry gaps are rendered as
          distinct broken intervals.
        </span>
        <span className="font-mono text-slate-400">
          Showing {readings.length} actual points over {timeWindow === 168 ? '7 days' : `${timeWindow} hours`}
        </span>
      </div>
    </div>
  );
};
