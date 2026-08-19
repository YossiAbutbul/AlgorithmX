import type { AuxView } from '../../algorithms/types';

type A = Extract<AuxView, { kind: 'arrayTable' }>;

export function ArrayTable({
  view,
  hovered,
  onHover,
}: {
  view: A;
  hovered?: string | null;
  onHover?: (id: string | null) => void;
}) {
  return (
    <div>
      <div className="scroll-x">
        <table className="w-full border-collapse text-[length:var(--step-2)]">
          <thead>
            <tr>
              {view.columns.map((c) => (
                <th
                  key={c}
                  scope="col"
                  className="num border-b border-line px-2 py-1 text-start text-[length:var(--step-1)] font-semibold text-ink-soft"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.rows.map((r) => {
              const isHovered = hovered === r.key;
              return (
                <tr
                  key={r.key}
                  onMouseEnter={() => onHover?.(r.key)}
                  onMouseLeave={() => onHover?.(null)}
                  style={{
                    background: r.highlight
                      ? 'var(--state-current-fill)'
                      : isHovered
                        ? 'var(--accent-soft)'
                        : 'transparent',
                    transition: 'background-color .2s ease',
                  }}
                >
                  {r.values.map((v, i) => (
                    <td
                      key={i}
                      className="num border-b border-line px-2 py-1"
                      style={{
                        fontWeight: i === 0 ? 700 : 400,
                        color: v === 'INF' ? 'var(--ink-soft)' : 'var(--ink)',
                      }}
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {view.note && <p className="mt-1 text-[length:var(--step-1)] text-ink-soft">{view.note}</p>}
    </div>
  );
}
