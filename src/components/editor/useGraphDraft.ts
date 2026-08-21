import { useCallback, useEffect, useRef, useState } from 'react';
import { edgeIdOf } from '../../algorithms/engine';
import type { EdgeId, GraphModel, NodeId } from '../../algorithms/types';
import { cloneGraph } from '../../graphs/presets';

/** What the pointer does on the canvas. */
export type Tool = 'select' | 'connect' | 'add';

export type Selection = { type: 'node'; id: NodeId } | { type: 'edge'; id: EdgeId } | null;

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Two nodes closer than this overlap once drawn, so a new one is refused. */
const MIN_GAP = 58;

/** How many steps back the editor can go. */
const HISTORY_LIMIT = 60;

/** Keeps a nudged node clear of the canvas edge, matching the drag clamp. */
const R_EDGE = 30;

function nextId(graph: GraphModel): NodeId {
  const used = new Set(graph.nodes.map((n) => n.id));
  for (const l of LETTERS) if (!used.has(l)) return l;
  let i = graph.nodes.length + 1;
  while (used.has(`N${i}`)) i += 1;
  return `N${i}`;
}

/**
 * Past, present and future in one value. Undo and redo move a graph between
 * three lists at once, and doing that across separate states means nesting one
 * setter inside another's updater, which React is free to run twice. One state,
 * one transition, no nesting.
 */
interface Timeline {
  past: GraphModel[];
  present: GraphModel;
  future: GraphModel[];
}

export interface GraphDraft {
  graph: GraphModel;
  dirty: boolean;
  tool: Tool;
  setTool: (t: Tool) => void;
  selection: Selection;
  select: (s: Selection) => void;
  /** The first node of a connection in progress. */
  linkFrom: NodeId | null;
  note: string;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  /** Pointer handlers, wired to the one canvas the run already draws through. */
  onCanvasClick: (x: number, y: number) => void;
  onNodeClick: (id: NodeId) => void;
  onEdgeClick: (id: EdgeId) => void;
  onNodeDrag: (id: NodeId, x: number, y: number) => void;
  onNodeDragEnd: () => void;
  /** Connects two nodes directly, for the rim handle's drag and drop. */
  connect: (from: NodeId, to: NodeId) => void;
  /** Moves a node by a keyboard nudge rather than a drag. */
  nudge: (id: NodeId, dx: number, dy: number) => void;
  cancelLink: () => void;
  deleteSelection: () => void;
  /** Opens one undo step for a run of small edits, such as typing a weight. */
  beginChange: () => void;
  setWeight: (id: EdgeId, weight: number) => void;
  flipEdge: (id: EdgeId) => void;
  replaceGraph: (g: GraphModel, note: string) => void;
  revert: () => void;
}

export function useGraphDraft(source: GraphModel, weightLabel: string): GraphDraft {
  const [timeline, setTimeline] = useState<Timeline>(() => ({
    past: [],
    present: cloneGraph(source),
    future: [],
  }));
  const [tool, setToolRaw] = useState<Tool>('select');
  const [selection, setSelection] = useState<Selection>(null);
  const [linkFrom, setLinkFrom] = useState<NodeId | null>(null);
  const [note, setNote] = useState('');
  const [dirty, setDirty] = useState(false);

  /** A drag is one undo step, not one per pointer move. */
  const dragging = useRef(false);

  const graph = timeline.present;

  useEffect(() => {
    setTimeline({ past: [], present: cloneGraph(source), future: [] });
    setSelection(null);
    setLinkFrom(null);
    setDirty(false);
    setNote('');
  }, [source]);

  /** Applies a change and files the graph it replaced under undo. */
  const commit = useCallback((change: (g: GraphModel) => GraphModel) => {
    setTimeline((t) => ({
      past: [...t.past.slice(-(HISTORY_LIMIT - 1)), t.present],
      present: change(t.present),
      // A fresh change is a new branch, so anything redone from here is gone
      future: [],
    }));
    setDirty(true);
  }, []);

  /** Opens a step without changing anything, for edits that arrive keystroke by keystroke. */
  const beginChange = useCallback(() => {
    setTimeline((t) => ({
      past: [...t.past.slice(-(HISTORY_LIMIT - 1)), t.present],
      present: t.present,
      future: [],
    }));
    setDirty(true);
  }, []);

  /** Changes the graph inside the step already open. */
  const amend = useCallback((change: (g: GraphModel) => GraphModel) => {
    setTimeline((t) => ({ ...t, present: change(t.present) }));
    setDirty(true);
  }, []);

  const undo = useCallback(() => {
    setTimeline((t) =>
      t.past.length === 0
        ? t
        : {
            past: t.past.slice(0, -1),
            present: t.past[t.past.length - 1],
            future: [t.present, ...t.future],
          },
    );
    setSelection(null);
    setLinkFrom(null);
    setNote('הפעולה האחרונה בוטלה.');
  }, []);

  const redo = useCallback(() => {
    setTimeline((t) =>
      t.future.length === 0
        ? t
        : {
            past: [...t.past, t.present],
            present: t.future[0],
            future: t.future.slice(1),
          },
    );
    setSelection(null);
    setLinkFrom(null);
    setNote('הפעולה שוחזרה.');
  }, []);

  const setTool = useCallback((t: Tool) => {
    setToolRaw(t);
    setLinkFrom(null);
    setNote('');
  }, []);

  const connect = useCallback(
    (from: NodeId, to: NodeId) => {
      if (from === to) return;
      const edgeId = edgeIdOf(graph.directed, from, to);
      setSelection({ type: 'edge', id: edgeId });
      setLinkFrom(null);
      if (graph.edges.some((e) => e.id === edgeId)) {
        setNote('הצלע הזאת כבר קיימת.');
        return;
      }
      commit((g) => ({ ...g, edges: [...g.edges, { id: edgeId, from, to, weight: 1 }] }));
      setNote(`נוספה צלע ${from} ${graph.directed ? '->' : '-'} ${to}.`);
    },
    [graph, commit],
  );

  const nudge = useCallback(
    (id: NodeId, dx: number, dy: number) => {
      commit((g) => ({
        ...g,
        nodes: g.nodes.map((n) =>
          n.id === id
            ? {
                ...n,
                x: Math.max(R_EDGE, Math.min(g.width - R_EDGE, n.x + dx)),
                y: Math.max(R_EDGE, Math.min(g.height - R_EDGE, n.y + dy)),
              }
            : n,
        ),
      }));
    },
    [commit],
  );

  const cancelLink = useCallback(() => {
    setLinkFrom(null);
    setSelection(null);
    setNote('');
  }, []);

  const onCanvasClick = useCallback(
    (x: number, y: number) => {
      if (tool !== 'add') {
        setSelection(null);
        setLinkFrom(null);
        setNote('');
        return;
      }
      if (graph.nodes.some((n) => Math.hypot(n.x - x, n.y - y) < MIN_GAP)) {
        setNote('קרוב מדי לצומת קיים. נסה מקום פנוי יותר.');
        return;
      }
      const id = nextId(graph);
      commit((g) => ({ ...g, nodes: [...g.nodes, { id, x, y }] }));
      setSelection({ type: 'node', id });
      // Adding is a one shot, so a second click cannot drop a node you did not want
      setToolRaw('select');
      setNote(`נוסף צומת ${id}. הכלי חזר לבחירה.`);
    },
    [graph, tool, commit],
  );

  const onNodeClick = useCallback(
    (id: NodeId) => {
      if (tool !== 'connect') {
        setSelection({ type: 'node', id });
        setNote('');
        return;
      }
      if (linkFrom === null) {
        setLinkFrom(id);
        setNote('בחר את הצומת השני.');
        return;
      }
      if (linkFrom === id) {
        setLinkFrom(null);
        setNote('');
        return;
      }
      connect(linkFrom, id);
    },
    [tool, linkFrom, connect],
  );

  const onEdgeClick = useCallback((id: EdgeId) => {
    setSelection({ type: 'edge', id });
    setLinkFrom(null);
    setNote('');
  }, []);

  const onNodeDrag = useCallback(
    (id: NodeId, x: number, y: number) => {
      setSelection({ type: 'node', id });
      const move = (g: GraphModel) => ({
        ...g,
        nodes: g.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
      });
      if (!dragging.current) {
        dragging.current = true;
        commit(move);
      } else {
        amend(move);
      }
    },
    [commit, amend],
  );

  const onNodeDragEnd = useCallback(() => {
    dragging.current = false;
  }, []);

  const deleteSelection = useCallback(() => {
    if (!selection) return;
    if (selection.type === 'node') {
      const id = selection.id;
      commit((g) => ({
        ...g,
        nodes: g.nodes.filter((n) => n.id !== id),
        edges: g.edges.filter((e) => e.from !== id && e.to !== id),
      }));
      setNote(`צומת ${id} נמחק, ואיתו הצלעות שנגעו בו.`);
    } else {
      const id = selection.id;
      commit((g) => ({ ...g, edges: g.edges.filter((e) => e.id !== id) }));
      setNote('הצלע נמחקה.');
    }
    setSelection(null);
  }, [selection, commit]);

  const setWeight = useCallback(
    (id: EdgeId, weight: number) => {
      amend((g) => ({
        ...g,
        edges: g.edges.map((e) => (e.id === id ? { ...e, weight } : e)),
      }));
      setNote(`ה${weightLabel} עודכן ל-${weight}.`);
    },
    [amend, weightLabel],
  );

  const flipEdge = useCallback(
    (id: EdgeId) => {
      const edge = graph.edges.find((e) => e.id === id);
      if (!edge || !graph.directed) return;
      const flipped = edgeIdOf(true, edge.to, edge.from);
      if (graph.edges.some((e) => e.id === flipped)) {
        setNote('הצלע ההפוכה כבר קיימת.');
        return;
      }
      commit((g) => ({
        ...g,
        edges: g.edges.map((e) => (e.id === id ? { ...e, id: flipped, from: e.to, to: e.from } : e)),
      }));
      setSelection({ type: 'edge', id: flipped });
      setNote('כיוון הצלע התהפך.');
    },
    [graph, commit],
  );

  const replaceGraph = useCallback(
    (g: GraphModel, text: string) => {
      commit(() => g);
      setSelection(null);
      setLinkFrom(null);
      setNote(text);
    },
    [commit],
  );

  const revert = useCallback(() => {
    commit(() => cloneGraph(source));
    setSelection(null);
    setLinkFrom(null);
    setNote('חזרנו לגרף המוכן.');
  }, [source, commit]);

  return {
    graph,
    dirty,
    tool,
    setTool,
    selection,
    select: setSelection,
    linkFrom,
    note,
    canUndo: timeline.past.length > 0,
    canRedo: timeline.future.length > 0,
    undo,
    redo,
    onCanvasClick,
    onNodeClick,
    onEdgeClick,
    onNodeDrag,
    onNodeDragEnd,
    connect,
    nudge,
    cancelLink,
    deleteSelection,
    beginChange,
    setWeight,
    flipEdge,
    replaceGraph,
    revert,
  };
}
