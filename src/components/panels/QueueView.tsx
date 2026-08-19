import type { AuxView } from '../../algorithms/types';

type Q = Extract<AuxView, { kind: 'queue' }>;

export function QueueView({ view, onHover }: { view: Q; onHover?: (id: string | null) => void }) {
  return (
    <div>
      <div className="flex min-h-[42px] items-center gap-1.5" dir="rtl">
        <span className="text-[length:var(--step-1)] font-semibold text-ink-soft">ראש</span>
        <div className="flex flex-1 flex-wrap gap-1.5">
          {view.items.length === 0 && (
            <span className="text-[length:var(--step-1)] text-ink-soft">התור ריק</span>
          )}
          {view.items.map((it, i) => (
            <span
              key={`${it}-${i}`}
              onMouseEnter={() => onHover?.(it)}
              onMouseLeave={() => onHover?.(null)}
              className="num rounded-lg border px-2.5 py-1 text-[length:var(--step-2)] font-semibold"
              style={{
                borderColor: i === 0 ? 'var(--state-frontier)' : 'var(--line)',
                background: i === 0 ? 'var(--state-frontier-fill)' : 'var(--surface)',
              }}
            >
              {it}
            </span>
          ))}
        </div>
        <span className="text-[length:var(--step-1)] font-semibold text-ink-soft">זנב</span>
      </div>
      {view.note && <p className="mt-1 text-[length:var(--step-1)] text-ink-soft">{view.note}</p>}
    </div>
  );
}
