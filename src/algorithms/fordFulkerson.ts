import { fordFulkersonContent } from '../content/fordFulkerson.content';
import { flowResidual, flowSmall } from '../graphs/presets';
import { dfsAugmenting, flowRun } from './flow';
import type { AlgorithmModule, Frame, GraphModel, RunOptions } from './types';

export function fordFulkersonRun(graph: GraphModel, opts: RunOptions): Frame[] {
  return flowRun(graph, opts, {
    search: dfsAugmenting,
    searchName: 'חיפוש לעומק',
    searchTitle: 'חיפוש לעומק בגרף השיורי',
  });
}

export const fordFulkersonModule: AlgorithmModule = {
  id: 'ford-fulkerson',
  titleHe: 'Ford-Fulkerson: זרימה מקסימלית',
  shortHe: 'Ford-Fulkerson',
  requires: ['dfs'],
  graphKind: { directed: true, weighted: true, flow: true, allowNegative: false },
  needsSource: true,
  needsSink: true,
  presetGraphs: [
    {
      id: 'residual',
      nameHe: 'רשת 100 מול 1',
      whyHe: 'כאן בחירת מסלול גרועה מכריחה את האלגוריתם להשתמש בצלע שיורית ולבטל בחירה קודמת.',
      graph: flowResidual(),
      source: 's',
      sink: 't',
    },
    {
      id: 'small',
      nameHe: 'הרשת הקטנה',
      whyHe: 'זרימה מקסימלית 3 וחתך מינימלי בקיבול 3, נוח לתרגול ידני ולראות את משפט max-flow min-cut.',
      graph: flowSmall(),
      source: 's',
      sink: 't',
    },
  ],
  run: fordFulkersonRun,
  content: fordFulkersonContent,
};
