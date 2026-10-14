import { flowScenario, nMinusOne, validateNetwork } from './topology.mjs';

export const CONTROLLER_MODE = 'SIMULATION_ONLY';
/** No GPIO, serial, PLC, motor, or real-network adapter exists in this repository. */
export function planMaintenance({ network, targetNode, relocatedNetwork, telemetry, nowMs = Date.now(),
  structuralApproval = false, operatorApproval = false, emergencyStop = false } = {}) {
  const reasons = [];
  if (structuralApproval !== true) reasons.push('Missing independent structural approval (simulated input).');
  if (operatorApproval !== true) reasons.push('Missing operator approval.');
  if (emergencyStop !== false) reasons.push('Emergency stop is asserted or unknown.');
  if (!Number.isFinite(nowMs)) reasons.push('Invalid controller clock.');
  if (!telemetry || !Number.isFinite(telemetry.timestampMs) || !Number.isFinite(nowMs) || nowMs - telemetry.timestampMs > 5000 || nowMs < telemetry.timestampMs) reasons.push('Telemetry is missing, stale, or from the future.');
  if (!telemetry || telemetry.locksHealthy !== true || telemetry.anchorsVerified !== true) reasons.push('Mechanical locks or anchors not confirmed.');
  if (!telemetry || !Number.isFinite(telemetry.windMps) || telemetry.windMps < 0 || telemetry.windMps > 8) reasons.push('Wind is outside the conservative simulated movement envelope.');
  if (!telemetry || !Number.isFinite(telemetry.reserveHours) || telemetry.reserveHours < 2) reasons.push('Insufficient or unknown recovery energy reserve.');
  let fallback = null, resilience = null;
  try {
    validateNetwork(network); validateNetwork(relocatedNetwork);
    const source = network.nodes.find(n => n.id === targetNode);
    if (!source || source.gateway) reasons.push('Maintenance target is missing or is an internet gateway.');
    const before = network.nodes.reduce((s, n) => s + (n.demandDownMbps ?? 0), 0);
    const after = relocatedNetwork.nodes.reduce((s, n) => s + (n.demandDownMbps ?? 0), 0);
    const beforeUp = network.nodes.reduce((s, n) => s + (n.demandUpMbps ?? 0), 0);
    const afterUp = relocatedNetwork.nodes.reduce((s, n) => s + (n.demandUpMbps ?? 0), 0);
    if (Math.abs(before - after) > 1e-6 || Math.abs(beforeUp - afterUp) > 1e-6) reasons.push('Demand was lost or invented during relocation.');
    // Do not permit a caller to invent new fallback links or upstream capacity.
    for (const edge of relocatedNetwork.edges) {
      const original = network.edges.find(e => e.id === edge.id);
      if (!original || original.from !== edge.from || original.to !== edge.to || edge.downMbps !== original.downMbps || edge.upMbps !== original.upMbps || edge.type !== original.type || edge.status !== original.status) reasons.push('Fallback network changed link identity, status or capacity.');
    }
    for (const node of relocatedNetwork.nodes) {
      const original = network.nodes.find(n => n.id === node.id);
      if (!original || original.gateway !== node.gateway || original.upstreamDownMbps !== node.upstreamDownMbps || original.upstreamUpMbps !== node.upstreamUpMbps || original.failureDomain !== node.failureDomain || original.status !== node.status) reasons.push('Fallback changed node identity, status or upstream capacity.');
      if (original?.gateway && ((node.demandDownMbps ?? 0) > (original.demandDownMbps ?? 0) || (node.demandUpMbps ?? 0) > (original.demandUpMbps ?? 0))) reasons.push('Customer access demand cannot be relocated directly to an internet gateway.');
    }
    fallback = flowScenario(relocatedNetwork, { failedNodes: [targetNode] });
    resilience = nMinusOne(relocatedNetwork, { failedNodes: [targetNode] });
    if (!fallback.qualified || !resilience.qualified) reasons.push('Fallback cannot carry all admitted traffic with reserve and a subsequent tested failure.');
  } catch { reasons.push('Network or relocated demand is malformed.'); }
  return { mode: CONTROLLER_MODE, allowed: reasons.length === 0, state: reasons.length ? 'LOCKED_DENIED' : 'SIMULATED_MAINTENANCE_READY',
    reasons: [...new Set(reasons)], fallback, resilience,
    steps: reasons.length ? ['Keep simulated structure locked.'] : ['Simulate customer reassociation.', 'Verify fallback load and tested N-1 cases.', 'Simulate cartridge lowering.', 'Inspect cartridge at ground level.', 'Simulate return and verify locks.'],
    warning: 'Not a certified safety controller. An allowed result never authorizes physical movement.' };
}

export function relocateDemoDemand(network, target = 'hub-a', destination = 'hub-b') {
  const copy = structuredClone(network);
  const a = copy.nodes.find(n => n.id === target), b = copy.nodes.find(n => n.id === destination);
  if (!a || !b || a.gateway || b.gateway || a === b) throw new TypeError('Invalid relocation');
  b.demandDownMbps = (b.demandDownMbps ?? 0) + (a.demandDownMbps ?? 0);
  b.demandUpMbps = (b.demandUpMbps ?? 0) + (a.demandUpMbps ?? 0);
  a.demandDownMbps = 0; a.demandUpMbps = 0;
  return copy;
}
