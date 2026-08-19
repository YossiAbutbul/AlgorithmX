import { useEffect, useMemo, useState } from 'react';
import { Eye, GitCompareArrows, Network, Pencil, TriangleAlert, X } from 'lucide-react';
import type { AlgorithmModule, GraphModel, NodeId } from '../algorithms/types';
import { validateGraph } from '../algorithms/validate';
import { AuxPanel } from './panels/AuxPanel';
import { GraphCanvas } from './GraphCanvas';
import { GraphEditor } from './GraphEditor';
import { Legend } from './Legend';
import { Pseudocode } from './Pseudocode';
import { StepControls } from './StepControls';
import { StepTimeline } from './StepTimeline';
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
    const snk = usingCustom ? (graph.nodes.find((n) => n.id === 't')?.id ?? graph.nodes[graph.nodes.length - 1]?.id) : preset.sink;
    setSource(src ?? first);
    setSink(snk);
    setDismissed([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId, custom]);

  const validation = useMemo(() => validateGraph(module, graph, source, sink), [module, graph, source, sink]);

  const frames = useMemo(() => {
    try {
      return module.run(graph, { source, sink, showNoChange });
    } catch {
      return [];
    }
  }, [module, graph, source, sink, showNoChange]);

  const player = usePlayer(frames.length);
  const frame = frames[Math.min(player.index, frames.length - 1)];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[length:var(--step-1)] font-bold text-ink-soft">
          <Network size={15} aria-hidden="true" />
          גרף
        </span>
        {module.presetGraphs.map((p) => (
          <button
            key={p.id}
            className="chip"
            aria-pressed={presetId === p.id}
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
        {module.showNoChangeToggle && (
          <label className="chip" data-active={showNoChange}>
            <input
              type="checkbox"
              checked={showNoChange}
              onChange={(e) => setShowNoChange(e.target.checked)}
            />
            <Eye size={14} aria-hidden="true" />
            הצג גם צעדים ללא שינוי
          </label>
        )}
        <button className="btn ms-auto" onClick={() => setEditing((v) => !v)}>
          {editing ? <X size={15} aria-hidden="true" /> : <Pencil size={15} aria-hidden="true" />}
          {editing ? 'סגור את העורך' : 'ערוך גרף'}
        </button>
      </div>

      <p className="text-[length:var(--step-1)] text-ink-soft">
        {usingCustom ? 'הגרף שבנית ונשמר בדפדפן.' : `${preset.nameHe}: ${preset.whyHe}`}
      </p>

      {(module.needsSource || module.needsSink) && (
        <div className="flex flex-wrap items-center gap-3">
          {module.needsSource && (
            <label className="flex items-center gap-2 text-[length:var(--step-2)]">
              <span className="text-ink-soft">צומת מקור</span>
              <select
                className="btn"
                value={source ?? ''}
                onChange={(e) => setSource(e.target.value)}
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
            <label className="flex items-center gap-2 text-[length:var(--step-2)]">
              <span className="text-ink-soft">צומת בור</span>
              <select className="btn" value={sink ?? ''} onChange={(e) => setSink(e.target.value)}>
                {graph.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.id}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {validation
        .filter((v) => !dismissed.includes(v.text))
        .map((v) => (
          <div
            key={v.text}
            className="rounded-card border p-3 text-[length:var(--step-2)]"
            style={{
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
            {v.suggestion && <p className="mt-1 text-[length:var(--step-1)]">{v.suggestion}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn" onClick={() => setDismissed((d) => [...d, v.text])}>
                הרץ בכל זאת
              </button>
              {v.action && onNavigate && (
                <button
                  className="btn btn-primary"
                  onClick={() => onNavigate(v.action!.targetId)}
                >
                  {v.action.label}
                </button>
              )}
            </div>
          </div>
        ))}

      {editing && (
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
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="flex flex-col gap-3">
          <div className="card-quiet overflow-hidden bg-sunken p-2">
            <GraphCanvas
              graph={graph}
              frame={frame}
              hoveredNode={hovered}
              onHoverNode={setHovered}
              ariaLabel={`הרצת ${module.shortHe} על הגרף`}
            />
          </div>

          <p
            aria-live="polite"
            className="card-quiet flex min-h-[62px] items-center px-3 py-2 text-[length:var(--step-3)]"
          >
            {frame?.message ?? 'אין צעדים להצגה בגרף הזה.'}
          </p>

          <StepControls player={player} />
          {frames.length > 1 && (
            <StepTimeline frames={frames} index={player.index} onSeek={player.setIndex} />
          )}
          <Legend flow={graph.flow} />
        </div>

        <div>
          {frame ? (
            <AuxPanel views={frame.aux} hovered={hovered} onHover={setHovered} />
          ) : (
            <p className="text-ink-soft">אין מבני נתונים להצגה.</p>
          )}
        </div>
      </div>

      <Pseudocode lines={module.content.pseudocode} activeLine={frame?.codeLine} />

      {module.content.compareHint && onGoToCompare && (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-sunken px-4 py-3">
          <p className="flex-1 text-[length:var(--step-2)]">{module.content.compareHint.text}</p>
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
