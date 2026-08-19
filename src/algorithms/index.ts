import { bfsModule } from './bfs';
import { dfsModule } from './dfs';
import { dijkstraModule } from './dijkstra';
import { bellmanFordModule } from './bellmanFord';
import { floydModule } from './floydWarshall';
import { primModule } from './prim';
import { kruskalModule } from './kruskal';
import { fordFulkersonModule } from './fordFulkerson';
import { edmondsKarpModule } from './edmondsKarp';
import type { AlgorithmModule } from './types';

/** הרגיסטרי מסודר לפי סדר התלות הלוגית, ואין לשנות את הסדר. */
export const ALGORITHMS: AlgorithmModule[] = [bfsModule, dfsModule, dijkstraModule, bellmanFordModule, floydModule, primModule, kruskalModule, fordFulkersonModule, edmondsKarpModule];

export function getAlgorithm(id: string): AlgorithmModule | undefined {
  return ALGORITHMS.find((a) => a.id === id);
}
