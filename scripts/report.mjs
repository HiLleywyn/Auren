import { linkBudget, rainLoss, capacity, batteryKwh, costModel, starlinkCost, costGate, breakEvenSubscribers } from '../src/model.mjs';
import { sampleNetwork, nMinusOne } from '../src/topology.mjs';

const cost = costModel();
const cap = capacity();
const report = {
  project: 'Auren Broadband', version: '0.1.0', classification: 'calculated-from-estimates', fieldValidated: false,
  link: linkBudget(), rain: rainLoss(), capacity: cap, twelveHourBatteryKwh: batteryKwh(),
  costs: { community: cost, sparse: costModel({ subscribers: 24, sharedCapex: 18000, permits: 1500,
    monthlyBackhaul: 1000, annualSites: 1200, annualStaff: 4000, annualMaintenance: 1500, financing: 4000 }) },
  starlinkReference: { date: '2026-10-14', upfrontAssumedZero: true, fiveYear100Mbps: starlinkCost() },
  costGate: costGate({ cost: cost.totalPerCustomer, comparator: starlinkCost(), serviceEquivalent: false, capacityQualified: cap.qualified }),
  breakEvenAt30Dollars: breakEvenSubscribers({ fixed: cost.fixed, perCustomer: cost.perCustomer - cost.customerPower, monthlyPrice: 30 }),
  syntheticResilience: nMinusOne(sampleNetwork()),
  warning: 'Not a quote, field result, certification, guaranteed broadband service or physical controller.'
};
console.log(JSON.stringify(report, null, 2));
