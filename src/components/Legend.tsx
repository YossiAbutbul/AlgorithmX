interface LegendProps {
  flow?: boolean;
  weighted?: boolean;
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

function EdgeSwatch({
  stroke,
  width,
  dash,
}: {
  stroke: string;
  width: number;
  dash?: string;
}) {
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

export function Legend({ flow = false }: LegendProps) {
  const edgeItems = [
    { label: 'לא נבדקה', stroke: 'var(--state-idle-line)', width: 2 },
    { label: 'נבדקת עכשיו', stroke: 'var(--state-current)', width: 3, dash: '6 5' },
    { label: flow ? 'רוויה' : 'נבחרה לעץ', stroke: 'var(--state-done)', width: 5 },
    { label: 'נדחתה', stroke: '#98a1c0', width: 2, dash: '3 6' },
  ];
  if (flow) {
    edgeItems.push({ label: 'שאריתית', stroke: 'var(--state-frontier)', width: 3, dash: '7 5' });
  }

  return (
    <div className="card-quiet bg-sunken px-4 py-3">
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[length:var(--step-1)] font-bold text-ink-soft">צמתים</span>
          {NODE_ITEMS.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5 text-[length:var(--step-1)]">
              <NodeSwatch fill={item.fill} stroke={item.stroke} glyph={item.glyph} />
              {item.label}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[length:var(--step-1)] font-bold text-ink-soft">צלעות</span>
          {edgeItems.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5 text-[length:var(--step-1)]">
              <EdgeSwatch stroke={item.stroke} width={item.width} dash={item.dash} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
