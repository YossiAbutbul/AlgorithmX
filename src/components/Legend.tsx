import type { Frame, NodeState } from '../algorithms/types';
import { EVENT_COLOR, EVENT_LABEL } from './events';

interface LegendProps {
  flow?: boolean;
  /** When given, the legend also explains the colours used on the scrubber. */
  frames?: Frame[];
}

const NODE_ITEMS: {
  state: NodeState;
  label: string;
  short: string;
  fill: string;
  stroke: string;
  glyph: string;
}[] = [
  {
    state: 'idle',
    label: 'לא נתגלה',
    short: 'לא נתגלה',
    fill: 'var(--surface)',
    stroke: 'var(--state-idle-line)',
    glyph: '',
  },
  {
    state: 'frontier',
    label: 'ממתין במבנה הנתונים',
    short: 'ממתין',
    fill: 'var(--state-frontier-fill)',
    stroke: 'var(--state-frontier)',
    glyph: '',
  },
  {
    state: 'current',
    label: 'מטופל עכשיו',
    short: 'מטופל עכשיו',
    fill: 'var(--state-current-fill)',
    stroke: 'var(--state-current)',
    glyph: 'ring',
  },
  {
    state: 'done',
    label: 'סופי',
    short: 'סופי',
    fill: 'var(--state-done-fill)',
    stroke: 'var(--state-done)',
    glyph: '',
  },
  {
    state: 'rejected',
    label: 'נבדק ונדחה',
    short: 'נדחה',
    fill: 'var(--state-rejected-fill)',
    stroke: 'var(--state-rejected)',
    glyph: 'cross',
  },
];

/**
 * The same node the graph draws, at key size. Only the rejected state carries a
 * mark; the others are told apart by fill and ring alone.
 */
function NodeSwatch({ fill, stroke, glyph }: { fill: string; stroke: string; glyph: string }) {
  // Up and to the right, the way an unobstructed mark sits on the graph
  const mx = 13 + 7.4;
  const my = 13 - 7.4;
  return (
    <svg width="32" height="26" viewBox="0 0 32 26" aria-hidden="true">
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
      {glyph === 'cross' && (
        <>
          <circle cx={mx} cy={my} r="4.6" fill="var(--surface)" stroke={stroke} strokeWidth="1.2" />
          <path
            d={`M ${mx - 1.8} ${my - 1.8} l 3.6 3.6 M ${mx + 1.8} ${my - 1.8} l -3.6 3.6`}
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
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
 * The node colours are the one part of the key you need while the run is
 * moving, so they sit under the graph rather than behind a click. Only the
 * states this particular run actually reaches are listed: a key is easier to
 * trust when nothing on it is unreachable.
 */
export function NodeKey({ states }: { states: NodeState[] }) {
  const present = NODE_ITEMS.filter((item) => states.includes(item.state));
  if (present.length < 2) return null;

  return (
    <div className="stage-key" aria-label="מקרא הצמתים">
      {present.map((item) => (
        <span key={item.state} className="flex flex-none items-center gap-1">
          <NodeSwatch fill={item.fill} stroke={item.stroke} glyph={item.glyph} />
          {item.short}
        </span>
      ))}
    </div>
  );
}

/**
 * The full reference, opened from the rail. Edge styles and the scrubber's
 * colours are the part that genuinely needs the room.
 */
export function Legend({ flow = false, frames }: LegendProps) {
  const edgeItems = [
    { label: 'לא נבדקה', stroke: 'var(--state-idle-line)', width: 2 },
    { label: 'נבדקת עכשיו', stroke: 'var(--state-current)', width: 3, dash: '6 5' },
    { label: flow ? 'רוויה' : 'נבחרה לעץ', stroke: 'var(--state-done)', width: 5 },
    { label: 'נדחתה', stroke: 'var(--state-rejected)', width: 2, dash: '3 6' },
  ];
  if (flow) {
    edgeItems.push({ label: 'שיורית', stroke: 'var(--state-frontier)', width: 3, dash: '7 5' });
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
