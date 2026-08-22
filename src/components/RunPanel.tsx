import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Eye, GitCompareArrows, Network, Pencil, TriangleAlert, X } from 'lucide-react';
import type { AlgorithmModule, GraphModel, NodeId, NodeState } from '../algorithms/types';
import { validateGraph } from '../algorithms/validate';
import { AuxPanel } from './panels/AuxPanel';
import { EVENT_INK, EVENT_LABEL } from './events';
import { GraphCanvas } from './GraphCanvas';
import { NodePicker } from './NodePicker';
import { graphAspect } from './graphGeometry';
import { EditorRail } from './editor/EditorRail';
import { EditorTools } from './editor/EditorTools';
import { useGraphDraft } from './editor/useGraphDraft';
import { NodeKey } from './Legend';
import { Pseudocode } from './Pseudocode';
import { TransportRail } from './TransportRail';
import { usePlayer } from './usePlayer';
import { loadCustomGraph, saveCustomGraph } from '../graphs/storage';

interface Props {
  module: AlgorithmModule;
  onGoToCompare?: (pairId: string) => void;
  onNavigate?: (id: string) => void;
}

export function RunPanel({ module, onGoToCompare, onNavigate }: Props) {
  const [presetId, setPresetId] = useState(module.presetGraphs[0].id);
  const [custom, setCustom] = useState<GraphModel | null>(() => loadCustomGraph(module.id));
  const [editing, setEditing] = useState(false);
  const [showNoChange, setShowNoChange] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [hovered, setHovered] = useState<NodeId | null>(null);

  useEffect(() => {
    setPresetId(module.presetGraphs[0].id);
    setCustom(loadCustomGraph(module.id));
    setEditing(false);
  }, [module.id]);

  const preset = module.presetGraphs.find((p) => p.id === presetId) ?? module.presetGraphs[0];
  const usingCustom = presetId === 'custom' && custom !== null;
  const graph = usingCustom ? (custom as GraphModel) : preset.graph;

  const [source, setSource] = useState<NodeId | undefined>(preset.source);
  const [sink, setSink] = useState<NodeId | undefined>(preset.sink);

  useEffect(() => {
    const first = graph.nodes[0]?.id;
    const src = usingCustom ? (graph.nodes.find((n) => n.id === 's')?.id ?? first) : preset.source;
    const snk = usingCustom
      ? (graph.nodes.find((n) => n.id === 't')?.id ?? graph.nodes[graph.nodes.length - 1]?.id)
      : preset.sink;
    setSource(src ?? first);
    setSink(snk);
    setDismissed([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId, custom]);

  /*
   * The editor works on a draft of whatever graph is on screen, and the stage
   * draws that draft. The run keeps drawing the saved graph, so switching modes
   * swaps what is in the rail and the bar and nothing else.
   */
  const draft = useGraphDraft(graph, graph.flow ? 'קיבול' : 'משקל');
  const shown = editing ? draft.graph : graph;

  const validation = useMemo(
    () => validateGraph(module, graph, source, sink),
    [module, graph, source, sink],
  );

  const draftNotes = useMemo(
    () => (editing ? validateGraph(module, draft.graph, source, sink) : []),
    [editing, module, draft.graph, source, sink],
  );
  const draftWarning = draftNotes[0]?.text;

  const selectedNodes = useMemo(() => {
    const picked = draft.selection?.type === 'node' ? [draft.selection.id] : [];
    return draft.linkFrom ? [...new Set([draft.linkFrom, ...picked])] : picked;
  }, [draft.selection, draft.linkFrom]);

  const toolHint =
    draft.tool === 'add'
      ? 'לחיצה על שטח ריק מוסיפה צומת, והכלי חוזר לבחירה.'
      : draft.tool === 'connect'
        ? draft.linkFrom
          ? `נבחר ${draft.linkFrom}. לחץ על הצומת השני.`
          : 'לחיצה על שני צמתים מחברת ביניהם.'
        : 'גרירה מזיזה צומת, וגרירה מהנקודה שעל המסגרת מחברת אותו לצומת אחר.';

  const selectionLine =
    draft.selection?.type === 'node'
      ? `צומת ${draft.selection.id} נבחר. המאפיינים שלו בסרגל.`
      : draft.selection?.type === 'edge'
        ? 'צלע נבחרה. המשקל והמחיקה בסרגל.'
        : 'עריכת הגרף. בחר צומת או צלע כדי לערוך אותם.';

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        draft.deleteSelection();
      } else if (e.key === 'Escape') {
        draft.cancelLink();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) draft.redo();
        else draft.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        draft.redo();
      } else if (e.key.startsWith('Arrow') && draft.selection?.type === 'node') {
        // Nudging beats dragging when a node needs to line up with its neighbours
        e.preventDefault();
        const step = e.shiftKey ? 10 : 2;
        const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
        const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
        draft.nudge(draft.selection.id, dx, dy);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, draft]);

  function saveDraft() {
    saveCustomGraph(module.id, draft.graph);
    setCustom(draft.graph);
    setPresetId('custom');
    setEditing(false);
  }

  const frames = useMemo(() => {
    try {
      return module.run(graph, { source, sink, showNoChange });
    } catch {
      return [];
    }
  }, [module, graph, source, sink, showNoChange]);

  /* The editor owns the keyboard while it is open, so space cannot start a run. */
  const player = usePlayer(frames.length, !editing);
  const frame = frames[Math.min(player.index, frames.length - 1)];

  /** Which node colours this run actually reaches, for the key under the graph. */
  const keyStates = useMemo(() => {
    const seen = new Set<NodeState>();
    for (const f of frames) for (const st of Object.values(f.nodeStates)) seen.add(st);
    return [...seen];
  }, [frames]);

  const activeCode = useMemo(() => {
    const i = frame?.codeLine;
    if (i === undefined) return null;
    const text = module.content.pseudocode[i];
    return text === undefined ? null : { line: i + 1, text: text.trimEnd() };
  }, [frame, module]);
  const openWarnings = validation.filter((v) => !dismissed.includes(v.text));

  return (
    <div className="flex flex-col gap-3">
      {/* Setup, on one line. It used to take four stacked rows above the graph. */}
      <div className="flex items-center gap-2">
        <div className="no-scrollbar fade-end flex min-w-0 flex-1 items-center gap-2">
        <span className="flex flex-none items-center gap-1.5 text-ink-faint" style={{ fontSize: 'var(--step-1)', fontWeight: 500 }}>
          <Network size={14} aria-hidden="true" />
          גרף
        </span>
        {module.presetGraphs.map((p) => (
          <button
            key={p.id}
            className="chip"
            aria-pressed={presetId === p.id}
            title={p.whyHe}
            onClick={() => setPresetId(p.id)}
          >
            {p.nameHe}
          </button>
        ))}
        <button
          className="chip"
          aria-pressed={presetId === 'custom'}
          disabled={!custom}
          onClick={() => custom && setPresetId('custom')}
          title={custom ? 'הגרף ששמרת' : 'עוד לא שמרת גרף משלך'}
        >
          הגרף שלי
        </button>

        {module.needsSource && (
          <label className="flex flex-none items-center gap-1.5">
            <span className="text-ink-faint" style={{ fontSize: 'var(--step-1)', fontWeight: 500 }}>
              מקור
            </span>
            <NodePicker
              label="צומת מקור"
              value={source}
              options={graph.nodes.map((n) => n.id)}
              onChange={setSource}
            />
          </label>
        )}
        {module.needsSink && (
          <label className="flex flex-none items-center gap-1.5">
            <span className="text-ink-faint" style={{ fontSize: 'var(--step-1)', fontWeight: 500 }}>
              בור
            </span>
            <NodePicker
              label="צומת בור"
              value={sink}
              options={graph.nodes.map((n) => n.id)}
              onChange={setSink}
            />
          </label>
        )}

        {module.showNoChangeToggle && (
          <label className="chip" data-active={showNoChange}>
            <input
              type="checkbox"
              checked={showNoChange}
              onChange={(e) => setShowNoChange(e.target.checked)}
            />
            <Eye size={14} aria-hidden="true" />
            <span className="hidden sm:inline">גם צעדים ללא שינוי</span>
          </label>
        )}

        </div>

        <button
          className="btn btn-sm flex-none"
          aria-label={editing ? 'סגור עורך' : 'ערוך גרף'}
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? <X size={15} aria-hidden="true" /> : <Pencil size={15} aria-hidden="true" />}
          <span className="hidden sm:inline">{editing ? 'סגור עורך' : 'ערוך גרף'}</span>
        </button>
      </div>

      {openWarnings.map((v) => (
        <div
          key={v.text}
          className="panel-in rounded-card border p-3"
          style={{
            fontSize: 'var(--step-2)',
            borderColor: v.level === 'error' ? 'var(--state-current)' : 'var(--state-frontier)',
            background:
              v.level === 'error' ? 'var(--state-current-fill)' : 'var(--state-frontier-fill)',
          }}
          role="status"
        >
          <p className="flex items-start gap-2">
            <TriangleAlert
              size={17}
              aria-hidden="true"
              className="mt-1 shrink-0"
              style={{
                color: v.level === 'error' ? 'var(--state-current)' : 'var(--state-frontier)',
              }}
            />
            <span>{v.text}</span>
          </p>
          {v.suggestion && (
            <p className="mt-1" style={{ fontSize: 'var(--step-1)' }}>
              {v.suggestion}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="btn btn-sm" onClick={() => setDismissed((d) => [...d, v.text])}>
              הרץ בכל זאת
            </button>
            {v.action && onNavigate && (
              <button
                className="btn btn-sm btn-primary"
                onClick={() => onNavigate(v.action!.targetId)}
              >
                {v.action.label}
              </button>
            )}
          </div>
        </div>
      ))}

      {/*
       * The stage: graph and narration as one surface, sized to what is left of
       * the viewport, with the rail docked under it. Everything a run needs is
       * on the first screen, at any window height.
       */}
      {/* Graph on the reading side, its data structures beside it on the left. */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div
          className="run-stage stage min-w-0"
          style={{ '--graph-aspect': graphAspect(graph) } as CSSProperties}
        >
          <div className="stage-canvas">
            <GraphCanvas
              graph={shown}
              frame={editing ? undefined : frame}
              hoveredNode={hovered}
              onHoverNode={setHovered}
              onNodeClick={editing ? draft.onNodeClick : undefined}
              onEdgeClick={editing ? draft.onEdgeClick : undefined}
              onCanvasClick={editing ? draft.onCanvasClick : undefined}
              onNodeDrag={editing && draft.tool === 'select' ? draft.onNodeDrag : undefined}
              onNodeDragEnd={editing ? draft.onNodeDragEnd : undefined}
              selectedNodes={editing ? selectedNodes : []}
              selectedEdge={editing && draft.selection?.type === 'edge' ? draft.selection.id : null}
              sourceNode={editing && module.needsSource ? source : undefined}
              sinkNode={editing && module.needsSink ? sink : undefined}
              canvasCursor={editing && draft.tool === 'add' ? 'copy' : 'default'}
              linkFrom={editing ? draft.linkFrom : null}
              onConnect={editing ? draft.connect : undefined}
              fit
              ariaLabel={
                editing ? 'עריכת הגרף' : `הרצת ${module.shortHe} על הגרף`
              }
            />
          </div>
          {/*
           * One strip, whichever mode is up: the colour key while running, the
           * active tool while editing. Same row, same height, so opening the
           * editor never moves anything on the page.
           */}
          {editing ? (
            <p className="stage-key" aria-live="polite">
              <span style={{ color: 'var(--accent-strong)', fontWeight: 600 }}>{toolHint}</span>
              <span className="ms-auto flex-none text-ink-faint">
                גרור מהנקודה שעל המסגרת כדי לחבר · חצים מזיזים · Delete מוחק · Ctrl+Z מבטל
              </span>
            </p>
          ) : (
            <NodeKey states={keyStates} />
          )}

          <div className="stage-caption">
            {editing ? (
              <>
                <p aria-live="polite" className="caption-line items-start gap-2.5">
                  <span className="event-chip" style={{ background: 'var(--accent-strong)' }}>
                    עריכה
                  </span>
                  <span>{draft.note || selectionLine}</span>
                </p>
                <p className="caption-sub text-(length:--step-1) text-ink-faint">
                  {draftWarning ??
                    (draft.dirty
                      ? 'יש שינויים שלא נשמרו. סגירת העורך תבטל אותם.'
                      : 'הגרף תקין להרצה. השינויים נשמרים רק בלחיצה על שמור.')}
                </p>
              </>
            ) : (
            <>
            <p aria-live="polite" className="caption-line">
              {frame ? (
                <span key={player.index} className="caption-swap flex items-start gap-2.5">
                  <span className="event-chip" style={{ background: EVENT_INK[frame.event] }}>
                    {EVENT_LABEL[frame.event]}
                  </span>
                  <span>{frame.message}</span>
                </span>
              ) : (
                <span className="text-ink-soft">אין צעדים להצגה בגרף הזה.</span>
              )}
            </p>
            {/*
             * The line the step is on, next to the step itself. The full listing
             * is a panel away, so without this the tie between the run and the
             * algorithm is only visible to whoever thinks to open it.
             */}
            {activeCode && (
              <p dir="ltr" className="caption-sub caption-code num" title="השורה בפסאודו-קוד">
                <span className="caption-code-num">{activeCode.line}</span>
                <span className="caption-code-text whitespace-pre">{activeCode.text}</span>
              </p>
            )}
            </>
            )}
          </div>
        </div>

        <aside className="run-aside">
          {editing ? (
            <div className="card flex h-full flex-col overflow-hidden p-3">
              <EditorRail
                module={module}
                draft={draft}
                source={source}
                sink={sink}
                onSource={setSource}
                onSink={setSink}
              />
            </div>
          ) : frame ? (
            <div className="card flex h-full flex-col overflow-hidden p-3">
              <AuxPanel views={frame.aux} hovered={hovered} onHover={setHovered} />
            </div>
          ) : (
            <p className="text-ink-soft">אין מבני נתונים להצגה.</p>
          )}
        </aside>
      </div>

      <div className="run-rail">
        {editing ? (
          <EditorTools draft={draft} onSave={saveDraft} />
        ) : (
          <TransportRail player={player} frames={frames} flow={graph.flow} />
        )}
      </div>

      {/* Depth, spanning the stage so it matches the rail below the graph. */}
      <Pseudocode lines={module.content.pseudocode} activeLine={frame?.codeLine} />

      {module.content.compareHint && onGoToCompare && (
        <div className="card flex flex-wrap items-center gap-3 px-4 py-3">
          <p className="flex-1" style={{ fontSize: 'var(--step-2)' }}>
            {module.content.compareHint.text}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => onGoToCompare(module.content.compareHint!.pairId)}
          >
            <GitCompareArrows size={15} aria-hidden="true" />
            פתח השוואה
          </button>
        </div>
      )}
    </div>
  );
}
