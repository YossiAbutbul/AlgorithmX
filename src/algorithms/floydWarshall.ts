import { floydContent } from '../content/floydWarshall.content';
import { baseWeighted, floydFocus } from '../graphs/presets';
import { FrameBuilder, INF } from './engine';
import type { AlgorithmModule, AuxView, Frame, GraphModel, NodeId, RunOptions } from './types';

export interface FloydResult {
  labels: NodeId[];
  dist: number[][];
  next: (NodeId | null)[][];
}

function initMatrices(graph: GraphModel): FloydResult {
  const labels = graph.nodes.map((n) => n.id);
  const dist: number[][] = labels.map((_, i) => labels.map((__, j) => (i === j ? 0 : INF)));
  const next: (NodeId | null)[][] = labels.map(() => labels.map(() => null));
  const idx = new Map(labels.map((id, i) => [id, i]));

  for (const e of graph.edges) {
    const i = idx.get(e.from);
    const j = idx.get(e.to);
    if (i === undefined || j === undefined) continue;
    if (e.weight < dist[i][j]) {
      dist[i][j] = e.weight;
      next[i][j] = e.to;
    }
    if (!graph.directed && e.weight < dist[j][i]) {
      dist[j][i] = e.weight;
      next[j][i] = e.from;
    }
  }
  return { labels, dist, next };
}

export function floydCompute(graph: GraphModel): FloydResult {
  const { labels, dist, next } = initMatrices(graph);
  const n = labels.length;
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] === INF || dist[k][j] === INF) continue;
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
          next[i][j] = next[i][k];
        }
      }
    }
  }
  return { labels, dist, next };
}

function toCells(dist: number[][]): (number | null)[][] {
  return dist.map((row) => row.map((v) => (v === INF ? null : v)));
}

function auxOf(
  labels: NodeId[],
  dist: number[][],
  k: number | null,
  changed: [number, number][],
  note: string,
): AuxView[] {
  const views: AuxView[] = [
    {
      kind: 'matrix',
      title: 'מטריצת dist',
      labels,
      cells: toCells(dist),
      changed,
      highlightRow: k ?? undefined,
      highlightCol: k ?? undefined,
      note,
    },
  ];
  return views;
}

export function floydRun(graph: GraphModel, opts: RunOptions): Frame[] {
  const b = new FrameBuilder(graph);
  const { labels, dist, next } = initMatrices(graph);
  const n = labels.length;
  const showAll = opts.showNoChange ?? false;

  b.emit({
    event: 'init',
    message:
      'אתחול: באלכסון אפס, בכל תא שיש בו צלע ישירה המשקל שלה, ובכל שאר התאים INF. אין עדיין צמתי ביניים מותרים.',
    aux: auxOf(labels, dist, null, [], 'k עוד לא התחיל. מותר להשתמש רק בצלעות ישירות.'),
    codeLine: 3,
    headline: 'אתחול',
  });

  let skipped = 0;

  for (let k = 0; k < n; k++) {
    const kid = labels[k];
    for (const id of labels) b.setNode(id, 'idle');
    b.setNode(kid, 'current');
    b.emit({
      event: 'iteration',
      message: `k=${kid}. מעכשיו מותר להשתמש ב-${labels.slice(0, k + 1).join(', ')} כצמתי ביניים. השורה והעמודה של ${kid} הן הבסיס לכל השיפורים בסבב הזה.`,
      aux: auxOf(
        labels,
        dist,
        k,
        [],
        `כל תא נבדק מול המסלול דרך ${kid}, כלומר dist[i][${kid}] ועוד dist[${kid}][j].`,
      ),
      codeLine: 4,
      focusNode: kid,
      headline: `k = ${kid}`,
    });

    let changesInRound = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const viaK =
          dist[i][k] === INF || dist[k][j] === INF ? INF : dist[i][k] + dist[k][j];
        const improves = viaK < dist[i][j];

        if (!improves) {
          skipped++;
          if (showAll) {
            b.emit({
              event: 'no-change',
              message: `i=${labels[i]}, j=${labels[j]}: המסלול דרך ${kid} אינו משפר את הערך הקיים.`,
              aux: auxOf(labels, dist, k, [], 'צעד ללא שינוי'),
              codeLine: 7,
            });
          }
          continue;
        }

        const before = dist[i][j];
        dist[i][j] = viaK;
        next[i][j] = next[i][k];
        changesInRound++;

        for (const id of labels) b.setNode(id, 'idle');
        b.setNode(kid, 'current');
        b.setNode(labels[i], 'frontier');
        b.setNode(labels[j], 'done');

        const ikEdge = graph.edges.find(
          (e) =>
            (e.from === labels[i] && e.to === kid) ||
            (!graph.directed && e.from === kid && e.to === labels[i]),
        );
        const kjEdge = graph.edges.find(
          (e) =>
            (e.from === kid && e.to === labels[j]) ||
            (!graph.directed && e.from === labels[j] && e.to === kid),
        );
        b.clearEdges('considered', 'idle');
        if (ikEdge) b.setEdge(ikEdge.id, 'considered');
        if (kjEdge) b.setEdge(kjEdge.id, 'considered');

        b.emit({
          event: 'relax',
          message: `i=${labels[i]}, j=${labels[j]}: דרך ${kid} מקבלים ${dist[i][k]} ועוד ${dist[k][j]} שהם ${viaK}, וזה קטן מ-${before === INF ? 'INF' : before}. מעדכנים את התא.`,
          aux: auxOf(
            labels,
            dist,
            k,
            [[i, j]],
            `המסלול שנמצא הוא ${labels[i]} אל ${kid} אל ${labels[j]}.`,
          ),
          codeLine: 9,
          focusNode: kid,
          pathEdges: [ikEdge?.id, kjEdge?.id].filter((x): x is string => !!x),
        });
      }
    }

    if (changesInRound === 0) {
      b.emit({
        event: 'no-change',
        message: `בסבב k=${kid} לא השתנה אף תא. הצומת הזה אינו משמש כצומת ביניים משתלם לאף זוג.`,
        aux: auxOf(labels, dist, k, [], 'סבב ללא שינוי'),
        codeLine: 7,
      });
    }
  }

  const negativeDiagonal: NodeId[] = [];
  for (let i = 0; i < n; i++) if (dist[i][i] < 0) negativeDiagonal.push(labels[i]);

  b.clearEdges('considered', 'idle');
  for (const id of labels) b.setNode(id, 'done');
  b.emit({
    event: 'done',
    message:
      negativeDiagonal.length > 0
        ? `סיום. באלכסון יש ערך שלילי עבור ${negativeDiagonal.join(', ')}, וזה סימן ודאי למעגל שלילי.`
        : `סיום. המטריצה מכילה עכשיו את המרחק הקצר ביותר בין כל זוג צמתים.${showAll ? '' : ` דילגנו על ${skipped} צעדים שלא שינו כלום.`}`,
    aux: auxOf(labels, dist, null, [], 'כל הצמתים מותרים כצמתי ביניים.'),
    codeLine: 10,
    headline: 'סיום',
  });

  return b.build();
}

export const floydModule: AlgorithmModule = {
  id: 'floyd-warshall',
  titleHe: 'Floyd-Warshall: מסלולים בין כל הזוגות',
  shortHe: 'Floyd-Warshall',
  requires: ['bellman-ford'],
  graphKind: { directed: true, weighted: true, allowNegative: true },
  needsSource: false,
  showNoChangeToggle: true,
  presetGraphs: [
    {
      id: 'focus',
      nameHe: 'הגרף הממוקד',
      whyHe: 'ארבעה צמתים בלבד, כדי שהמטריצה תהיה קריאה ושכל שיפור יהיה גלוי לעין.',
      graph: floydFocus(),
    },
    {
      id: 'base',
      nameHe: 'הגרף המשותף',
      whyHe: 'הגרף הממושקל הלא מכוון, כדי לראות איך נראית המטריצה כשהיא סימטרית.',
      graph: baseWeighted(),
    },
  ],
  run: floydRun,
  content: floydContent,
};
