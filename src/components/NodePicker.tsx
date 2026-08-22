import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { NodeId } from '../algorithms/types';

interface Props {
  value: NodeId | undefined;
  options: NodeId[];
  onChange: (id: NodeId) => void;
  label: string;
  /** Fills its column, for the editor's rail. */
  block?: boolean;
}

/**
 * A node picker, in place of a select. The list a select opens is drawn by the
 * operating system: it cannot be animated, it ignores the palette, and in dark
 * mode it arrives as a pane of someone else's colours. This is the app's own
 * list, so it opens the way every other panel here does and the caret turns
 * with it.
 */
export function NodePicker({ value, options, onChange, label, block = false }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, options.indexOf(value ?? options[0])));
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, options, value]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({
      block: 'nearest',
    });
  }, [open, active]);

  const commit = (i: number) => {
    const next = options[i];
    if (next !== undefined) onChange(next);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      commit(active);
    }
  };

  return (
    <div ref={wrap} className={`relative ${block ? 'w-full' : 'flex-none'}`}>
      <button
        type="button"
        className={`picker-btn num ${block ? 'w-full' : ''}`}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKey}
      >
        <span>{value ?? ''}</span>
        <ChevronDown size={14} aria-hidden="true" className="picker-caret" />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={id}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          className="picker-list"
          onKeyDown={onKey}
        >
          {options.map((o, i) => (
            <li key={o}>
              <button
                type="button"
                role="option"
                aria-selected={o === value}
                data-active={i === active}
                className="picker-item num"
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(i)}
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
