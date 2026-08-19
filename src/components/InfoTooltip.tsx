import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  children: ReactNode;
}

/** כפתור מידע קטן שפותח תיבה. נפתח בהצבעה, בלחיצה ובמקלדת, ונסגר ב-Escape. */
export function InfoTooltip({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="info-btn"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
      >
        <Info size={15} aria-hidden="true" />
      </button>
      {open && (
        <div className="tooltip-pop" role="dialog" aria-label={label}>
          {children}
        </div>
      )}
    </div>
  );
}
