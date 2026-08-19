import { bellmanFordContent } from '../content/bellmanFord.content';
import { bellmanFocus, negativeCycle } from '../graphs/presets';
import { FrameBuilder, INF, edgeLabel, formatValue } from './engine';
import type {
  AlgorithmModule,
  AuxView,
  EdgeId,
  Frame,
  GraphModel,
  NodeId,
  RunOptions,
} from './types';

export interface BellmanResult {
  dist: Record<NodeId, number>;
  parent: Record<NodeId, NodeId | null>;
  rounds: number;
  negativeCycle: NodeId[] | null;
}


/** מהצומת שהשתפר בסבב V, V צעדים אחורה מגיעים בוודאות אל תוך המעגל עצמו. */
function traceCycle(
  parent: Record<NodeId, NodeId | null>,
  from: NodeId,
  steps: number,
): NodeId[] | null {
  let x: NodeId | null = from;
  for (let i = 0; i < steps; i++) {
    if (x === null) return null;
    x = parent[x];
  }
  if (x === null) return null;
  const start = x;
  const seq: NodeId[] = [start];
  let y = parent[start];
  let guard = 0;
  while (y !== null && y !== start && guard++ < steps + 2) {
    seq.push(y);
    y = parent[y];
  }
  if (y !== start) return null;
  return seq.reverse();
}

export function bellmanCompute(graph: GraphModel, source: NodeId): BellmanResult {
  const dist: Record<NodeId, number> = {};
  const parent: Record<NodeId, NodeId | null> = {};
  for (const n of graph.nodes) {
    dist[n.id] = INF;
    parent[n.id] = null;
  }
  dist[source] = 0;
  let rounds = 0;

  for (let k = 1; k <= graph.nodes.length - 1; k++) {
    let changed = false;
    rounds = k;
    for (const e of graph.edges) {
      if (dist[e.from] === INF) continue;
      if (dist[e.from] + e.weight < dist[e.to]) {
        dist[e.to] = dist[e.from] + e.weight;
        parent[e.to] = e.from;
        changed = true;
      }
    }
    if (!changed) break;
  }

  let hit: NodeId | null = null;
  for (const e of graph.edges) {
    if (dist[e.from] === INF) continue;
    if (dist[e.from] + e.weight < dist[e.to]) {
      hit = e.to;
      parent[e.to] = e.from;
      break;
    }
  }

  let cycle: NodeId[] | null = null;
  if (hit) cycle = traceCycle(parent, hit, graph.nodes.length);

  return { dist, parent, rounds, negativeCycle: cycle };
}

interface History {
  labels: string[];
  values: Record<NodeId, string[]>;
}

function auxOf(
  graph: GraphModel,
  dist: Record<NodeId, number>,
  parent: Record<NodeId, NodeId | null>,
  history: History,
  liveLabel: string | null,
  touched: NodeId | null,
  edgeStatus: Record<EdgeId, 'pending' | 'taken' | 'rejected'>,
): AuxView[] {
  const columns = ['צומת', ...history.labels];
  if (liveLabel) columns.push(liveLabel);
  return [
    {
      kind: 'arrayTable',
      title: 'dist לאורך הסבבים',
      columns,
      rows: graph.nodes.map((n) => {
        const values: (string | number)[] = [n.id, ...(history.values[n.id] ?? [])];
        if (liveLabel) values.push(formatValue(dist[n.id]));
        return { key: n.id, values, highlight: n.id === touched };
      }),
      note: 'כל עמודה היא מצב המערך בסוף סבב. אחרי k סבבים, כל מסלול באורך עד k קשתות כבר מחושב נכון.',
    },
    {
      kind: 'edgeList',
      title: 'סדר הצלעות בסבב',
      rows: graph.edges.map((e) => ({
        id: e.id,
        label: edgeLabel(graph, e),
        weight: e.weight,
        status: edgeStatus[e.id] ?? 'pending',
      })),
      note: 'הסדר קבוע ומוצהר, והוא משפיע רק על קצב ההתכנסות ולא על התוצאה.',
    },
    {
      kind: 'arrayTable',
      title: 'parent',
      columns: ['צומת', 'parent'],
      rows: graph.nodes.map((n) => ({
        key: n.id,
        values: [n.id, parent[n.id] ?? '-'],
        highlight: n.id === touched,
      })),
    },
  ];
}

export function bellmanRun(graph: GraphModel, opts: RunOptions): Frame[] {
  const source = opts.source ?? graph.nodes[0]?.id;
  const b = new FrameBuilder(graph);
  if (!source) return b.build();

  const dist: Record<NodeId, number> = {};
  const parent: Record<NodeId, NodeId | null> = {};
  for (const n of graph.nodes) {
    dist[n.id] = INF;
    parent[n.id] = null;
  }
  dist[source] = 0;

  const history: History = { labels: ['התחלה'], values: {} };
  for (const n of graph.nodes) history.values[n.id] = [formatValue(dist[n.id])];

  let edgeStatus: Record<EdgeId, 'pending' | 'taken' | 'rejected'> = {};
  const badges = (): Record<NodeId, string> => {
    const out: Record<NodeId, string> = {};
    for (const n of graph.nodes) out[n.id] = `d=${formatValue(dist[n.id])}`;
    return out;
  };

  b.setNode(source, 'frontier');
  b.emit({
    event: 'init',
    message: `אתחול: dist[${source}]=0 וכל השאר INF. אין תור וגם אין סדר מיוחד, רק רשימת צלעות קבועה.`,
    aux: auxOf(graph, dist, parent, history, null, source, edgeStatus),
    codeLine: 2,
    focusNode: source,
    nodeBadges: badges(),
    headline: 'אתחול',
  });

  const V = graph.nodes.length;
  let stoppedEarly = false;
  let usedRounds = 0;

  for (let k = 1; k <= V - 1; k++) {
    usedRounds = k;
    edgeStatus = {};
    b.clearEdges('relaxed', 'idle');
    b.clearEdges('rejected', 'idle');
    b.emit({
      event: 'iteration',
      message: `סבב ${k} מתוך ${V - 1}. עוברים על כל הצלעות בסדר הקבוע ומנסים relax.`,
      aux: auxOf(graph, dist, parent, history, `סבב ${k}`, null, edgeStatus),
      codeLine: 3,
      nodeBadges: badges(),
      headline: `סבב ${k}`,
    });

    let changed = false;
    for (const e of graph.edges) {
      const from = dist[e.from];
      if (from !== INF && from + e.weight < dist[e.to]) {
        const before = dist[e.to];
        dist[e.to] = from + e.weight;
        parent[e.to] = e.from;
        changed = true;
        edgeStatus[e.id] = 'taken';
        b.setEdge(e.id, 'relaxed');
        b.setNode(e.to, 'frontier');
        b.emit({
          event: 'relax',
          message: `relax על ${edgeLabel(graph, e)}: ${formatValue(from)} ועוד ${e.weight} קטן מ-${formatValue(before)}, ולכן dist[${e.to}]=${dist[e.to]}.`,
          aux: auxOf(graph, dist, parent, history, `סבב ${k}`, e.to, edgeStatus),
          codeLine: 7,
          focusEdge: e.id,
          focusNode: e.to,
          nodeBadges: badges(),
        });
      } else {
        edgeStatus[e.id] = 'rejected';
        if (b.edgeStates[e.id] === 'idle') b.setEdge(e.id, 'rejected');
        b.emit({
          event: 'no-change',
          message:
            from === INF
              ? `${e.from} עדיין INF, ולכן ${edgeLabel(graph, e)} לא יכולה לשפר כלום בסבב הזה.`
              : `${edgeLabel(graph, e)} לא משפר: ${formatValue(from)} ועוד ${e.weight} אינו קטן מ-${formatValue(dist[e.to])}.`,
          aux: auxOf(graph, dist, parent, history, `סבב ${k}`, e.to, edgeStatus),
          codeLine: 6,
          focusEdge: e.id,
          focusNode: e.to,
          nodeBadges: badges(),
        });
      }
    }

    history.labels.push(`סבב ${k}`);
    for (const n of graph.nodes) history.values[n.id].push(formatValue(dist[n.id]));

    if (!changed) {
      stoppedEarly = true;
      b.emit({
        event: 'no-change',
        message: `בסבב ${k} לא היה אף שיפור, ולכן אפשר לעצור מוקדם. סבבים נוספים לא ישנו כלום.`,
        aux: auxOf(graph, dist, parent, history, null, null, edgeStatus),
        codeLine: 8,
        nodeBadges: badges(),
        headline: 'עצירה מוקדמת',
      });
      break;
    }
  }

  edgeStatus = {};
  b.clearEdges('relaxed', 'idle');
  b.clearEdges('rejected', 'idle');
  b.emit({
    event: 'iteration',
    message: `סבב מספר ${V}, סבב הבדיקה. אם עדיין אפשר לשפר משהו, סימן שיש מעגל שלילי.`,
    aux: auxOf(graph, dist, parent, history, null, null, edgeStatus),
    codeLine: 9,
    nodeBadges: badges(),
    headline: 'בדיקת מעגל שלילי',
  });

  let hit: { id: EdgeId; to: NodeId } | null = null;
  for (const e of graph.edges) {
    if (dist[e.from] !== INF && dist[e.from] + e.weight < dist[e.to]) {
      hit = { id: e.id, to: e.to };
      parent[e.to] = e.from;
      break;
    }
  }

  const cycle = hit ? traceCycle(parent, hit.to, V) : null;
  if (hit && cycle) {
    const cycleEdges: EdgeId[] = [];
    let weightSum = 0;
    for (let i = 0; i < cycle.length; i++) {
      const from = cycle[i];
      const to = cycle[(i + 1) % cycle.length];
      const e = graph.edges.find((x2) => x2.from === from && x2.to === to);
      if (e) {
        cycleEdges.push(e.id);
        weightSum += e.weight;
        b.setEdge(e.id, 'relaxed');
      }
    }
    for (const n of graph.nodes) b.setNode(n.id, cycle.includes(n.id) ? 'current' : 'rejected');
    b.emit({
      event: 'done',
      message: `בסבב ${V} עדיין היה שיפור על ${hit.id}. יש מעגל שלילי: ${cycle.join(' אל ')} אל ${cycle[0]}, בסכום ${weightSum}. לכן אין מסלול קצר ביותר מוגדר.`,
      aux: auxOf(graph, dist, parent, history, null, hit.to, edgeStatus),
      codeLine: 10,
      nodeBadges: badges(),
      pathEdges: cycleEdges,
      headline: 'נמצא מעגל שלילי',
    });
    return b.build();
  }

  for (const n of graph.nodes) b.setNode(n.id, dist[n.id] === INF ? 'rejected' : 'done');
  for (const n of graph.nodes) {
    const p = parent[n.id];
    if (!p) continue;
    const e = graph.edges.find((x) => x.from === p && x.to === n.id);
    if (e) b.setEdge(e.id, 'tree');
  }
  b.emit({
    event: 'done',
    message: `אין מעגל שלילי. ${stoppedEarly ? `הערכים התייצבו כבר אחרי ${usedRounds} סבבים` : `נדרשו ${usedRounds} סבבים`}, וכל dist הוא המרחק הקצר ביותר מהמקור.`,
    aux: auxOf(graph, dist, parent, history, null, null, edgeStatus),
    codeLine: 11,
    nodeBadges: badges(),
    headline: 'סיום',
  });

  return b.build();
}

export const bellmanFordModule: AlgorithmModule = {
  id: 'bellman-ford',
  titleHe: 'Bellman-Ford: מסלולים קצרים עם משקלים שליליים',
  shortHe: 'Bellman-Ford',
  requires: ['dijkstra'],
  graphKind: { directed: true, weighted: true, allowNegative: true },
  needsSource: true,
  presetGraphs: [
    {
      id: 'focus',
      nameHe: 'הגרף הממוקד',
      whyHe: 'יש כאן משקל שלילי בלי מעגל שלילי, בדיוק המקרה ש-Dijkstra נכשל בו ו-Bellman-Ford פותר.',
      graph: bellmanFocus(),
      source: 'S',
    },
    {
      id: 'cycle',
      nameHe: 'הגרף עם מעגל שלילי',
      whyHe: 'סכום המעגל הוא מינוס 2, ולכן סבב הבדיקה מספר V מגלה שיפור נוסף ומדווח על מעגל שלילי.',
      graph: negativeCycle(),
      source: 'S',
    },
  ],
  run: bellmanRun,
  content: bellmanFordContent,
};
