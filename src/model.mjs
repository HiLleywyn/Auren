/** Pure planning calculations. No measured Auren performance is implied. */
export function number(value, name, { min = 0, max = Number.MAX_VALUE, positive = false } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (positive && value === 0)) {
    throw new RangeError(`${name} must be a finite number ${positive ? 'greater than' : 'at least'} ${min} and at most ${max}`);
  }
  return value;
}

export function fsplDb(frequencyGHz, distanceKm) {
  number(frequencyGHz, 'frequencyGHz', { positive: true });
  number(distanceKm, 'distanceKm', { positive: true });
  return 92.45 + 20 * Math.log10(frequencyGHz) + 20 * Math.log10(distanceKm);
}

export function noiseDbm(bandwidthMHz, noiseFigureDb) {
  number(bandwidthMHz, 'bandwidthMHz', { positive: true });
  number(noiseFigureDb, 'noiseFigureDb');
  return -174 + 10 * Math.log10(bandwidthMHz * 1e6) + noiseFigureDb;
}

export function linkBudget({ frequencyGHz = 5.8, distanceKm = 5, bandwidthMHz = 30, noiseFigureDb = 6,
  hubEirpDbm = 36, customerEirpDbm = 36, hubGainDbi = 19, customerGainDbi = 23,
  additionalLossDb = 2, requiredSnrDb = 18, reservedFadeDb = 6 } = {}) {
  for (const [k, v] of Object.entries({ hubEirpDbm, customerEirpDbm, hubGainDbi, customerGainDbi, additionalLossDb, requiredSnrDb, reservedFadeDb })) number(v, k);
  const pathLossDb = fsplDb(frequencyGHz, distanceKm);
  const noise = noiseDbm(bandwidthMHz, noiseFigureDb);
  const downRxDbm = hubEirpDbm + customerGainDbi - pathLossDb - additionalLossDb;
  const upRxDbm = customerEirpDbm + hubGainDbi - pathLossDb - additionalLossDb;
  const downSnrDb = downRxDbm - noise;
  const upSnrDb = upRxDbm - noise;
  return { classification: 'calculated', pathLossDb, noiseDbm: noise, downRxDbm, upRxDbm, downSnrDb, upSnrDb,
    downMarginDb: downSnrDb - requiredSnrDb - reservedFadeDb,
    upMarginDb: upSnrDb - requiredSnrDb - reservedFadeDb,
    customerConductedDbm: customerEirpDbm - customerGainDbi,
    hubConductedDbm: hubEirpDbm - hubGainDbi,
    qualified: Math.min(downSnrDb, upSnrDb) >= requiredSnrDb + reservedFadeDb,
    warning: 'Clear LOS calculation; not a regulatory approval, throughput measurement, or foliage model.' };
}

export function pathClearance({ distanceKm, hubHeightM, customerHeightM, frequencyGHz = 5.8,
  terrain = [], effectiveEarthFactor = 4 / 3, fresnelFraction = 0.6 }) {
  number(distanceKm, 'distanceKm', { positive: true });
  number(hubHeightM, 'hubHeightM'); number(customerHeightM, 'customerHeightM');
  number(frequencyGHz, 'frequencyGHz', { positive: true });
  number(effectiveEarthFactor, 'effectiveEarthFactor', { positive: true });
  number(fresnelFraction, 'fresnelFraction', { max: 1 });
  const distanceM = distanceKm * 1000;
  if (!Array.isArray(terrain)) throw new TypeError('terrain must be an array');
  const samples = terrain.map(point => {
    const x = number(point.distanceM, 'terrain.distanceM', { max: distanceM });
    const elevation = number(point.obstructionM, 'terrain.obstructionM');
    const lineM = hubHeightM + (customerHeightM - hubHeightM) * x / distanceM;
    const fresnelM = Math.sqrt((0.299792458 / frequencyGHz) * x * (distanceM - x) / distanceM);
    const bulgeM = x * (distanceM - x) / (2 * 6371000 * effectiveEarthFactor);
    return { distanceM: x, lineM, fresnelM, bulgeM, obstructionM: elevation,
      clearanceM: lineM - elevation - bulgeM - fresnelFraction * fresnelM };
  });
  return { classification: 'calculated', samples,
    minimumClearanceM: samples.length ? Math.min(...samples.map(x => x.clearanceM)) : null,
    qualified: samples.length ? samples.every(x => x.clearanceM >= 0) : null,
    warning: 'Obstructions are above the straight endpoint ground datum, not above local terrain. Empty samples mean unknown, not clear.' };
}

// ITU-R P.838-3 tables 1-4. Frequency in GHz, rain in mm/hour.
const fit = (f, a, b, c, m, d) => a.reduce((sum, x, i) => sum + x * Math.exp(-Math.pow((Math.log10(f) - b[i]) / c[i], 2)), m * Math.log10(f) + d);
export function rainLoss({ frequencyGHz = 5.8, rainMmHour = 50, distanceKm = 5, polarization = 'horizontal' } = {}) {
  number(frequencyGHz, 'frequencyGHz', { min: 1, max: 1000 });
  number(rainMmHour, 'rainMmHour'); number(distanceKm, 'distanceKm');
  if (!['horizontal', 'vertical'].includes(polarization)) throw new RangeError('Unknown polarization');
  const h = polarization === 'horizontal';
  const k = 10 ** (h
    ? fit(frequencyGHz, [-5.33980, -.35351, -.23789, -.94158], [-.10008, 1.26970, .86036, .64552], [1.13098, .454, .15354, .16817], -.18961, .71147)
    : fit(frequencyGHz, [-3.80595, -3.44965, -.39902, .50167], [.56934, -.22911, .73042, 1.07319], [.81061, .51059, .11899, .27195], -.16398, .63297));
  const alpha = h
    ? fit(frequencyGHz, [-.14318, .29591, .32177, -5.37610, 16.1721], [1.82442, .77564, .63773, -.9623, -3.2998], [-.55187, .19822, .13164, 1.47828, 3.43990], .67849, -1.95537)
    : fit(frequencyGHz, [-.07771, .56727, -.20238, -48.2991, 48.5833], [2.3384, .95545, 1.1452, .791669, .791459], [-.76284, .54039, .26809, .116226, .116479], -.053739, .83433);
  return { classification: 'calculated', k, alpha, dbPerKm: k * rainMmHour ** alpha,
    attenuationDb: k * rainMmHour ** alpha * distanceKm,
    warning: 'Uniform rain over full horizontal path. Not an annual availability prediction.' };
}

export function capacity({ bandwidthMHz = 30, combinedBitsPerHz = 9, payloadEfficiency = .65,
  downFraction = .75, sectors = 12, reuseFactor = .8, subscribers = 240,
  busyDownMbps = 4, busyUpMbps = .8, peakDownMbps = 100, headroom = .2 } = {}) {
  for (const [k, v] of Object.entries({ bandwidthMHz, combinedBitsPerHz, sectors, subscribers, busyDownMbps, busyUpMbps, peakDownMbps })) number(v, k, { positive: true });
  for (const [k, v] of Object.entries({ payloadEfficiency, downFraction, reuseFactor })) number(v, k, { positive: true, max: 1 });
  number(headroom, 'headroom', { max: .99 });
  const aggregatePerSectorMbps = bandwidthMHz * combinedBitsPerHz * payloadEfficiency;
  const downPerSectorMbps = aggregatePerSectorMbps * downFraction;
  const upPerSectorMbps = aggregatePerSectorMbps * (1 - downFraction);
  const downMbps = downPerSectorMbps * sectors * reuseFactor;
  const upMbps = upPerSectorMbps * sectors * reuseFactor;
  const demandDownMbps = subscribers * busyDownMbps;
  const demandUpMbps = subscribers * busyUpMbps;
  return { classification: 'calculated', aggregatePerSectorMbps, downPerSectorMbps, upPerSectorMbps,
    downMbps, upMbps, demandDownMbps, demandUpMbps,
    downUtilization: demandDownMbps / downMbps, upUtilization: upMbps ? demandUpMbps / upMbps : Infinity,
    peakOversubscription: subscribers * peakDownMbps / downMbps,
    qualified: demandDownMbps <= downMbps * (1 - headroom) && demandUpMbps <= upMbps * (1 - headroom),
    warning: 'Estimated PHY efficiency and spatial reuse; aggregate does not prove per-sector placement or upstream capacity.' };
}

export function batteryKwh({ watts = 75, hours = 12, usableFraction = .8, conversionEfficiency = .9 } = {}) {
  number(watts, 'watts'); number(hours, 'hours');
  number(usableFraction, 'usableFraction', { positive: true, max: 1 });
  number(conversionEfficiency, 'conversionEfficiency', { positive: true, max: 1 });
  return watts * hours / 1000 / usableFraction / conversionEfficiency;
}

export const COMMUNITY = Object.freeze({ subscribers: 240, years: 5, sharedCapex: 30000, permits: 2000,
  monthlyBackhaul: 700, annualSites: 720, annualSitePower: 300, annualStaff: 7500,
  annualMaintenance: 2000, annualInsurance: 600, annualSystems: 100, financing: 6000,
  customerEquipment: 250, customerInstall: 100, annualFailureRate: .04, monthlySupport: 2,
  customerWatts: 14, electricityKwh: .15, hardwareLifeYears: 5,
  developmentBudget: 0, developmentSubscribers: 10000, salesTaxFraction: 0 });

export function costModel(overrides = {}) {
  const p = { ...COMMUNITY, ...overrides };
  for (const [k, v] of Object.entries(p)) number(v, k);
  for (const k of ['subscribers', 'years', 'hardwareLifeYears', 'developmentSubscribers']) number(p[k], k, { positive: true });
  number(p.annualFailureRate, 'annualFailureRate', { max: 1 });
  number(p.salesTaxFraction, 'salesTaxFraction', { max: 1 });
  const annualFixed = p.annualSites + p.annualSitePower + p.annualStaff + p.annualMaintenance + p.annualInsurance + p.annualSystems;
  const sharedTax = p.sharedCapex * p.salesTaxFraction;
  const fixed = p.sharedCapex + sharedTax + p.permits + p.monthlyBackhaul * 12 * p.years + annualFixed * p.years + p.financing;
  const scheduledReplacements = Math.max(0, Math.ceil(p.years / p.hardwareLifeYears) - 1);
  const customerReplacements = p.customerEquipment * (scheduledReplacements + p.annualFailureRate * p.years);
  const customerPower = p.customerWatts / 1000 * 8760 * p.years * p.electricityKwh;
  const perCustomer = p.customerEquipment * (1 + p.salesTaxFraction) + p.customerInstall + customerReplacements + p.monthlySupport * 12 * p.years + customerPower;
  const developmentPerCustomer = p.developmentBudget / p.developmentSubscribers;
  const total = fixed + p.subscribers * (perCustomer + developmentPerCustomer);
  return { classification: 'estimated-inputs-calculated-total', parameters: p, fixed, perCustomer, customerPower,
    customerReplacements, scheduledReplacements, developmentPerCustomer, total, totalPerCustomer: total / p.subscribers,
    providerMonthlyFloor: (total / p.subscribers - customerPower) / (12 * p.years),
    warning: 'Not a quotation. Immediate constant adoption; zero tax unless set; replacements are a budgeting convention. Capacity must be checked separately.' };
}

export function starlinkCost({ monthly = 55, upfront = 0, watts = 42.5, electricityKwh = .15, years = 5 } = {}) {
  for (const [k, v] of Object.entries({ monthly, upfront, watts, electricityKwh, years })) number(v, k);
  return monthly * 12 * years + upfront + watts / 1000 * 8760 * years * electricityKwh;
}

export function breakEvenSubscribers({ fixed, perCustomer, monthlyPrice, years = 5 }) {
  for (const [k, v] of Object.entries({ fixed, perCustomer, monthlyPrice, years })) number(v, k);
  const contribution = monthlyPrice * 12 * years - perCustomer;
  return contribution > 0 ? Math.ceil(fixed / contribution) : null;
}

export function costGate({ cost, comparator, serviceEquivalent, capacityQualified }) {
  number(cost, 'cost'); number(comparator, 'comparator', { positive: true });
  const ratio = cost / comparator;
  return { ratio, numericalQuarterTarget: ratio <= .25,
    validComparison: serviceEquivalent === true && capacityQualified === true,
    achieved: ratio <= .25 && serviceEquivalent === true && capacityQualified === true,
    label: 'Calculated cost gate; field evidence is additionally required before marketing a proven advantage.' };
}
