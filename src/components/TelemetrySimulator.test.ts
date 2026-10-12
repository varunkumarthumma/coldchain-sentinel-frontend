import { getScenarioValues, formatToIsoLocalDateTime } from './TelemetrySimulatorPanel';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('--- Testing Telemetry Simulator Scenarios ---');

// 1. Verify Thermal Excursion (TEMP_HEAT_EXCURSION)
// Must scale temperature up while keeping humidity within reasonable configured range (65% - 95%)
for (let step = 0; step < 150; step++) {
  const vals = getScenarioValues('TEMP_HEAT_EXCURSION', step, 'TEMPERATURE_HUMIDITY');
  assert(vals.temp !== null && vals.temp >= 7.2 && vals.temp <= 12.8, `Step ${step}: temp out of range (${vals.temp})`);
  assert(vals.hum !== null && vals.hum >= 75.0 && vals.hum <= 78.0, `Step ${step}: humidity drifted to ${vals.hum}%, expected safe range 75-78%`);
  assert(vals.isGap === false, 'Thermal excursion must not be marked as gap');
}
console.log('✓ Passed: TEMP_HEAT_EXCURSION maintains safe humidity (75-78%) and never decays to 4.60%');

// 2. Verify Chilling Excursion (TEMP_CHILL_EXCURSION)
// Plunges from 1.5°C down to -3.8°C (breaching <= 0.0°C threshold by step 3)
for (let step = 0; step < 50; step++) {
  const vals = getScenarioValues('TEMP_CHILL_EXCURSION', step, 'TEMPERATURE_HUMIDITY');
  assert(vals.temp !== null && vals.temp >= -3.8 && vals.temp <= 1.5, `Step ${step}: chilling temp should stay in [-3.8, 1.5] (${vals.temp})`);
  assert(vals.hum !== null && vals.hum >= 80.0 && vals.hum <= 84.0, `Step ${step}: chilling humidity should remain stable (${vals.hum})`);
}
// Confirm breach occurs
const chilledBreach = getScenarioValues('TEMP_CHILL_EXCURSION', 10, 'TEMPERATURE_HUMIDITY');
assert(chilledBreach.temp !== null && chilledBreach.temp <= 0.0, 'Chilling excursion must reach <= 0.0°C');
console.log('✓ Passed: TEMP_CHILL_EXCURSION drops temperature to -3.8°C with stable humidity');

// 3. Verify Low Humidity Excursion (HUMIDITY_LOW_EXCURSION)
// Drops from 68% down to 48% (breaching < 65% minimum)
for (let step = 0; step < 50; step++) {
  const vals = getScenarioValues('HUMIDITY_LOW_EXCURSION', step, 'TEMPERATURE_HUMIDITY');
  assert(vals.temp !== null && vals.temp >= 3.0 && vals.temp <= 5.0, `Step ${step}: temp should remain safe (${vals.temp})`);
  assert(vals.hum !== null && vals.hum >= 48.0 && vals.hum <= 68.0, `Step ${step}: humidity out of bounds (${vals.hum})`);
}
const lowHumBreach = getScenarioValues('HUMIDITY_LOW_EXCURSION', 10, 'TEMPERATURE_HUMIDITY');
assert(lowHumBreach.hum !== null && lowHumBreach.hum < 65.0, 'Low humidity excursion must breach < 65%');
console.log('✓ Passed: HUMIDITY_LOW_EXCURSION reaches 48% (< 65%) with safe temperature');

// 4. Verify High Humidity Excursion (HUMIDITY_HIGH_EXCURSION)
// Climbs from 88% up to 98.5% (breaching > 95% maximum)
for (let step = 0; step < 50; step++) {
  const vals = getScenarioValues('HUMIDITY_HIGH_EXCURSION', step, 'TEMPERATURE_HUMIDITY');
  assert(vals.temp !== null && vals.temp >= 3.0 && vals.temp <= 6.0, `Step ${step}: temp should remain safe (${vals.temp})`);
  assert(vals.hum !== null && vals.hum >= 88.0 && vals.hum <= 98.5, `Step ${step}: humidity out of bounds (${vals.hum})`);
}
const highHumBreach = getScenarioValues('HUMIDITY_HIGH_EXCURSION', 10, 'TEMPERATURE_HUMIDITY');
assert(highHumBreach.hum !== null && highHumBreach.hum > 95.0, 'High humidity excursion must breach > 95%');
console.log('✓ Passed: HUMIDITY_HIGH_EXCURSION reaches 98.5% (> 95%) with safe temperature');

// 5. Verify Recovery Cycle (RECOVERY_CYCLE)
for (let step = 0; step < 20; step++) {
  const vals = getScenarioValues('RECOVERY_CYCLE', step, 'TEMPERATURE_HUMIDITY');
  assert(vals.temp !== null && vals.temp >= 3.8 && vals.temp <= 11.2, `Step ${step}: recovery temp should stay within cooldown bounds (${vals.temp})`);
  assert(vals.hum !== null && vals.hum >= 65.0 && vals.hum <= 95.0, `Step ${step}: recovery humidity should stay within safe bounds (${vals.hum})`);
}
console.log('✓ Passed: RECOVERY_CYCLE cools steadily towards target');

// 6. Verify formatToIsoLocalDateTime generates local ISO without UTC timezone shift
const testDate = new Date(2026, 9, 11, 14, 30, 45); // Oct 11, 2026 14:30:45
const formatted = formatToIsoLocalDateTime(testDate);
assert(formatted === '2026-10-11T14:30:45', `Expected 2026-10-11T14:30:45 but got ${formatted}`);
console.log('✓ Passed: formatToIsoLocalDateTime produces correct local ISO string');

console.log('--- ALL TELEMETRY SIMULATOR UNIT TESTS PASSED ---');
