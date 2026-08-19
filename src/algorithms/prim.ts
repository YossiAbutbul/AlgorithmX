import { primContent } from '../content/prim.content';
import { baseWeighted, tieWeights } from '../graphs/presets';
import { FrameBuilder, INF, adjacency, edgeLabel, formatValue } from './engine';
import type {
  AlgorithmModule,
  AuxView,
  EdgeId,
  Frame,
  GraphModel,
  NodeId,
  RunOptions,
} from './types';

export interface MstResult {
  edges: EdgeId[];
  total: number;
  order: NodeId[];
}

export function primCompute(graph: GraphModel, source: NodeId): MstResult {
  const adj = adjacency(graph);
  const key: Record<NodeId, number> = {};
  const parentEdge: Record<NodeId, EdgeId | null> = {};
  const inTree: Record<NodeId, boolean> = {};
  for (const n of graph.nodes) {
    key[n.id] = INF;
    parentEdge[n.id] = null;
    inTree[n.id] = false;
  }
  key[source] = 0;

  const edges: EdgeId[] = [];
  const order: NodeId[] = [];
  let total = 0;
  let open = graph.nodes.map((n) => n.id);

  while (open.length > 0) {
    let best: NodeId | null = null;
    for (const id of open) {
      if (best === null || key[id] < key[best] || (key[id] === key[best] && id < best)) best = id;
    }
    if (best === null || key[best] === INF) break;
    open = open.filter((id) => id !== best);
    inTree[best] = true;
    order.push(best);
    const pe = parentEdge[best];
    if (pe) {
      edges.push(pe);
      total += key[best];
    }
    for (const { to, edge } of adj.get(best) ?? []) {
      if (!inTree[to] && edge.weight < key[to]) {
        key[to] = edge.weight;
        parentEdge[to] = edge.id;
      }
    }
  }
  return { edges, total, order };
}

function auxOf(
  graph: GraphModel,
  open: NodeId[],
  key: Record<NodeId, number>,
  parent: Record<NodeId, NodeId | null>,
  inTree: Record<NodeId, boolean>,
  chosen: EdgeId[],
  total: number,
  touched: NodeId | null,
): AuxView[] {
  const sorted = [...open].sort((a, b) => key[a] - key[b] || (a < b ? -1 : 1));
  return [
    {
      kind: 'priorityQueue',
      title: 'תור עדיפויות לפי key',
      items: sorted.map((id) => ({ id, key: key[id] === INF ? null : key[id] })),
      note: 'key הוא משקל הצלע הקלה אל העץ, ולא מרחק מהמקור',
    },
    {
      kind: 'arrayTable',
      title: 'מערכי העזר',
      columns: ['צומת', 'key', 'parent', 'בעץ'],
      rows: graph.nodes.map((n) => ({
        key: n.id,
        values: [n.id, formatValue(key[n.id]), parent[n.id] ?? '-', inTree[n.id] ? 'V' : 'X'],
        highlight: n.id === touched,
      })),
    },
    {
      kind: 'edgeList',
      title: 'צלעות העץ',
      rows: chosen.map((id) => {
        const e = graph.edges.find((x) => x.id === id);
        return {
          id,
          label: e ? edgeLabel(graph, e) : id,
          weight: e?.weight ?? 0,
          status: 'taken' as const,
        };
      }),
      note: `משקל כולל עד כה: ${total}`,
    },
  ];
}

export function primRun(graph: GraphModel, opts: RunOptions): Frame[] {
  const source = opts.source ?? graph.nodes[0]?.id;
  const b = new FrameBuilder(graph);
  if (!source) return b.build();

  const adj = adjacency(graph);
  const key: Record<NodeId, number> = {};
  const parent: Record<NodeId, NodeId | null> = {};
  const parentEdge: Record<NodeId, EdgeId | null> = {};
  const inTree: Record<NodeId, boolean> = {};
  for (const n of graph.nodes) {
    key[n.id] = INF;
    parent[n.id] = null;
    parentEdge[n.id] = null;
    inTree[n.id] = false;
  }
  key[source] = 0;

  let open = graph.nodes.map((n) => n.id);
  const chosen: EdgeId[] = [];
  let total = 0;

  const badges = (): Record<NodeId, string> => {
    const out: Record<NodeId, string> = {};
    for (const n of graph.nodes) out[n.id] = `key=${formatValue(key[n.id])}`;
    return out;
  };

  b.setNode(source, 'frontier');
  b.emit({
    event: 'init',
    message: `אתחול: key של כל הצמתים INF, key[${source}]=0, והעץ עדיין ריק.`,
    aux: auxOf(graph, open, key, parent, inTree, chosen, total, source),
    codeLine: 3,
    focusNode: source,
    nodeBadges: badges(),
    headline: 'אתחול',
  });

  while (open.length > 0) {
    let best: NodeId | null = null;
    for (const id of open) {
      if (best === null || key[id] < key[best] || (key[id] === key[best] && id < best)) best = id;
    }
    if (best === null || key[best] === INF) {
      b.emit({
        event: 'no-change',
        message:
          'כל מה שנשאר בתור אינו מחובר לעץ. הגרף אינו קשיר, ולכן מתקבל עץ פורש של רכיב אחד בלבד.',
        aux: auxOf(graph, open, key, parent, inTree, chosen, total, null),
        codeLine: 4,
        nodeBadges: badges(),
      });
      break;
    }

    const u = best;
    open = open.filter((id) => id !== u);
    inTree[u] = true;
    const pe = parentEdge[u];
    if (pe) {
      chosen.push(pe);
      total += key[u];
      b.setEdge(pe, 'tree');
    }
    b.setNode(u, 'current');
    b.emit({
      event: 'select',
      message: pe
        ? `${u} נכנס לעץ דרך הצלע הקלה ביותר שיוצאת מהעץ, במשקל ${key[u]}. המשקל הכולל עכשיו ${total}.`
        : `מתחילים מ-${source}, שנכנס לעץ בלי צלע.`,
      aux: auxOf(graph, open, key, parent, inTree, chosen, total, u),
      codeLine: 5,
      focusNode: u,
      focusEdge: pe ?? undefined,
      nodeBadges: badges(),
      headline: `${u} נכנס לעץ`,
    });

    for (const { to, edge } of adj.get(u) ?? []) {
      if (inTree[to]) {
        if (b.edgeStates[edge.id] === 'idle') b.setEdge(edge.id, 'rejected');
        b.emit({
          event: 'reject',
          message: `${to} כבר בעץ, ולכן ${edgeLabel(graph, edge)} הייתה סוגרת מעגל ואינה נבדקת.`,
          aux: auxOf(graph, open, key, parent, inTree, chosen, total, to),
          codeLine: 7,
          focusEdge: edge.id,
          focusNode: to,
          nodeBadges: badges(),
        });
        continue;
      }
      if (edge.weight < key[to]) {
        const before = key[to];
        key[to] = edge.weight;
        parent[to] = u;
        parentEdge[to] = edge.id;
        b.setNode(to, 'frontier');
        b.setEdge(edge.id, 'considered');
        b.emit({
          event: 'relax',
          message: `${edgeLabel(graph, edge)} במשקל ${edge.weight} קלה מ-key[${to}]=${formatValue(before)}, ולכן key[${to}]=${edge.weight} ו-parent הוא ${u}.`,
          aux: auxOf(graph, open, key, parent, inTree, chosen, total, to),
          codeLine: 8,
          focusEdge: edge.id,
          focusNode: to,
          nodeBadges: badges(),
        });
      } else {
        if (b.edgeStates[edge.id] === 'idle') b.setEdge(edge.id, 'rejected');
        b.emit({
          event: 'no-change',
          message: `${edgeLabel(graph, edge)} במשקל ${edge.weight} אינה קלה מ-key[${to}]=${formatValue(key[to])}, ולכן אין שינוי.`,
          aux: auxOf(graph, open, key, parent, inTree, chosen, total, to),
          codeLine: 7,
          focusEdge: edge.id,
          focusNode: to,
          nodeBadges: badges(),
        });
      }
    }

    b.setNode(u, 'done');
  }

  for (const n of graph.nodes) if (!inTree[n.id]) b.setNode(n.id, 'rejected');
  for (const id of chosen) b.setEdge(id, 'tree');
  b.clearEdges('considered', 'rejected');

  b.emit({
    event: 'done',
    message: `סיום. העץ מכיל ${chosen.length} צלעות במשקל כולל ${total}. אם יש משקלים שווים, ייתכן עץ אחר בדיוק באותו משקל.`,
    aux: auxOf(graph, open, key, parent, inTree, chosen, total, null),
    codeLine: 10,
    nodeBadges: badges(),
    headline: 'סיום',
  });

  return b.build();
}

export const primModule: AlgorithmModule = {
  id: 'prim',
  titleHe: 'Prim: עץ פורש מינימלי מצומת אחד',
  shortHe: 'Prim',
  requires: ['dijkstra'],
  graphKind: { directed: false, weighted: true, allowNegative: true },
  needsSource: true,
  presetGraphs: [
    {
      id: 'base',
      nameHe: 'הגרף המשותף',
      whyHe: 'אותו גרף ממושקל שעליו רץ Kruskal, כדי לראות שתי דרכי בנייה שונות לאותו משקל כולל.',
      graph: baseWeighted(),
      source: 'A',
    },
    {
      id: 'tie',
      nameHe: 'הגרף עם משקלים שווים',
      whyHe: 'שתי צלעות במשקל 2 יוצרות שני עצים פורשים חוקיים שונים, אבל המשקל הכולל זהה.',
      graph: tieWeights(),
      source: 'P',
    },
  ],
  run: primRun,
  content: primContent,
};
