import { useCallback, useEffect, useRef, useState } from 'react';

export type Speed = 'slow' | 'normal' | 'fast';

const DELAY: Record<Speed, number> = { slow: 1400, normal: 750, fast: 320 };

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface Player {
  index: number;
  setIndex: (i: number) => void;
  playing: boolean;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
  speed: Speed;
  setSpeed: (s: Speed) => void;
  total: number;
}

export function usePlayer(total: number, keyboard = true): Player {
  const [index, setIndexRaw] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>('normal');
  const reduced = useRef(prefersReducedMotion());

  const last = Math.max(0, total - 1);

  const setIndex = useCallback(
    (i: number) => setIndexRaw(Math.max(0, Math.min(last, i))),
    [last],
  );

  useEffect(() => {
    setIndexRaw(0);
    setPlaying(false);
  }, [total]);

  const next = useCallback(() => setIndexRaw((i) => Math.min(last, i + 1)), [last]);
  const prev = useCallback(() => setIndexRaw((i) => Math.max(0, i - 1)), []);
  const reset = useCallback(() => {
    setIndexRaw(0);
    setPlaying(false);
  }, []);
  const togglePlay = useCallback(() => {
    if (reduced.current) {
      setIndexRaw((i) => Math.min(last, i + 1));
      return;
    }
    setPlaying((p) => !p);
  }, [last]);

  useEffect(() => {
    if (!playing) return;
    if (index >= last) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setIndexRaw((i) => Math.min(last, i + 1)), DELAY[speed]);
    return () => window.clearTimeout(t);
  }, [playing, index, last, speed]);

  useEffect(() => {
    if (!keyboard) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      // רכיבים שמטפלים בעצמם בחצים: הטאבים ופס הצעדים
      if (target?.closest('[role="tablist"]') || target?.closest('[role="slider"]')) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        prev();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        next();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [keyboard, next, prev, togglePlay]);

  return { index, setIndex, playing, togglePlay, next, prev, reset, speed, setSpeed, total };
}
