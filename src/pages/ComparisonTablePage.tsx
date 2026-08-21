import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronsUpDown, ChevronUp } from 'lucide-react';
import {
  COMPARISON_COLUMNS,
  COMPARISON_ROWS,
  type ComparisonRow,
} from '../content/comparison';

export function ComparisonTablePage({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [sortKey, setSortKey] = useState<keyof ComparisonRow | null>(null);
  const [asc, setAsc] = useState(true);

  const rows = useMemo(() => {
    if (!sortKey) return COMPARISON_ROWS;
    return [...COMPARISON_ROWS].sort((a, b) => {
      const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), 'he');
      return asc ? cmp : -cmp;
    });
  }, [sortKey, asc]);

  function toggleSort(key: keyof ComparisonRow) {
    if (sortKey === key) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(true);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="prose">
        <h1 style={{ fontSize: 'var(--step-5)' }}>הכל במקום אחד</h1>
        <p className="text-ink-soft">
          תשעת האלגוריתמים בשורה אחת כל אחד. לחיצה על כותרת עמודה ממיינת, ולחיצה על שורה פותחת את
          הטאב המתאים.
        </p>
      </header>

      <div className="card hidden overflow-hidden p-0 lg:block">
        <div className="scroll-x">
          <table className="w-full border-collapse text-(length:--step-2)">
            <thead>
              <tr>
                {COMPARISON_COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className="border-b border-line bg-sunken px-3 py-2 text-start"
                  >
                    <button
                      className="flex items-center gap-1 font-semibold"
                      onClick={() => toggleSort(c.key)}
                      aria-label={`מיין לפי ${c.label}`}
                    >
                      {c.label}
                      <span aria-hidden="true" className="text-ink-soft">
                        {sortKey === c.key ? (
                          asc ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )
                        ) : (
                          <ChevronsUpDown size={14} opacity={0.5} />
                        )}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  tabIndex={0}
                  role="link"
                  className="cursor-pointer hover:bg-(--accent-soft) focus:bg-(--accent-soft)"
                  onClick={() => onNavigate(r.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onNavigate(r.id);
                    }
                  }}
                >
                  {COMPARISON_COLUMNS.map((c) => (
                    <td
                      key={c.key}
                      className={`border-b border-line px-3 py-2 ${
                        c.key === 'time' || c.key === 'space' || c.key === 'name' ? 'num' : ''
                      }`}
                      style={{ fontWeight: c.key === 'name' ? 700 : 400 }}
                    >
                      {r[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {rows.map((r) => (
          <button
            key={r.id}
            className="card p-3 text-start"
            onClick={() => onNavigate(r.id)}
          >
            <h2 className="num mb-1 flex items-center gap-1">
              <span style={{ fontSize: 'var(--step-4)' }}>{r.name}</span>
              <ChevronLeft size={18} aria-hidden="true" style={{ color: 'var(--accent)' }} />
            </h2>
            <p className="mb-2">{r.solves}</p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-(length:--step-1)">
              {COMPARISON_COLUMNS.filter((c) => c.key !== 'name' && c.key !== 'solves').map((c) => (
                <div key={c.key} className="flex gap-1">
                  <dt className="text-ink-soft">{c.label}:</dt>
                  <dd className={c.key === 'time' || c.key === 'space' ? 'num' : ''}>
                    {r[c.key]}
                  </dd>
                </div>
              ))}
            </dl>
          </button>
        ))}
      </div>
    </div>
  );
}
