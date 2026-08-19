import { describe, expect, it } from 'vitest';
import { ALGORITHMS } from './index';
import { bfsCompute, bfsRun } from './bfs';
import { dfsCompute } from './dfs';
import { dijkstraCompute } from './dijkstra';
import { bellmanCompute } from './bellmanFord';
import { floydCompute } from './floydWarshall';
import { primCompute } from './prim';
import { kruskalCompute } from './kruskal';
import { bfsAugmenting, dfsAugmenting, maxFlowCompute } from './flow';
import {
  baseUnweighted,
  bellmanFocus,
  dfsDirected,
  dijkstraFocus,
  floydFocus,
  baseWeighted,
  tieWeights,
  flowResidual,
  flowSmall,
  negativeCycle,
  negativeEdge,
} from '../graphs/presets';

describe('BFS', () => {
  it('מחשב מרחקים נכונים על הגרף המשותף ממקור A', () => {
    const { dist, order } = bfsCompute(baseUnweighted(), 'A');
    expect(dist).toEqual({ A: 0, B: 1, C: 1, D: 2, E: 2, F: 3, G: 4 });
    expect(order).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  });

  it('מסיים בערכי dist שמופיעים גם בתגי הצמתים של ה-frame האחרון', () => {
    const frames = bfsRun(baseUnweighted(), { source: 'A' });
    const last = frames[frames.length - 1];
    expect(last.event).toBe('done');
    expect(last.nodeBadges).toEqual({
      A: 'd=0',
      B: 'd=1',
      C: 'd=1',
      D: 'd=2',
      E: 'd=2',
      F: 'd=3',
      G: 'd=4',
    });
  });
});

describe('DFS', () => {
  it('מחשב זמני d ו-f נכונים על הגרף המכוון הממוקד', () => {
    const r = dfsCompute(dfsDirected(), '1');
    expect(r.discovery).toEqual({ '1': 1, '2': 2, '4': 3, '5': 4, '3': 8 });
    expect(r.finish).toEqual({ '1': 10, '2': 7, '4': 6, '5': 5, '3': 9 });
  });

  it('מסווג את הצלע 5 אל 2 כ-back edge ומזהה מעגל', () => {
    const r = dfsCompute(dfsDirected(), '1');
    expect(r.classes['5->2']).toBe('back');
    expect(r.classes['3->4']).toBe('cross');
    expect(r.classes['3->5']).toBe('cross');
    expect(r.hasBackEdge).toBe(true);
  });
});

describe('Dijkstra', () => {
  it('מגיע ל-T עם 6 בגרף הממוקד', () => {
    const r = dijkstraCompute(dijkstraFocus(), 'S');
    expect(r.dist).toEqual({ S: 0, A: 2, B: 3, C: 4, D: 5, T: 6 });
    expect(r.order).toEqual(['S', 'A', 'B', 'C', 'D', 'T']);
  });

  it('נכשל בכוונה על משקל שלילי: מחזיר 3 במקום 1', () => {
    const r = dijkstraCompute(negativeEdge(), 'S');
    expect(r.dist.A).toBe(3);
    const truth = bellmanCompute(negativeEdge(), 'S');
    expect(truth.dist.A).toBe(1);
    expect(r.dist.A).not.toBe(truth.dist.A);
  });
});

describe('Bellman-Ford', () => {
  it('מחשב נכון עם משקל שלילי, D שווה 7', () => {
    const r = bellmanCompute(bellmanFocus(), 'S');
    expect(r.dist).toEqual({ S: 0, A: 2, B: 5, C: 5, D: 7 });
    expect(r.negativeCycle).toBeNull();
  });

  it('עוצר מוקדם אחרי שני סבבים בגרף הממוקד', () => {
    expect(bellmanCompute(bellmanFocus(), 'S').rounds).toBe(2);
  });

  it('מזהה את המעגל השלילי ומחזיר את הצמתים שלו', () => {
    const r = bellmanCompute(negativeCycle(), 'S');
    expect(r.negativeCycle).not.toBeNull();
    expect([...(r.negativeCycle as string[])].sort()).toEqual(['X', 'Y', 'Z']);
  });
});

describe('Floyd-Warshall', () => {
  it('מסכים עם Dijkstra מכל צומת על הגרף הממוקד', () => {
    const graph = floydFocus();
    const { labels, dist } = floydCompute(graph);
    labels.forEach((from, i) => {
      const naive = dijkstraCompute(graph, from);
      labels.forEach((to, j) => {
        const expected = from === to ? 0 : naive.dist[to];
        expect(dist[i][j]).toBe(expected);
      });
    });
  });

  it('מוצא את המסלול העקיף 1 אל 2 אל 3 אל 4 במשקל 6', () => {
    const { labels, dist } = floydCompute(floydFocus());
    const i = labels.indexOf('1');
    const j = labels.indexOf('4');
    expect(dist[i][j]).toBe(6);
    expect(dist[labels.indexOf('2')][j]).toBe(3);
  });
});

describe('Prim ו-Kruskal', () => {
  it('שניהם נותנים משקל כולל 18 על הגרף המשותף', () => {
    expect(primCompute(baseWeighted(), 'A').total).toBe(18);
    expect(kruskalCompute(baseWeighted()).total).toBe(18);
  });

  it('Prim בוחר את הצלעות בסדר הצפוי', () => {
    expect(primCompute(baseWeighted(), 'A').edges).toEqual([
      'A-C',
      'C-D',
      'D-F',
      'E-F',
      'A-B',
      'F-G',
    ]);
  });

  it('Kruskal לוקח בסדר המיון ודוחה את B-D ואת C-E', () => {
    const r = kruskalCompute(baseWeighted());
    expect(r.edges).toEqual(['C-D', 'A-C', 'E-F', 'D-F', 'A-B', 'F-G']);
    expect(r.edges).not.toContain('B-D');
    expect(r.edges).not.toContain('C-E');
  });

  it('בגרף עם משקלים שווים המשקל הכולל זהה גם אם העץ שונה', () => {
    const p = primCompute(tieWeights(), 'P');
    const k = kruskalCompute(tieWeights());
    expect(p.total).toBe(k.total);
    expect(p.edges.length).toBe(3);
  });
});

describe('Ford-Fulkerson ו-Edmonds-Karp', () => {
  it('אותה זרימה מקסימלית בשתי הרשתות', () => {
    expect(maxFlowCompute(flowResidual(), 's', 't', dfsAugmenting).maxFlow).toBe(200);
    expect(maxFlowCompute(flowResidual(), 's', 't', bfsAugmenting).maxFlow).toBe(200);
    expect(maxFlowCompute(flowSmall(), 's', 't', dfsAugmenting).maxFlow).toBe(3);
    expect(maxFlowCompute(flowSmall(), 's', 't', bfsAugmenting).maxFlow).toBe(3);
  });

  it('זרימה מקסימלית שווה לקיבול החתך המינימלי', () => {
    for (const graph of [flowResidual(), flowSmall()]) {
      for (const search of [dfsAugmenting, bfsAugmenting]) {
        const r = maxFlowCompute(graph, 's', 't', search);
        expect(r.minCutCapacity).toBe(r.maxFlow);
      }
    }
  });

  it('החתך המינימלי ברשת הקטנה הוא a אל t ו-b אל t', () => {
    const r = maxFlowCompute(flowSmall(), 's', 't', bfsAugmenting);
    expect([...r.minCutEdges].sort()).toEqual(['a->t', 'b->t']);
    expect(r.minCutCapacity).toBe(3);
  });

  it('BFS חוסך איטרציות ברשת 100 מול 1', () => {
    const ff = maxFlowCompute(flowResidual(), 's', 't', dfsAugmenting);
    const ek = maxFlowCompute(flowResidual(), 's', 't', bfsAugmenting);
    expect(ff.iterations).toBe(4);
    expect(ek.iterations).toBe(2);
    expect(ek.iterations).toBeLessThan(ff.iterations);
  });

  it('Ford-Fulkerson משתמש בצלע אחורית ברשת 100 מול 1', () => {
    const ff = maxFlowCompute(flowResidual(), 's', 't', dfsAugmenting);
    expect(ff.paths[0]).toEqual(['s', 'u', 'v', 't']);
    expect(ff.paths[3]).toEqual(['s', 'v', 'u', 't']);
  });
});

describe('בדיקת מסגרת לכל האלגוריתמים', () => {
  for (const mod of ALGORITHMS) {
    for (const preset of mod.presetGraphs) {
      it(`${mod.id} על ${preset.id}: לכל frame יש מצב לכל צומת, והאחרון הוא done`, () => {
        const frames = mod.run(preset.graph, { source: preset.source, sink: preset.sink });
        expect(frames.length).toBeGreaterThan(1);
        for (const frame of frames) {
          for (const node of preset.graph.nodes) {
            expect(frame.nodeStates[node.id]).toBeDefined();
          }
          for (const edge of preset.graph.edges) {
            expect(frame.edgeStates[edge.id]).toBeDefined();
          }
        }
        expect(frames[frames.length - 1].event).toBe('done');
      });
    }
  }
});
