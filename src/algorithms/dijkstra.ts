import { dijkstraContent } from '../content/dijkstra.content';
import { baseWeighted, dijkstraFocus, negativeEdge } from '../graphs/presets';
import { FrameBuilder, INF, adjacency, edgeLabel, formatValue } from './engine';
import type { AlgorithmModule, AuxView, Frame, GraphModel, NodeId, RunOptions } from './types';

export interface DijkstraResult {
  dist: Record<NodeId, number>;
  parent: Record<NodeId, NodeId | null>;
  order: NodeId[];
}

export function dijkstraCompute(graph: GraphModel, source: NodeId): DijkstraResult {
  const adj = adjacency(graph);
  const dist: Record<NodeId, number> = {};
  const parent: Record<NodeId, NodeId | null> = {};
  const closed = new Set<NodeId>();
  for (const n of graph.nodes) {
    dist[n.id] = INF;
    parent[n.id] = null;
  }
  dist[source] = 0;
  const order: NodeId[] = [];

  while (closed.size < graph.nodes.length) {
    let best: NodeId | null = null;
    for (const n of graph.nodes) {
      if (closed.has(n.id)) continue;
      if (best === null || dist[n.id] < dist[best] || (dist[n.id] === dist[best] && n.id < best)) {
        best = n.id;
      }
    }
    if (best === null || dist[best] === INF) break;
    closed.add(best);
    order.push(best);
    for (const { to, edge } of adj.get(best) ?? []) {
      if (closed.has(to)) continue;
      const cand = dist[best] + edge.weight;
      if (cand < dist[to]) {
        dist[to] = cand;
        parent[to] = best;
      }
    }
  }
  return { dist, parent, order };
}

function auxOf(
  graph: GraphModel,
  open: NodeId[],
  dist: Record<NodeId, number>,
  parent: Record<NodeId, NodeId | null>,
  closed: Set<NodeId>,
  touched: NodeId | null,
): AuxView[] {
  const sorted = [...open].sort((a, b) => dist[a] - dist[b] || (a < b ? -1 : 1));
  return [
    {
      kind: 'priorityQueue',
      title: 'תור עדיפויות לפי dist',
      items: sorted.map((id) => ({ id, key: dist[id] === INF ? null : dist[id] })),
      note: 'המינימום נמצא בקצה הימני ויוצא הבא',
    },
    {
      kind: 'setView',
      title: 'הצמתים הסגורים',
      items: [...closed],
      note: 'צומת שנסגר, ה-dist שלו סופי',
    },
    {
      kind: 'arrayTable',
      title: 'מערכי העזר',
      columns: ['צומת', 'dist', 'parent'],
      rows: graph.nodes.map((n) => ({
        key: n.id,
        values: [n.id, formatValue(dist[n.id]), parent[n.id] ?? '-'],
        highlight: n.id === touched,
      })),
    },
  ];
}

export function dijkstraRun(graph: GraphModel, opts: RunOptions): Frame[] {
  const source = opts.source ?? graph.nodes[0]?.id;
  const b = new FrameBuilder(graph);
  if (!source) return b.build();

  const adj = adjacency(graph);
  const dist: Record<NodeId, number> = {};
  const parent: Record<NodeId, NodeId | null> = {};
  const treeEdge: Record<NodeId, string | null> = {};
  for (const n of graph.nodes) {
    dist[n.id] = INF;
    parent[n.id] = null;
    treeEdge[n.id] = null;
  }
  dist[source] = 0;
  const closed = new Set<NodeId>();
  let open = graph.nodes.map((n) => n.id);

  const badges = (): Record<NodeId, string> => {
    const out: Record<NodeId, string> = {};
    for (const n of graph.nodes) out[n.id] = `d=${formatValue(dist[n.id])}`;
    return out;
  };

  b.setNode(source, 'frontier');
  b.emit({
    event: 'init',
    message: `אתחול: dist[${source}]=0, כל השאר INF, וכל הצמתים בתור העדיפויות.`,
    aux: auxOf(graph, open, dist, parent, closed, source),
    codeLine: 3,
    focusNode: source,
    nodeBadges: badges(),
    headline: 'אתחול',
  });

  while (open.length > 0) {
    let best: NodeId | null = null;
    for (const id of open) {
      if (best === null || dist[id] < dist[best] || (dist[id] === dist[best] && id < best)) {
        best = id;
      }
    }
    if (best === null || dist[best] === INF) {
      b.emit({
        event: 'no-change',
        message: 'כל מה שנשאר בתור הוא במרחק INF, כלומר לא נגיש מהמקור. עוצרים.',
        aux: auxOf(graph, open, dist, parent, closed, null),
        codeLine: 5,
        nodeBadges: badges(),
      });
      break;
    }

    const u = best;
    open = open.filter((id) => id !== u);
    closed.add(u);
    b.setNode(u, 'current');
    if (treeEdge[u]) b.setEdge(treeEdge[u] as string, 'tree');
    b.emit({
      event: 'select',
      message: `${u} הוא המינימום בתור עם dist=${formatValue(dist[u])}. הוא נסגר, והערך שלו סופי.`,
      aux: auxOf(graph, open, dist, parent, closed, u),
      codeLine: 6,
      focusNode: u,
      nodeBadges: badges(),
      headline: `סגירת ${u}`,
    });

    for (const { to, edge } of adj.get(u) ?? []) {
      const cand = dist[u] + edge.weight;
      if (closed.has(to)) {
        if (b.edgeStates[edge.id] === 'idle') b.setEdge(edge.id, 'rejected');
        b.emit({
          event: 'reject',
          message:
            cand < dist[to]
              ? `${to} כבר סגור, ולכן Dijkstra אינו חוזר אליו. שים לב שהמסלול דרך ${u} היה נותן ${cand} במקום ${formatValue(dist[to])}, וכאן בדיוק נולדת התוצאה השגויה.`
              : `${to} כבר סגור והערך שלו סופי, ולכן אין טעם לבדוק את ${edgeLabel(graph, edge)} שוב.`,
          aux: auxOf(graph, open, dist, parent, closed, to),
          codeLine: 8,
          focusEdge: edge.id,
          focusNode: to,
          nodeBadges: badges(),
        });
        continue;
      }
      if (cand < dist[to]) {
        const before = dist[to];
        dist[to] = cand;
        if (treeEdge[to]) b.setEdge(treeEdge[to] as string, 'idle');
        parent[to] = u;
        treeEdge[to] = edge.id;
        b.setEdge(edge.id, 'relaxed');
        b.setNode(to, 'frontier');
        b.emit({
          event: 'relax',
          message: `relax מוצלח על ${edgeLabel(graph, edge)}: ${formatValue(dist[u])} ועוד ${edge.weight} קטן מ-${formatValue(before)}, ולכן dist[${to}]=${cand}.`,
          aux: auxOf(graph, open, dist, parent, closed, to),
          codeLine: 10,
          focusEdge: edge.id,
          focusNode: to,
          nodeBadges: badges(),
        });
        b.setEdge(edge.id, 'considered');
      } else {
        if (b.edgeStates[edge.id] === 'idle') b.setEdge(edge.id, 'rejected');
        b.emit({
          event: 'no-change',
          message: `${edgeLabel(graph, edge)} לא משפר: ${formatValue(dist[u])} ועוד ${edge.weight} אינו קטן מ-${formatValue(dist[to])}.`,
          aux: auxOf(graph, open, dist, parent, closed, to),
          codeLine: 9,
          focusEdge: edge.id,
          focusNode: to,
          nodeBadges: badges(),
        });
      }
    }

    b.setNode(u, 'done');
    if (treeEdge[u]) b.setEdge(treeEdge[u] as string, 'tree');
  }

  for (const n of graph.nodes) {
    if (!closed.has(n.id)) b.setNode(n.id, 'rejected');
    else b.setNode(n.id, 'done');
  }
  for (const n of graph.nodes) {
    const e = treeEdge[n.id];
    if (e && closed.has(n.id)) b.setEdge(e, 'tree');
  }

  const hasNegative = graph.edges.some((e) => e.weight < 0);
  b.emit({
    event: 'done',
    message: hasNegative
      ? 'התור התרוקן. שים לב: יש בגרף משקל שלילי, ולכן חלק מהערכים כאן שגויים למרות שהאלגוריתם סיים.'
      : 'התור התרוקן. כל צומת נגיש נסגר עם המרחק הקצר ביותר מהמקור.',
    aux: auxOf(graph, open, dist, parent, closed, null),
    codeLine: 12,
    nodeBadges: badges(),
    headline: 'סיום',
  });

  return b.build();
}

export const dijkstraModule: AlgorithmModule = {
  id: 'dijkstra',
  titleHe: 'Dijkstra: מסלולים קצרים ממקור יחיד',
  shortHe: 'Dijkstra',
  requires: ['bfs'],
  graphKind: { directed: true, weighted: true, allowNegative: false },
  needsSource: true,
  presetGraphs: [
    {
      id: 'focus',
      nameHe: 'הגרף הממוקד',
      whyHe: 'כל המשקלים חיוביים, ויש כאן שלושה שיפורי relax אמיתיים שרואים בהרצה.',
      graph: dijkstraFocus(),
      source: 'S',
    },
    {
      id: 'negative',
      nameHe: 'הגרף עם משקל שלילי',
      whyHe: 'כאן משקל שלילי אחד הופך את Dijkstra לשגוי: A ייסגר על 3 למרות שהמרחק האמיתי הוא 1.',
      graph: negativeEdge(),
      source: 'S',
    },
    {
      id: 'base',
      nameHe: 'הגרף המשותף',
      whyHe: 'הגרף הממושקל הלא מכוון, כדי להשוות את התוצאה מול Prim על אותם נתונים.',
      graph: baseWeighted(),
      source: 'A',
    },
  ],
  run: dijkstraRun,
  content: dijkstraContent,
};
