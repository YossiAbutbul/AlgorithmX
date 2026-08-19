import { kruskalContent } from '../content/kruskal.content';
import { baseWeighted, tieWeights } from '../graphs/presets';
import { FrameBuilder, edgeLabel } from './engine';
import type {
  AlgorithmModule,
  AuxView,
  EdgeId,
  Frame,
  GraphEdge,
  GraphModel,
  NodeId,
  RunOptions,
} from './types';
import type { MstResult } from './prim';

/** Union-Find עם union by rank ועם path compression. */
export class DisjointSet {
  private parent: Record<NodeId, NodeId> = {};
  private rank: Record<NodeId, number> = {};

  constructor(ids: NodeId[]) {
    for (const id of ids) {
      this.parent[id] = id;
      this.rank[id] = 0;
    }
  }

  find(x: NodeId): NodeId {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }

  union(a: NodeId, b: NodeId): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) this.parent[ra] = rb;
    else if (this.rank[ra] > this.rank[rb]) this.parent[rb] = ra;
    else {
      this.parent[rb] = ra;
      this.rank[ra] += 1;
    }
    return true;
  }

  groups(ids: NodeId[]): NodeId[][] {
    const map = new Map<NodeId, NodeId[]>();
    for (const id of ids) {
      const root = this.find(id);
      const list = map.get(root) ?? [];
      list.push(id);
      map.set(root, list);
    }
    return [...map.values()].map((g) => [...g].sort());
  }
}

/** מיון עולה לפי משקל, ובשוויון לפי מזהה הצלע. סדר קבוע ומוצהר. */
export function sortedEdges(graph: GraphModel): GraphEdge[] {
  return [...graph.edges].sort(
    (a, b) => a.weight - b.weight || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

export function kruskalCompute(graph: GraphModel): MstResult {
  const dsu = new DisjointSet(graph.nodes.map((n) => n.id));
  const edges: EdgeId[] = [];
  let total = 0;
  for (const e of sortedEdges(graph)) {
    if (dsu.union(e.from, e.to)) {
      edges.push(e.id);
      total += e.weight;
    }
  }
  return { edges, total, order: [] };
}

function pathInForest(chosen: GraphEdge[], from: NodeId, to: NodeId): EdgeId[] {
  const adj = new Map<NodeId, { to: NodeId; id: EdgeId }[]>();
  for (const e of chosen) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    if (!adj.has(e.to)) adj.set(e.to, []);
    adj.get(e.from)?.push({ to: e.to, id: e.id });
    adj.get(e.to)?.push({ to: e.from, id: e.id });
  }
  const prev = new Map<NodeId, { node: NodeId; id: EdgeId }>();
  const seen = new Set<NodeId>([from]);
  const queue: NodeId[] = [from];
  while (queue.length) {
    const u = queue.shift() as NodeId;
    if (u === to) break;
    for (const nb of adj.get(u) ?? []) {
      if (seen.has(nb.to)) continue;
      seen.add(nb.to);
      prev.set(nb.to, { node: u, id: nb.id });
      queue.push(nb.to);
    }
  }
  const path: EdgeId[] = [];
  let cur = to;
  while (cur !== from) {
    const step = prev.get(cur);
    if (!step) return [];
    path.push(step.id);
    cur = step.node;
  }
  return path;
}

function auxOf(
  graph: GraphModel,
  order: GraphEdge[],
  status: Record<EdgeId, 'pending' | 'taken' | 'rejected'>,
  dsu: DisjointSet,
  total: number,
  takenCount: number,
): AuxView[] {
  return [
    {
      kind: 'edgeList',
      title: 'הצלעות ממוינות לפי משקל',
      rows: order.map((e) => ({
        id: e.id,
        label: edgeLabel(graph, e),
        weight: e.weight,
        status: status[e.id] ?? 'pending',
      })),
      note: `נלקחו ${takenCount} צלעות מתוך ${graph.nodes.length - 1} הדרושות. משקל כולל ${total}.`,
    },
    {
      kind: 'disjointSet',
      title: 'קבוצות Union-Find',
      groups: dsu.groups(graph.nodes.map((n) => n.id)),
      note: 'כל קבוצה היא רכיב קשירות של היער שנבנה עד כה',
    },
  ];
}

export function kruskalRun(graph: GraphModel, _opts: RunOptions): Frame[] {
  void _opts;
  const b = new FrameBuilder(graph);
  const ids = graph.nodes.map((n) => n.id);
  const dsu = new DisjointSet(ids);
  const order = sortedEdges(graph);
  const status: Record<EdgeId, 'pending' | 'taken' | 'rejected'> = {};
  const chosen: GraphEdge[] = [];
  let total = 0;

  b.emit({
    event: 'init',
    message: `אתחול: כל צומת בקבוצה נפרדת משלו, והצלעות ממוינות בסדר עולה: ${order
      .map((e) => `${edgeLabel(graph, e)}=${e.weight}`)
      .join(', ')}.`,
    aux: auxOf(graph, order, status, dsu, total, 0),
    codeLine: 3,
    headline: 'אתחול',
  });

  for (const e of order) {
    b.clearEdges('considered', 'idle');
    b.setEdge(e.id, 'considered');
    for (const id of ids) if (b.nodeStates[id] !== 'done') b.setNode(id, 'idle');
    b.setNode(e.from, 'current');
    b.setNode(e.to, 'current');

    const sameSet = dsu.find(e.from) === dsu.find(e.to);
    if (!sameSet) {
      dsu.union(e.from, e.to);
      status[e.id] = 'taken';
      chosen.push(e);
      total += e.weight;
      b.setEdge(e.id, 'tree');
      b.setNode(e.from, 'done');
      b.setNode(e.to, 'done');
      b.emit({
        event: 'select',
        message: `${edgeLabel(graph, e)} במשקל ${e.weight}: הקצוות בקבוצות שונות, ולכן היא נלקחת והקבוצות מתאחדות. משקל כולל ${total}.`,
        aux: auxOf(graph, order, status, dsu, total, chosen.length),
        codeLine: 6,
        focusEdge: e.id,
        nodeBadges: {},
        headline: `נלקחה ${edgeLabel(graph, e)}`,
      });
    } else {
      status[e.id] = 'rejected';
      b.setEdge(e.id, 'rejected');
      const cyclePath = pathInForest(chosen, e.from, e.to);
      b.emit({
        event: 'reject',
        message: `${edgeLabel(graph, e)} במשקל ${e.weight}: שני הקצוות כבר באותה קבוצה, ולכן היא הייתה סוגרת מעגל ונדחית.`,
        aux: auxOf(graph, order, status, dsu, total, chosen.length),
        codeLine: 8,
        focusEdge: e.id,
        pathEdges: [...cyclePath, e.id],
        headline: `נדחתה ${edgeLabel(graph, e)}`,
      });
    }
  }

  b.clearEdges('considered', 'rejected');
  for (const id of ids) b.setNode(id, 'done');
  const components = dsu.groups(ids).length;

  b.emit({
    event: 'done',
    message:
      components === 1
        ? `סיום. העץ מכיל ${chosen.length} צלעות במשקל כולל ${total}, בדיוק כמו התוצאה של Prim על אותו גרף.`
        : `סיום. הגרף אינו קשיר, ולכן התקבל יער פורש עם ${components} רכיבים ובמשקל כולל ${total}.`,
    aux: auxOf(graph, order, status, dsu, total, chosen.length),
    codeLine: 9,
    headline: 'סיום',
  });

  return b.build();
}

export const kruskalModule: AlgorithmModule = {
  id: 'kruskal',
  titleHe: 'Kruskal: עץ פורש מינימלי לפי מיון צלעות',
  shortHe: 'Kruskal',
  requires: ['prim'],
  graphKind: { directed: false, weighted: true, allowNegative: true },
  needsSource: false,
  presetGraphs: [
    {
      id: 'base',
      nameHe: 'הגרף המשותף',
      whyHe: 'אותו גרף ממושקל שעליו רץ Prim, במכוון, כדי לראות סדר בנייה שונה ומשקל כולל זהה.',
      graph: baseWeighted(),
    },
    {
      id: 'tie',
      nameHe: 'הגרף עם משקלים שווים',
      whyHe: 'שתי צלעות במשקל 2, ולכן סדר המיון בשוויון הוא זה שקובע איזה עץ מתקבל.',
      graph: tieWeights(),
    },
  ],
  run: kruskalRun,
  content: kruskalContent,
};
