import type {
  AuxView,
  EdgeId,
  EdgeState,
  Frame,
  FrameEvent,
  GraphEdge,
  GraphModel,
  NodeId,
  NodeState,
} from './types';

export const INF = Number.POSITIVE_INFINITY;

/** מפתח צלע יציב. בגרף לא מכוון: מיון לקסיקוגרפי של שני הקצוות. */
export function edgeIdOf(directed: boolean, from: NodeId, to: NodeId): EdgeId {
  if (directed) return `${from}->${to}`;
  return [from, to].sort().join('-');
}

export function edgeLabel(graph: GraphModel, edge: GraphEdge): string {
  return graph.directed ? `${edge.from} -> ${edge.to}` : `${edge.from} - ${edge.to}`;
}

export function nodeIds(graph: GraphModel): NodeId[] {
  return graph.nodes.map((n) => n.id);
}

/** רשימת שכנויות דטרמיניסטית: השכנים ממוינים לפי סדר אלפביתי של המזהה. */
export function adjacency(graph: GraphModel): Map<NodeId, { to: NodeId; edge: GraphEdge }[]> {
  const map = new Map<NodeId, { to: NodeId; edge: GraphEdge }[]>();
  for (const n of graph.nodes) map.set(n.id, []);
  for (const e of graph.edges) {
    map.get(e.from)?.push({ to: e.to, edge: e });
    if (!graph.directed) map.get(e.to)?.push({ to: e.from, edge: e });
  }
  for (const [, list] of map) {
    list.sort((a, b) => (a.to < b.to ? -1 : a.to > b.to ? 1 : 0));
  }
  return map;
}

export function formatValue(v: number): string {
  if (v === INF) return 'INF';
  if (v === -INF) return '-INF';
  return String(v);
}

export interface BuilderState {
  nodeStates: Record<NodeId, NodeState>;
  edgeStates: Record<EdgeId, EdgeState>;
}

export interface EmitInput {
  event: FrameEvent;
  message: string;
  aux: AuxView[];
  codeLine?: number;
  focusNode?: NodeId;
  focusEdge?: EdgeId;
  nodeBadges?: Record<NodeId, string>;
  edgeBadges?: Record<EdgeId, string>;
  headline?: string;
  residual?: { id: EdgeId; amount: number; active?: boolean }[];
  cutNodes?: NodeId[];
  cutEdges?: EdgeId[];
  pathEdges?: EdgeId[];
}

/**
 * צובר frames. כל אלגוריתם משנה את מצבי הצמתים והצלעות דרך המחלקה הזו
 * ומפיק frame בכל נקודת עניין. ה-UI רק מציג frame לפי אינדקס.
 */
export class FrameBuilder {
  private frames: Frame[] = [];
  nodeStates: Record<NodeId, NodeState> = {};
  edgeStates: Record<EdgeId, EdgeState> = {};

  constructor(graph: GraphModel) {
    for (const n of graph.nodes) this.nodeStates[n.id] = 'idle';
    for (const e of graph.edges) this.edgeStates[e.id] = 'idle';
  }

  setNode(id: NodeId, state: NodeState): void {
    this.nodeStates[id] = state;
  }

  setEdge(id: EdgeId, state: EdgeState): void {
    this.edgeStates[id] = state;
  }

  clearEdges(from: EdgeState, to: EdgeState): void {
    for (const key of Object.keys(this.edgeStates)) {
      if (this.edgeStates[key] === from) this.edgeStates[key] = to;
    }
  }

  emit(input: EmitInput): void {
    this.frames.push({
      index: this.frames.length,
      event: input.event,
      message: input.message,
      nodeStates: { ...this.nodeStates },
      edgeStates: { ...this.edgeStates },
      focusNode: input.focusNode,
      focusEdge: input.focusEdge,
      nodeBadges: input.nodeBadges ? { ...input.nodeBadges } : undefined,
      edgeBadges: input.edgeBadges ? { ...input.edgeBadges } : undefined,
      aux: input.aux,
      codeLine: input.codeLine,
      headline: input.headline,
      residual: input.residual,
      cutNodes: input.cutNodes,
      cutEdges: input.cutEdges,
      pathEdges: input.pathEdges,
    });
  }

  get length(): number {
    return this.frames.length;
  }

  build(): Frame[] {
    return this.frames;
  }
}

export function distBadges(dist: Record<NodeId, number>, prefix = 'd='): Record<NodeId, string> {
  const out: Record<NodeId, string> = {};
  for (const [id, v] of Object.entries(dist)) {
    out[id] = `${prefix}${formatValue(v)}`;
  }
  return out;
}

export function findEdge(graph: GraphModel, from: NodeId, to: NodeId): GraphEdge | undefined {
  return graph.edges.find(
    (e) =>
      (e.from === from && e.to === to) || (!graph.directed && e.from === to && e.to === from),
  );
}
