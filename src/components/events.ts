import type { FrameEvent } from '../algorithms/types';

/** One colour per kind of step. The scrubber and the legend read from here. */
export const EVENT_COLOR: Record<FrameEvent, string> = {
  init: 'var(--ink-faint)',
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

export const EVENT_LABEL: Record<FrameEvent, string> = {
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
