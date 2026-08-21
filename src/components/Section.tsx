import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { loadPanelOpen, savePanelOpen } from '../graphs/storage';

interface Props {
  title: string;
  subtitle?: string;
  id?: string;
  icon?: LucideIcon;
  /**
   * Sections with little in them get a reading column instead of a full width
   * card floating in an empty page.
   */
  narrow?: boolean;
  children: ReactNode;
}

export function Section({ title, subtitle, id, icon: Icon, narrow = false, children }: Props) {
  return (
    <section
      id={id}
      className="card p-4 sm:p-6"
      style={narrow ? { maxWidth: '78ch' } : undefined}
    >
      <header className="mb-4 flex items-center gap-3">
        {Icon && (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            aria-hidden="true"
          >
            <Icon size={18} />
          </span>
        )}
        <div>
          <h2 style={{ fontSize: 'var(--step-4)' }}>{title}</h2>
          {subtitle && (
            <p className="text-ink-soft" style={{ fontSize: 'var(--step-1)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}

export function Accordion({
  summary,
  children,
  id,
  icon: Icon,
  /** Code and tables fill their column instead of the reading measure. */
  wide = false,
  /**
   * Panels that carry the run itself stay open once opened. Without this the
   * pseudo-code closes on every visit, and the line that tracks the step is
   * work to get to rather than something you read as you go.
   */
  persistKey,
  defaultOpen = false,
}: {
  summary: string;
  children: ReactNode;
  id?: string;
  icon?: LucideIcon;
  wide?: boolean;
  persistKey?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(() =>
    persistKey ? loadPanelOpen(persistKey, defaultOpen) : defaultOpen,
  );

  return (
    <details
      id={id}
      open={open}
      onToggle={(e) => {
        const next = e.currentTarget.open;
        setOpen(next);
        if (persistKey) savePanelOpen(persistKey, next);
      }}
      className="card group overflow-hidden"
      style={wide ? undefined : { maxWidth: '78ch' }}
    >
      <summary
        className="flex cursor-pointer items-center gap-2 px-4 py-3 font-semibold"
        style={{ fontSize: 'var(--step-2)', minHeight: 'var(--tap)' }}
      >
        {Icon && <Icon size={16} aria-hidden="true" style={{ color: 'var(--ink-soft)' }} />}
        {summary}
        {/* The chevron sits at the far edge of the header, opposite the label. */}
        <ChevronDown
          size={17}
          aria-hidden="true"
          className="ms-auto shrink-0 transition-transform group-open:rotate-180"
          style={{ color: 'var(--accent)' }}
        />
      </summary>
      <div className="panel-in border-t border-line px-4 py-3">{children}</div>
    </details>
  );
}
