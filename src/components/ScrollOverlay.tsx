import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_THUMB = 34;

/**
 * Thin scrollbar floating over the content, replacing the browser bar that takes width.
 * Kept on the right side of the viewport, where a scrollbar is expected.
 */
export function ScrollOverlay() {
  const [thumb, setThumb] = useState({ top: 0, height: 0, visible: false });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startY: number; startScroll: number } | null>(null);

  const update = useCallback(() => {
    const doc = document.documentElement;
    const viewport = doc.clientHeight;
    const total = doc.scrollHeight;
    if (total <= viewport + 1) {
      setThumb((t) => (t.visible ? { ...t, visible: false } : t));
      return;
    }
    const height = Math.max(MIN_THUMB, (viewport / total) * viewport);
    const maxScroll = total - viewport;
    const top = maxScroll > 0 ? (doc.scrollTop / maxScroll) * (viewport - height) : 0;
    setThumb({ top, height, visible: true });
  }, []);

  useEffect(() => {
    update();
    // The first measurement can run before the content reaches its final height
    const raf = requestAnimationFrame(update);
    const timer = window.setTimeout(update, 250);
    document.fonts?.ready.then(update).catch(() => undefined);

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      ro.observe(document.body);
      ro.observe(document.documentElement);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, [update]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const start = drag.current;
      if (!start) return;
      const doc = document.documentElement;
      const viewport = doc.clientHeight;
      const total = doc.scrollHeight;
      const height = Math.max(MIN_THUMB, (viewport / total) * viewport);
      const range = viewport - height;
      if (range <= 0) return;
      const delta = e.clientY - start.startY;
      window.scrollTo({ top: start.startScroll + (delta / range) * (total - viewport) });
    };
    const onUp = () => {
      drag.current = null;
      setDragging(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  if (!thumb.visible) return null;

  return (
    <div className="scroll-overlay" aria-hidden="true">
      <div
        className="scroll-overlay-thumb"
        data-dragging={dragging}
        style={{ top: thumb.top, height: thumb.height }}
        onMouseDown={(e) => {
          e.preventDefault();
          drag.current = { startY: e.clientY, startScroll: document.documentElement.scrollTop };
          setDragging(true);
        }}
      />
    </div>
  );
}
