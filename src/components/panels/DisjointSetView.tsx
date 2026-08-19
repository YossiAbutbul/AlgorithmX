import type { AuxView } from '../../algorithms/types';

type D = Extract<AuxView, { kind: 'disjointSet' }>;

export function DisjointSetView({
  view,
  onHover,
}: {
  view: D;
  onHover?: (id: string | null) => void;
}) {
  return (
    <div>
      <div className="flex min-h-[42px] flex-wrap gap-2">
        {view.groups.map((g, i) => (
          <span
            key={i}
            className="flex items-center gap-1 rounded-lg border border-line bg-sunken px-2 py-1"
          >
            {g.map((id) => (
              <span
                key={id}
                onMouseEnter={() => onHover?.(id)}
                onMouseLeave={() => onHover?.(null)}
                className="num text-[var(--step-2)] font-semibold"
              >
                {id}
              </span>
            ))}
          </span>
        ))}
      </div>
      {view.note && <p className="mt-1 text-[var(--step-1)] text-ink-soft">{view.note}</p>}
    </div>
  );
}
