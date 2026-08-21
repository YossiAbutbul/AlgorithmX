import { useMemo } from 'react';
import type {
  EdgeState,
  Frame,
  GraphEdge,
  GraphModel,
  NodeId,
  NodeState,
} from '../algorithms/types';

const R = 26;

interface NodeStyle {
  fill: string;
  stroke: string;
  width: number;
  dash?: string;
  glyph: 'none' | 'dot' | 'ring' | 'check' | 'cross';
}

const NODE_STYLES: Record<NodeState, NodeStyle> = {
  idle: { fill: '#ffffff', stroke: 'var(--state-idle-line)', width: 1.6, glyph: 'none' },
  frontier: {
    fill: 'var(--state-frontier-fill)',
    stroke: 'var(--state-frontier)',
    width: 3,
    glyph: 'dot',
  },
  current: {
    fill: 'var(--state-current-fill)',
    stroke: 'var(--state-current)',
    width: 4,
    glyph: 'ring',
  },
  done: { fill: 'var(--state-done-fill)', stroke: 'var(--state-done)', width: 3, glyph: 'check' },
  rejected: {
    fill: '#eef0f7',
    stroke: '#98a1c0',
    width: 2,
    dash: '5 4',
    glyph: 'cross',
  },
};

interface EdgeStyle {
  stroke: string;
  width: number;
  dash?: string;
  opacity?: number;
}

const EDGE_STYLES: Record<EdgeState, EdgeStyle> = {
  idle: { stroke: 'var(--state-idle-line)', width: 2 },
  considered: { stroke: 'var(--state-current)', width: 3, dash: '6 5' },
  tree: { stroke: 'var(--state-done)', width: 5 },
  rejected: { stroke: '#98a1c0', width: 2, dash: '3 6', opacity: 0.75 },
  relaxed: { stroke: 'var(--state-current)', width: 4.5 },
  saturated: { stroke: 'var(--state-done)', width: 6 },
  residual: { stroke: 'var(--state-frontier)', width: 3, dash: '7 5' },
};

function markerIdFor(state: EdgeState): string {
  return `arrow-${state}`;
}

interface Geometry {
  path: string;
  midX: number;
  midY: number;
}

function straightGeometry(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  directed: boolean,
): Geometry {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const gapEnd = directed ? R + 9 : R + 2;
  const sx = ax + ux * (R + 2);
  const sy = ay + uy * (R + 2);
  const ex = bx - ux * gapEnd;
  const ey = by - uy * gapEnd;
  return {
    path: `M ${sx} ${sy} L ${ex} ${ey}`,
    midX: (sx + ex) / 2,
    midY: (sy + ey) / 2,
  };
}

function curvedGeometry(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  bend: number,
  directed: boolean,
): Geometry {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const cx = (ax + bx) / 2 + nx * bend;
  const cy = (ay + by) / 2 + ny * bend;

  const toStart = Math.hypot(cx - ax, cy - ay) || 1;
  const sx = ax + ((cx - ax) / toStart) * (R + 2);
  const sy = ay + ((cy - ay) / toStart) * (R + 2);
  const toEnd = Math.hypot(cx - bx, cy - by) || 1;
  const gapEnd = directed ? R + 9 : R + 2;
  const ex = bx + ((cx - bx) / toEnd) * gapEnd;
  const ey = by + ((cy - by) / toEnd) * gapEnd;

  return {
    path: `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`,
    midX: 0.25 * sx + 0.5 * cx + 0.25 * ex,
    midY: 0.25 * sy + 0.5 * cy + 0.25 * ey,
  };
}

export interface GraphCanvasProps {
  graph: GraphModel;
  frame?: Frame;
  hoveredNode?: NodeId | null;
  onHoverNode?: (id: NodeId | null) => void;
  onNodeClick?: (id: NodeId) => void;
  onCanvasClick?: (x: number, y: number) => void;
  onNodeDrag?: (id: NodeId, x: number, y: number) => void;
  selectedNodes?: NodeId[];
  compact?: boolean;
  /** Fill the parent box instead of capping at a fixed height. */
  fit?: boolean;
  ariaLabel?: string;
}

export function GraphCanvas({
  graph,
  frame,
  hoveredNode,
  onHoverNode,
  onNodeClick,
  onCanvasClick,
  onNodeDrag,
  selectedNodes = [],
  compact = false,
  fit = false,
  ariaLabel,
}: GraphCanvasProps) {
  const pos = useMemo(() => {
    const m = new Map<NodeId, { x: number; y: number }>();
    for (const n of graph.nodes) m.set(n.id, { x: n.x, y: n.y });
    return m;
  }, [graph]);

  const antiParallel = useMemo(() => {
    const set = new Set<string>();
    if (!graph.directed) return set;
    for (const e of graph.edges) {
      const rev = graph.edges.find((o) => o.from === e.to && o.to === e.from);
      if (rev) set.add(e.id);
    }
    return set;
  }, [graph]);

  /** Edge paths, shared by the renderer and by the badge placement below. */
  const edgeGeo = useMemo(() => {
    const m = new Map<string, Geometry>();
    for (const e of graph.edges) {
      const a = pos.get(e.from);
      const b = pos.get(e.to);
      if (!a || !b) continue;
      const bend = antiParallel.has(e.id) ? 34 : 0;
      m.set(
        e.id,
        bend
          ? curvedGeometry(a.x, a.y, b.x, b.y, bend, graph.directed)
          : straightGeometry(a.x, a.y, b.x, b.y, graph.directed),
      );
    }
    return m;
  }, [graph, pos, antiParallel]);

  /**
   * A distance label pinned under the node collides with any edge that leaves
   * downward. Place it in the widest gap between this node's own edges, then
   * prefer whichever of those gaps sits furthest from the weight labels and the
   * other nodes, so it does not simply land on top of something else.
   */
  const badgeSpot = useMemo(() => {
    const spot = new Map<NodeId, { x: number; y: number; ux: number; uy: number }>();
    const DIST = R + 15;
    const inFrame = (x: number, y: number) =>
      x > 22 && x < graph.width - 22 && y > 14 && y < graph.height - 8;

    const obstacles = [
      ...[...edgeGeo.values()].map((g) => ({ x: g.midX, y: g.midY })),
      ...graph.nodes.map((o) => ({ x: o.x, y: o.y })),
    ];

    for (const n of graph.nodes) {
      const angles: number[] = [];
      for (const e of graph.edges) {
        const other =
          e.from === n.id ? pos.get(e.to) : e.to === n.id ? pos.get(e.from) : undefined;
        if (other) angles.push(Math.atan2(other.y - n.y, other.x - n.x));
      }

      // Directly below reads best when nothing is in the way
      let best = Math.PI / 2;
      if (angles.length > 0) {
        angles.sort((a, b) => a - b);
        const gaps = angles.map((a, i) => {
          const next = i === angles.length - 1 ? angles[0] + Math.PI * 2 : angles[i + 1];
          return { angle: (a + next) / 2, gap: next - a };
        });

        const scored = gaps.map((g) => {
          const x = n.x + Math.cos(g.angle) * DIST;
          const y = n.y + Math.sin(g.angle) * DIST;
          let clearance = Infinity;
          for (const o of obstacles) {
            const d = Math.hypot(o.x - x, o.y - y);
            // The node's own centre is always DIST away, so it is not an obstacle
            if (d > 1 && d < clearance) clearance = d;
          }
          return { ...g, x, y, clearance, fits: inFrame(x, y) };
        });

        scored.sort((a, c) => {
          if (a.fits !== c.fits) return a.fits ? -1 : 1;
          // Anything past 34 units is clear enough, so the wider gap decides
          const ca = Math.min(a.clearance, 34);
          const cc = Math.min(c.clearance, 34);
          return cc - ca || c.gap - a.gap;
        });
        best = scored[0].angle;
      }

      const ux = Math.cos(best);
      const uy = Math.sin(best);
      spot.set(n.id, { x: n.x + ux * DIST, y: n.y + uy * DIST, ux, uy });
    }
    return spot;
  }, [graph, pos, edgeGeo]);

  const edgeState = (e: GraphEdge): EdgeState => frame?.edgeStates[e.id] ?? 'idle';
  const nodeState = (id: NodeId): NodeState => frame?.nodeStates[id] ?? 'idle';

  const cutLine = useMemo(() => {
    if (!frame?.cutNodes || frame.cutNodes.length === 0) return null;
    const inSet = new Set(frame.cutNodes);
    const left = graph.nodes.filter((n) => inSet.has(n.id));
    const right = graph.nodes.filter((n) => !inSet.has(n.id));
    if (left.length === 0 || right.length === 0) return null;
    const maxLeft = Math.max(...left.map((n) => n.x));
    const minRight = Math.min(...right.map((n) => n.x));
    if (minRight - maxLeft < 40) return null;
    return (maxLeft + minRight) / 2;
  }, [frame, graph]);

  function svgPoint(evt: React.MouseEvent<SVGSVGElement>): { x: number; y: number } {
    const svg = evt.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * graph.width;
    const y = ((evt.clientY - rect.top) / rect.height) * graph.height;
    return { x: Math.round(x), y: Math.round(y) };
  }

  function handleDragStart(evt: React.MouseEvent<SVGGElement>, id: NodeId) {
    if (!onNodeDrag) return;
    evt.preventDefault();
    evt.stopPropagation();
    const svg = evt.currentTarget.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const move = (ev: MouseEvent) => {
      const x = ((ev.clientX - rect.left) / rect.width) * graph.width;
      const y = ((ev.clientY - rect.top) / rect.height) * graph.height;
      onNodeDrag(
        id,
        Math.max(R + 4, Math.min(graph.width - R - 4, Math.round(x))),
        Math.max(R + 4, Math.min(graph.height - R - 24, Math.round(y))),
      );
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  const states: EdgeState[] = [
    'idle',
    'considered',
    'tree',
    'rejected',
    'relaxed',
    'saturated',
    'residual',
  ];

  return (
    <svg
      viewBox={`0 0 ${graph.width} ${graph.height}`}
      preserveAspectRatio="xMidYMid meet"
      className={fit ? 'select-none' : 'h-auto w-full select-none'}
      style={
        fit
          ? { width: '100%', height: '100%', direction: 'ltr' }
          : { maxHeight: compact ? 260 : 420, direction: 'ltr' }
      }
      role="img"
      aria-label={ariaLabel ?? 'תרשים הגרף'}
      onClick={(e) => {
        if (!onCanvasClick) return;
        const p = svgPoint(e);
        onCanvasClick(p.x, p.y);
      }}
    >
      <defs>
        {states.map((s) => (
          <marker
            key={s}
            id={markerIdFor(s)}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="11"
            markerHeight="11"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_STYLES[s].stroke} />
          </marker>
        ))}
      </defs>

      {cutLine !== null && (
        <g>
          <line
            x1={cutLine}
            y1={12}
            x2={cutLine}
            y2={graph.height - 12}
            stroke="var(--ink-soft)"
            strokeWidth={2}
            strokeDasharray="10 7"
          />
          <text
            x={cutLine + 6}
            y={22}
            fontSize={12}
            fill="var(--ink-soft)"
            fontFamily="Heebo, sans-serif"
          >
            min cut
          </text>
        </g>
      )}

      {graph.edges.map((e) => {
        const a = pos.get(e.from);
        const b = pos.get(e.to);
        if (!a || !b) return null;
        const st = edgeState(e);
        const style = EDGE_STYLES[st];
        const geo = edgeGeo.get(e.id);
        if (!geo) return null;
        const onPath = frame?.pathEdges?.includes(e.id);
        const isCut = frame?.cutEdges?.includes(e.id);
        const label = frame?.edgeBadges?.[e.id] ?? (graph.weighted ? String(e.weight) : '');
        const dim =
          hoveredNode != null && e.from !== hoveredNode && e.to !== hoveredNode ? 0.35 : 1;

        return (
          <g key={e.id} opacity={dim}>
            {onPath && (
              <path
                d={geo.path}
                fill="none"
                stroke="var(--state-current)"
                strokeWidth={style.width + 7}
                strokeLinecap="round"
                opacity={0.22}
              />
            )}
            <path
              key={`${e.id}-${st}`}
              d={geo.path}
              fill="none"
              stroke={style.stroke}
              strokeWidth={style.width}
              strokeDasharray={style.dash}
              strokeLinecap="round"
              opacity={style.opacity ?? 1}
              markerEnd={graph.directed ? `url(#${markerIdFor(st)})` : undefined}
              className={
                st === 'considered'
                  ? 'edge-flow'
                  : st === 'tree' || st === 'saturated'
                    ? 'edge-draw'
                    : undefined
              }
              style={{
                transition: 'stroke .2s ease, stroke-width .2s ease',
                // The draw animation needs a dash as long as the path itself
                ...(st === 'tree' || st === 'saturated'
                  ? ({ '--draw-len': '400', strokeDasharray: 400 } as React.CSSProperties)
                  : null),
              }}
            />
            {label !== '' && (
              <g>
                <rect
                  x={geo.midX - (label.length * 3.6 + 6)}
                  y={geo.midY - 10}
                  width={label.length * 7.2 + 12}
                  height={19}
                  rx={6}
                  fill="var(--surface)"
                  stroke={isCut ? 'var(--state-current)' : 'var(--line)'}
                  strokeWidth={isCut ? 1.6 : 1}
                />
                <text
                  x={geo.midX}
                  y={geo.midY + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fontFamily="'JetBrains Mono', monospace"
                  fill={isCut ? 'var(--state-current)' : 'var(--ink)'}
                >
                  {label}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {(frame?.residual ?? []).map((r) => {
        const e = graph.edges.find((x) => x.id === r.id);
        if (!e) return null;
        const a = pos.get(e.to);
        const b = pos.get(e.from);
        if (!a || !b) return null;
        const geo = curvedGeometry(a.x, a.y, b.x, b.y, 30, true);
        return (
          <g key={`res-${r.id}`} opacity={r.active ? 1 : 0.55}>
            <path
              d={geo.path}
              fill="none"
              stroke="var(--state-frontier)"
              strokeWidth={r.active ? 3.5 : 2}
              strokeDasharray="7 5"
              markerEnd={`url(#${markerIdFor('residual')})`}
            />
            <text
              x={geo.midX}
              y={geo.midY + 4}
              textAnchor="middle"
              fontSize={11}
              fontFamily="'JetBrains Mono', monospace"
              fill="var(--state-frontier)"
            >
              {r.amount}
            </text>
          </g>
        );
      })}

      {graph.nodes.map((n) => {
        const st = nodeState(n.id);
        const style = NODE_STYLES[st];
        const badge = frame?.nodeBadges?.[n.id];
        const isHovered = hoveredNode === n.id;
        const isSelected = selectedNodes.includes(n.id);
        return (
          <g
            key={n.id}
            onMouseEnter={() => onHoverNode?.(n.id)}
            onMouseLeave={() => onHoverNode?.(null)}
            onMouseDown={(e) => handleDragStart(e, n.id)}
            onClick={(e) => {
              if (!onNodeClick) return;
              e.stopPropagation();
              onNodeClick(n.id);
            }}
            style={{ cursor: onNodeClick || onNodeDrag ? 'pointer' : 'default' }}
          >
            {(isHovered || isSelected) && (
              <circle
                cx={n.x}
                cy={n.y}
                r={R + 7}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2}
                strokeDasharray={isSelected ? undefined : '4 4'}
              />
            )}
            {style.glyph === 'ring' && (
              <circle
                className="node-pulse"
                cx={n.x}
                cy={n.y}
                r={R + 4}
                fill="none"
                stroke={style.stroke}
                strokeWidth={2}
                style={
                  { '--pulse-min': `${R + 3}px`, '--pulse-max': `${R + 13}px` } as React.CSSProperties
                }
              />
            )}
            <circle
              cx={n.x}
              cy={n.y}
              r={R}
              fill={style.fill}
              stroke={style.stroke}
              strokeWidth={style.width}
              strokeDasharray={style.dash}
              style={{
                transition: 'fill .24s ease, stroke .24s ease, stroke-width .24s ease',
              }}
            />
            <text
              x={n.x}
              y={n.y + 5}
              textAnchor="middle"
              fontSize={17}
              fontWeight={700}
              fontFamily="Heebo, sans-serif"
              fill="var(--ink)"
            >
              {n.id}
            </text>
            {style.glyph === 'check' && (
              <path
                d={`M ${n.x + 10} ${n.y - 14} l 4 4 l 7 -8`}
                fill="none"
                stroke={style.stroke}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {style.glyph === 'dot' && (
              <circle cx={n.x + 16} cy={n.y - 16} r={4} fill={style.stroke} />
            )}
            {style.glyph === 'cross' && (
              <path
                d={`M ${n.x + 12} ${n.y - 18} l 8 8 M ${n.x + 20} ${n.y - 18} l -8 8`}
                stroke={style.stroke}
                strokeWidth={2}
                strokeLinecap="round"
              />
            )}
            {badge &&
              (() => {
                const at = badgeSpot.get(n.id) ?? { x: n.x, y: n.y + R + 15, ux: 0, uy: 1 };
                return (
                  <text
                    key={`${n.id}-${badge}`}
                    className="pop-in"
                    x={at.x}
                    y={at.y}
                    textAnchor={at.ux > 0.4 ? 'start' : at.ux < -0.4 ? 'end' : 'middle'}
                    dominantBaseline={at.uy > 0.4 ? 'hanging' : at.uy < -0.4 ? 'auto' : 'central'}
                    fontSize={13}
                    fontWeight={600}
                    fontFamily="'JetBrains Mono', monospace"
                    fill={st === 'idle' ? 'var(--ink-faint)' : style.stroke}
                    /* A halo keeps the label readable if a line still runs close */
                    stroke="var(--surface)"
                    strokeWidth={3.5}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                    style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                  >
                    {badge}
                  </text>
                );
              })()}
          </g>
        );
      })}
    </svg>
  );
}
