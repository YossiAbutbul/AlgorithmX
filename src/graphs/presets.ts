import { edgeIdOf } from '../algorithms/engine';
import type { GraphEdge, GraphModel, GraphNode, NodeId } from '../algorithms/types';

interface BuildOpts {
  directed: boolean;
  weighted: boolean;
  flow?: boolean;
  width?: number;
  height?: number;
}

export function buildGraph(
  opts: BuildOpts,
  nodes: [NodeId, number, number][],
  edges: [NodeId, NodeId, number][],
): GraphModel {
  const graphNodes: GraphNode[] = nodes.map(([id, x, y]) => ({ id, x, y }));
  const graphEdges: GraphEdge[] = edges.map(([from, to, weight]) => ({
    id: edgeIdOf(opts.directed, from, to),
    from,
    to,
    weight,
  }));
  return {
    directed: opts.directed,
    weighted: opts.weighted,
    flow: opts.flow ?? false,
    nodes: graphNodes,
    edges: graphEdges,
    width: opts.width ?? 680,
    height: opts.height ?? 340,
  };
}

export function cloneGraph(graph: GraphModel): GraphModel {
  return {
    ...graph,
    nodes: graph.nodes.map((n) => ({ ...n })),
    edges: graph.edges.map((e) => ({ ...e })),
  };
}

const BASE_NODES: [NodeId, number, number][] = [
  ['A', 70, 160],
  ['B', 195, 70],
  ['C', 195, 250],
  ['D', 330, 130],
  ['E', 330, 262],
  ['F', 470, 190],
  ['G', 600, 190],
];

const BASE_EDGES_UNWEIGHTED: [NodeId, NodeId, number][] = [
  ['A', 'B', 1],
  ['A', 'C', 1],
  ['B', 'D', 1],
  ['C', 'D', 1],
  ['C', 'E', 1],
  ['D', 'F', 1],
  ['E', 'F', 1],
  ['F', 'G', 1],
];

const BASE_EDGES_WEIGHTED: [NodeId, NodeId, number][] = [
  ['A', 'B', 4],
  ['A', 'C', 2],
  ['B', 'D', 5],
  ['C', 'D', 1],
  ['C', 'E', 7],
  ['D', 'F', 3],
  ['E', 'F', 2],
  ['F', 'G', 6],
];

/** הגרף הבסיסי המשותף, גרסה לא ממושקלת. שבעה צמתים A עד G. */
export const baseUnweighted = (): GraphModel =>
  buildGraph({ directed: false, weighted: false }, BASE_NODES, BASE_EDGES_UNWEIGHTED);

/** הגרף הבסיסי המשותף, גרסה ממושקלת. אותם צמתים ואותן צלעות. */
export const baseWeighted = (): GraphModel =>
  buildGraph({ directed: false, weighted: true }, BASE_NODES, BASE_EDGES_WEIGHTED);

/** BFS: הגילוי הראשון קובע, גם כשיש שרשרת ארוכה שמובילה לאותו צומת. */
export const bfsShortcut = (): GraphModel =>
  buildGraph(
    { directed: false, weighted: false, width: 620, height: 340 },
    [
      ['S', 80, 100],
      ['A', 220, 100],
      ['B', 360, 100],
      ['C', 500, 100],
      ['D', 500, 260],
      ['E', 290, 260],
    ],
    [
      ['S', 'A', 1],
      ['A', 'B', 1],
      ['B', 'C', 1],
      ['C', 'D', 1],
      ['S', 'D', 1],
      ['D', 'E', 1],
    ],
  );

/** DFS: גרף מכוון לסיווג צלעות. הצלע 5->2 היא back edge ומעידה על מעגל. */
export const dfsDirected = (): GraphModel =>
  buildGraph(
    { directed: true, weighted: false },
    [
      ['1', 100, 170],
      ['2', 250, 80],
      ['3', 250, 260],
      ['4', 420, 170],
      ['5', 570, 170],
    ],
    [
      ['1', '2', 1],
      ['1', '3', 1],
      ['2', '4', 1],
      ['3', '4', 1],
      ['4', '5', 1],
      ['3', '5', 1],
      ['5', '2', 1],
    ],
  );

/** Dijkstra: כל המשקלים חיוביים, ויש בו שיפורי relax אמיתיים. */
export const dijkstraFocus = (): GraphModel =>
  buildGraph(
    { directed: true, weighted: true },
    [
      ['S', 70, 170],
      ['A', 200, 80],
      ['B', 200, 265],
      ['C', 350, 170],
      ['D', 480, 265],
      ['T', 600, 170],
    ],
    [
      ['S', 'A', 2],
      ['S', 'B', 5],
      ['A', 'B', 1],
      ['A', 'C', 4],
      ['B', 'C', 1],
      ['B', 'D', 3],
      ['C', 'D', 1],
      ['C', 'T', 3],
      ['D', 'T', 1],
    ],
  );

/** Dijkstra: משקל שלילי אחד מספיק כדי לשבור את הנכונות. */
export const negativeEdge = (): GraphModel =>
  buildGraph(
    { directed: true, weighted: true, width: 480, height: 340 },
    [
      ['S', 90, 170],
      ['A', 330, 90],
      ['B', 330, 250],
    ],
    [
      ['S', 'A', 3],
      ['S', 'B', 5],
      ['B', 'A', -4],
    ],
  );

/** Bellman-Ford: משקל שלילי בלי מעגל שלילי. */
export const bellmanFocus = (): GraphModel =>
  buildGraph(
    { directed: true, weighted: true },
    [
      ['S', 70, 170],
      ['A', 210, 80],
      ['B', 210, 265],
      ['C', 380, 170],
      ['D', 540, 170],
    ],
    [
      ['S', 'A', 4],
      ['S', 'B', 5],
      ['B', 'A', -3],
      ['A', 'C', 3],
      ['B', 'C', 4],
      ['A', 'D', 6],
      ['C', 'D', 2],
    ],
  );

/** Bellman-Ford: מעגל שלילי בסכום מינוס 2. */
export const negativeCycle = (): GraphModel =>
  buildGraph(
    { directed: true, weighted: true, width: 520, height: 340 },
    [
      ['S', 80, 170],
      ['X', 230, 170],
      ['Y', 400, 95],
      ['Z', 400, 255],
    ],
    [
      ['S', 'X', 2],
      ['X', 'Y', 1],
      ['Y', 'Z', -2],
      ['Z', 'X', -1],
    ],
  );

/** Floyd-Warshall: ארבעה צמתים, מכוון וממושקל, עם זוגות אנטי מקבילים. */
export const floydFocus = (): GraphModel =>
  buildGraph(
    { directed: true, weighted: true, width: 560, height: 360 },
    [
      ['1', 150, 90],
      ['2', 420, 90],
      ['3', 420, 275],
      ['4', 150, 275],
    ],
    [
      ['1', '2', 3],
      ['1', '4', 7],
      ['2', '1', 8],
      ['2', '3', 2],
      ['3', '1', 5],
      ['3', '4', 1],
      ['4', '1', 2],
    ],
  );

/** Prim ו-Kruskal: שני משקלים שווים, ולכן ה-MST אינו יחיד. */
export const tieWeights = (): GraphModel =>
  buildGraph(
    { directed: false, weighted: true, width: 620, height: 340 },
    [
      ['P', 110, 110],
      ['Q', 320, 110],
      ['R', 320, 270],
      ['T', 520, 190],
    ],
    [
      ['P', 'Q', 1],
      ['P', 'R', 2],
      ['Q', 'R', 2],
      ['R', 'T', 3],
    ],
  );

/** רשת זרימה 100 מול 1: הרשת שמראה למה צריך צלע שאריתית. */
export const flowResidual = (): GraphModel =>
  buildGraph(
    { directed: true, weighted: true, flow: true, width: 560, height: 340 },
    [
      ['s', 80, 170],
      ['u', 280, 85],
      ['v', 280, 260],
      ['t', 480, 170],
    ],
    [
      ['s', 'u', 100],
      ['s', 'v', 100],
      ['u', 'v', 1],
      ['u', 't', 100],
      ['v', 't', 100],
    ],
  );

/** רשת זרימה קטנה: זרימה מקסימלית 3 וחתך מינימלי בקיבול 3. */
export const flowSmall = (): GraphModel =>
  buildGraph(
    { directed: true, weighted: true, flow: true, width: 540, height: 340 },
    [
      ['s', 80, 170],
      ['a', 260, 85],
      ['b', 260, 260],
      ['t', 450, 170],
    ],
    [
      ['s', 'a', 3],
      ['s', 'b', 2],
      ['a', 'b', 2],
      ['a', 't', 1],
      ['b', 't', 2],
    ],
  );
