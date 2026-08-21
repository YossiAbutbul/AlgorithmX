import { useEffect, useMemo, useState } from 'react';
import { Eye, GitCompareArrows, Network, Pencil, TriangleAlert, X } from 'lucide-react';
import type { AlgorithmModule, GraphModel, NodeId } from '../algorithms/types';
import { validateGraph } from '../algorithms/validate';
import { AuxPanel } from './panels/AuxPanel';
import { EVENT_COLOR, EVENT_LABEL } from './events';
import { GraphCanvas } from './GraphCanvas';
import { GraphEditor } from './GraphEditor';
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

  const validation = useMemo(
    () => validateGraph(module, graph, source, sink),
    [module, graph, source, sink],
  );

  const frames = useMemo(() => {
    try {
      return module.run(graph, { source, sink, showNoChange });
    } catch {
      return [];
    }
  }, [module, graph, source, sink, showNoChange]);

  const player = usePlayer(frames.length);
  const frame = frames[Math.min(player.index, frames.length - 1)];
  const openWarnings = validation.filter((v) => !dismissed.includes(v.text));

  return (
    <div className="flex flex-col gap-3">
      {/* Setup, on one line. It used to take four stacked rows above the graph. */}
      <div className="no-scrollbar fade-end flex items-center gap-2">
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
            <select
              className="btn btn-sm num"
              value={source ?? ''}
              onChange={(e) => setSource(e.target.value)}
              aria-label="צומת מקור"
            >
              {graph.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id}
                </option>
              ))}
            </select>
          </label>
        )}
        {module.needsSink && (
          <label className="flex flex-none items-center gap-1.5">
            <span className="text-ink-faint" style={{ fontSize: 'var(--step-1)', fontWeight: 500 }}>
              בור
            </span>
            <select
              className="btn btn-sm num"
              value={sink ?? ''}
              onChange={(e) => setSink(e.target.value)}
              aria-label="צומת בור"
            >
              {graph.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id}
                </option>
              ))}
            </select>
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

        <button className="btn btn-sm ms-auto flex-none" onClick={() => setEditing((v) => !v)}>
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

      {editing && (
        <div className="panel-in">
          <GraphEditor
            module={module}
            graph={graph}
            onSave={(g) => {
              saveCustomGraph(module.id, g);
              setCustom(g);
              setPresetId('custom');
            }}
            onReset={() => {
              setPresetId(module.presetGraphs[0].id);
              setEditing(false);
            }}
          />
        </div>
      )}

      {/*
       * The stage: graph and narration as one surface, sized to what is left of
       * the viewport, with the rail docked under it. Everything a run needs is
       * on the first screen, at any window height.
       */}
      {/* Graph on the reading side, its data structures beside it on the left. */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="run-stage stage">
          <div className="stage-canvas">
            <GraphCanvas
              graph={graph}
              frame={frame}
              hoveredNode={hovered}
              onHoverNode={setHovered}
              fit
              ariaLabel={`הרצת ${module.shortHe} על הגרף`}
            />
          </div>
          <p className="stage-caption" aria-live="polite">
            {frame ? (
              <span key={player.index} className="caption-swap flex items-start gap-2.5">
                <span className="event-chip" style={{ background: EVENT_COLOR[frame.event] }}>
                  {EVENT_LABEL[frame.event]}
                </span>
                <span>{frame.message}</span>
              </span>
            ) : (
              <span className="text-ink-soft">אין צעדים להצגה בגרף הזה.</span>
            )}
          </p>
        </div>

        <aside className="run-aside">
          {frame ? (
            <div className="card h-full overflow-y-auto p-3">
              <AuxPanel views={frame.aux} hovered={hovered} onHover={setHovered} />
            </div>
          ) : (
            <p className="text-ink-soft">אין מבני נתונים להצגה.</p>
          )}
        </aside>
      </div>

      <div className="run-rail">
        <TransportRail player={player} frames={frames} flow={graph.flow} />
      </div>

      {/* Depth. Reached by scrolling on purpose, not scrolled past by accident. */}
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
