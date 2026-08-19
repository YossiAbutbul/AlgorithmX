import { dfsContent } from '../content/dfs.content';
import { baseUnweighted, dfsDirected } from '../graphs/presets';
import { FrameBuilder, adjacency, edgeLabel } from './engine';
import type { AlgorithmModule, AuxView, Frame, GraphModel, NodeId, RunOptions } from './types';

export type EdgeClass = 'tree' | 'back' | 'forward' | 'cross';

const CLASS_HE: Record<EdgeClass, string> = {
  tree: 'tree',
  back: 'back',
  forward: 'forward',
  cross: 'cross',
};

export interface DfsResult {
  discovery: Record<NodeId, number>;
  finish: Record<NodeId, number>;
  parent: Record<NodeId, NodeId | null>;
  classes: Record<string, EdgeClass>;
  order: NodeId[];
  topological: NodeId[];
  hasBackEdge: boolean;
}

export function dfsCompute(graph: GraphModel, start?: NodeId): DfsResult {
  const adj = adjacency(graph);
  const color: Record<NodeId, 'white' | 'gray' | 'black'> = {};
  const discovery: Record<NodeId, number> = {};
  const finish: Record<NodeId, number> = {};
  const parent: Record<NodeId, NodeId | null> = {};
  const classes: Record<string, EdgeClass> = {};
  const order: NodeId[] = [];
  const finishOrder: NodeId[] = [];
  let time = 0;
  for (const n of graph.nodes) {
    color[n.id] = 'white';
    parent[n.id] = null;
  }

  const visit = (u: NodeId) => {
    color[u] = 'gray';
    discovery[u] = ++time;
    order.push(u);
    for (const { to, edge } of adj.get(u) ?? []) {
      if (color[to] === 'white') {
        parent[to] = u;
        classes[edge.id] = 'tree';
        visit(to);
      } else if (classes[edge.id] === undefined) {
        if (color[to] === 'gray') {
          if (graph.directed || parent[u] !== to) classes[edge.id] = 'back';
        } else {
          classes[edge.id] = discovery[u] < discovery[to] ? 'forward' : 'cross';
        }
      }
    }
    color[u] = 'black';
    finish[u] = ++time;
    finishOrder.push(u);
  };

  const roots = start ? [start, ...graph.nodes.map((n) => n.id)] : graph.nodes.map((n) => n.id);
  for (const id of roots) if (color[id] === 'white') visit(id);

  const hasBackEdge = Object.values(classes).some((c) => c === 'back');
  return {
    discovery,
    finish,
    parent,
    classes,
    order,
    topological: [...finishOrder].reverse(),
    hasBackEdge,
  };
}

function auxOf(
  graph: GraphModel,
  stack: NodeId[],
  discovery: Record<NodeId, number>,
  finish: Record<NodeId, number>,
  color: Record<NodeId, string>,
  parent: Record<NodeId, NodeId | null>,
  classes: Record<string, EdgeClass>,
  touched: NodeId | null,
): AuxView[] {
  const colorHe: Record<string, string> = { white: 'לבן', gray: 'אפור', black: 'שחור' };
  const views: AuxView[] = [
    {
      kind: 'stack',
      title: 'מחסנית הרקורסיה',
      items: [...stack],
      note: 'הצמתים האפורים, אלה שנפתחו וטרם נסגרו',
    },
    {
      kind: 'arrayTable',
      title: 'זמני גילוי וסיום',
      columns: ['צומת', 'd', 'f', 'צבע', 'parent'],
      rows: graph.nodes.map((n) => ({
        key: n.id,
        values: [
          n.id,
          discovery[n.id] ?? '-',
          finish[n.id] ?? '-',
          colorHe[color[n.id]],
          parent[n.id] ?? '-',
        ],
        highlight: n.id === touched,
      })),
    },
  ];

  const classified = graph.edges.filter((e) => classes[e.id]);
  if (classified.length > 0) {
    views.push({
      kind: 'arrayTable',
      title: 'סיווג הצלעות',
      columns: ['צלע', 'סוג'],
      rows: classified.map((e) => ({
        key: e.id,
        values: [edgeLabel(graph, e), CLASS_HE[classes[e.id]]],
      })),
      note: graph.directed
        ? 'forward ו-cross קיימים רק בגרף מכוון'
        : 'בגרף לא מכוון יש רק tree ו-back',
    });
  }
  return views;
}

export function dfsRun(graph: GraphModel, opts: RunOptions): Frame[] {
  const b = new FrameBuilder(graph);
  const adj = adjacency(graph);
  const color: Record<NodeId, 'white' | 'gray' | 'black'> = {};
  const discovery: Record<NodeId, number> = {};
  const finish: Record<NodeId, number> = {};
  const parent: Record<NodeId, NodeId | null> = {};
  const classes: Record<string, EdgeClass> = {};
  const stack: NodeId[] = [];
  let time = 0;

  for (const n of graph.nodes) {
    color[n.id] = 'white';
    parent[n.id] = null;
  }

  const badges = (): Record<NodeId, string> => {
    const out: Record<NodeId, string> = {};
    for (const n of graph.nodes) {
      const d = discovery[n.id];
      if (d === undefined) continue;
      out[n.id] = `${d}/${finish[n.id] ?? '?'}`;
    }
    return out;
  };

  const aux = (touched: NodeId | null) =>
    auxOf(graph, stack, discovery, finish, color, parent, classes, touched);

  b.emit({
    event: 'init',
    message: 'אתחול: כל הצמתים לבנים, השעון על אפס, ואף צלע עוד לא סווגה.',
    aux: aux(null),
    codeLine: 1,
    headline: 'אתחול',
  });

  const visit = (u: NodeId) => {
    color[u] = 'gray';
    discovery[u] = ++time;
    stack.push(u);
    b.setNode(u, 'current');
    b.emit({
      event: 'visit',
      message: `נכנסים ל-${u}. הצומת נצבע אפור וזמן הגילוי שלו הוא d=${discovery[u]}.`,
      aux: aux(u),
      codeLine: 7,
      focusNode: u,
      nodeBadges: badges(),
      headline: `כניסה ל-${u}`,
    });

    for (const { to, edge } of adj.get(u) ?? []) {
      if (color[to] === 'white') {
        parent[to] = u;
        classes[edge.id] = 'tree';
        b.setEdge(edge.id, 'tree');
        b.emit({
          event: 'discover',
          message: `הצלע ${edgeLabel(graph, edge)} מובילה לצומת לבן, ולכן היא tree edge והרקורסיה יורדת ל-${to}.`,
          aux: aux(to),
          codeLine: 10,
          focusEdge: edge.id,
          focusNode: to,
          nodeBadges: badges(),
        });
        b.setNode(u, 'frontier');
        visit(to);
        b.setNode(u, 'current');
      } else if (classes[edge.id] === undefined) {
        let cls: EdgeClass | null = null;
        let why = '';
        if (color[to] === 'gray') {
          if (graph.directed || parent[u] !== to) {
            cls = 'back';
            why = graph.directed
              ? `${to} עדיין אפור, כלומר הוא אב קדמון בעץ. זו back edge, וקיומה מעיד על מעגל.`
              : `${to} עדיין אפור ואינו האב הישיר, ולכן זו back edge ויש מעגל.`;
          } else {
            why = `${to} הוא האב הישיר של ${u}. בגרף לא מכוון זו אינה back edge אמיתית, אלא אותה צלע מהכיוון ההפוך.`;
          }
        } else {
          cls = discovery[u] < discovery[to] ? 'forward' : 'cross';
          why =
            cls === 'forward'
              ? `${to} כבר שחור ו-d[${u}] קטן מ-d[${to}], ולכן זו forward edge אל צאצא.`
              : `${to} כבר שחור ו-d[${u}] גדול מ-d[${to}], ולכן זו cross edge בין ענפים.`;
        }
        if (cls) classes[edge.id] = cls;
        if (b.edgeStates[edge.id] === 'idle') b.setEdge(edge.id, 'rejected');
        b.emit({
          event: 'reject',
          message: why,
          aux: aux(to),
          codeLine: color[to] === 'gray' ? 12 : 14,
          focusEdge: edge.id,
          focusNode: to,
          nodeBadges: badges(),
        });
      }
    }

    color[u] = 'black';
    finish[u] = ++time;
    stack.pop();
    b.setNode(u, 'done');
    b.emit({
      event: 'finish',
      message: `סיימנו את ${u}. הוא נצבע שחור וזמן הסיום שלו הוא f=${finish[u]}.`,
      aux: aux(u),
      codeLine: 15,
      focusNode: u,
      nodeBadges: badges(),
    });
  };

  const start = opts.source;
  const roots = start ? [start, ...graph.nodes.map((n) => n.id)] : graph.nodes.map((n) => n.id);
  for (const id of roots) {
    if (color[id] === 'white') {
      if (id !== start) {
        b.emit({
          event: 'iteration',
          message: `נשארו צמתים לבנים. מתחילים סריקה חדשה מהשורש ${id}.`,
          aux: aux(id),
          codeLine: 4,
          focusNode: id,
          nodeBadges: badges(),
        });
      }
      visit(id);
    }
  }

  const finishOrder = graph.nodes
    .map((n) => n.id)
    .sort((a, b2) => (finish[b2] ?? 0) - (finish[a] ?? 0));
  const hasBack = Object.values(classes).some((c) => c === 'back');
  const topoText = hasBack
    ? 'יש back edge בגרף, ולכן יש מעגל ומיון טופולוגי אינו קיים.'
    : `אין back edge, ולכן סדר הסיום ההפוך הוא מיון טופולוגי תקין: ${finishOrder.join(', ')}.`;

  b.emit({
    event: 'done',
    message: `הסריקה הסתיימה. ${graph.directed ? topoText : 'כל צלע סווגה כ-tree או כ-back.'}`,
    aux: aux(null),
    codeLine: 4,
    nodeBadges: badges(),
    headline: 'סיום',
  });

  return b.build();
}

export const dfsModule: AlgorithmModule = {
  id: 'dfs',
  titleHe: 'DFS: חיפוש לעומק',
  shortHe: 'DFS',
  requires: ['bfs'],
  graphKind: { directed: false, weighted: false, allowNegative: false },
  needsSource: true,
  presetGraphs: [
    {
      id: 'base',
      nameHe: 'הגרף המשותף',
      whyHe: 'אותו גרף שעליו רץ BFS, במכוון, כדי להשוות עץ רחב מול עץ עמוק.',
      graph: baseUnweighted(),
      source: 'A',
    },
    {
      id: 'directed',
      nameHe: 'הגרף הממוקד',
      whyHe: 'גרף מכוון שבו מופיעים כל סוגי הצלעות, והצלע 5 אל 2 היא back edge שמעידה על מעגל.',
      graph: dfsDirected(),
      source: '1',
    },
  ],
  run: dfsRun,
  content: dfsContent,
};
