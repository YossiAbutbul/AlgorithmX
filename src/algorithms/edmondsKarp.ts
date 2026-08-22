import { edmondsKarpContent } from '../content/edmondsKarp.content';
import { flowResidual, flowSmall } from '../graphs/presets';
import { bfsAugmenting, flowRun } from './flow';
import type { AlgorithmModule, Frame, GraphModel, RunOptions } from './types';

export function edmondsKarpRun(graph: GraphModel, opts: RunOptions): Frame[] {
  return flowRun(graph, opts, {
    search: bfsAugmenting,
    searchName: 'BFS',
    searchTitle: 'BFS בגרף השיורי',
  });
}

export const edmondsKarpModule: AlgorithmModule = {
  id: 'edmonds-karp',
  titleHe: 'Edmonds-Karp: זרימה מקסימלית עם BFS',
  shortHe: 'Edmonds-Karp',
  requires: ['ford-fulkerson', 'bfs'],
  graphKind: { directed: true, weighted: true, flow: true, allowNegative: false },
  needsSource: true,
  needsSink: true,
  presetGraphs: [
    {
      id: 'residual',
      nameHe: 'רשת 100 מול 1',
      whyHe: 'אותה רשת של Ford-Fulkerson, במכוון. כאן BFS מסיים בשתי איטרציות במקום ארבע.',
      graph: flowResidual(),
      source: 's',
      sink: 't',
    },
    {
      id: 'small',
      nameHe: 'הרשת הקטנה',
      whyHe: 'אותה רשת קטנה, כדי לראות שהזרימה המקסימלית זהה ורק מספר האיטרציות משתנה.',
      graph: flowSmall(),
      source: 's',
      sink: 't',
    },
  ],
  run: edmondsKarpRun,
  content: edmondsKarpContent,
};
