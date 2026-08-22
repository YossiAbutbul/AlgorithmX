import { useEffect, useRef, useState } from 'react';
import { ChevronDown, GitCompareArrows, Table2 } from 'lucide-react';
import type { AlgorithmModule } from '../algorithms/types';


/**
 * The nine algorithms grouped by the problem they solve. One strip of eleven
 * equal tabs never fit any screen and clipped its own first label, so the
 * switcher opens a panel instead and the grouping teaches the taxonomy.
 */
const FAMILIES: { name: string; ids: string[] }[] = [
  { name: 'סריקה', ids: ['bfs', 'dfs'] },
  { name: 'מסלולים קצרים', ids: ['dijkstra', 'bellman-ford', 'floyd-warshall'] },
  { name: 'עץ פורש מינימלי', ids: ['prim', 'kruskal'] },
  { name: 'זרימה מקסימלית', ids: ['ford-fulkerson', 'edmonds-karp'] },
];

export const EXTRA_TABS = [
  { id: 'table', label: 'הכל במקום אחד', Icon: Table2 },
  { id: 'compare', label: 'השוואה זו לצד זו', Icon: GitCompareArrows },
];

interface Props {
  all: AlgorithmModule[];
  current: string;
  onNavigate: (id: string) => void;
}

export function AlgorithmSwitcher({ all, current, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const active = all.find((a) => a.id === current);
  const extra = EXTRA_TABS.find((t) => t.id === current);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(id: string) {
    setOpen(false);
    onNavigate(id);
  }

  return (
    <div ref={wrapRef} className="relative min-w-0 shrink">
      <button
        ref={btnRef}
        className="switcher-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="num truncate">{active ? active.shortHe : (extra?.label ?? 'בחר')}</span>
        {active && (
          <span className="hidden font-normal text-ink-soft sm:inline" style={{ fontSize: 'var(--step-1)' }}>
            {active.titleHe.split(':')[1]?.trim() ?? ''}
          </span>
        )}
        <ChevronDown className="caret" size={15} aria-hidden="true" />
      </button>

      {open && (
        <div className="switcher-panel" role="menu" aria-label="בחירת אלגוריתם">
          {FAMILIES.map((fam) => (
            <div key={fam.name}>
              <h3
                className="mb-1.5 font-body text-ink-faint"
                style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em' }}
              >
                {fam.name}
              </h3>
              <ul className="flex flex-col gap-0.5">
                {fam.ids.map((id) => {
                  const m = all.find((a) => a.id === id);
                  if (!m) return null;
                  const isOn = m.id === current;
                  return (
                    <li key={id}>
                      <button
                        role="menuitem"
                        className="switcher-item"
                        aria-current={isOn}
                        onClick={() => pick(id)}
                      >
                        <span
                          className="num"
                          style={{
                            fontWeight: 600,
                            color: isOn ? 'var(--accent)' : 'var(--ink)',
                          }}
                        >
                          {m.shortHe}
                        </span>
                        <span className="text-ink-soft" style={{ fontSize: 'var(--step-1)' }}>
                          {m.titleHe.split(':')[1]?.trim() ?? ''}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div className="col-span-full border-t border-line-soft pt-2">
            <ul className="flex flex-wrap gap-1.5">
              {EXTRA_TABS.map((t) => (
                <li key={t.id}>
                  <button
                    role="menuitem"
                    className="chip"
                    aria-pressed={current === t.id}
                    onClick={() => pick(t.id)}
                  >
                    <t.Icon size={14} aria-hidden="true" />
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
