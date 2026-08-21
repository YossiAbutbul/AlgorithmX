import { useMemo } from 'react';
import type {
  EdgeState,
  Frame,
  GraphEdge,
  GraphModel,
  NodeId,
  NodeState,
} from '../algorithms/types';
import {
  MARK_R,
  R,
  curvedGeometry,
  edgeGeometry,
  graphView,
  markOffset,
  nodeAnchors,
  nodePositions,
} from './graphGeometry';

interface NodeStyle {
  fill: string;
  stroke: string;
  width: number;
  dash?: string;
  glyph: 'none' | 'ring' | 'cross';
}

const NODE_STYLES: Record<NodeState, NodeStyle> = {
  idle: { fill: '#ffffff', stroke: 'var(--state-idle-line)', width: 1.6, glyph: 'none' },
  /* Fill and ring carry the state on their own; a second mark only added noise. */
  frontier: {
    fill: 'var(--state-frontier-fill)',
    stroke: 'var(--state-frontier)',
    width: 3,
    glyph: 'none',
  },
  current: {
    fill: 'var(--state-current-fill)',
    stroke: 'var(--state-current)',
    width: 4,
    glyph: 'ring',
  },
  done: { fill: 'var(--state-done-fill)', stroke: 'var(--state-done)', width: 3, glyph: 'none' },
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

/**
 * The rejected mark, drawn as a badge sitting on the rim: a filled disc keeps
 * the cross legible where it overlaps the ring, and it rides in a gap between
 * the node's edges so it never lands on a line.
 */
function RimMark({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={MARK_R} fill="var(--surface)" stroke={color} strokeWidth={1.6} />
      <path
        d={`M ${cx - 2.8} ${cy - 2.8} l 5.6 5.6 M ${cx + 2.8} ${cy - 2.8} l -5.6 5.6`}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </g>
  );
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
  const pos = useMemo(() => nodePositions(graph), [graph]);
  const edgeGeo = useMemo(() => edgeGeometry(graph), [graph]);
  const anchors = useMemo(() => nodeAnchors(graph, edgeGeo), [graph, edgeGeo]);

  /** The frame is fitted to what is drawn, not to the authored canvas. */
  const view = useMemo(() => graphView(graph), [graph]);

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

  /**
   * Client pixels to graph units. The svg meets its box rather than filling it,
   * so a box with a different aspect leaves a band on two sides that has to
   * come out before the scale is applied, or every click lands off target.
   */
  function toGraph(rect: DOMRect, clientX: number, clientY: number) {
    const scale = Math.min(rect.width / view.w, rect.height / view.h);
    const offsetX = (rect.width - view.w * scale) / 2;
    const offsetY = (rect.height - view.h * scale) / 2;
    return {
      x: view.x + (clientX - rect.left - offsetX) / scale,
      y: view.y + (clientY - rect.top - offsetY) / scale,
    };
  }

  function svgPoint(evt: React.MouseEvent<SVGSVGElement>): { x: number; y: number } {
    const p = toGraph(evt.currentTarget.getBoundingClientRect(), evt.clientX, evt.clientY);
    return { x: Math.round(p.x), y: Math.round(p.y) };
  }

  function handleDragStart(evt: React.MouseEvent<SVGGElement>, id: NodeId) {
    if (!onNodeDrag) return;
    evt.preventDefault();
    evt.stopPropagation();
    const svg = evt.currentTarget.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const move = (ev: MouseEvent) => {
      const p = toGraph(rect, ev.clientX, ev.clientY);
      onNodeDrag(
        id,
        Math.max(R + 4, Math.min(graph.width - R - 4, Math.round(p.x))),
        Math.max(R + 4, Math.min(graph.height - R - 24, Math.round(p.y))),
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
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
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
            y1={view.y + 12}
            x2={cutLine}
            y2={view.y + view.h - 12}
            stroke="var(--ink-soft)"
            strokeWidth={2}
            strokeDasharray="10 7"
          />
          <text
            x={cutLine + 6}
            y={view.y + 22}
            fontSize={12}
            fill="var(--ink-soft)"
            fontFamily="'IBM Plex Sans Hebrew', sans-serif"
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
        const at = anchors.get(n.id) ?? {
          badge: { x: n.x, y: n.y + R + 15, ux: 0, uy: 1 },
          mark: { ux: Math.SQRT1_2, uy: -Math.SQRT1_2 },
        };
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
              fontFamily="'IBM Plex Sans Hebrew', sans-serif"
              fill="var(--ink)"
            >
              {n.id}
            </text>
            {style.glyph === 'cross' && (
              <RimMark
                cx={n.x + at.mark.ux * markOffset(MARK_R)}
                cy={n.y + at.mark.uy * markOffset(MARK_R)}
                color={style.stroke}
              />
            )}
            {badge &&
              (() => {
                const spot = at.badge;
                return (
                  <text
                    key={`${n.id}-${badge}`}
                    className="pop-in"
                    x={spot.x}
                    y={spot.y}
                    textAnchor={spot.ux > 0.4 ? 'start' : spot.ux < -0.4 ? 'end' : 'middle'}
                    dominantBaseline={spot.uy > 0.4 ? 'hanging' : spot.uy < -0.4 ? 'auto' : 'central'}
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
