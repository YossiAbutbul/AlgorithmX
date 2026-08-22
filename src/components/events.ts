import type { FrameEvent } from '../algorithms/types';

/** One colour per kind of step. The scrubber and the legend read from here. */
export const EVENT_COLOR: Record<FrameEvent, string> = {
  init: 'var(--ink-faint)',
  visit: 'var(--state-current)',
  discover: 'var(--state-done)',
  relax: 'var(--state-done)',
  'no-change': 'var(--state-quiet)',
  reject: 'var(--state-rejected)',
  select: 'var(--state-current)',
  finish: 'var(--state-done)',
  augment: 'var(--state-done)',
  iteration: 'var(--state-frontier)',
  done: 'var(--ink)',
};

/**
 * The same steps at reading weight, for the caption chip, which puts type on
 * top of the colour. The scrubber keeps the brighter set above: those are bars,
 * not backgrounds for text.
 */
export const EVENT_INK: Record<FrameEvent, string> = {
  init: 'var(--ink-faint)',
  visit: 'var(--state-current-ink)',
  discover: 'var(--state-done-ink)',
  relax: 'var(--state-done-ink)',
  'no-change': 'var(--state-quiet-ink)',
  reject: 'var(--state-rejected-ink)',
  select: 'var(--state-current-ink)',
  finish: 'var(--state-done-ink)',
  augment: 'var(--state-done-ink)',
  iteration: 'var(--state-frontier-ink)',
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
