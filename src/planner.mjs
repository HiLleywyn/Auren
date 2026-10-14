/** Reproducible planning tools. Inputs are estimates, never field evidence. */
import { COMMUNITY, number, capacity, costModel, starlinkCost, pathClearance, linkBudget, rainLoss } from './model.mjs';

export const PLANNER_VERSION = '0.2.0';
export const PRESETS = Object.freeze({
  community: { title: 'Clustered community', subscribers: 240, sectors: 12, sharedCapex: 30000, permits: 2000,
    monthlyBackhaul: 700, annualSites: 720, annualStaff: 7500, annualMaintenance: 2000, financing: 6000 },
  starter: { title: '60-home starter', subscribers: 60, sectors: 3, sharedCapex: 18000, permits: 1500,
    monthlyBackhaul: 700, annualSites: 1200, annualStaff: 4000, annualMaintenance: 1500, financing: 4000 },
  sparse: { title: 'Sparse rural', subscribers: 24, sectors: 3, sharedCapex: 18000, permits: 1500,
    monthlyBackhaul: 1000, annualSites: 1200, annualStaff: 4000, annualMaintenance: 1500, financing: 4000 }
});
export const DEFAULT_PLAN = Object.freeze({
  ...COMMUNITY, title: 'Clustered community', sectors: 12, bandwidthMHz: 30, combinedBitsPerHz: 9,
  busyDownMbps: 4, busyUpMbps: .8, gatewayDownMbps: 2000, gatewayUpMbps: 2000,
  monthlyPrice: 30, startFraction: 1, rampMonths: 0, comparatorMonthly: 55,
  distanceKm: 5, hubHeightM: 30, customerHeightM: 6, rainMmHour: 0,
  terrainCsv: 'distance_m,obstruction_m\n500,0\n1000,0\n1500,0\n2000,0\n2500,0\n3000,0\n3500,0\n4000,0\n4500,0'
});

export function validatePlan(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Plan must be an object');
  const unknown = Object.keys(input).filter(key => !Object.hasOwn(DEFAULT_PLAN, key));
  if (unknown.length) throw new RangeError(`Unknown plan fields: ${unknown.join(', ')}`);
  const p = { ...DEFAULT_PLAN, ...input };
  if (typeof p.title !== 'string' || p.title.length > 80 || /[\u0000-\u001f<>]/.test(p.title)) throw new RangeError('Use a plain-text title, at most 80 characters');
  if (typeof p.terrainCsv !== 'string' || p.terrainCsv.length > 32000) throw new RangeError('Terrain CSV is limited to 32,000 characters');
  for (const [key, value] of Object.entries(p)) if (!['title', 'terrainCsv'].includes(key)) number(value, key, { max: 1e9 });
  for (const key of ['subscribers', 'sectors', 'rampMonths']) if (!Number.isInteger(p[key])) throw new RangeError(`${key} must be an integer`);
  number(p.subscribers, 'subscribers', { positive: true, max: 10000 });
  number(p.sectors, 'sectors', { positive: true, max: 240 });
  number(p.startFraction, 'startFraction', { max: 1 });
  number(p.years, 'years', { positive: true, max: 10 });
  number(p.hardwareLifeYears, 'hardwareLifeYears', { positive: true, max: 20 });
  for (const key of ['years', 'hardwareLifeYears']) if (Math.abs(p[key] * 12 - Math.round(p[key] * 12)) > 1e-8) throw new RangeError(`${key} must be a whole number of months`);
  number(p.rampMonths, 'rampMonths', { max: p.years * 12 });
  number(p.distanceKm, 'distanceKm', { positive: true, max: 100 });
  number(p.hubHeightM, 'hubHeightM', { max: 120 });
  number(p.customerHeightM, 'customerHeightM', { max: 100 });
  number(p.rainMmHour, 'rainMmHour', { max: 300 });
  for (const key of ['bandwidthMHz', 'combinedBitsPerHz', 'busyDownMbps', 'busyUpMbps', 'gatewayDownMbps', 'gatewayUpMbps', 'developmentSubscribers']) number(p[key], key, { positive: true });
  number(p.bandwidthMHz, 'bandwidthMHz', { positive: true, max: 160 });
  number(p.combinedBitsPerHz, 'combinedBitsPerHz', { positive: true, max: 20 });
  for (const key of ['busyDownMbps', 'busyUpMbps']) number(p[key], key, { positive: true, max: 1000 });
  for (const key of ['gatewayDownMbps', 'gatewayUpMbps']) number(p[key], key, { positive: true, max: 1000000 });
  number(p.annualFailureRate, 'annualFailureRate', { max: 1 });
  number(p.salesTaxFraction, 'salesTaxFraction', { max: 1 });
  if (p.startFraction < 1 && p.rampMonths === 0) throw new RangeError('A partial starting population needs a nonzero adoption ramp');
  return p;
}

export function terrainFromCsv(csv, distanceKm) {
  if (typeof csv !== 'string' || csv.length > 32000) throw new RangeError('Terrain CSV exceeds the size limit');
  number(distanceKm, 'distanceKm', { positive: true });
  const rows = csv.trim() ? csv.trim().split(/\r?\n/) : [];
  if (!rows.length) return [];
  if (rows[0].replace(/\s/g, '') !== 'distance_m,obstruction_m') throw new RangeError('CSV header must be distance_m,obstruction_m');
  if (rows.length > 502) throw new RangeError('At most 501 terrain points are supported');
  let previous = -1;
  return rows.slice(1).filter(row => row.trim()).map((row, index) => {
    const fields = row.split(',').map(x => x.trim());
    if (fields.length !== 2 || fields.some(x => !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(x))) throw new RangeError(`CSV row ${index + 2}: two nonnegative numbers required`);
    const distanceM = Number(fields[0]), obstructionM = Number(fields[1]);
    number(distanceM, 'terrain distance', { max: distanceKm * 1000 });
    number(obstructionM, 'terrain obstruction', { max: 10000 });
    if (distanceM <= previous) throw new RangeError('Terrain distances must strictly increase');
    previous = distanceM;
    return { distanceM, obstructionM };
  });
}

export function costBreakdown(input = {}) {
  const c = costModel(input), p = c.parameters, n = p.subscribers;
  const items = [
    ['Shared equipment + initial equipment tax', p.sharedCapex * (1 + p.salesTaxFraction), 'provider'],
    ['Permits / compliance', p.permits, 'provider'],
    ['Terrestrial upstream', p.monthlyBackhaul * 12 * p.years, 'provider'],
    ['Sites', p.annualSites * p.years, 'provider'],
    ['Shared power', p.annualSitePower * p.years, 'provider'],
    ['Paid operations', p.annualStaff * p.years, 'provider'],
    ['Shared maintenance', p.annualMaintenance * p.years, 'provider'],
    ['Insurance', p.annualInsurance * p.years, 'provider'],
    ['Monitoring / admin', p.annualSystems * p.years, 'provider'],
    ['Financing allowance', p.financing, 'provider'],
    ['Home equipment + initial equipment tax', n * p.customerEquipment * (1 + p.salesTaxFraction), 'provider'],
    ['Home installation', n * p.customerInstall, 'provider'],
    ['Home scheduled / failure replacements', n * c.customerReplacements, 'provider'],
    ['Customer support', n * p.monthlySupport * 12 * p.years, 'provider'],
    ['Home electricity', n * c.customerPower, 'household'],
    ['Allocated development', n * c.developmentPerCustomer, 'provider']
  ].map(([label, total, payer]) => ({ label, total, perCustomer: total / n, payer }));
  return { ...c, items };
}

/** Monthly cohort forecast; no churn, collections, inflation or loan amortization model. */
export function adoptionForecast(input = {}) {
  const p = validatePlan(input), months = Math.round(p.years * 12), lifeMonths = Math.round(p.hardwareLifeYears * 12);
  const costKeys = Object.keys(COMMUNITY), c = costModel(Object.fromEntries(costKeys.map(k => [k, p[k]])));
  const annualFixed = p.annualSites + p.annualSitePower + p.annualStaff + p.annualMaintenance + p.annualInsurance + p.annualSystems;
  const initialShared = p.sharedCapex * (1 + p.salesTaxFraction) + p.permits + p.financing;
  const cohorts = [], rows = [];
  let active = 0, cumulative = -initialShared, providerTotal = initialShared, revenueTotal = 0, subscriberMonths = 0, homePowerTotal = 0, fundingRequirement = initialShared;
  for (let m = 0; m < months; m++) {
    const desired = p.subscribers * (p.startFraction + (1 - p.startFraction) * Math.min(1, m / (p.rampMonths || 1)));
    const joined = Math.max(0, desired - active);
    if (joined > 0) cohorts.push({ month: m, count: joined });
    active += joined;
    const replaced = cohorts.filter(x => m > x.month && (m - x.month) % lifeMonths === 0).reduce((sum, x) => sum + x.count, 0);
    const fixed = p.monthlyBackhaul + annualFixed / 12;
    const acquisitions = joined * (p.customerEquipment * (1 + p.salesTaxFraction) + p.customerInstall + c.developmentPerCustomer);
    const replacements = replaced * p.customerEquipment + active * p.annualFailureRate / 12 * p.customerEquipment;
    const support = active * p.monthlySupport;
    const cost = fixed + acquisitions + replacements + support;
    const revenue = active * p.monthlyPrice;
    const homePower = active * p.customerWatts / 1000 * 730 * p.electricityKwh;
    fundingRequirement = Math.max(fundingRequirement, -cumulative + cost);
    cumulative += revenue - cost; providerTotal += cost; revenueTotal += revenue; subscriberMonths += active; homePowerTotal += homePower;
    rows.push({ month: m + 1, active, joined, replacements, cost, revenue, homePower, cumulative });
  }
  const recoveredAt = rows.find((row, index) => row.cumulative >= 0 && rows.slice(index).every(x => x.cumulative >= 0));
  return { classification: 'estimated-cohort-forecast', rows, initialShared, providerTotal, revenueTotal,
    homePowerTotal, subscriberMonths, finalSubscribers: active, meanSubscribers: subscriberMonths / months,
    fundingRequirement,
    recoveryMonth: recoveredAt?.month ?? null, finalBalance: cumulative,
    costPerSubscriberMonth: subscriberMonths ? (providerTotal + homePowerTotal) / subscriberMonths : null,
    warning: 'Expected fractional cohorts. Joining occurs at month start; ramp reaches target at rampMonths. No churn, bad debt, income tax, inflation, carrier construction or loan schedule. Financing is an explicit allowance, not interest amortization.' };
}

export function analyzePlan(input = {}) {
  const p = validatePlan(input);
  const costInput = Object.fromEntries(Object.keys(COMMUNITY).map(k => [k, p[k]]));
  const cost = costBreakdown(costInput), adoption = adoptionForecast(p);
  const access = capacity({ subscribers: p.subscribers, sectors: p.sectors, bandwidthMHz: p.bandwidthMHz,
    combinedBitsPerHz: p.combinedBitsPerHz, busyDownMbps: p.busyDownMbps, busyUpMbps: p.busyUpMbps });
  const carrierQualified = access.demandDownMbps <= p.gatewayDownMbps * .8 && access.demandUpMbps <= p.gatewayUpMbps * .8;
  const terrain = terrainFromCsv(p.terrainCsv, p.distanceKm);
  const clearance = pathClearance({ distanceKm: p.distanceKm, hubHeightM: p.hubHeightM, customerHeightM: p.customerHeightM, terrain });
  const rain = rainLoss({ distanceKm: p.distanceKm, rainMmHour: p.rainMmHour });
  const radio = linkBudget({ distanceKm: p.distanceKm, bandwidthMHz: p.bandwidthMHz, additionalLossDb: 2 + rain.attenuationDb });
  const comparator = starlinkCost({ monthly: p.comparatorMonthly, electricityKwh: p.electricityKwh, years: p.years });
  const fullAdoptionRatio = cost.totalPerCustomer / comparator;
  const equivalentMonthsCost = adoption.costPerSubscriberMonth === null ? null : adoption.costPerSubscriberMonth * p.years * 12;
  const referencePerMonth = comparator / (p.years * 12);
  return { version: PLANNER_VERSION, classification: 'planning-estimates-not-field-results', parameters: p,
    cost, adoption, access, carrierQualified, clearance, rain, radio, comparator, fullAdoptionRatio, equivalentMonthsCost,
    matchedSubscriberMonthRatio: adoption.costPerSubscriberMonth === null ? null : adoption.costPerSubscriberMonth / referencePerMonth,
    gates: { aggregateAccess: access.qualified, singleCarrierCapacity: carrierQualified,
      sampledPathClearance: clearance.qualified, bidirectionalRadio: radio.qualified,
      numericalQuarterCost: fullAdoptionRatio <= .25, fieldServiceEquivalence: false,
      provenQuarterCost: false, physicalMovementAuthorized: false },
    limitations: ['No measured Auren results.', 'Cost comparison is not Starlink internal provider cost.',
      'Terrain points do not establish unsampled clearance or legal spectrum access.',
      'Carrier capacities assume physical route diversity; no carrier quotations exist.',
      'Average subscriber-month accounting does not promise continuous five-year service to late joiners.',
      'Aggregate access does not prove sector placement, RF reuse or a real N−1 topology.',
      'Mast settings are analytical inputs, not structurally approved heights.'] };
}

export function reportJson(result) {
  return JSON.stringify({ product: 'Auren', schema: 'auren-plan-v1', ...result }, null, 2);
}
export function importPlan(json) {
  if (typeof json !== 'string' || json.length > 512000) throw new RangeError('Plan JSON is limited to 512 KB');
  const parsed = JSON.parse(json);
  if (!parsed || parsed.schema !== 'auren-plan-v1') throw new RangeError('Not an Auren plan-v1 report');
  return validatePlan(parsed.parameters);
}
export function forecastCsv(result) {
  const header = 'month,active_subscribers,joined_subscribers,provider_cost_usd,revenue_usd,home_power_usd,cumulative_provider_balance_usd';
  return [header, ...result.adoption.rows.map(r => [r.month, r.active, r.joined, r.cost, r.revenue, r.homePower, r.cumulative].map(n => Number(n.toFixed(4))).join(','))].join('\n') + '\n';
}
