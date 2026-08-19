import { FrameBuilder, edgeLabel } from './engine';
import type { AuxView, EdgeId, Frame, GraphModel, NodeId, RunOptions } from './types';

export interface Arc {
  to: NodeId;
  edgeId: EdgeId;
  forward: boolean;
}

export interface FlowResult {
  maxFlow: number;
  iterations: number;
  flow: Record<EdgeId, number>;
  minCutNodes: NodeId[];
  minCutEdges: EdgeId[];
  minCutCapacity: number;
  paths: NodeId[][];
}

/**
 * Residual arcs leaving node u, in a declared order:
 * forward edges in edge list order first, then backward edges in the same order.
 */
export function residualArcs(
  graph: GraphModel,
  u: NodeId,
  flow: Record<EdgeId, number>,
): Arc[] {
  const out: Arc[] = [];
  for (const e of graph.edges) {
    if (e.from === u && e.weight - flow[e.id] > 0) {
      out.push({ to: e.to, edgeId: e.id, forward: true });
    }
  }
  for (const e of graph.edges) {
    if (e.to === u && flow[e.id] > 0) {
      out.push({ to: e.from, edgeId: e.id, forward: false });
    }
  }
  return out;
}

export function residualCapacity(
  graph: GraphModel,
  arc: Arc,
  flow: Record<EdgeId, number>,
): number {
  const e = graph.edges.find((x) => x.id === arc.edgeId);
  if (!e) return 0;
  return arc.forward ? e.weight - flow[e.id] : flow[e.id];
}

export interface SearchResult {
  path: Arc[] | null;
  visited: NodeId[];
  parentOf: Record<NodeId, string>;
}

/** Depth first search on the residual graph, in the declared edge order. This is what Ford-Fulkerson picks. */
export function dfsAugmenting(
  graph: GraphModel,
  s: NodeId,
  t: NodeId,
  flow: Record<EdgeId, number>,
): SearchResult {
  const seen = new Set<NodeId>([s]);
  const visited: NodeId[] = [s];
  const parentOf: Record<NodeId, string> = {};
  const path: Arc[] = [];

  const go = (u: NodeId): boolean => {
    if (u === t) return true;
    for (const arc of residualArcs(graph, u, flow)) {
      if (seen.has(arc.to)) continue;
      seen.add(arc.to);
      visited.push(arc.to);
      parentOf[arc.to] = `${u}${arc.forward ? '' : ' (אחורית)'}`;
      path.push(arc);
      if (go(arc.to)) return true;
      path.pop();
    }
    return false;
  };

  const found = go(s);
  return { path: found ? path : null, visited, parentOf };
}

/** Breadth first search on the residual graph, so always the path with the fewest edges. */
export function bfsAugmenting(
  graph: GraphModel,
  s: NodeId,
  t: NodeId,
  flow: Record<EdgeId, number>,
): SearchResult {
  const prev = new Map<NodeId, Arc>();
  const seen = new Set<NodeId>([s]);
  const visited: NodeId[] = [s];
  const parentOf: Record<NodeId, string> = {};
  const queue: NodeId[] = [s];

  while (queue.length > 0) {
    const u = queue.shift() as NodeId;
    if (u === t) break;
    for (const arc of residualArcs(graph, u, flow)) {
      if (seen.has(arc.to)) continue;
      seen.add(arc.to);
      visited.push(arc.to);
      prev.set(arc.to, arc);
      parentOf[arc.to] = `${u}${arc.forward ? '' : ' (אחורית)'}`;
      queue.push(arc.to);
    }
  }

  if (!seen.has(t)) return { path: null, visited, parentOf };

  const path: Arc[] = [];
  let cur = t;
  while (cur !== s) {
    const arc = prev.get(cur);
    if (!arc) return { path: null, visited, parentOf };
    path.push(arc);
    const e = graph.edges.find((x) => x.id === arc.edgeId);
    cur = arc.forward ? (e?.from as NodeId) : (e?.to as NodeId);
  }
  return { path: path.reverse(), visited, parentOf };
}

export type SearchFn = typeof dfsAugmenting;

function reachableInResidual(
  graph: GraphModel,
  s: NodeId,
  flow: Record<EdgeId, number>,
): NodeId[] {
  const seen = new Set<NodeId>([s]);
  const stack = [s];
  while (stack.length) {
    const u = stack.pop() as NodeId;
    for (const arc of residualArcs(graph, u, flow)) {
      if (!seen.has(arc.to)) {
        seen.add(arc.to);
        stack.push(arc.to);
      }
    }
  }
  return [...seen];
}

export function maxFlowCompute(
  graph: GraphModel,
  s: NodeId,
  t: NodeId,
  search: SearchFn,
): FlowResult {
  const flow: Record<EdgeId, number> = {};
  for (const e of graph.edges) flow[e.id] = 0;
  let maxFlow = 0;
  let iterations = 0;
  const paths: NodeId[][] = [];

  for (;;) {
    const { path } = search(graph, s, t, flow);
    if (!path) break;
    let bottleneck = Infinity;
    for (const arc of path) {
      bottleneck = Math.min(bottleneck, residualCapacity(graph, arc, flow));
    }
    for (const arc of path) {
      flow[arc.edgeId] += arc.forward ? bottleneck : -bottleneck;
    }
    maxFlow += bottleneck;
    iterations += 1;
    paths.push(pathNodes(graph, s, path));
  }

  const minCutNodes = reachableInResidual(graph, s, flow);
  const inSet = new Set(minCutNodes);
  const minCutEdges = graph.edges
    .filter((e) => inSet.has(e.from) && !inSet.has(e.to))
    .map((e) => e.id);
  const minCutCapacity = graph.edges
    .filter((e) => inSet.has(e.from) && !inSet.has(e.to))
    .reduce((sum, e) => sum + e.weight, 0);

  return { maxFlow, iterations, flow, minCutNodes, minCutEdges, minCutCapacity, paths };
}

function pathNodes(_graph: GraphModel, s: NodeId, path: Arc[]): NodeId[] {
  return [s, ...path.map((arc) => arc.to)];
}

function auxOf(
  graph: GraphModel,
  flow: Record<EdgeId, number>,
  total: number,
  parentOf: Record<NodeId, string>,
  searchTitle: string,
): AuxView[] {
  const views: AuxView[] = [
    {
      kind: 'flowTable',
      title: 'זרימה מול קיבול',
      rows: graph.edges.map((e) => ({
        id: e.id,
        label: edgeLabel(graph, e),
        flow: flow[e.id],
        capacity: e.weight,
      })),
      totalFlow: total,
      note: 'צלע רוויה היא צלע שהזרימה בה שווה לקיבול',
    },
  ];
  const rows = Object.entries(parentOf);
  if (rows.length > 0) {
    views.push({
      kind: 'arrayTable',
      title: searchTitle,
      columns: ['צומת', 'הגיע מ'],
      rows: rows.map(([node, from]) => ({ key: node, values: [node, from] })),
      note: 'החיפוש רץ על הגרף השאריתי, ולא על הגרף המקורי',
    });
  }
  return views;
}

export interface FlowRunConfig {
  search: SearchFn;
  searchName: string;
  searchTitle: string;
}

export function flowRun(graph: GraphModel, opts: RunOptions, config: FlowRunConfig): Frame[] {
  const s = opts.source ?? graph.nodes[0]?.id;
  const t = opts.sink ?? graph.nodes[graph.nodes.length - 1]?.id;
  const b = new FrameBuilder(graph);
  if (!s || !t || s === t) return b.build();

  const flow: Record<EdgeId, number> = {};
  for (const e of graph.edges) flow[e.id] = 0;
  let total = 0;
  let iteration = 0;

  const badges = (): Record<EdgeId, string> => {
    const out: Record<EdgeId, string> = {};
    for (const e of graph.edges) out[e.id] = `${flow[e.id]}/${e.weight}`;
    return out;
  };
  const residualList = (active: EdgeId[] = []) =>
    graph.edges
      .filter((e) => flow[e.id] > 0)
      .map((e) => ({ id: e.id, amount: flow[e.id], active: active.includes(e.id) }));

  const paintStates = () => {
    for (const e of graph.edges) {
      if (flow[e.id] >= e.weight && e.weight > 0) b.setEdge(e.id, 'saturated');
      else if (flow[e.id] > 0) b.setEdge(e.id, 'tree');
      else b.setEdge(e.id, 'idle');
    }
  };

  b.setNode(s, 'current');
  b.setNode(t, 'frontier');
  b.emit({
    event: 'init',
    message: `אתחול: הזרימה בכל צלע היא 0, והגרף השאריתי זהה בשלב הזה לרשת המקורית. מחפשים מסלול הגדלה מ-${s} אל ${t}.`,
    aux: auxOf(graph, flow, total, {}, config.searchTitle),
    codeLine: 1,
    edgeBadges: badges(),
    headline: 'אתחול',
  });

  for (;;) {
    const { path, parentOf } = config.search(graph, s, t, flow);
    iteration += 1;

    if (!path) {
      const reachable = reachableInResidual(graph, s, flow);
      const inSet = new Set(reachable);
      const cutEdges = graph.edges
        .filter((e) => inSet.has(e.from) && !inSet.has(e.to))
        .map((e) => e.id);
      const cutCap = graph.edges
        .filter((e) => inSet.has(e.from) && !inSet.has(e.to))
        .reduce((sum, e) => sum + e.weight, 0);

      paintStates();
      for (const n of graph.nodes) b.setNode(n.id, inSet.has(n.id) ? 'current' : 'done');
      b.emit({
        event: 'done',
        message: `אין יותר מסלול הגדלה. הזרימה המקסימלית היא ${total}. הצמתים הנגישים מ-${s} בגרף השאריתי הם ${reachable.join(', ')}, והצלעות שיוצאות מהם הן החתך המינימלי בקיבול ${cutCap}, בדיוק כמו הזרימה.`,
        aux: auxOf(graph, flow, total, {}, config.searchTitle),
        codeLine: 7,
        edgeBadges: badges(),
        residual: residualList(),
        cutNodes: reachable,
        cutEdges,
        headline: 'סיום: max-flow min-cut',
      });
      break;
    }

    let bottleneck = Infinity;
    for (const arc of path) bottleneck = Math.min(bottleneck, residualCapacity(graph, arc, flow));
    const nodes = pathNodes(graph, s, path);
    const pathEdges = path.map((a) => a.edgeId);
    const usedBackward = path.filter((a) => !a.forward);

    paintStates();
    for (const n of graph.nodes) b.setNode(n.id, nodes.includes(n.id) ? 'frontier' : 'idle');
    b.setNode(s, 'current');
    b.setNode(t, 'current');
    for (const arc of path) if (arc.forward) b.setEdge(arc.edgeId, 'considered');

    b.emit({
      event: 'select',
      message: `איטרציה ${iteration}: ${config.searchName} מצא את המסלול ${nodes.join(' אל ')}${
        usedBackward.length > 0
          ? `, והוא משתמש בצלע אחורית שמבטלת חלק מזרימה קודמת`
          : ''
      }. צוואר הבקבוק הוא ${bottleneck}.`,
      aux: auxOf(graph, flow, total, parentOf, config.searchTitle),
      codeLine: 3,
      edgeBadges: badges(),
      residual: residualList(usedBackward.map((a) => a.edgeId)),
      pathEdges,
      headline: `איטרציה ${iteration}`,
    });

    for (const arc of path) flow[arc.edgeId] += arc.forward ? bottleneck : -bottleneck;
    total += bottleneck;

    paintStates();
    b.emit({
      event: 'augment',
      message: `דוחפים ${bottleneck} יחידות לאורך המסלול. הזרימה הכוללת עולה ל-${total}${
        usedBackward.length > 0
          ? `, והזרימה בצלע האחורית ירדה, כלומר ביטלנו בחירה קודמת`
          : ''
      }.`,
      aux: auxOf(graph, flow, total, {}, config.searchTitle),
      codeLine: 5,
      edgeBadges: badges(),
      residual: residualList(),
      pathEdges,
    });

    if (iteration > 400) break;
  }

  return b.build();
}
