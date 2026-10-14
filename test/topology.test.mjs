import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleNetwork, flowScenario, nMinusOne } from '../src/topology.mjs';
import { planMaintenance, relocateDemoDemand, CONTROLLER_MODE } from '../src/controller.mjs';

test('healthy and individual failure cases carry synthetic loads', () => { assert.equal(flowScenario(sampleNetwork()).qualified, true); assert.equal(nMinusOne(sampleNetwork()).qualified, true); });
test('fog removes optical paths, not RF fallback', () => {
  const s = flowScenario(sampleNetwork(), { fog: true }); assert.equal(s.qualified, true); assert.ok(!s.activeEdges.includes('a-b-optical'));
});
test('losing all upstream gateways is not called working internet', () => assert.equal(flowScenario(sampleNetwork(), { failedDomains: ['carrier-east', 'carrier-west'] }).qualified, false));
test('shared carrier failure domain cannot masquerade as two independent providers', () => {
  const n = sampleNetwork(); n.nodes.filter(x => x.gateway).forEach(x => { x.failureDomain = 'shared-duct'; }); assert.equal(nMinusOne(n).qualified, false);
});
test('disconnected customers remain counted', () => {
  const s = flowScenario(sampleNetwork(), { failedNodes: ['hub-a'] }); assert.equal(s.demandDownMbps, 160); assert.equal(s.strandedDownMbps, 80); assert.equal(s.qualified, false);
});
test('a topology with alternate paths can still fail due to a shared bottleneck', () => {
  const n = sampleNetwork(); n.edges.forEach(e => { e.downMbps = 30; }); assert.equal(flowScenario(n).qualified, false);
});
test('malformed topology is rejected', () => {
  const n = sampleNetwork(); n.nodes.push(n.nodes[0]); assert.throws(() => flowScenario(n));
  const m = sampleNetwork(); m.edges[0].to = 'absent'; assert.throws(() => flowScenario(m));
});
function request() {
  const network = sampleNetwork(); return { network, targetNode: 'hub-a', relocatedNetwork: relocateDemoDemand(network),
    nowMs: 10000, telemetry: { timestampMs: 10000, locksHealthy: true, anchorsVerified: true, windMps: 4, reserveHours: 12 },
    structuralApproval: true, operatorApproval: true, emergencyStop: false };
}
test('simulation controller has no physical actuator and denies by default', () => {
  assert.equal(CONTROLLER_MODE, 'SIMULATION_ONLY'); assert.equal(planMaintenance().allowed, false); assert.equal(planMaintenance().state, 'LOCKED_DENIED');
});
test('valid synthetic maintenance plan is still explicitly simulation only', () => {
  const p = planMaintenance(request()); assert.equal(p.allowed, true); assert.equal(p.mode, 'SIMULATION_ONLY'); assert.match(p.warning, /never authorizes physical/);
});
test('stale, future, missing or NaN telemetry denies movement', () => {
  for (const telemetry of [undefined, { ...request().telemetry, timestampMs: 0 }, { ...request().telemetry, timestampMs: 11000 }, { ...request().telemetry, windMps: NaN }]) assert.equal(planMaintenance({ ...request(), telemetry }).allowed, false);
});
test('wind, stop, locks, anchors, approval and reserve are fail-closed', () => {
  for (const patch of [{ structuralApproval: false }, { operatorApproval: false }, { emergencyStop: true },
    { telemetry: { ...request().telemetry, locksHealthy: false } }, { telemetry: { ...request().telemetry, anchorsVerified: false } },
    { telemetry: { ...request().telemetry, windMps: 20 } }, { telemetry: { ...request().telemetry, reserveHours: 1 } }]) assert.equal(planMaintenance({ ...request(), ...patch }).allowed, false);
});
test('maintenance cannot hide lost demand or fabricate fallback capacity', () => {
  const r = request(); r.relocatedNetwork.nodes.find(n => n.id === 'hub-b').demandDownMbps = 80; assert.equal(planMaintenance(r).allowed, false);
  const s = request(); s.relocatedNetwork.edges[0].downMbps = 99999; assert.equal(planMaintenance(s).allowed, false);
});
test('maintenance denies if a subsequent tested failure overloads remaining paths', () => {
  const r = request(); r.network.edges.filter(e => e.type === 'rf').forEach(e => { e.downMbps = 150; }); r.relocatedNetwork = relocateDemoDemand(r.network);
  assert.equal(flowScenario(r.relocatedNetwork, { failedNodes: ['hub-a'] }).qualified, true);
  assert.equal(planMaintenance(r).allowed, false);
});
test('maintenance cannot resurrect a failed gateway in its fallback inventory', () => {
  const r = request();
  r.network.nodes.filter(n => n.gateway).forEach(n => { n.status = 'down'; });
  r.relocatedNetwork.nodes.filter(n => n.gateway).forEach(n => { n.status = 'up'; });
  assert.equal(planMaintenance(r).allowed, false);
});
test('customer demand cannot be moved straight onto an internet gateway', () => {
  const r = request();
  r.relocatedNetwork.nodes.find(n => n.id === 'hub-b').demandDownMbps = 80;
  r.relocatedNetwork.nodes.find(n => n.id === 'gateway-east').demandDownMbps = 80;
  assert.equal(planMaintenance(r).allowed, false);
});
