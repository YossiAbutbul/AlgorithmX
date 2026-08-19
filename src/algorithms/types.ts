export type NodeId = string;
export type EdgeId = string;

export type NodeState = 'idle' | 'frontier' | 'current' | 'done' | 'rejected';

export type EdgeState =
  | 'idle'
  | 'considered'
  | 'tree'
  | 'rejected'
  | 'relaxed'
  | 'saturated'
  | 'residual';

export type FrameEvent =
  | 'init'
  | 'visit'
  | 'discover'
  | 'relax'
  | 'no-change'
  | 'reject'
  | 'select'
  | 'finish'
  | 'augment'
  | 'iteration'
  | 'done';

export interface GraphNode {
  id: NodeId;
  x: number;
  y: number;
}

export interface GraphEdge {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
  weight: number;
}

export interface GraphModel {
  directed: boolean;
  weighted: boolean;
  flow: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
}

export interface ArrayTableRow {
  key: string;
  values: (string | number)[];
  highlight?: boolean;
}

export type AuxView =
  | { kind: 'queue'; title: string; items: string[]; headIndex: 0; note?: string }
  | { kind: 'stack'; title: string; items: string[]; note?: string }
  | {
      kind: 'priorityQueue';
      title: string;
      items: { id: NodeId; key: number | null }[];
      note?: string;
    }
  | {
      kind: 'arrayTable';
      title: string;
      columns: string[];
      rows: ArrayTableRow[];
      note?: string;
    }
  | {
      kind: 'matrix';
      title: string;
      labels: string[];
      cells: (number | null)[][];
      changed?: [number, number][];
      highlightRow?: number;
      highlightCol?: number;
      note?: string;
    }
  | {
      kind: 'edgeList';
      title: string;
      rows: {
        id: EdgeId;
        label: string;
        weight: number;
        status: 'pending' | 'taken' | 'rejected';
      }[];
      note?: string;
    }
  | { kind: 'disjointSet'; title: string; groups: NodeId[][]; note?: string }
  | {
      kind: 'flowTable';
      title: string;
      rows: { id: EdgeId; label: string; flow: number; capacity: number }[];
      totalFlow: number;
      note?: string;
    }
  | { kind: 'setView'; title: string; items: string[]; note?: string };

export interface Frame {
  index: number;
  event: FrameEvent;
  message: string;
  nodeStates: Record<NodeId, NodeState>;
  edgeStates: Record<EdgeId, EdgeState>;
  focusNode?: NodeId;
  focusEdge?: EdgeId;
  nodeBadges?: Record<NodeId, string>;
  edgeBadges?: Record<EdgeId, string>;
  aux: AuxView[];
  codeLine?: number;
  headline?: string;
  /** Active residual arcs in a flow network, drawn dashed in the reverse direction. */
  residual?: { id: EdgeId; amount: number; active?: boolean }[];
  /** Source side of the minimum cut, used to draw the cut line at the end of the run. */
  cutNodes?: NodeId[];
  /** The edges that cross the minimum cut. */
  cutEdges?: EdgeId[];
  /** A highlighted path, for example an augmenting path or a negative cycle. */
  pathEdges?: EdgeId[];
}

export interface PresetGraph {
  id: string;
  nameHe: string;
  whyHe: string;
  graph: GraphModel;
  source?: NodeId;
  sink?: NodeId;
}

export interface QuizItem {
  question: string;
  answer: string;
}

export interface PitfallItem {
  title: string;
  body: string;
}

export interface StructureItem {
  name: string;
  role: string;
}

export interface AlgorithmContent {
  idea: string;
  whenToUse: string[];
  determinism: string;
  structures: StructureItem[];
  efficiency: {
    time: string;
    space: string;
    notes: string[];
  };
  pitfalls: PitfallItem[];
  bottomLine: string;
  examTips: string[];
  pseudocode: string[];
  proof: { invariant: string; paragraphs: string[] };
  quiz: QuizItem[];
  compareHint?: { pairId: string; text: string };
}

export interface RunOptions {
  source?: NodeId;
  sink?: NodeId;
  showNoChange?: boolean;
}

export interface AlgorithmModule {
  id: string;
  titleHe: string;
  shortHe: string;
  requires: string[];
  graphKind: {
    directed: boolean;
    weighted: boolean;
    flow?: boolean;
    allowNegative: boolean;
  };
  presetGraphs: PresetGraph[];
  needsSource: boolean;
  needsSink?: boolean;
  /** Shows a toggle for displaying steps that changed nothing. */
  showNoChangeToggle?: boolean;
  run(graph: GraphModel, opts: RunOptions): Frame[];
  content: AlgorithmContent;
}
