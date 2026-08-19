import { ChevronLeft, ChevronRight, Gauge, Pause, Play, RotateCcw } from 'lucide-react';
import type { Player, Speed } from './usePlayer';

const SPEEDS: { id: Speed; label: string }[] = [
  { id: 'slow', label: 'איטי' },
  { id: 'normal', label: 'רגיל' },
  { id: 'fast', label: 'מהיר' },
];

interface Props {
  player: Player;
}

export function StepControls({ player }: Props) {
  const { index, total, playing, next, prev, reset, togglePlay, speed, setSpeed } = player;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5">
        <button className="btn" onClick={prev} disabled={index === 0} aria-label="הצעד הקודם">
          <ChevronRight size={16} aria-hidden="true" />
          הקודם
        </button>
        <button
          className="btn btn-primary"
          onClick={togglePlay}
          disabled={index >= total - 1}
          aria-label={playing ? 'עצור' : 'נגן'}
        >
          {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          {playing ? 'עצור' : 'נגן'}
        </button>
        <button className="btn" onClick={next} disabled={index >= total - 1} aria-label="הצעד הבא">
          הבא
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <button className="btn" onClick={reset} disabled={index === 0} aria-label="לאיפוס">
          <RotateCcw size={15} aria-hidden="true" />
          לאיפוס
        </button>
      </div>

      <div className="flex items-center gap-1" role="group" aria-label="מהירות ניגון">
        <Gauge size={15} aria-hidden="true" style={{ color: 'var(--ink-soft)' }} />
        <span className="text-[length:var(--step-1)] text-ink-soft">מהירות</span>
        {SPEEDS.map((s) => (
          <button
            key={s.id}
            className="chip"
            aria-pressed={speed === s.id}
            onClick={() => setSpeed(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="num ms-auto text-[length:var(--step-2)] font-semibold text-ink-soft">
        צעד {index + 1} מתוך {total}
      </div>
    </div>
  );
}
