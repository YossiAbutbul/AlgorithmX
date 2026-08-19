import { Code } from 'lucide-react';
import { Accordion } from './Section';

interface Props {
  lines: string[];
  activeLine?: number;
}

export function Pseudocode({ lines, activeLine }: Props) {
  return (
    <Accordion summary="הצג פסאודו-קוד" icon={Code}>
      <p className="mb-2 text-[var(--step-1)] text-ink-soft">
        השורה המודגשת היא השורה שמתאימה לצעד הנוכחי בהרצה.
      </p>
      <div className="scroll-x rounded-lg bg-sunken">
      <ol dir="ltr" className="inline-block min-w-full text-[var(--step-2)]">
        {lines.map((line, i) => {
          const active = i === activeLine;
          return (
            <li
              key={i}
              className="num flex gap-3 px-3 py-0.5"
              style={{
                background: active ? 'var(--state-current-fill)' : 'transparent',
                borderInlineStart: active
                  ? '3px solid var(--state-current)'
                  : '3px solid transparent',
                transition: 'background-color .18s ease',
              }}
            >
              <span className="w-5 shrink-0 text-end text-ink-soft">{i + 1}</span>
              <span className="whitespace-pre">{line}</span>
            </li>
          );
        })}
      </ol>
      </div>
    </Accordion>
  );
}
