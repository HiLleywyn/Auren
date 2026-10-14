import test from 'node:test';
import assert from 'node:assert/strict';
import { fsplDb, linkBudget, noiseDbm, pathClearance, rainLoss, capacity, batteryKwh, costModel, starlinkCost, costGate, breakEvenSubscribers } from '../src/model.mjs';
const near = (actual, expected, tolerance = .01) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test('5 km bidirectional budget reproduces reference and respects customer conducted power', () => {
  const b = linkBudget(); near(b.pathLossDb, 121.698); near(b.downRxDbm, -64.698); near(b.upRxDbm, -68.698);
  near(b.noiseDbm, -93.229); assert.equal(b.customerConductedDbm, 13); assert.equal(b.hubConductedDbm, 17); assert.equal(b.qualified, true);
});
test('doubling distance costs approximately six dB', () => near(fsplDb(5.8, 10) - fsplDb(5.8, 5), 6.0206));
test('uplink must qualify, even if the downlink is strong', () => assert.equal(linkBudget({ customerEirpDbm: 20 }).qualified, false));
test('wide bandwidth increases thermal noise', () => near(noiseDbm(60, 6) - noiseDbm(30, 6), 3.0103));
test('unsurveyed terrain is unknown, never silently clear', () => assert.equal(pathClearance({ distanceKm: 5, hubHeightM: 30, customerHeightM: 6 }).qualified, null));
test('trees and customer-proximate obstructions fail qualification', () => {
  const b = pathClearance({ distanceKm: 5, hubHeightM: 30, customerHeightM: 6, terrain: [{ distanceM: 2500, obstructionM: 20 }] });
  assert.equal(b.qualified, false); near(b.samples[0].bulgeM, .3679); assert.ok(b.samples[0].fresnelM > 8);
  assert.equal(pathClearance({ distanceKm: 5, hubHeightM: 60, customerHeightM: 6, terrain: [{ distanceM: 4500, obstructionM: 20 }] }).qualified, false);
});
test('rain coefficients reproduce independently checked reference', () => {
  near(rainLoss().attenuationDb, 1.5472);
  near(rainLoss({ polarization: 'vertical' }).attenuationDb, .98787);
  near(rainLoss({ rainMmHour: 100 }).attenuationDb, 4.73649);
  assert.equal(rainLoss({ rainMmHour: 0 }).attenuationDb, 0);
});
test('reference capacity preserves headroom but does not imply simultaneous peak speeds', () => {
  const c = capacity(); near(c.downPerSectorMbps, 131.625); near(c.downMbps, 1263.6);
  assert.equal(c.qualified, true); assert.ok(c.peakOversubscription > 18);
  assert.equal(capacity({ combinedBitsPerHz: 4.5 }).qualified, false);
  assert.equal(capacity({ subscribers: 482 }).qualified, false);
});
test('battery budget includes depth of discharge and conversion losses', () => { near(batteryKwh(), 1.25); near(batteryKwh({ hours: 72 }), 7.5); });
test('five-year baseline reproduces cost memo', () => {
  const c = costModel(); near(c.fixed, 136100); near(c.total, 282975.2); near(c.totalPerCustomer, 1179.06333);
  near(c.customerPower, 91.98); near(c.providerMonthlyFloor, 18.11805);
});
test('lifetime, tax, development and backhaul are not hidden', () => {
  const baseline = costModel(); near(costModel({ hardwareLifeYears: 2.5 }).totalPerCustomer - baseline.totalPerCustomer, 250);
  near(costModel({ monthlyBackhaul: 2000 }).totalPerCustomer - baseline.totalPerCustomer, 325);
  near(costModel({ developmentBudget: 300000, developmentSubscribers: 240 }).developmentPerCustomer, 1250);
  assert.ok(costModel({ salesTaxFraction: .1 }).total > baseline.total);
});
test('replacement exactly at the end of the accounting period is not charged', () => assert.equal(costModel({ hardwareLifeYears: 5 }).scheduledReplacements, 0));
test('quarter-cost gate cannot pass without equivalent service and capacity', () => {
  near(starlinkCost(), 3579.225);
  assert.equal(costGate({ cost: 805, comparator: starlinkCost(), serviceEquivalent: false, capacityQualified: true }).achieved, false);
  assert.equal(costGate({ cost: 805, comparator: starlinkCost(), serviceEquivalent: true, capacityQualified: false }).achieved, false);
  assert.equal(costGate({ cost: 805, comparator: starlinkCost(), serviceEquivalent: true, capacityQualified: true }).achieved, true);
});
test('provider break-even excludes customer-paid electricity, with explicit no-margin failure', () => {
  assert.equal(breakEvenSubscribers({ fixed: 136100, perCustomer: 520, monthlyPrice: 30 }), 107);
  assert.equal(breakEvenSubscribers({ fixed: 10000, perCustomer: 2000, monthlyPrice: 20 }), null);
});
test('invalid scientific inputs fail instead of producing plausible results', () => {
  for (const value of [NaN, Infinity, -1, 0]) assert.throws(() => fsplDb(5.8, value));
  assert.throws(() => capacity({ reuseFactor: 1.1 })); assert.throws(() => batteryKwh({ usableFraction: 0 }));
  assert.throws(() => costModel({ subscribers: 0 })); assert.throws(() => rainLoss({ frequencyGHz: .1 }));
});
