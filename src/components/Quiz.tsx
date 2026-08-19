import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { QuizItem } from '../algorithms/types';

export function Quiz({ items }: { items: QuizItem[] }) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <ol className="flex flex-col gap-3">
      {items.map((q, i) => (
        <li key={i} className="card-quiet p-3">
          <div className="flex items-start gap-2">
            <span className="num shrink-0 font-bold text-ink-soft">{i + 1}.</span>
            <p className="flex-1">{q.question}</p>
          </div>
          <button
            className="btn mt-2"
            aria-expanded={!!open[i]}
            onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
          >
            {open[i] ? (
              <EyeOff size={15} aria-hidden="true" />
            ) : (
              <Eye size={15} aria-hidden="true" />
            )}
            {open[i] ? 'הסתר פתרון' : 'הצג פתרון'}
          </button>
          {open[i] && (
            <p
              className="mt-2 rounded-lg px-3 py-2 text-[length:var(--step-2)]"
              style={{ background: 'var(--state-done-fill)' }}
            >
              {q.answer}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
