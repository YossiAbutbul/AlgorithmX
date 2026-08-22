import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Pause, Play, RotateCcw } from 'lucide-react';
import type { Frame } from '../algorithms/types';
import { EVENT_LABEL, EVENT_COLOR } from './events';
import { Legend } from './Legend';
import { SPEEDS } from './usePlayer';
import type { Player } from './usePlayer';

interface Props {
  player: Player;
  frames: Frame[];
  /** Draw the flow specific rows in the legend. */
  flow?: boolean;
  /** The compare page drives two players from one rail, so it hides the legend. */
  showLegend?: boolean;
  compact?: boolean;
}

export function TransportRail({
  player,
  frames,
  flow = false,
  showLegend = true,
  compact = false,
}: Props) {
  const { index, total, playing, next, prev, reset, togglePlay, speed, setSpeed, setIndex } = player;
  const [legendOpen, setLegendOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const legendWrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!legendOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!legendWrap.current?.contains(e.target as Node)) setLegendOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLegendOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [legendOpen]);

  /** The run reads right to left, so the scrubber does too. */
  const seekFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el || frames.length === 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = (rect.right - clientX) / rect.width;
    setIndex(Math.round(ratio * (frames.length - 1)));
  };

  const atEnd = index >= total - 1;

  return (
    <div className="rail" role="group" aria-label="בקרת הרצה">
      <button
        className="btn btn-primary"
        onClick={togglePlay}
        disabled={atEnd && !playing}
        aria-label={playing ? 'עצור' : 'נגן'}
      >
        {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        <span className={compact ? 'hidden lg:inline' : 'hidden sm:inline'}>
          {playing ? 'עצור' : 'נגן'}
        </span>
      </button>

      <button className="btn" onClick={prev} disabled={index === 0} aria-label="הצעד הקודם">
        <ChevronRight size={17} aria-hidden="true" />
      </button>
      <button className="btn" onClick={next} disabled={atEnd} aria-label="הצעד הבא">
        <ChevronLeft size={17} aria-hidden="true" />
      </button>
      <button className="btn" onClick={reset} disabled={index === 0} aria-label="לאיפוס">
        <RotateCcw size={15} aria-hidden="true" />
      </button>

      <div
        ref={trackRef}
        dir="rtl"
        className="scrubber"
        role="slider"
        tabIndex={0}
        aria-label="ציר הצעדים"
        aria-valuemin={1}
        aria-valuemax={Math.max(1, frames.length)}
        aria-valuenow={index + 1}
        aria-valuetext={`צעד ${index + 1}: ${EVENT_LABEL[frames[index]?.event ?? 'init']}`}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          seekFromClientX(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && seekFromClientX(e.clientX)}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            next();
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            prev();
          }
          if (e.key === 'Home') {
            e.preventDefault();
            setIndex(0);
          }
          if (e.key === 'End') {
            e.preventDefault();
            setIndex(frames.length - 1);
          }
        }}
      >
        {frames.map((f, i) => {
          const active = i === index;
          const quiet = f.event === 'no-change' || f.event === 'reject';
          return (
            <span
              key={i}
              data-active={active}
              className="scrubber-mark"
              title={`${i + 1}. ${EVENT_LABEL[f.event]}`}
              style={{
                height: active ? '100%' : quiet ? '38%' : i < index ? '72%' : '52%',
                background: EVENT_COLOR[f.event],
                opacity: i <= index ? 1 : 0.34,
              }}
            />
          );
        })}
      </div>

      <span
        dir="ltr"
        className="num flex-none whitespace-nowrap px-1 text-ink-soft"
        style={{ fontSize: 'var(--step-1)', fontWeight: 600 }}
      >
        <b style={{ color: 'var(--ink)' }}>{index + 1}</b> / {total}
      </span>

      <button
        className="btn btn-sm"
        onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
        aria-label={`מהירות ניגון, כעת פי ${speed}`}
      >
        <span className="num">{speed}x</span>
      </button>

      {showLegend && (
        <div ref={legendWrap} className="relative flex-none">
          <button
            className="btn btn-sm"
            aria-expanded={legendOpen}
            onClick={() => setLegendOpen((v) => !v)}
          >
            <Info size={15} aria-hidden="true" />
            <span className="hidden sm:inline">מקרא</span>
          </button>
          {legendOpen && (
            <div className="popover popover-rail">
              <Legend flow={flow} frames={frames} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
