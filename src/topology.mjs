import { number } from './model.mjs';

/** Synthetic common-sink max-flow. Capacity is a hypothesis until measured. */
export function validateNetwork(network) {
  if (!network || !Array.isArray(network.nodes) || !Array.isArray(network.edges)) throw new TypeError('Network requires nodes and edges');
  if (network.nodes.length > 100 || network.edges.length > 500) throw new RangeError('Prototype network limit exceeded');
  const ids = new Set();
  for (const node of network.nodes) {
    if (typeof node.id !== 'string' || !/^[a-z][a-z0-9-]{0,47}$/.test(node.id) || ids.has(node.id)) throw new TypeError('Invalid or duplicate node id');
    ids.add(node.id);
    if (node.status !== undefined && !['up', 'down'].includes(node.status)) throw new TypeError('Invalid node status');
    number(node.demandDownMbps ?? 0, 'demandDownMbps'); number(node.demandUpMbps ?? 0, 'demandUpMbps');
    if (node.gateway) {
      number(node.upstreamDownMbps, 'upstreamDownMbps'); number(node.upstreamUpMbps, 'upstreamUpMbps');
      if (typeof node.failureDomain !== 'string' || !node.failureDomain) throw new TypeError('Gateways need a failureDomain');
    }
  }
  const edges = new Set();
  for (const edge of network.edges) {
    if (typeof edge.id !== 'string' || !/^[a-z][a-z0-9-]{0,47}$/.test(edge.id) || edges.has(edge.id) || !ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) throw new TypeError('Invalid edge');
    edges.add(edge.id);
    number(edge.downMbps, 'edge.downMbps'); number(edge.upMbps, 'edge.upMbps');
    if (edge.status !== undefined && !['up', 'down'].includes(edge.status)) throw new TypeError('Invalid link status');
    if (edge.type !== undefined && !['rf', 'optical', 'fiber'].includes(edge.type)) throw new TypeError('Invalid link type');
  }
  return true;
}

function maximumFlow(ids, links, source, sink) {
  const index = new Map(ids.map((id, i) => [id, i]));
  const residual = ids.map(() => ids.map(() => 0));
  for (const [a, b, cap] of links) residual[index.get(a)][index.get(b)] += cap;
  const s = index.get(source), t = index.get(sink);
  let total = 0;
  while (true) {
    const parent = Array(ids.length).fill(-1), queue = [s]; parent[s] = s;
    for (let q = 0; q < queue.length && parent[t] === -1; q++) {
      const u = queue[q];
      for (let v = 0; v < ids.length; v++) if (parent[v] === -1 && residual[u][v] > 1e-8) { parent[v] = u; queue.push(v); }
    }
    if (parent[t] === -1) break;
    let delta = Infinity;
    for (let v = t; v !== s; v = parent[v]) delta = Math.min(delta, residual[parent[v]][v]);
    for (let v = t; v !== s; v = parent[v]) { residual[parent[v]][v] -= delta; residual[v][parent[v]] += delta; }
    total += delta;
  }
  const reachable = new Set([s]), queue = [s];
  for (let q = 0; q < queue.length; q++) for (let v = 0; v < ids.length; v++) {
    if (!reachable.has(v) && residual[queue[q]][v] > 1e-8) { reachable.add(v); queue.push(v); }
  }
  return { total, cutSide: ids.filter((id, i) => reachable.has(i) && !id.startsWith('__')) };
}

export function flowScenario(network, { failedNodes = [], failedEdges = [], failedDomains = [], fog = false, headroom = .2 } = {}) {
  validateNetwork(network); number(headroom, 'headroom', { max: .99 });
  const disabled = new Set(failedNodes);
  for (const node of network.nodes) if (node.status === 'down' || failedDomains.includes(node.failureDomain)) disabled.add(node.id);
  const nodes = network.nodes.filter(n => !disabled.has(n.id));
  const liveIds = new Set(nodes.map(n => n.id));
  // Demand never disappears just because a customer-serving node has failed.
  const totalDemandDownMbps = network.nodes.reduce((s, n) => s + (n.demandDownMbps ?? 0), 0);
  const totalDemandUpMbps = network.nodes.reduce((s, n) => s + (n.demandUpMbps ?? 0), 0);
  const strandedDownMbps = network.nodes.filter(n => disabled.has(n.id)).reduce((s, n) => s + (n.demandDownMbps ?? 0), 0);
  const strandedUpMbps = network.nodes.filter(n => disabled.has(n.id)).reduce((s, n) => s + (n.demandUpMbps ?? 0), 0);
  const links = network.edges.filter(e => liveIds.has(e.from) && liveIds.has(e.to) && e.status !== 'down' && !failedEdges.includes(e.id) && !(fog && e.type === 'optical'));
  const run = direction => {
    const demandKey = direction === 'down' ? 'demandDownMbps' : 'demandUpMbps';
    const upstreamKey = direction === 'down' ? 'upstreamDownMbps' : 'upstreamUpMbps';
    const capacityKey = direction === 'down' ? 'downMbps' : 'upMbps';
    const arcs = [];
    for (const n of nodes) {
      arcs.push(['__source', n.id, n[demandKey] ?? 0]);
      if (n.gateway) arcs.push([n.id, '__sink', n[upstreamKey] * (1 - headroom)]);
    }
    for (const e of links) {
      arcs.push([e.from, e.to, e[capacityKey] * (1 - headroom)]);
      arcs.push([e.to, e.from, e[capacityKey] * (1 - headroom)]);
    }
    return maximumFlow(['__source', '__sink', ...nodes.map(n => n.id)], arcs, '__source', '__sink');
  };
  const down = run('down'), up = run('up');
  return { classification: 'synthetic-calculated', demandDownMbps: totalDemandDownMbps, demandUpMbps: totalDemandUpMbps,
    servedDownMbps: down.total, servedUpMbps: up.total, strandedDownMbps, strandedUpMbps,
    qualified: down.total >= totalDemandDownMbps - 1e-6 && up.total >= totalDemandUpMbps - 1e-6,
    downCut: down.cutSide, upCut: up.cutSide, activeEdges: links.map(e => e.id),
    warning: 'Common-sink fractional flow, not a packet-routing proof. Demand relocation must be explicitly modeled; physical failure domains and RF interference are inputs.' };
}

export function nMinusOne(network, options = {}) {
  validateNetwork(network);
  const cases = [{ name: 'healthy', result: flowScenario(network, options) }];
  for (const edge of network.edges.filter(e => e.status !== 'down')) cases.push({ name: `edge:${edge.id}`, result: flowScenario(network, { ...options, failedEdges: [...(options.failedEdges ?? []), edge.id] }) });
  const domains = [...new Set(network.nodes.filter(n => n.gateway).map(n => n.failureDomain))];
  for (const domain of domains) cases.push({ name: `gateway-domain:${domain}`, result: flowScenario(network, { ...options, failedDomains: [...(options.failedDomains ?? []), domain] }) });
  return { classification: 'synthetic-calculated', qualified: cases.every(c => c.result.qualified), cases,
    excluded: 'Customer access reassociation, non-gateway node failure, packet loss, latency and real correlated outage probabilities require additional experiments.' };
}

export function sampleNetwork() {
  return {
    classification: 'synthetic',
    nodes: [
      { id: 'hub-a', demandDownMbps: 80, demandUpMbps: 16 },
      { id: 'hub-b', demandDownMbps: 80, demandUpMbps: 16 },
      { id: 'gateway-east', gateway: true, failureDomain: 'carrier-east', upstreamDownMbps: 1000, upstreamUpMbps: 1000 },
      { id: 'gateway-west', gateway: true, failureDomain: 'carrier-west', upstreamDownMbps: 1000, upstreamUpMbps: 1000 }
    ],
    edges: [
      { id: 'a-east-rf', from: 'hub-a', to: 'gateway-east', type: 'rf', downMbps: 300, upMbps: 75 },
      { id: 'a-west-rf', from: 'hub-a', to: 'gateway-west', type: 'rf', downMbps: 300, upMbps: 75 },
      { id: 'b-east-rf', from: 'hub-b', to: 'gateway-east', type: 'rf', downMbps: 300, upMbps: 75 },
      { id: 'b-west-rf', from: 'hub-b', to: 'gateway-west', type: 'rf', downMbps: 300, upMbps: 75 },
      { id: 'a-b-optical', from: 'hub-a', to: 'hub-b', type: 'optical', downMbps: 1000, upMbps: 1000 }
    ]
  };
}
