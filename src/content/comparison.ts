import type { GraphModel, NodeId } from '../algorithms/types';
import {
  baseUnweighted,
  baseWeighted,
  flowResidual,
  negativeEdge,
} from '../graphs/presets';

export interface ComparisonRow {
  id: string;
  name: string;
  solves: string;
  graphKind: string;
  negative: string;
  structure: string;
  time: string;
  space: string;
  output: string;
  limit: string;
}

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    id: 'bfs',
    name: 'BFS',
    solves: 'מסלול קצר ביותר במספר קשתות',
    graphKind: 'כל גרף, בלי משקלים',
    negative: 'לא רלוונטי',
    structure: 'תור FIFO',
    time: 'O(V+E)',
    space: 'O(V)',
    output: 'מרחקים ועץ סריקה',
    limit: 'בלי משקלים',
  },
  {
    id: 'dfs',
    name: 'DFS',
    solves: 'סיווג צלעות, מעגלים, מיון טופולוגי',
    graphKind: 'כל גרף, בלי משקלים',
    negative: 'לא רלוונטי',
    structure: 'מחסנית או רקורסיה',
    time: 'O(V+E)',
    space: 'O(V)',
    output: 'זמני d ו-f, סיווג צלעות',
    limit: 'לא נותן מרחקים',
  },
  {
    id: 'dijkstra',
    name: 'Dijkstra',
    solves: 'מסלולים קצרים ממקור יחיד',
    graphKind: 'מכוון או לא, ממושקל',
    negative: 'לא',
    structure: 'priority queue',
    time: 'O((V+E) log V)',
    space: 'O(V)',
    output: 'מרחקים ועץ מסלולים',
    limit: 'משקלים אי שליליים',
  },
  {
    id: 'bellman-ford',
    name: 'Bellman-Ford',
    solves: 'מסלולים קצרים ממקור יחיד',
    graphKind: 'מכוון, ממושקל',
    negative: 'כן, וגם מזהה מעגל שלילי',
    structure: 'רשימת צלעות',
    time: 'O(V*E)',
    space: 'O(V)',
    output: 'מרחקים ועץ מסלולים',
    limit: 'איטי',
  },
  {
    id: 'floyd-warshall',
    name: 'Floyd-Warshall',
    solves: 'מרחקים בין כל הזוגות',
    graphKind: 'מכוון או לא, ממושקל',
    negative: 'כן, ומזהה לפי האלכסון',
    structure: 'מטריצה',
    time: 'O(V^3)',
    space: 'O(V^2)',
    output: 'מטריצת מרחקים',
    limit: 'זיכרון ריבועי',
  },
  {
    id: 'prim',
    name: 'Prim',
    solves: 'עץ פורש מינימלי',
    graphKind: 'לא מכוון, ממושקל',
    negative: 'כן, לא משנה',
    structure: 'priority queue',
    time: 'O(E log V)',
    space: 'O(V)',
    output: 'עץ פורש מינימלי',
    limit: 'רכיב אחד',
  },
  {
    id: 'kruskal',
    name: 'Kruskal',
    solves: 'עץ או יער פורש מינימלי',
    graphKind: 'לא מכוון, ממושקל',
    negative: 'כן, לא משנה',
    structure: 'מיון ו-Union-Find',
    time: 'O(E log E)',
    space: 'O(V)',
    output: 'עץ פורש מינימלי',
    limit: 'תלוי במיון',
  },
  {
    id: 'ford-fulkerson',
    name: 'Ford-Fulkerson',
    solves: 'זרימה מקסימלית וחתך מינימלי',
    graphKind: 'רשת זרימה',
    negative: 'לא, קיבולים אי שליליים',
    structure: 'גרף שיורי',
    time: 'O(E * maxFlow)',
    space: 'O(V+E)',
    output: 'זרימה וחתך',
    limit: 'תלוי בקיבולים',
  },
  {
    id: 'edmonds-karp',
    name: 'Edmonds-Karp',
    solves: 'זרימה מקסימלית וחתך מינימלי',
    graphKind: 'רשת זרימה',
    negative: 'לא, קיבולים אי שליליים',
    structure: 'BFS על הגרף השיורי',
    time: 'O(V*E^2)',
    space: 'O(V+E)',
    output: 'זרימה וחתך',
    limit: 'איטי מ-Dinic',
  },
];

export const COMPARISON_COLUMNS: { key: keyof ComparisonRow; label: string }[] = [
  { key: 'name', label: 'אלגוריתם' },
  { key: 'solves', label: 'מה הוא פותר' },
  { key: 'graphKind', label: 'סוג הגרף' },
  { key: 'negative', label: 'משקלים שליליים' },
  { key: 'structure', label: 'מבנה הנתונים המרכזי' },
  { key: 'time', label: 'זמן' },
  { key: 'space', label: 'זיכרון' },
  { key: 'output', label: 'הפלט' },
  { key: 'limit', label: 'המגבלה' },
];

export interface ComparePair {
  id: string;
  label: string;
  left: string;
  right: string;
  graph: () => GraphModel;
  source?: NodeId;
  sink?: NodeId;
  lesson: string;
}

export const COMPARE_PAIRS: ComparePair[] = [
  {
    id: 'bfs-dfs',
    label: 'BFS מול DFS',
    left: 'bfs',
    right: 'dfs',
    graph: baseUnweighted,
    source: 'A',
    lesson:
      'אותו גרף ואותו מקור, ושני עצים שונים לגמרי: BFS מתפרש לרוחב שכבה אחרי שכבה, ו-DFS צולל לשרשרת עמוקה וחוזר.',
  },
  {
    id: 'dijkstra-bellman',
    label: 'Dijkstra מול Bellman-Ford',
    left: 'dijkstra',
    right: 'bellman-ford',
    graph: negativeEdge,
    source: 'S',
    lesson:
      'Dijkstra סוגר את A על 3 ולא חוזר אליו, ולכן מפספס את המסלול דרך B שנותן 1. Bellman-Ford סורק את כל הצלעות שוב ומתקן.',
  },
  {
    id: 'prim-kruskal',
    label: 'Prim מול Kruskal',
    left: 'prim',
    right: 'kruskal',
    graph: baseWeighted,
    source: 'A',
    lesson:
      'Prim מגדל עץ אחד סביב המקור, ו-Kruskal מאחד יער לפי סדר משקלים. סדר הצלעות שונה לגמרי, והמשקל הכולל זהה: 18.',
  },
  {
    id: 'ff-ek',
    label: 'Ford-Fulkerson מול Edmonds-Karp',
    left: 'ford-fulkerson',
    right: 'edmonds-karp',
    graph: flowResidual,
    source: 's',
    sink: 't',
    lesson:
      'אותה זרימה מקסימלית, 200, אבל Ford-Fulkerson צריך ארבע איטרציות ונאלץ לבטל בחירה דרך צלע אחורית, ו-Edmonds-Karp מסיים בשתיים.',
  },
];
