import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Unlink } from 'lucide-react';
import { ALGORITHMS, getAlgorithm } from '../algorithms';
import type { Frame, GraphModel, NodeId } from '../algorithms/types';
import { AuxPanel } from '../components/panels/AuxPanel';
import { GraphCanvas } from '../components/GraphCanvas';
import { Legend } from '../components/Legend';
import { StepControls } from '../components/StepControls';
import { StepTimeline } from '../components/StepTimeline';
import { usePlayer } from '../components/usePlayer';
import { COMPARE_PAIRS } from '../content/comparison';

interface SideProps {
  title: string;
  graph: GraphModel;
  frames: Frame[];
  index: number;
  onSeek: (i: number) => void;
  synced: boolean;
}

function Side({ title, graph, frames, index, onSeek, synced }: SideProps) {
  const [hovered, setHovered] = useState<NodeId | null>(null);
  const i = Math.min(index, frames.length - 1);
  const frame = frames[i];
  return (
    <section className="card flex flex-col gap-3 p-3">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-[var(--step-4)]">{title}</h2>
        <span className="num text-[var(--step-1)] text-ink-soft">
          צעד {i + 1} מתוך {frames.length}
        </span>
      </header>
      <div className="card-quiet bg-sunken p-2">
        <GraphCanvas
          graph={graph}
          frame={frame}
          hoveredNode={hovered}
          onHoverNode={setHovered}
          compact
          ariaLabel={`הרצת ${title}`}
        />
      </div>
      <p
        aria-live="polite"
        className="card-quiet flex min-h-[58px] items-center px-3 py-2 text-[var(--step-2)]"
      >
        {frame?.message}
      </p>
      <StepTimeline frames={frames} index={i} onSeek={onSeek} />
      {!synced && (
        <div className="flex gap-1.5">
          <button className="btn" onClick={() => onSeek(i - 1)} disabled={i === 0}>
            <ChevronRight size={16} aria-hidden="true" />
            הקודם
          </button>
          <button
            className="btn"
            onClick={() => onSeek(i + 1)}
            disabled={i >= frames.length - 1}
          >
            הבא
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      {frame && <AuxPanel views={frame.aux} hovered={hovered} onHover={setHovered} />}
    </section>
  );
}

export function ComparePage({ initialPair }: { initialPair: string | null }) {
  const [pairId, setPairId] = useState(initialPair ?? COMPARE_PAIRS[0].id);
  const [synced, setSynced] = useState(true);

  useEffect(() => {
    if (initialPair) setPairId(initialPair);
  }, [initialPair]);

  const pair = COMPARE_PAIRS.find((p) => p.id === pairId) ?? COMPARE_PAIRS[0];
  const graph = useMemo(() => pair.graph(), [pair]);
  const left = getAlgorithm(pair.left) ?? ALGORITHMS[0];
  const right = getAlgorithm(pair.right) ?? ALGORITHMS[1];

  const leftFrames = useMemo(
    () => left.run(graph, { source: pair.source, sink: pair.sink }),
    [left, graph, pair],
  );
  const rightFrames = useMemo(
    () => right.run(graph, { source: pair.source, sink: pair.sink }),
    [right, graph, pair],
  );

  const total = Math.max(leftFrames.length, rightFrames.length);
  const player = usePlayer(total);
  const [rightIndex, setRightIndex] = useState(0);
  const [leftIndex, setLeftIndex] = useState(0);

  useEffect(() => {
    if (synced) {
      setLeftIndex(player.index);
      setRightIndex(player.index);
    }
  }, [player.index, synced]);

  useEffect(() => {
    setLeftIndex(0);
    setRightIndex(0);
  }, [pairId]);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-[var(--step-5)]">השוואה זו לצד זו</h1>
        <p className="text-ink-soft">
          שני אלגוריתמים על אותו גרף בדיוק, עם בקרת צעדים אחת. אם הצעדים אינם מקבילים במשמעות, אפשר
          לנתק את הסנכרון.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {COMPARE_PAIRS.map((p) => (
          <button key={p.id} className="chip" aria-pressed={p.id === pairId} onClick={() => setPairId(p.id)}>
            {p.label}
          </button>
        ))}
        <label className="chip ms-auto" data-active={!synced}>
          <input type="checkbox" checked={!synced} onChange={(e) => setSynced(!e.target.checked)} />
          <Unlink size={14} aria-hidden="true" />
          נתק סנכרון
        </label>
      </div>

      {synced && <StepControls player={player} />}
      <Legend flow={graph.flow} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Side
          title={left.titleHe}
          graph={graph}
          frames={leftFrames}
          index={leftIndex}
          onSeek={(i) => (synced ? player.setIndex(i) : setLeftIndex(Math.max(0, Math.min(leftFrames.length - 1, i))))}
          synced={synced}
        />
        <Side
          title={right.titleHe}
          graph={graph}
          frames={rightFrames}
          index={rightIndex}
          onSeek={(i) => (synced ? player.setIndex(i) : setRightIndex(Math.max(0, Math.min(rightFrames.length - 1, i))))}
          synced={synced}
        />
      </div>

      <p
        className="rounded-card px-4 py-3 text-[var(--step-3)]"
        style={{ background: 'var(--accent-soft)' }}
      >
        <b>מה למדנו מההשוואה: </b>
        {pair.lesson}
      </p>
    </div>
  );
}
