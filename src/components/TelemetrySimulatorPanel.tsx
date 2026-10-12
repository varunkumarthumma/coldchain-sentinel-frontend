import React, { useState, useEffect, useRef } from 'react';
import { Sensor, SensorType } from '../api/types';
import { api } from '../api/client';
import {
  Play,
  Square,
  Pause,
  RotateCcw,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  Snowflake,
  Droplets,
  Activity,
  Layers,
  ShieldAlert,
} from 'lucide-react';

export type SimulationScenario =
  | 'NORMAL'
  | 'TEMP_HEAT_EXCURSION'
  | 'TEMP_CHILL_EXCURSION'
  | 'HUMIDITY_LOW_EXCURSION'
  | 'HUMIDITY_HIGH_EXCURSION'
  | 'RECOVERY_CYCLE'
  | 'TELEMETRY_GAP'
  | 'MANUAL_CUSTOM';

interface TelemetrySimulatorPanelProps {
  sensor: Sensor;
  onReadingEmitted: (newReading?: any) => void;
}

interface EmittedLog {
  id: string;
  timestamp: string;
  temp: number | null;
  hum: number | null;
  scenario: SimulationScenario;
  alertTriggered: boolean;
  alertMessage?: string;
}

// Convert Date to ISO string compatible with Spring Boot LocalDateTime ("YYYY-MM-DDTHH:mm:ss")
export function formatToIsoLocalDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const mins = pad(date.getMinutes());
  const secs = pad(date.getSeconds());
  return `${year}-${month}-${day}T${hours}:${mins}:${secs}`;
}

export function getScenarioValues(
  scen: SimulationScenario,
  currentStep: number,
  sensorType: SensorType,
  manualValues?: { temp: string; hum: string }
): { temp: number | null; hum: number | null; isGap: boolean; description: string } {
  const allowsTemp = sensorType !== 'HUMIDITY';
  const allowsHum = sensorType !== 'TEMPERATURE';
  const step = currentStep % 20;

  switch (scen) {
    case 'NORMAL': {
      const t = 3.6 + Math.sin(step * 0.8) * 0.9;
      const h = 80.0 + Math.cos(step * 0.8) * 3.5;
      return {
        temp: allowsTemp ? parseFloat(t.toFixed(2)) : null,
        hum: allowsHum ? parseFloat(h.toFixed(2)) : null,
        isGap: false,
        description: 'Nominal operational state within safe thermal and humidity limits.',
      };
    }

    case 'TEMP_HEAT_EXCURSION': {
      const t = Math.min(12.8, 7.2 + step * 0.8);
      const h = 76.5 + Math.sin(step) * 1.5;
      return {
        temp: allowsTemp ? parseFloat(t.toFixed(2)) : null,
        hum: allowsHum ? parseFloat(h.toFixed(2)) : null,
        isGap: false,
        description:
          'Thermal breakdown scenario: temperature escalates up to 12.80°C while humidity remains safe (75-78%).',
      };
    }

    case 'TEMP_CHILL_EXCURSION': {
      const t = Math.max(-3.8, 1.5 - step * 0.7);
      const h = 82.0 + Math.sin(step * 0.5) * 2.0;
      return {
        temp: allowsTemp ? parseFloat(t.toFixed(2)) : null,
        hum: allowsHum ? parseFloat(h.toFixed(2)) : null,
        isGap: false,
        description:
          'Excessive chilling excursion: temperature plunges down to -3.8°C (triggering freeze alert) with stable humidity.',
      };
    }

    case 'HUMIDITY_LOW_EXCURSION': {
      const h = Math.max(48.0, 68.0 - step * 2.5);
      const t = 4.2 + Math.cos(step * 0.4) * 0.3;
      return {
        temp: allowsTemp ? parseFloat(t.toFixed(2)) : null,
        hum: allowsHum ? parseFloat(h.toFixed(2)) : null,
        isGap: false,
        description:
          'Low humidity excursion: humidity drops to 48.0% (breaching 65% minimum) while temperature remains safe.',
      };
    }

    case 'HUMIDITY_HIGH_EXCURSION': {
      const h = Math.min(98.5, 88.0 + step * 1.5);
      const t = 5.0 + Math.sin(step * 0.5) * 0.2;
      return {
        temp: allowsTemp ? parseFloat(t.toFixed(2)) : null,
        hum: allowsHum ? parseFloat(h.toFixed(2)) : null,
        isGap: false,
        description:
          'High humidity excursion: humidity climbs to 98.5% (condensation warning) while temperature remains safe.',
      };
    }

    case 'RECOVERY_CYCLE': {
      const recTemp = Math.max(3.8, 11.2 - step * 1.2);
      const recHum = Math.min(82.0, 72.0 + step * 1.5);
      return {
        temp: allowsTemp ? parseFloat(recTemp.toFixed(2)) : null,
        hum: allowsHum ? parseFloat(recHum.toFixed(2)) : null,
        isGap: false,
        description: 'Cooling remediation cycle: temperature cools from 11.2°C back down into safe 3.8°C target.',
      };
    }

    case 'TELEMETRY_GAP': {
      return {
        temp: allowsTemp ? 4.1 : null,
        hum: allowsHum ? 79.5 : null,
        isGap: true,
        description:
          'Intentional telemetry blackout: skips forward 3 hours to verify missing-reading gap rendering.',
      };
    }

    case 'MANUAL_CUSTOM':
    default: {
      return {
        temp: allowsTemp && manualValues?.temp ? parseFloat(manualValues.temp) : null,
        hum: allowsHum && manualValues?.hum ? parseFloat(manualValues.hum) : null,
        isGap: false,
        description: 'Operator-specified custom telemetry values.',
      };
    }
  }
}

export const TelemetrySimulatorPanel: React.FC<TelemetrySimulatorPanelProps> = ({
  sensor,
  onReadingEmitted,
}) => {
  const [scenario, setScenario] = useState<SimulationScenario>('NORMAL');
  const [intervalSec, setIntervalSec] = useState<number>(3);
  const [maxReadingsLimit, setMaxReadingsLimit] = useState<number>(10);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [emittedCount, setEmittedCount] = useState<number>(0);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [recentLogs, setRecentLogs] = useState<EmittedLog[]>([]);
  const [isEmitting, setIsEmitting] = useState<boolean>(false);

  const [manualTemp, setManualTemp] = useState<string>('4.50');
  const [manualHum, setManualHum] = useState<string>('75.00');
  const [gapHoursOffset, setGapHoursOffset] = useState<number>(3);

  const [perfMetrics, setPerfMetrics] = useState<{
    count: number;
    totalSec: number;
    avgHttpMs: number;
    lastReqMs: number;
  } | null>(null);

  const isRunningRef = useRef<boolean>(false);
  const isEmittingRef = useRef<boolean>(false);
  const stepIndexRef = useRef<number>(0);
  const emittedCountRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scenarioRef = useRef<SimulationScenario>(scenario);
  const intervalSecRef = useRef<number>(intervalSec);
  const maxReadingsLimitRef = useRef<number>(maxReadingsLimit);
  const gapHoursOffsetRef = useRef<number>(gapHoursOffset);
  const manualValuesRef = useRef({ temp: manualTemp, hum: manualHum });

  const runStartTimeRef = useRef<number>(0);
  const lastReadingTimeRef = useRef<number>(0);
  const httpDurationsRef = useRef<number[]>([]);

  useEffect(() => {
    scenarioRef.current = scenario;
  }, [scenario]);

  useEffect(() => {
    intervalSecRef.current = intervalSec;
  }, [intervalSec]);

  useEffect(() => {
    maxReadingsLimitRef.current = maxReadingsLimit;
  }, [maxReadingsLimit]);

  useEffect(() => {
    gapHoursOffsetRef.current = gapHoursOffset;
  }, [gapHoursOffset]);

  useEffect(() => {
    manualValuesRef.current = { temp: manualTemp, hum: manualHum };
  }, [manualTemp, manualHum]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    stopSimulation();
    stepIndexRef.current = 0;
    emittedCountRef.current = 0;
    setStepIndex(0);
    setEmittedCount(0);
  }, [sensor.id, scenario]);

  const executeReading = async (isManualStep = false): Promise<void> => {
    if (isEmittingRef.current) {
      console.warn('[Simulator Perf] Skipped trigger: previous reading request is still in-flight');
      return;
    }

    const currentCount = emittedCountRef.current;
    if (!isManualStep && currentCount >= maxReadingsLimitRef.current) {
      stopSimulation();
      return;
    }

    isEmittingRef.current = true;
    setIsEmitting(true);

    const readingNumber = currentCount + 1;
    const reqStart = performance.now();
    const delaySinceLast = lastReadingTimeRef.current > 0 ? reqStart - lastReadingTimeRef.current : 0;

    try {
      const currentStep = stepIndexRef.current;
      const vals = getScenarioValues(
        scenarioRef.current,
        currentStep,
        sensor.sensorType,
        manualValuesRef.current
      );

      const now = new Date();
      let recordedDate = now;

      if (vals.isGap) {
        recordedDate = new Date(now.getTime() + gapHoursOffsetRef.current * 60 * 60 * 1000);
      }

      const recordedAtStr = formatToIsoLocalDateTime(recordedDate);

      const payload: {
        temperatureCelsius?: number;
        humidityPercentage?: number;
        recordedAt: string;
        dataSource: string;
      } = {
        recordedAt: recordedAtStr,
        dataSource: 'SIMULATED',
      };

      if (vals.temp !== null) payload.temperatureCelsius = vals.temp;
      if (vals.hum !== null) payload.humidityPercentage = vals.hum;

      const created = await api.recordReading(sensor.id, payload);
      const reqDuration = performance.now() - reqStart;
      lastReadingTimeRef.current = performance.now();
      httpDurationsRef.current.push(reqDuration);

      const isTempBreach =
        created.temperatureCelsius !== null &&
        (created.temperatureCelsius > 8.0 || created.temperatureCelsius < 0.0);
      const isHumBreach =
        created.humidityPercentage !== null &&
        (created.humidityPercentage > 95.0 || created.humidityPercentage < 65.0);
      const alertTriggered = isTempBreach || isHumBreach;

      let alertMessage = '';
      if (isTempBreach && created.temperatureCelsius! > 8.0)
        alertMessage = `HIGH_TEMPERATURE (T: ${created.temperatureCelsius}°C > 8.0°C)`;
      else if (isTempBreach && created.temperatureCelsius! < 0.0)
        alertMessage = `LOW_TEMPERATURE (T: ${created.temperatureCelsius}°C < 0.0°C)`;
      else if (isHumBreach && created.humidityPercentage! > 95.0)
        alertMessage = `HIGH_HUMIDITY (H: ${created.humidityPercentage}% > 95%)`;
      else if (isHumBreach && created.humidityPercentage! < 65.0)
        alertMessage = `LOW_HUMIDITY (H: ${created.humidityPercentage}% < 65%)`;

      const newLog: EmittedLog = {
        id: `${Date.now()}-${currentStep}`,
        timestamp: new Date(created.recordedAt).toLocaleTimeString(),
        temp: created.temperatureCelsius,
        hum: created.humidityPercentage,
        scenario: scenarioRef.current,
        alertTriggered,
        alertMessage,
      };

      setRecentLogs((prev) => [newLog, ...prev.slice(0, 11)]);

      stepIndexRef.current = currentStep + 1;
      setStepIndex(stepIndexRef.current);

      emittedCountRef.current = readingNumber;
      setEmittedCount(readingNumber);

      const totalElapsedMs = performance.now() - runStartTimeRef.current;
      const avgHttp =
        httpDurationsRef.current.reduce((a, b) => a + b, 0) / httpDurationsRef.current.length;

      setPerfMetrics({
        count: readingNumber,
        totalSec: totalElapsedMs / 1000,
        avgHttpMs: avgHttp,
        lastReqMs: reqDuration,
      });

      console.log(
        `[Simulator Perf] Reading #${readingNumber}/${maxReadingsLimitRef.current} | HTTP: ${reqDuration.toFixed(1)}ms | Inter-delay: ${delaySinceLast.toFixed(1)}ms | Elapsed: ${(totalElapsedMs / 1000).toFixed(2)}s`
      );

      const uiStart = performance.now();
      onReadingEmitted(created);
      const uiDuration = performance.now() - uiStart;
      if (uiDuration > 2) {
        console.log(`[Simulator Perf] State update dispatched in ${uiDuration.toFixed(1)}ms`);
      }

      if (!isManualStep && isRunningRef.current) {
        if (readingNumber >= maxReadingsLimitRef.current) {
          stopSimulation();
        } else {
          const nextDelay = intervalSecRef.current * 1000;
          timerRef.current = setTimeout(() => {
            executeReading(false);
          }, nextDelay);
        }
      }
    } catch (err: unknown) {
      console.error('[Simulator Perf] Failed to emit simulated reading:', err);
      stopSimulation();
      alert(err instanceof Error ? err.message : 'Telemetry emission failed');
    } finally {
      isEmittingRef.current = false;
      setIsEmitting(false);
    }
  };

  const emitSingleReading = () => {
    executeReading(true);
  };

  const startSimulation = () => {
    if (emittedCountRef.current >= maxReadingsLimitRef.current) {
      emittedCountRef.current = 0;
      stepIndexRef.current = 0;
      setEmittedCount(0);
      setStepIndex(0);
      httpDurationsRef.current = [];
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    isRunningRef.current = true;
    setIsRunning(true);
    setIsPaused(false);

    runStartTimeRef.current = performance.now();
    lastReadingTimeRef.current = performance.now();

    executeReading(false);
  };

  const pauseSimulation = () => {
    isRunningRef.current = false;
    setIsRunning(false);
    setIsPaused(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopSimulation = () => {
    isRunningRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetSimulation = () => {
    stopSimulation();
    emittedCountRef.current = 0;
    stepIndexRef.current = 0;
    httpDurationsRef.current = [];
    setEmittedCount(0);
    setStepIndex(0);
    setRecentLogs([]);
    setPerfMetrics(null);
  };

  const currentPreview = getScenarioValues(scenario, stepIndex, sensor.sensorType);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4 shadow-xs">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            Controlled Telemetry Simulation Engine
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Repeatable hardware-in-the-loop scenario emulation for operational triage testing
          </p>
        </div>

        {/* Audit Compliance Pill */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
          <ShieldAlert className="h-3 w-3 text-amber-600" />
          Tagged: SIMULATED (Data Integrity Enforced)
        </div>
      </div>

      {/* Scenario Selector & Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Scenario Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Telemetry Scenario Profile
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setScenario('NORMAL')}
              disabled={isRunning}
              className={`rounded-lg p-2.5 text-left text-xs transition-all border ${
                scenario === 'NORMAL'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500 font-semibold'
                  : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50'
              }`}
            >
              <div className="font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Normal Baseline
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Safe 3.2°C – 4.8°C / 80%</div>
            </button>

            <button
              onClick={() => setScenario('TEMP_HEAT_EXCURSION')}
              disabled={isRunning}
              className={`rounded-lg p-2.5 text-left text-xs transition-all border ${
                scenario === 'TEMP_HEAT_EXCURSION'
                  ? 'border-rose-500 bg-rose-50 text-rose-900 ring-1 ring-rose-500 font-semibold'
                  : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50'
              }`}
            >
              <div className="font-semibold text-rose-700 flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5" /> Thermal Excursion
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Climbs to 12.8°C (&gt;8°C)</div>
            </button>

            <button
              onClick={() => setScenario('TEMP_CHILL_EXCURSION')}
              disabled={isRunning}
              className={`rounded-lg p-2.5 text-left text-xs transition-all border ${
                scenario === 'TEMP_CHILL_EXCURSION'
                  ? 'border-sky-500 bg-sky-50 text-sky-900 ring-1 ring-sky-500 font-semibold'
                  : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50'
              }`}
            >
              <div className="font-semibold text-sky-700 flex items-center gap-1.5">
                <Snowflake className="h-3.5 w-3.5" /> Chilling Excursion
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Freezes to -3.8°C (&lt;0°C)</div>
            </button>

            <button
              onClick={() => setScenario('HUMIDITY_LOW_EXCURSION')}
              disabled={isRunning}
              className={`rounded-lg p-2.5 text-left text-xs transition-all border ${
                scenario === 'HUMIDITY_LOW_EXCURSION'
                  ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500 font-semibold'
                  : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50'
              }`}
            >
              <div className="font-semibold text-amber-700 flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5" /> Low Humidity
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Desiccation (&lt;65%)</div>
            </button>

            <button
              onClick={() => setScenario('HUMIDITY_HIGH_EXCURSION')}
              disabled={isRunning}
              className={`rounded-lg p-2.5 text-left text-xs transition-all border ${
                scenario === 'HUMIDITY_HIGH_EXCURSION'
                  ? 'border-purple-500 bg-purple-50 text-purple-900 ring-1 ring-purple-500 font-semibold'
                  : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50'
              }`}
            >
              <div className="font-semibold text-purple-700 flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5" /> High Humidity
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Condensation (&gt;95%)</div>
            </button>

            <button
              onClick={() => setScenario('RECOVERY_CYCLE')}
              disabled={isRunning}
              className={`rounded-lg p-2.5 text-left text-xs transition-all border ${
                scenario === 'RECOVERY_CYCLE'
                  ? 'border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-500 font-semibold'
                  : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50'
              }`}
            >
              <div className="font-semibold text-blue-700 flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Recovery Cycle
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">11.5°C down to 3.8°C</div>
            </button>

            <button
              onClick={() => setScenario('TELEMETRY_GAP')}
              disabled={isRunning}
              className={`rounded-lg p-2.5 text-left text-xs transition-all border ${
                scenario === 'TELEMETRY_GAP'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500 font-semibold'
                  : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50'
              }`}
            >
              <div className="font-semibold text-indigo-700 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Telemetry Gap
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">+3h missing interval</div>
            </button>

            <button
              onClick={() => setScenario('MANUAL_CUSTOM')}
              disabled={isRunning}
              className={`rounded-lg p-2.5 text-left text-xs transition-all border ${
                scenario === 'MANUAL_CUSTOM'
                  ? 'border-slate-600 bg-slate-100 text-slate-900 ring-1 ring-slate-600 font-semibold'
                  : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50'
              }`}
            >
              <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5" /> Manual Custom
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Operator custom values</div>
            </button>
          </div>

          <p className="text-[11px] text-slate-500 italic pt-1">{currentPreview.description}</p>
        </div>

        {/* Right: Execution Frequency & Safety Limits */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-600" />
                Interval
              </label>
              <select
                value={intervalSec}
                onChange={(e) => setIntervalSec(Number(e.target.value))}
                disabled={isRunning}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value={2}>2 seconds (Rapid demo)</option>
                <option value={3}>3 seconds (Recommended)</option>
                <option value={5}>5 seconds (Steady)</option>
                <option value={10}>10 seconds (Paced)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3 text-amber-600" />
                Safety Max Cap
              </label>
              <select
                value={maxReadingsLimit}
                onChange={(e) => setMaxReadingsLimit(Number(e.target.value))}
                disabled={isRunning}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value={5}>5 readings (Quick test)</option>
                <option value={10}>10 readings (Standard)</option>
                <option value={20}>20 readings (Comprehensive)</option>
                <option value={50}>50 readings (Extended cap)</option>
              </select>
            </div>
          </div>

          {/* Manual input fields if scenario is MANUAL_CUSTOM */}
          {scenario === 'MANUAL_CUSTOM' && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1 font-medium">Temperature (°C)</label>
                <input
                  type="number"
                  step="0.01"
                  value={manualTemp}
                  onChange={(e) => setManualTemp(e.target.value)}
                  disabled={isRunning || sensor.sensorType === 'HUMIDITY'}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1 font-medium">Humidity (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={manualHum}
                  onChange={(e) => setManualHum(e.target.value)}
                  disabled={isRunning || sensor.sensorType === 'TEMPERATURE'}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Gap duration field if scenario is TELEMETRY_GAP */}
          {scenario === 'TELEMETRY_GAP' && (
            <div className="pt-2 border-t border-slate-200">
              <label className="block text-[11px] text-slate-600 mb-1 font-medium">Simulated Blackout Gap Duration</label>
              <select
                value={gapHoursOffset}
                onChange={(e) => setGapHoursOffset(Number(e.target.value))}
                disabled={isRunning}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value={2.5}>2.5 Hours (Exceeds 2h telemetry threshold)</option>
                <option value={3}>3 Hours (Standard transmission gap demo)</option>
                <option value={6}>6 Hours (Extended gateway outage)</option>
                <option value={12}>12 Hours (Half-day power blackout)</option>
              </select>
            </div>
          )}

          {/* Execution Progress & Status */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Emission Progress:</span>
              <span className="font-mono text-blue-700 font-bold">
                {emittedCount} / {maxReadingsLimit} readings
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 transition-all duration-300 ${
                  isRunning ? 'bg-blue-600' : isPaused ? 'bg-amber-500' : 'bg-slate-400'
                }`}
                style={{
                  width: `${Math.min(100, (emittedCount / maxReadingsLimit) * 100)}%`,
                }}
              />
            </div>

            {/* Performance Telemetry Indicator */}
            {perfMetrics && (
              <div className="flex items-center justify-between text-[10px] text-slate-600 bg-white rounded-md px-2 py-1 border border-slate-200 font-mono">
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  ⏱ Elapsed: {perfMetrics.totalSec.toFixed(2)}s
                </span>
                <span>Avg HTTP: {perfMetrics.avgHttpMs.toFixed(1)}ms</span>
                <span>Last Req: {perfMetrics.lastReqMs.toFixed(1)}ms</span>
              </div>
            )}
          </div>

          {/* Action Button Controls */}
          <div className="flex items-center gap-2 pt-1">
            {!isRunning ? (
              <button
                onClick={startSimulation}
                disabled={isEmitting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-all"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                {isPaused ? 'Resume Run' : 'Start Simulation'}
              </button>
            ) : (
              <button
                onClick={pauseSimulation}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-all shadow-xs"
              >
                <Pause className="h-3.5 w-3.5" />
                Pause
              </button>
            )}

            <button
              onClick={emitSingleReading}
              disabled={isRunning || isEmitting}
              title="Emit exactly 1 reading step"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Send className="h-3 w-3 text-blue-600" />
              Step (1x)
            </button>

            <button
              onClick={stopSimulation}
              disabled={!isRunning && !isPaused}
              title="Stop simulation loop"
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
            >
              <Square className="h-3 w-3 fill-current" />
              Stop
            </button>

            <button
              onClick={resetSimulation}
              disabled={isRunning}
              title="Reset counter"
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-500 hover:text-slate-800 transition-colors shadow-2xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Emitted Telemetry Live Log Stream */}
      {recentLogs.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Live Emission Stream (Newest First)
            </span>
            <span className="text-[10px] text-slate-500 font-mono font-medium">
              Backend Evaluated: {recentLogs.filter((l) => l.alertTriggered).length} Alerts Triggered
            </span>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className={`flex items-center justify-between p-2 rounded-lg border text-xs font-mono transition-all ${
                  log.alertTriggered
                    ? 'border-rose-200 bg-rose-50/70 text-rose-900'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[10px]">{log.timestamp}</span>
                  <span className="font-bold text-slate-900">
                    {log.temp !== null ? `${log.temp.toFixed(2)} °C` : '—'} /{' '}
                    {log.hum !== null ? `${log.hum.toFixed(2)} %` : '—'}
                  </span>
                  <span className="rounded bg-amber-100 border border-amber-200 px-1 py-0.2 text-[9px] font-semibold text-amber-800">
                    SIMULATED
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  {log.alertTriggered ? (
                    <span className="flex items-center gap-1 text-rose-700 font-bold">
                      <AlertTriangle className="h-3 w-3" />
                      {log.alertMessage || 'Alert Triggered'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <CheckCircle2 className="h-3 w-3" />
                      Safe
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
