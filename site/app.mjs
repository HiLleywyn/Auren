import { costModel, starlinkCost, capacity, linkBudget, pathClearance, rainLoss } from './src/model.mjs';
import { sampleNetwork, flowScenario, nMinusOne } from './src/topology.mjs';
import { planMaintenance, relocateDemoDemand } from './src/controller.mjs';
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const value = id => Number($(id).value);
const text = (id, value) => { $(id).textContent = value; };

const phases = {
  assemble: ['Base-level assembly', 'Short bays are inserted at ground level. Alternating load-support collars are a hypothesis that needs a restrained low-height prototype and independent review.'],
  raise: ['Raise, tension, and mechanically lock', 'Reviewed guy tension and positive locks must support every deployment stage. A software flag is not a load-bearing lock. Anchors, wind and recovery loads remain engineering work.'],
  operate: ['Operate with a qualified alternate path', 'Access and terrestrial transport need real spare capacity before a relay changes geometry. Two carrier names are not enough: shared ducts, power and storms can defeat both.'],
  service: ['Bring the cartridge down, not the technician up', 'An independent captured carriage lowers equipment only after approved handover and local safety checks. This illustration is not motor control or authorization to build the structure.']
};
for (const button of document.querySelectorAll('button[data-phase]')) button.addEventListener('click', () => {
  const phase = button.dataset.phase;
  for (const peer of document.querySelectorAll('button[data-phase]')) peer.setAttribute('aria-pressed', String(peer === button));
  $('mechanism-scene').dataset.phase = phase;
  text('mechanism-stage-title', phases[phase][0]); text('mechanism-stage-copy', phases[phase][1]);
});

for (const tab of document.querySelectorAll('[role=tab]')) {
  tab.addEventListener('click', () => {
    for (const peer of document.querySelectorAll('[role=tab]')) {
      peer.setAttribute('aria-selected', String(peer === tab));
      $(peer.getAttribute('aria-controls')).hidden = peer !== tab;
    }
  });
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...document.querySelectorAll('[role=tab]')], index = tabs.indexOf(tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].click(); tabs[next].focus();
  });
}

function updateCost() {
  const subscribers = value('subscribers'), monthlyBackhaul = value('backhaul'), hardwareLifeYears = value('lifetime'), allocation = value('rd');
  const c = costModel({ subscribers, monthlyBackhaul, hardwareLifeYears, developmentBudget: allocation ? 300000 : 0, developmentSubscribers: allocation || 10000 });
  const reference = starlinkCost(); const cap = capacity({ subscribers });
  text('subscribers-out', subscribers); text('backhaul-out', money(monthlyBackhaul)); text('lifetime-out', `${hardwareLifeYears} years`);
  text('cost-total', money(c.totalPerCustomer)); text('cost-ratio', `${(c.totalPerCustomer / reference * 100).toFixed(1)}% of the ${money(reference)} five-year reference.`);
  $('auren-bar').style.width = `${Math.min(100, c.totalPerCustomer / reference * 100)}%`;
  text('cost-gate', c.totalPerCustomer <= reference / 4 ? 'Numerical quarter-cost target met in this estimate. Equivalent service and field availability remain unproven.' : `Quarter-cost target not met. The numerical ceiling is ${money(reference / 4)} per home.`);
  text('capacity-result', `Estimated access capacity: ${(cap.downMbps / 1000).toFixed(2)} Gbps down; demand ${(cap.demandDownMbps / 1000).toFixed(2)} Gbps. ${cap.qualified ? 'Aggregate access headroom passes.' : 'Aggregate access headroom fails.'} This does not qualify a real site or upstream service.`);
}

function updateLink() {
  const distanceKm = value('distance'), hubHeightM = value('height'), obstructionM = value('trees'), rainMmHour = value('rain');
  const rain = rainLoss({ distanceKm, rainMmHour });
  const b = linkBudget({ distanceKm, additionalLossDb: 2 + rain.attenuationDb });
  const g = pathClearance({ distanceKm, hubHeightM, customerHeightM: 6, terrain: [{ distanceM: distanceKm * 500, obstructionM }] });
  text('distance-out', `${distanceKm} km`); text('height-out', `${hubHeightM} m`); text('trees-out', `${obstructionM} m`); text('rain-out', `${rainMmHour} mm/h`);
  text('link-snr', `${b.upSnrDb.toFixed(1)} dB`); text('link-down', `${b.downRxDbm.toFixed(1)} dBm`); text('link-up', `${b.upRxDbm.toFixed(1)} dBm`);
  text('link-clearance', `${g.minimumClearanceM.toFixed(1)} m`);
  const reasons = []; if (!b.qualified) reasons.push('bidirectional SNR reserve fails'); if (!g.qualified) reasons.push('midpoint Fresnel clearance fails');
  text('link-gate', reasons.length ? `Screening failure: ${reasons.join('; ')}.` : 'These screening checks pass. Full-path terrain, interference, real fade and throughput measurements are still required.');
}

function scenario() {
  const n = sampleNetwork(), selection = $('failure').value; let options = {};
  if (selection === 'fog') options.fog = true;
  if (selection === 'east') options.failedDomains = ['carrier-east'];
  if (selection === 'both') options.failedDomains = ['carrier-east', 'carrier-west'];
  if (selection === 'bottleneck') for (const e of n.edges.filter(e => e.type === 'rf')) e.downMbps = 30;
  if (selection === 'shared') for (const node of n.nodes.filter(x => x.gateway)) node.failureDomain = 'shared-duct';
  return { n, options };
}

function updateFailure() {
  const { n, options } = scenario(); const flow = flowScenario(n, options), resilience = nMinusOne(n, options);
  for (const edge of document.querySelectorAll('[data-edge]')) edge.classList.toggle('failed', !flow.activeEdges.includes(edge.dataset.edge));
  text('flow-result', `${flow.qualified ? 'Synthetic load carried' : 'Synthetic load NOT carried'}: ${flow.servedDownMbps.toFixed(0)}/${flow.demandDownMbps} Mbps down, ${flow.servedUpMbps.toFixed(0)}/${flow.demandUpMbps} Mbps up.`);
  text('resilience-result', `Tested link / carrier-domain N−1 cases: ${resilience.qualified ? 'pass' : 'fail'}. ${resilience.cases.filter(c => !c.result.qualified).length} failing cases. Not a physical availability measurement.`);
  text('maintenance-result', 'Maintenance plans remain locked until simulated checks pass.');
}

$('maintenance').addEventListener('click', () => {
  const { n, options } = scenario();
  // Apply the visible failure scenario to the inventory, not only the display.
  for (const node of n.nodes) if ((options.failedDomains ?? []).includes(node.failureDomain)) node.status = 'down';
  for (const edge of n.edges) if (options.fog && edge.type === 'optical') edge.status = 'down';
  const now = Date.now();
  const p = planMaintenance({ network: n, targetNode: 'hub-a', relocatedNetwork: relocateDemoDemand(n), nowMs: now,
    structuralApproval: $('approval').checked, operatorApproval: $('approval').checked, emergencyStop: false,
    telemetry: { timestampMs: now, locksHealthy: true, anchorsVerified: true, windMps: 4, reserveHours: 12 } });
  text('maintenance-result', p.allowed ? 'SIMULATION ONLY: fallback and approvals pass. A cartridge-lowering sequence can be simulated. No physical movement is authorized or executed.' : `LOCKED / DENIED: ${p.reasons.join(' ')}`);
});

for (const id of ['subscribers', 'backhaul', 'lifetime', 'rd']) $(id).addEventListener('input', updateCost);
for (const id of ['distance', 'height', 'trees', 'rain']) $(id).addEventListener('input', updateLink);
$('failure').addEventListener('change', updateFailure); $('approval').addEventListener('change', () => text('maintenance-result', 'Approval changed. Run the simulated checks again.'));
updateCost(); updateLink(); updateFailure();
