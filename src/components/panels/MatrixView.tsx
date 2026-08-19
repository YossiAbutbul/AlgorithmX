import type { AuxView } from '../../algorithms/types';

type M = Extract<AuxView, { kind: 'matrix' }>;

export function MatrixView({ view }: { view: M }) {
  const changed = new Set((view.changed ?? []).map(([r, c]) => `${r},${c}`));
  return (
    <div>
      <div className="scroll-x">
        <table className="border-collapse text-[var(--step-2)]" dir="ltr">
          <thead>
            <tr>
              <th className="px-2 py-1" />
              {view.labels.map((l, c) => (
                <th
                  key={l}
                  scope="col"
                  className="num px-2 py-1 text-center text-[var(--step-1)] font-semibold"
                  style={{
                    color: c === view.highlightCol ? 'var(--accent)' : 'var(--ink-soft)',
                  }}
                >
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.cells.map((row, r) => (
              <tr key={r}>
                <th
                  scope="row"
                  className="num px-2 py-1 text-center text-[var(--step-1)] font-semibold"
                  style={{ color: r === view.highlightRow ? 'var(--accent)' : 'var(--ink-soft)' }}
                >
                  {view.labels[r]}
                </th>
                {row.map((cell, c) => {
                  const isChanged = changed.has(`${r},${c}`);
                  const inK = r === view.highlightRow || c === view.highlightCol;
                  return (
                    <td
                      key={c}
                      className="num border border-line px-2.5 py-1 text-center"
                      style={{
                        background: isChanged
                          ? 'var(--state-current-fill)'
                          : inK
                            ? 'var(--accent-soft)'
                            : r === c
                              ? 'var(--surface-sunken)'
                              : 'var(--surface)',
                        color:
                          cell === null
                            ? 'var(--ink-soft)'
                            : isChanged
                              ? 'var(--state-current)'
                              : 'var(--ink)',
                        fontWeight: isChanged ? 700 : 400,
                        minWidth: 42,
                      }}
                    >
                      {cell === null ? 'INF' : cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {view.note && <p className="mt-1 text-[var(--step-1)] text-ink-soft">{view.note}</p>}
    </div>
  );
}
