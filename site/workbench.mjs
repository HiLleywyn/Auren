import { DEFAULT_PLAN, PRESETS, analyzePlan, importPlan, reportJson, forecastCsv } from './src/planner.mjs';
const $ = id => document.getElementById(id);
const put = (id, value) => { $(id).textContent = value; };
const money = (n, digits = 0) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits }).format(n);
const form = $('plan-form'), controls = [...form.querySelectorAll('[name]')];
let plan = { ...DEFAULT_PLAN }, result = null;
const fractions = ['startFraction', 'annualFailureRate', 'salesTaxFraction'];

function populate() {
  for (const input of controls) input.value = fractions.includes(input.name) ? plan[input.name] * 100 : plan[input.name];
  $('plan-rd').value = plan.developmentBudget === 0 ? '0' : plan.developmentBudget === 300000 && plan.developmentSubscribers === 10000 ? '10000' : plan.developmentBudget === 300000 && plan.developmentSubscribers === plan.subscribers ? '240' : 'custom';
}
function readInputs() {
  const next = { ...plan };
  for (const input of controls) {
    const raw = input.type === 'number' ? input.value === '' ? NaN : Number(input.value) : input.value;
    next[input.name] = fractions.includes(input.name) ? raw / 100 : raw;
  }
  const rd = $('plan-rd').value;
  if (rd !== 'custom') {
    next.developmentBudget = rd === '0' ? 0 : 300000;
    next.developmentSubscribers = rd === '240' ? next.subscribers : Number(rd) || 10000;
  }
  return next;
}
function svg(tag, attrs = {}, content) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (content !== undefined) node.textContent = content;
  return node;
}
function drawCash(a) {
  const g = $('cash-drawing'); g.replaceChildren();
  const values = [-a.initialShared, ...a.rows.map(r => r.cumulative)], min = Math.min(0, ...values), max = Math.max(1, ...values);
  const x = i => 65 + i / (values.length - 1) * 565, y = v => 190 - (v - min) / (max - min) * 160;
  for (const v of [min, 0, max]) g.append(svg('line', { x1: 65, x2: 630, y1: y(v), y2: y(v), stroke: '#c5cec1', 'stroke-dasharray': v === 0 ? '' : '3 5' }), svg('text', { x: 57, y: y(v) + 4, 'text-anchor': 'end' }, `${Math.round(v / 1000)}k`));
  g.append(svg('polyline', { points: values.map((v, i) => `${x(i)},${y(v)}`).join(' '), fill: 'none', stroke: '#ae5527', 'stroke-width': 2.5 }));
  g.append(svg('text', { x: 65, y: 215 }, 'Opening'), svg('text', { x: 630, y: 215, 'text-anchor': 'end' }, `Month ${a.rows.length}`));
}
function drawTerrain(r) {
  const g = $('terrain-drawing'); g.replaceChildren();
  const p = r.parameters, samples = r.clearance.samples;
  const points = [{ distanceM: 0, lineM: p.hubHeightM, requiredM: p.hubHeightM, obstructionM: 0 }, ...samples.map(s => ({ ...s, requiredM: s.lineM - s.bulgeM - .6 * s.fresnelM })), { distanceM: p.distanceKm * 1000, lineM: p.customerHeightM, requiredM: p.customerHeightM, obstructionM: 0 }];
  const min = Math.min(0, ...points.map(s => s.requiredM)), max = Math.max(1, ...points.flatMap(s => [s.lineM, s.obstructionM]));
  const x = s => 55 + s.distanceM / (p.distanceKm * 1000) * 570, y = v => 192 - (v - min) / (max - min) * 145;
  for (const v of [min, max]) g.append(svg('line', { x1: 55, x2: 625, y1: y(v), y2: y(v), stroke: '#c5cec1' }), svg('text', { x: 47, y: y(v) + 4, 'text-anchor': 'end' }, `${v.toFixed(0)}m`));
  g.append(svg('polyline', { points: points.map(s => `${x(s)},${y(s.lineM)}`).join(' '), fill: 'none', stroke: '#173b47', 'stroke-width': 2 }));
  g.append(svg('polyline', { points: points.map(s => `${x(s)},${y(s.requiredM)}`).join(' '), fill: 'none', stroke: '#ae5527', 'stroke-dasharray': '5 4', 'stroke-width': 1.5 }));
  for (const s of samples) g.append(svg('line', { x1: x(s), x2: x(s), y1: y(0), y2: y(s.obstructionM), stroke: s.clearanceM < 0 ? '#a34126' : '#617f64', 'stroke-width': 3 }), svg('circle', { cx: x(s), cy: y(s.obstructionM), r: 3, fill: s.clearanceM < 0 ? '#a34126' : '#617f64' }));
  g.append(svg('text', { x: 55, y: 220 }, 'Hub / 0 km'), svg('text', { x: 625, y: 220, 'text-anchor': 'end' }, `Home / ${p.distanceKm} km`), svg('text', { x: 55, y: 23 }, 'Solid: sight line · dashed: required clearance envelope · points: supplied samples'));
}
function render(r) {
  const p = r.parameters, a = r.adoption;
  put('plan-total', money(r.cost.totalPerCustomer));
  put('plan-reference', `${p.years} years · ${(r.fullAdoptionRatio * 100).toFixed(1)}% of ${money(r.comparator)} Starlink reference. Service equivalence unproven.`);
  put('plan-funding', money(a.fundingRequirement));
  put('plan-recovery', a.recoveryMonth ? `Modeled sustained cash recovery: month ${a.recoveryMonth}.` : 'Shared + cohort costs do not recover within this horizon.');
  const gateLabels = [['Aggregate busy-hour access + 20% reserve', r.gates.aggregateAccess], ['Single surviving carrier capacity + reserve', r.gates.singleCarrierCapacity], ['Bidirectional radio margin + 6 dB reserve', r.gates.bidirectionalRadio], ['Entered terrain points clear 60% Fresnel', r.gates.sampledPathClearance], ['Full-adoption numerical quarter-cost target', r.gates.numericalQuarterCost], ['Field service equivalence established', null], ['Certified physical movement authorization', false]];
  $('plan-gates').replaceChildren(...gateLabels.map(([label, pass]) => {
    const li = document.createElement('li'), name = document.createElement('span'), status = document.createElement('strong');
    name.textContent = label; status.textContent = pass === null ? 'UNPROVEN' : pass ? 'PASS' : 'NOT MET';
    status.className = pass === null ? 'gate-unknown' : pass ? 'gate-pass' : 'gate-fail'; li.append(name, status); return li;
  }));
  $('cost-items').replaceChildren(...r.cost.items.map(item => {
    const tr = document.createElement('tr');
    for (const [index, value] of [item.label, money(item.total), money(item.perCustomer, 2)].entries()) {
      const cell = document.createElement(index === 0 ? 'th' : 'td'); if (index === 0) cell.scope = 'row'; cell.textContent = value; tr.append(cell);
    }
    return tr;
  }));
  put('items-total', money(r.cost.total)); put('items-home', money(r.cost.totalPerCustomer, 2));
  put('provider-floor', `Provider accounting floor at constant full adoption: ${money(r.cost.providerMonthlyFloor, 2)}/home/month, excluding household electricity. Not a customer price or margin target. Default comparator: $55/month, zero upfront, 42.5 W at the same energy price; US advertised tier checked October 14, 2026. Imported comparator changes remain visible in JSON.`);
  put('mean-active', a.meanSubscribers.toFixed(1)); put('end-balance', money(a.finalBalance));
  put('subscriber-month-cost', a.costPerSubscriberMonth === null ? 'No active homes' : money(a.costPerSubscriberMonth, 2));
  put('ramp-context', `${a.subscriberMonths.toFixed(0)} active subscriber-months over ${p.years} years. ${r.matchedSubscriberMonthRatio === null ? 'No service-month comparison is possible.' : `Estimated cost is ${(r.matchedSubscriberMonthRatio * 100).toFixed(1)}% of the matched Starlink subscriber-month reference.`} Late joiners do not receive ${p.years} years of service during this horizon. Peak funding assumes monthly costs are paid before that month’s revenue; financing is only an allowance.`);
  put('radio-snr', `${r.radio.downSnrDb.toFixed(1)} / ${r.radio.upSnrDb.toFixed(1)} dB`);
  put('radio-clearance', r.clearance.minimumClearanceM === null ? 'Unknown / no samples' : `${r.clearance.minimumClearanceM.toFixed(1)} m`);
  put('radio-rain', `${r.rain.attenuationDb.toFixed(2)} dB`);
  put('access-capacity', `${r.access.downMbps.toFixed(0)} / ${r.access.upMbps.toFixed(0)} Mbps`);
  put('access-demand', `${r.access.demandDownMbps.toFixed(0)} / ${r.access.demandUpMbps.toFixed(0)} Mbps`);
  put('access-oversubscription', `${r.access.peakOversubscription.toFixed(1)} : 1`);
  drawCash(a); drawTerrain(r);
}
function update() {
  try {
    const next = readInputs(), analyzed = analyzePlan(next);
    plan = next; result = analyzed; render(result); $('plan-error').hidden = true;
    document.querySelector('.workspace-results').dataset.stale = 'false';
    for (const id of ['export-report', 'export-csv', 'print-report']) $(id).disabled = false;
    put('workspace-status', `${plan.title || 'Untitled scenario'} recalculated locally. No field evidence attached.`);
  } catch (error) {
    result = null; $('plan-error').hidden = false; put('plan-error', `Invalid inputs: ${error.message}. Previous outputs are stale and cannot be exported.`);
    document.querySelector('.workspace-results').dataset.stale = 'true';
    for (const id of ['export-report', 'export-csv', 'print-report']) $(id).disabled = true;
    put('workspace-status', 'Correct the inputs to calculate a valid scenario.');
  }
}
function download(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], { type })), anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
form.addEventListener('submit', e => e.preventDefault());
form.addEventListener('input', update); form.addEventListener('change', update);
$('preset').addEventListener('change', () => { plan = { ...DEFAULT_PLAN, ...PRESETS[$('preset').value] }; populate(); update(); });
$('terrain-example').addEventListener('click', () => { $('terrain-csv').value = `distance_m,obstruction_m\n${Number($('plan-distance').value) * 500},20`; update(); });
$('export-report').addEventListener('click', () => { if (result) { download(reportJson(result), 'application/json', 'auren-planning-report.json'); put('workspace-status', 'JSON report generated locally. Treat exported assumptions as estimates.'); } });
$('export-csv').addEventListener('click', () => { if (result) download(forecastCsv(result), 'text/csv', 'auren-monthly-forecast.csv'); });
$('print-report').addEventListener('click', () => { if (result) window.print(); });
$('import-plan').addEventListener('click', () => {
  try { const next = importPlan($('import-json').value); analyzePlan(next); plan = next; $('preset').value = 'custom'; populate(); update(); put('workspace-status', 'Imported parameters validated and recalculated locally. Imported results were not trusted.'); }
  catch (error) { put('workspace-status', `Import rejected: ${error.message}. Current scenario has not changed.`); }
});
populate(); update();
