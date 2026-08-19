import { useRef } from 'react';
import type { Frame, FrameEvent } from '../algorithms/types';

const EVENT_COLOR: Record<FrameEvent, string> = {
  init: 'var(--ink-soft)',
  visit: 'var(--state-current)',
  discover: 'var(--state-done)',
  relax: 'var(--state-done)',
  'no-change': '#b7bfda',
  reject: '#98a1c0',
  select: 'var(--state-current)',
  finish: 'var(--state-done)',
  augment: 'var(--state-done)',
  iteration: 'var(--state-frontier)',
  done: 'var(--ink)',
};

const EVENT_LABEL: Record<FrameEvent, string> = {
  init: 'אתחול',
  visit: 'ביקור',
  discover: 'גילוי',
  relax: 'שיפור',
  'no-change': 'בלי שינוי',
  reject: 'דחייה',
  select: 'בחירה',
  finish: 'סגירת צומת',
  augment: 'הגדלה',
  iteration: 'איטרציה',
  done: 'סיום',
};

interface Props {
  frames: Frame[];
  index: number;
  onSeek: (i: number) => void;
}

export function StepTimeline({ frames, index, onSeek }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const seekFromClientX = (clientX: number) => {
    const el = ref.current;
    if (!el || frames.length === 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = (rect.right - clientX) / rect.width;
    const i = Math.round(ratio * (frames.length - 1));
    onSeek(Math.max(0, Math.min(frames.length - 1, i)));
  };

  const used = Array.from(new Set(frames.map((f) => f.event)));

  return (
    <div>
      <div
        ref={ref}
        dir="rtl"
        className="flex h-8 w-full items-end gap-[2px] rounded-lg bg-sunken px-2 py-1.5"
        style={{ cursor: 'pointer', touchAction: 'none' }}
        onMouseDown={(e) => {
          dragging.current = true;
          seekFromClientX(e.clientX);
        }}
        onMouseMove={(e) => {
          if (dragging.current) seekFromClientX(e.clientX);
        }}
        onMouseUp={() => {
          dragging.current = false;
        }}
        onMouseLeave={() => {
          dragging.current = false;
        }}
        role="slider"
        tabIndex={0}
        aria-label="פס הצעדים"
        aria-valuemin={1}
        aria-valuemax={frames.length}
        aria-valuenow={index + 1}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') onSeek(index + 1);
          if (e.key === 'ArrowRight') onSeek(index - 1);
          if (e.key === 'Home') onSeek(0);
          if (e.key === 'End') onSeek(frames.length - 1);
        }}
      >
        {frames.map((f, i) => {
          const active = i === index;
          const passed = i <= index;
          return (
            <span
              key={i}
              title={`${i + 1}. ${EVENT_LABEL[f.event]}`}
              className="flex-1 rounded-sm"
              style={{
                minWidth: 3,
                height: active ? 18 : f.event === 'no-change' || f.event === 'reject' ? 7 : 12,
                background: EVENT_COLOR[f.event],
                opacity: passed ? 1 : 0.28,
                outline: active ? '2px solid var(--accent)' : 'none',
                outlineOffset: 1,
                transition: 'height .15s ease, opacity .15s ease',
              }}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[var(--step-1)] text-ink-soft">
        {used.map((ev) => (
          <span key={ev} className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: EVENT_COLOR[ev] }}
            />
            {EVENT_LABEL[ev]}
          </span>
        ))}
      </div>
    </div>
  );
}
