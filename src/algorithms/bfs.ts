import { bfsContent } from '../content/bfs.content';
import { baseUnweighted, bfsShortcut } from '../graphs/presets';
import { FrameBuilder, INF, adjacency, formatValue } from './engine';
import type { AlgorithmModule, AuxView, Frame, GraphModel, NodeId, RunOptions } from './types';

interface BfsResult {
  dist: Record<NodeId, number>;
  parent: Record<NodeId, NodeId | null>;
  order: NodeId[];
}

/** Pure computation, no frames. Also used by the tests. */
export function bfsCompute(graph: GraphModel, source: NodeId): BfsResult {
  const adj = adjacency(graph);
  const dist: Record<NodeId, number> = {};
  const parent: Record<NodeId, NodeId | null> = {};
  for (const n of graph.nodes) {
    dist[n.id] = INF;
    parent[n.id] = null;
  }
  dist[source] = 0;
  const queue: NodeId[] = [source];
  const order: NodeId[] = [];
  while (queue.length > 0) {
    const u = queue.shift() as NodeId;
    order.push(u);
    for (const { to } of adj.get(u) ?? []) {
      if (dist[to] === INF) {
        dist[to] = dist[u] + 1;
        parent[to] = u;
        queue.push(to);
      }
    }
  }
  return { dist, parent, order };
}

function auxOf(
  graph: GraphModel,
  queue: NodeId[],
  dist: Record<NodeId, number>,
  parent: Record<NodeId, NodeId | null>,
  touched: NodeId | null,
): AuxView[] {
  return [
    {
      kind: 'queue',
      title: 'תור FIFO',
      items: [...queue],
      headIndex: 0,
      note: 'יוצא מהראש, נכנס לזנב',
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

function badges(dist: Record<NodeId, number>): Record<NodeId, string> {
  const out: Record<NodeId, string> = {};
  for (const [id, v] of Object.entries(dist)) {
    if (v !== INF) out[id] = `d=${v}`;
  }
  return out;
}

export function bfsRun(graph: GraphModel, opts: RunOptions): Frame[] {
  const source = opts.source ?? graph.nodes[0]?.id;
  const b = new FrameBuilder(graph);
  if (!source) return b.build();

  const adj = adjacency(graph);
  const dist: Record<NodeId, number> = {};
  const parent: Record<NodeId, NodeId | null> = {};
  for (const n of graph.nodes) {
    dist[n.id] = INF;
    parent[n.id] = null;
  }
  dist[source] = 0;
  const queue: NodeId[] = [source];
  b.setNode(source, 'frontier');
  b.emit({
    event: 'init',
    message: `אתחול: dist של כל הצמתים INF, dist[${source}]=0, והתור מכיל רק את ${source}.`,
    aux: auxOf(graph, queue, dist, parent, source),
    codeLine: 2,
    focusNode: source,
    nodeBadges: badges(dist),
    headline: 'אתחול',
  });

  while (queue.length > 0) {
    const u = queue.shift() as NodeId;
    b.setNode(u, 'current');
    b.emit({
      event: 'visit',
      message: `מוציאים מהתור את ${u} במרחק ${dist[u]}. עכשיו סורקים את שכניו בסדר אלפביתי.`,
      aux: auxOf(graph, queue, dist, parent, u),
      codeLine: 4,
      focusNode: u,
      nodeBadges: badges(dist),
      headline: `ביקור ב-${u}`,
    });

    for (const { to, edge } of adj.get(u) ?? []) {
      if (dist[to] === INF) {
        dist[to] = dist[u] + 1;
        parent[to] = u;
        queue.push(to);
        b.setNode(to, 'frontier');
        b.setEdge(edge.id, 'tree');
        b.emit({
          event: 'discover',
          message: `${to} מתגלה לראשונה דרך ${u}, ולכן dist[${to}]=${dist[to]} וזה כבר המרחק הסופי שלו.`,
          aux: auxOf(graph, queue, dist, parent, to),
          codeLine: 7,
          focusNode: to,
          focusEdge: edge.id,
          nodeBadges: badges(dist),
        });
      } else {
        if (b.edgeStates[edge.id] === 'idle') b.setEdge(edge.id, 'rejected');
        b.emit({
          event: 'reject',
          message: `${to} כבר התגלה קודם עם dist=${formatValue(dist[to])}, ולכן הצלע הזו אינה מוסיפה כלום.`,
          aux: auxOf(graph, queue, dist, parent, to),
          codeLine: 6,
          focusNode: to,
          focusEdge: edge.id,
          nodeBadges: badges(dist),
        });
      }
    }

    b.setNode(u, 'done');
  }

  b.emit({
    event: 'done',
    message: 'התור התרוקן. כל צומת נגיש קיבל את המרחק הקצר ביותר בקשתות מהמקור.',
    aux: auxOf(graph, queue, dist, parent, null),
    codeLine: 9,
    nodeBadges: badges(dist),
    headline: 'סיום',
  });

  return b.build();
}

export const bfsModule: AlgorithmModule = {
  id: 'bfs',
  titleHe: 'BFS: חיפוש לרוחב',
  shortHe: 'BFS',
  requires: [],
  graphKind: { directed: false, weighted: false, allowNegative: false },
  needsSource: true,
  presetGraphs: [
    {
      id: 'base',
      nameHe: 'הגרף המשותף',
      whyHe: 'אותו גרף חוזר בכל האלגוריתמים, כדי שאפשר יהיה להשוות ביניהם על אותו נתון.',
      graph: baseUnweighted(),
      source: 'A',
    },
    {
      id: 'shortcut',
      nameHe: 'הגרף הממוקד',
      whyHe: 'כאן יש קיצור דרך אחד מול שרשרת ארוכה, וזה מראה שהגילוי הראשון הוא כבר הסופי.',
      graph: bfsShortcut(),
      source: 'S',
    },
  ],
  run: bfsRun,
  content: bfsContent,
};
