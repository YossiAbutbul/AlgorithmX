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
      {/*
        * The queue is a reference you glance at, not the subject of the panel,
        * so an entry is a tight chip rather than a button sized block. The head
        * still carries the frontier colour, which is what marks it out.
        */}
      <div className="flex min-h-[30px] flex-wrap gap-1">
        {view.items.length === 0 && (
          <span className="text-(length:--step-1) text-ink-soft">התור ריק</span>
        )}
        {view.items.map((it, i) => (
          <span
            key={`${it.id}-${i}`}
            onMouseEnter={() => onHover?.(it.id)}
            onMouseLeave={() => onHover?.(null)}
            className="item-in num inline-flex items-baseline gap-px rounded-md border px-1.5 py-px text-(length:--step-1) leading-5"
            style={{
              borderColor: i === 0 ? 'var(--state-frontier)' : 'var(--line)',
              background: i === 0 ? 'var(--state-frontier-fill)' : 'var(--surface)',
            }}
          >
            <b>{it.id}</b>
            {/* The colon stays: without it A with key 2 reads as the number 12. */}
            <span className="text-ink-faint">:{it.key === null ? 'INF' : it.key}</span>
          </span>
        ))}
      </div>
      {view.note && <p className="mt-1 text-(length:--step-1) text-ink-soft">{view.note}</p>}
    </div>
  );
}
