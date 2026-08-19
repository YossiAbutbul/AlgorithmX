import type { AuxView } from '../../algorithms/types';

type S = Extract<AuxView, { kind: 'stack' }>;

export function StackView({ view, onHover }: { view: S; onHover?: (id: string | null) => void }) {
  const items = [...view.items].reverse();
  return (
    <div>
      <div className="flex min-h-[42px] flex-col-reverse gap-1">
        {items.length === 0 && (
          <span className="text-[var(--step-1)] text-ink-soft">המחסנית ריקה</span>
        )}
        {items.map((it, i) => (
          <span
            key={`${it}-${i}`}
            onMouseEnter={() => onHover?.(it)}
            onMouseLeave={() => onHover?.(null)}
            className="num rounded-lg border px-2.5 py-1 text-center text-[var(--step-2)] font-semibold"
            style={{
              borderColor: i === items.length - 1 ? 'var(--state-frontier)' : 'var(--line)',
              background: i === items.length - 1 ? 'var(--state-frontier-fill)' : 'var(--surface)',
            }}
          >
            {it}
            {i === items.length - 1 && (
              <span className="ms-2 text-[var(--step-1)] font-normal text-ink-soft">ראש</span>
            )}
          </span>
        ))}
      </div>
      {view.note && <p className="mt-1 text-[var(--step-1)] text-ink-soft">{view.note}</p>}
    </div>
  );
}
