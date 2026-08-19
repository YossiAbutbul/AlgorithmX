import { adjacency } from './engine';
import type { AlgorithmModule, GraphModel, NodeId } from './types';

export interface ValidationNote {
  level: 'warn' | 'error';
  text: string;
  suggestion?: string;
  /** כפתור שמוביל לאלגוריתם שכן מתאים למקרה הזה. */
  action?: { label: string; targetId: string };
}

function componentOf(graph: GraphModel, start: NodeId): Set<NodeId> {
  const adj = adjacency(graph);
  const seen = new Set<NodeId>([start]);
  const stack = [start];
  while (stack.length) {
    const u = stack.pop() as NodeId;
    for (const { to } of adj.get(u) ?? []) {
      if (!seen.has(to)) {
        seen.add(to);
        stack.push(to);
      }
    }
  }
  return seen;
}

/**
 * ולידציה מלמדת ולא חוסמת. כל הודעה מסבירה מה נשבר ומה האפשרות החלופית,
 * וההרצה ממשיכה כדי שאפשר יהיה לראות את התוצאה השגויה בפועל.
 */
export function validateGraph(
  module: AlgorithmModule,
  graph: GraphModel,
  source?: NodeId,
  sink?: NodeId,
): ValidationNote[] {
  const notes: ValidationNote[] = [];

  if (graph.nodes.length === 0) {
    notes.push({ level: 'error', text: 'הגרף ריק. הוסף לפחות צומת אחד בעורך.' });
    return notes;
  }

  const negative = graph.edges.filter((e) => e.weight < 0);
  if (negative.length > 0 && !module.graphKind.allowNegative && module.graphKind.weighted) {
    notes.push({
      level: 'warn',
      text:
        negative.length === 1
          ? `יש כאן צלע אחת במשקל שלילי, וזה שובר את התנאי של ${module.shortHe}.`
          : `יש כאן ${negative.length} צלעות במשקל שלילי, וזה שובר את התנאי של ${module.shortHe}.`,
      suggestion:
        'אפשר להריץ בכל זאת ולראות בדיוק איפה התוצאה יוצאת שגויה, או לעבור לטאב Bellman-Ford שמטפל במשקלים שליליים.',
      action: { label: 'עבור ל-Bellman-Ford', targetId: 'bellman-ford' },
    });
  }

  if (module.needsSource && source && (module.id === 'prim' || module.id === 'bfs' || module.id === 'dfs')) {
    const reach = componentOf(graph, source);
    if (reach.size < graph.nodes.length) {
      const missing = graph.nodes.filter((n) => !reach.has(n.id)).map((n) => n.id);
      notes.push({
        level: 'warn',
        text: `הגרף אינו קשיר מהמקור ${source}. הצמתים ${missing.join(', ')} אינם נגישים.`,
        suggestion:
          module.id === 'prim'
            ? 'Prim יבנה עץ פורש של הרכיב שמכיל את המקור בלבד, ולא של כל הגרף.'
            : 'הסריקה תכסה רק את הרכיב של המקור.',
      });
    }
  }

  if (graph.flow) {
    if (!source || !graph.nodes.some((n) => n.id === source)) {
      notes.push({ level: 'error', text: 'ברשת זרימה חייב להיות צומת מקור s.' });
    }
    if (!sink || !graph.nodes.some((n) => n.id === sink)) {
      notes.push({ level: 'error', text: 'ברשת זרימה חייב להיות צומת בור t.' });
    }
    if (source && sink && source === sink) {
      notes.push({ level: 'error', text: 'המקור והבור חייבים להיות צמתים שונים.' });
    }
    if (graph.edges.some((e) => e.weight < 0)) {
      notes.push({
        level: 'error',
        text: 'קיבול שלילי אינו חוקי ברשת זרימה. תקן את הקיבול בעורך.',
      });
    }
  }

  if (graph.directed !== module.graphKind.directed) {
    notes.push({
      level: 'warn',
      text: module.graphKind.directed
        ? 'האלגוריתם הזה מוגדר על גרף מכוון, והגרף הנוכחי אינו מכוון.'
        : 'האלגוריתם הזה מוגדר על גרף לא מכוון, והגרף הנוכחי מכוון.',
    });
  }

  return notes;
}
