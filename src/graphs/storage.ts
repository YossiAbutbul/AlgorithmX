import type { GraphModel } from '../algorithms/types';

const GRAPH_KEY = (moduleId: string) => `algorithmx:graph:${moduleId}`;
const TAB_KEY = 'algorithmx:lastTab';

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveCustomGraph(moduleId: string, graph: GraphModel): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(GRAPH_KEY(moduleId), JSON.stringify(graph));
  } catch {
    /* מכסת אחסון מלאה, אין מה לעשות */
  }
}

export function loadCustomGraph(moduleId: string): GraphModel | null {
  const ls = safeLocalStorage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(GRAPH_KEY(moduleId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GraphModel;
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCustomGraph(moduleId: string): void {
  safeLocalStorage()?.removeItem(GRAPH_KEY(moduleId));
}

export function saveLastTab(id: string): void {
  safeLocalStorage()?.setItem(TAB_KEY, id);
}

export function loadLastTab(): string | null {
  return safeLocalStorage()?.getItem(TAB_KEY) ?? null;
}

export function exportGraph(graph: GraphModel): string {
  return JSON.stringify(
    {
      directed: graph.directed,
      weighted: graph.weighted,
      flow: graph.flow,
      width: graph.width,
      height: graph.height,
      nodes: graph.nodes,
      edges: graph.edges,
    },
    null,
    1,
  );
}

export function importGraph(text: string): GraphModel | null {
  try {
    const parsed = JSON.parse(text) as GraphModel;
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null;
    return {
      directed: !!parsed.directed,
      weighted: !!parsed.weighted,
      flow: !!parsed.flow,
      width: parsed.width || 680,
      height: parsed.height || 340,
      nodes: parsed.nodes,
      edges: parsed.edges,
    };
  } catch {
    return null;
  }
}
