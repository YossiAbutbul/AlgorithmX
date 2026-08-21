import type { AuxView } from '../../algorithms/types';

type P = Extract<AuxView, { kind: 'priorityQueue' }>;

export function PriorityQueueView({
  view,
  onHover,
}: {
  view: P;
  onHover?: (id: string | null) => void;
}) {
  return (
    <div>
      <div className="flex min-h-[42px] flex-wrap gap-1.5">
        {view.items.length === 0 && (
          <span className="text-(length:--step-1) text-ink-soft">התור ריק</span>
        )}
        {view.items.map((it, i) => (
          <span
            key={`${it.id}-${i}`}
            onMouseEnter={() => onHover?.(it.id)}
            onMouseLeave={() => onHover?.(null)}
            className="item-in num rounded-lg border px-2.5 py-1 text-(length:--step-2)"
            style={{
              borderColor: i === 0 ? 'var(--state-frontier)' : 'var(--line)',
              background: i === 0 ? 'var(--state-frontier-fill)' : 'var(--surface)',
            }}
          >
            <b>{it.id}</b>
            <span className="text-ink-soft"> : {it.key === null ? 'INF' : it.key}</span>
          </span>
        ))}
      </div>
      {view.note && <p className="mt-1 text-(length:--step-1) text-ink-soft">{view.note}</p>}
    </div>
  );
}
