import type { AuxView } from '../../algorithms/types';

type F = Extract<AuxView, { kind: 'flowTable' }>;

export function FlowTable({ view }: { view: F }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between rounded-lg bg-sunken px-3 py-1.5">
        <span className="text-(length:--step-2) font-semibold">זרימה כוללת</span>
        <span className="num text-(length:--step-4) font-bold" style={{ color: 'var(--state-done)' }}>
          {view.totalFlow}
        </span>
      </div>
      <div className="scroll-x">
        <table className="w-full border-collapse text-(length:--step-2)">
          <thead>
            <tr>
              {['צלע', 'flow / cap', 'ניצול'].map((c) => (
                <th
                  key={c}
                  scope="col"
                  className="border-b border-line px-2 py-1 text-start text-(length:--step-1) font-semibold text-ink-soft"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.rows.map((r) => {
              const full = r.flow >= r.capacity && r.capacity > 0;
              return (
                <tr key={r.id} style={{ background: full ? 'var(--state-done-fill)' : 'transparent' }}>
                  <td className="num border-b border-line px-2 py-1 font-semibold">{r.label}</td>
                  <td className="num border-b border-line px-2 py-1">
                    {r.flow} / {r.capacity}
                  </td>
                  <td className="border-b border-line px-2 py-1">
                    <span
                      className="inline-block h-2 rounded-full align-middle"
                      style={{
                        width: `${Math.max(4, (r.flow / Math.max(1, r.capacity)) * 60)}px`,
                        background: full ? 'var(--state-done)' : 'var(--state-frontier)',
                      }}
                    />
                    {full && <span className="num ms-1 text-(length:--step-1)">רוויה</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {view.note && <p className="mt-1 text-(length:--step-1) text-ink-soft">{view.note}</p>}
    </div>
  );
}
