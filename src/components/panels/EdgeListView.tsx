import { Check, Circle, X } from 'lucide-react';
import type { AuxView } from '../../algorithms/types';

type E = Extract<AuxView, { kind: 'edgeList' }>;

const STATUS: Record<
  'pending' | 'taken' | 'rejected',
  { label: string; color: string; bg: string; mark: string }
> = {
  pending: { label: 'ממתינה', color: 'var(--ink-soft)', bg: 'transparent', mark: 'pending' },
  taken: {
    label: 'נלקחה',
    color: 'var(--state-done)',
    bg: 'var(--state-done-fill)',
    mark: 'taken',
  },
  rejected: {
    label: 'נדחתה',
    color: 'var(--state-rejected)',
    bg: 'var(--state-rejected-fill)',
    mark: 'rejected',
  },
};

export function EdgeListView({ view }: { view: E }) {
  return (
    <div>
      <div className="scroll-x">
        <table className="w-full border-collapse text-(length:--step-2)">
          <thead>
            <tr>
              {['', 'צלע', 'משקל', 'מצב'].map((c, i) => (
                <th
                  key={i}
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
              const s = STATUS[r.status];
              return (
                <tr key={r.id} style={{ background: s.bg }}>
                  <td className="border-b border-line px-2 py-1" style={{ color: s.color }}>
                    {s.mark === 'taken' && <Check size={15} aria-hidden="true" />}
                    {s.mark === 'rejected' && <X size={15} aria-hidden="true" />}
                    {s.mark === 'pending' && <Circle size={9} aria-hidden="true" />}
                  </td>
                  <td className="num border-b border-line px-2 py-1 font-semibold">{r.label}</td>
                  <td className="num border-b border-line px-2 py-1">{r.weight}</td>
                  <td
                    className="border-b border-line px-2 py-1 text-(length:--step-1)"
                    style={{ color: s.color }}
                  >
                    {s.label}
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
