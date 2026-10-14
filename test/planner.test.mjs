import test from 'node:test';
import assert from 'node:assert/strict';
import { costModel } from '../src/model.mjs';
import { DEFAULT_PLAN, PRESETS, validatePlan, analyzePlan, adoptionForecast, costBreakdown, terrainFromCsv, reportJson, importPlan, forecastCsv } from '../src/planner.mjs';
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

test('itemized costs add to the lifecycle total without omitting household power', () => {
  const c = costBreakdown(); near(c.items.reduce((sum, x) => sum + x.total, 0), c.total);
  near(c.items.filter(x => x.payer === 'household').reduce((s, x) => s + x.total, 0), 240 * c.customerPower);
});
test('full-adoption monthly cohort accounting reproduces the original five-year baseline', () => {
  const a = adoptionForecast(), c = costModel();
  near(a.providerTotal + a.homePowerTotal, c.total); near(a.costPerSubscriberMonth * 60, c.totalPerCustomer);
  near(a.subscriberMonths, 14400); assert.equal(a.rows.length, 60); assert.ok(a.fundingRequirement > a.initialShared);
});
test('short hardware lifetime costs are consistent across cohort and constant-adoption models', () => {
  const input = { hardwareLifeYears: 2.5, salesTaxFraction: .08, developmentBudget: 300000 };
  const a = adoptionForecast(input), c = costModel(input);
  near(a.providerTotal + a.homePowerTotal, c.total);
  assert.ok(a.rows[30].replacements > a.rows[29].replacements);
});
test('ramp keeps shared costs and compares active subscriber months, not phantom years of service', () => {
  const r = analyzePlan({ startFraction: .25, rampMonths: 24 });
  assert.ok(r.adoption.subscriberMonths < 14400); assert.equal(r.adoption.finalSubscribers, 240);
  assert.ok(r.matchedSubscriberMonthRatio > r.fullAdoptionRatio);
  assert.ok(r.adoption.finalBalance < analyzePlan().adoption.finalBalance);
});
test('zero revenue has no invented break-even month', () => {
  const a = adoptionForecast({ monthlyPrice: 0 }); assert.equal(a.recoveryMonth, null); assert.ok(a.finalBalance < 0);
});
test('opening from zero never silently creates customers at month zero', () => {
  const a = adoptionForecast({ startFraction: 0, rampMonths: 12 });
  assert.equal(a.rows[0].active, 0); assert.equal(a.rows[12].active, 240);
});
test('sparse preset reproduces the design memo, not the favorable community cost', () => {
  const { title, sectors, ...cost } = PRESETS.sparse;
  near(costModel(cost).totalPerCustomer, 5695.313333333334);
  assert.ok(analyzePlan({ ...DEFAULT_PLAN, ...PRESETS.sparse }).fullAdoptionRatio > 1);
});
test('oversubscribed and single-carrier-limited designs fail distinct gates', () => {
  assert.equal(analyzePlan({ subscribers: 480 }).gates.aggregateAccess, false);
  assert.equal(analyzePlan({ gatewayDownMbps: 500 }).gates.singleCarrierCapacity, false);
});
test('wider planner channels also widen the radio thermal-noise budget', () => {
  assert.ok(analyzePlan({ bandwidthMHz: 60 }).radio.upSnrDb < analyzePlan().radio.upSnrDb);
});
test('no favorable estimate becomes field proof or physical authorization', () => {
  const r = analyzePlan({ subscribers: 10000, sectors: 240, sharedCapex: 0, monthlyBackhaul: 0, annualStaff: 0 });
  assert.equal(r.gates.fieldServiceEquivalence, false); assert.equal(r.gates.provenQuarterCost, false);
  assert.equal(r.gates.physicalMovementAuthorized, false);
});
test('terrain CSV rejects malformed, unsorted, oversized and out-of-path samples', () => {
  for (const csv of ['x,y\n1,0', 'distance_m,obstruction_m\n1,<img>', 'distance_m,obstruction_m\n3,0\n2,0', 'distance_m,obstruction_m\n5001,0', 'distance_m,obstruction_m\n2,-1']) assert.throws(() => terrainFromCsv(csv, 5));
  assert.throws(() => terrainFromCsv('a'.repeat(32001), 5));
});
test('empty terrain is unknown and a sampled obstruction fails', () => {
  assert.equal(analyzePlan({ terrainCsv: '' }).gates.sampledPathClearance, null);
  assert.equal(analyzePlan({ terrainCsv: 'distance_m,obstruction_m\n2500,20' }).gates.sampledPathClearance, false);
});
test('malicious or physically nonsensical plan values are rejected', () => {
  for (const input of [{ title: '<script>' }, { sectors: 1.5 }, { subscribers: 0 }, { annualFailureRate: 2 }, { startFraction: .25, rampMonths: 0 }, { hardwareLifeYears: 0 }, { unknown: 1 }, { years: 5.01 }, { distanceKm: Infinity }, { monthlyBackhaul: Number.MAX_VALUE }, { combinedBitsPerHz: 2000 }]) assert.throws(() => validatePlan(input));
});
test('saved report round-trips the parameters; imported claims are ignored', () => {
  const r = analyzePlan({ title: 'Named plan', startFraction: .5, rampMonths: 12 });
  const saved = JSON.parse(reportJson(r)); saved.gates.provenQuarterCost = true;
  const imported = importPlan(JSON.stringify(saved)); assert.deepEqual(imported, r.parameters);
  assert.equal(analyzePlan(imported).gates.provenQuarterCost, false);
});
test('large but supported terrain reports can be re-imported', () => {
  const terrainCsv = 'distance_m,obstruction_m\n' + Array.from({ length: 501 }, (_, i) => `${i * 10},0`).join('\n');
  const r = analyzePlan({ terrainCsv }); assert.deepEqual(importPlan(reportJson(r)), r.parameters);
});
test('import rejects foreign schemas, extra input fields and prototype properties', () => {
  assert.throws(() => importPlan('{"schema":"other"}'));
  assert.throws(() => importPlan('{"schema":"auren-plan-v1","parameters":{"__proto__":{"polluted":true}}}'));
  assert.equal({}.polluted, undefined);
});
test('CSV exports numerical monthly rows without spreadsheet formulas from a scenario title', () => {
  const csv = forecastCsv(analyzePlan({ title: '=HYPERLINK(bad)' }));
  assert.equal(csv.trim().split('\n').length, 61); assert.ok(!csv.includes('HYPERLINK'));
});
