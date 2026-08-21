import type { AuxView } from '../../algorithms/types';

type S = Extract<AuxView, { kind: 'setView' }>;

export function SetView({ view, onHover }: { view: S; onHover?: (id: string | null) => void }) {
  return (
    <div>
      <div className="flex min-h-[36px] flex-wrap items-center gap-1.5">
        <span className="num text-ink-soft">{'{'}</span>
        {view.items.length === 0 && (
          <span className="text-(length:--step-1) text-ink-soft">ריק</span>
        )}
        {view.items.map((it) => (
          <span
            key={it}
            onMouseEnter={() => onHover?.(it)}
            onMouseLeave={() => onHover?.(null)}
            className="num rounded-md border px-2 py-0.5 text-(length:--step-2) font-semibold"
            style={{ borderColor: 'var(--state-done)', background: 'var(--state-done-fill)' }}
          >
            {it}
          </span>
        ))}
        <span className="num text-ink-soft">{'}'}</span>
      </div>
      {view.note && <p className="mt-1 text-(length:--step-1) text-ink-soft">{view.note}</p>}
    </div>
  );
}
