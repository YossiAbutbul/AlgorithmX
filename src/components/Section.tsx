import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  step?: number;
  title: string;
  subtitle?: string;
  id?: string;
  icon?: LucideIcon;
  children: ReactNode;
}

export function Section({ step, title, subtitle, id, icon: Icon, children }: Props) {
  return (
    <section id={id} className="card p-4 sm:p-6">
      <header className="mb-4 flex items-center gap-3">
        {(step !== undefined || Icon) && (
          <span
            className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--step-2)] font-bold"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            aria-hidden="true"
          >
            {Icon ? <Icon size={18} /> : step}
          </span>
        )}
        <div>
          <h2 className="flex items-baseline gap-2 text-[var(--step-4)]">
            {step !== undefined && (
              <span className="num text-[var(--step-1)] text-ink-soft">חלק {step}</span>
            )}
            {title}
          </h2>
          {subtitle && <p className="text-[var(--step-1)] text-ink-soft">{subtitle}</p>}
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
}: {
  summary: string;
  children: ReactNode;
  id?: string;
  icon?: LucideIcon;
}) {
  return (
    <details id={id} className="card-quiet group overflow-hidden">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-[var(--step-2)] font-semibold">
        <ChevronDown
          size={17}
          aria-hidden="true"
          className="shrink-0 transition-transform group-open:rotate-180"
          style={{ color: 'var(--accent)' }}
        />
        {Icon && <Icon size={16} aria-hidden="true" style={{ color: 'var(--ink-soft)' }} />}
        {summary}
      </summary>
      <div className="border-t border-line px-4 py-3">{children}</div>
    </details>
  );
}
