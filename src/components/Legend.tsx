import type { Frame } from '../algorithms/types';
import { EVENT_COLOR, EVENT_LABEL } from './events';

interface LegendProps {
  flow?: boolean;
  /** When given, the legend also explains the colours used on the scrubber. */
  frames?: Frame[];
}

const NODE_ITEMS = [
  { label: 'לא נתגלה', fill: '#ffffff', stroke: 'var(--state-idle-line)', glyph: '' },
  {
    label: 'ממתין במבנה הנתונים',
    fill: 'var(--state-frontier-fill)',
    stroke: 'var(--state-frontier)',
    glyph: 'dot',
  },
  {
    label: 'מטופל עכשיו',
    fill: 'var(--state-current-fill)',
    stroke: 'var(--state-current)',
    glyph: 'ring',
  },
  { label: 'סופי', fill: 'var(--state-done-fill)', stroke: 'var(--state-done)', glyph: 'check' },
  { label: 'נבדק ונדחה', fill: '#eef0f7', stroke: '#98a1c0', glyph: 'cross' },
];

function NodeSwatch({ fill, stroke, glyph }: { fill: string; stroke: string; glyph: string }) {
  return (
    <svg width="30" height="26" viewBox="0 0 30 26" aria-hidden="true">
      {glyph === 'ring' && (
        <circle cx="13" cy="13" r="11" fill="none" stroke={stroke} strokeWidth="1" />
      )}
      <circle
        cx="13"
        cy="13"
        r="8.5"
        fill={fill}
        stroke={stroke}
        strokeWidth={glyph === 'ring' ? 3 : 2}
        strokeDasharray={glyph === 'cross' ? '4 3' : undefined}
      />
      {glyph === 'check' && (
        <path
          d="M 20 5 l 2.5 2.5 l 5 -5"
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
      {glyph === 'dot' && <circle cx="23" cy="5" r="3" fill={stroke} />}
      {glyph === 'cross' && (
        <path d="M 21 3 l 5 5 M 26 3 l -5 5" stroke={stroke} strokeWidth="1.8" />
      )}
    </svg>
  );
}

function EdgeSwatch({ stroke, width, dash }: { stroke: string; width: number; dash?: string }) {
  return (
    <svg width="34" height="14" viewBox="0 0 34 14" aria-hidden="true">
      <line
        x1="2"
        y1="7"
        x2="32"
        y2="7"
        stroke={stroke}
        strokeWidth={width}
        strokeDasharray={dash}
        strokeLinecap="round"
      />
    </svg>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3
        className="font-body text-ink-faint"
        style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em' }}
      >
        {title}
      </h3>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">{children}</div>
    </div>
  );
}

/**
 * Opened from the rail, not pinned open under the graph. Reference material
 * should be one click away, not competing with the run for attention.
 */
export function Legend({ flow = false, frames }: LegendProps) {
  const edgeItems = [
    { label: 'לא נבדקה', stroke: 'var(--state-idle-line)', width: 2 },
    { label: 'נבדקת עכשיו', stroke: 'var(--state-current)', width: 3, dash: '6 5' },
    { label: flow ? 'רוויה' : 'נבחרה לעץ', stroke: 'var(--state-done)', width: 5 },
    { label: 'נדחתה', stroke: '#98a1c0', width: 2, dash: '3 6' },
  ];
  if (flow) {
    edgeItems.push({ label: 'שאריתית', stroke: 'var(--state-frontier)', width: 3, dash: '7 5' });
  }

  const events = frames ? Array.from(new Set(frames.map((f) => f.event))) : [];

  return (
    <div className="flex flex-col gap-3" style={{ fontSize: 'var(--step-1)' }}>
      <Group title="צמתים">
        {NODE_ITEMS.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <NodeSwatch fill={item.fill} stroke={item.stroke} glyph={item.glyph} />
            {item.label}
          </span>
        ))}
      </Group>

      <Group title="צלעות">
        {edgeItems.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <EdgeSwatch stroke={item.stroke} width={item.width} dash={item.dash} />
            {item.label}
          </span>
        ))}
      </Group>

      {events.length > 0 && (
        <Group title="צבעי ציר הצעדים">
          {events.map((ev) => (
            <span key={ev} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-xs"
                style={{ background: EVENT_COLOR[ev] }}
              />
              {EVENT_LABEL[ev]}
            </span>
          ))}
        </Group>
      )}
    </div>
  );
}
