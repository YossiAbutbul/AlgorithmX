import { useMemo, useState } from 'react';
import type {
  EdgeId,
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
  LABEL_HALF_H,
  edgeLabelSpots,
  graphView,
  labelHalfWidth,
  placeLabel,
  markOffset,
  nodeAnchors,
  nodePositions,
  residualBend,
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

/** The soft companion to a role's line colour, for the editor's endpoint nodes. */
function roleFill(color: string): string {
  return color === 'var(--state-done)' ? 'var(--state-done-fill)' : 'var(--state-frontier-fill)';
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
  onEdgeClick?: (id: EdgeId) => void;
  onCanvasClick?: (x: number, y: number) => void;
  onNodeDrag?: (id: NodeId, x: number, y: number) => void;
  /** Fired once when a drag finishes, so the editor can close its undo step. */
  onNodeDragEnd?: () => void;
  selectedNodes?: NodeId[];
  selectedEdge?: EdgeId | null;
  /** The editor marks the run's endpoints, which have no frame to colour them. */
  sourceNode?: NodeId;
  sinkNode?: NodeId;
  /** The pointer's meaning changes with the editor's tool. */
  canvasCursor?: 'default' | 'copy' | 'crosshair';
  /** A connection waiting for its second node, drawn as a line to the cursor. */
  linkFrom?: NodeId | null;
  /** Dropping the rim handle on another node connects the two. */
  onConnect?: (from: NodeId, to: NodeId) => void;
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
  onEdgeClick,
  onCanvasClick,
  onNodeDrag,
  onNodeDragEnd,
  selectedNodes = [],
  selectedEdge = null,
  sourceNode,
  sinkNode,
  canvasCursor = 'default',
  linkFrom = null,
  onConnect,
  compact = false,
  fit = false,
  ariaLabel,
}: GraphCanvasProps) {
  const pos = useMemo(() => nodePositions(graph), [graph]);
  const edgeGeo = useMemo(() => edgeGeometry(graph), [graph]);
  const anchors = useMemo(() => nodeAnchors(graph, edgeGeo), [graph, edgeGeo]);
  /** What each edge actually prints, so its label is measured and not guessed. */
  const edgeLabelText = useMemo(() => {
    const m = new Map<EdgeId, string>();
    for (const e of graph.edges) {
      m.set(e.id, frame?.edgeBadges?.[e.id] ?? (graph.weighted ? String(e.weight) : ''));
    }
    return m;
  }, [graph, frame]);

  /** Weight and flow labels, slid clear of crossings and of each other. */
  const labelSpot = useMemo(
    () => edgeLabelSpots(graph, edgeGeo, (id) => labelHalfWidth(edgeLabelText.get(id) ?? '')),
    [graph, edgeGeo, edgeLabelText],
  );

  /**
   * Residual arcs arrive with the frame and bend off their edge, so their
   * amounts were the one label the placement never saw. They are laid out after
   * the edge labels, against everything already on the canvas.
   */
  const residualLabel = useMemo(() => {
    const out = new Map<EdgeId, { geo: ReturnType<typeof curvedGeometry>; at: ReturnType<typeof placeLabel> }>();
    const list = frame?.residual ?? [];
    if (list.length === 0) return out;

    const obstacles = [
      ...graph.nodes.map((n) => ({ x: n.x, y: n.y, halfW: R, halfH: R })),
      ...labelSpot.values(),
    ];
    for (const geo of edgeGeo.values()) {
      for (let i = 1; i < 12; i += 1) {
        const p = geo.pointAt(i / 12);
        obstacles.push({ x: p.x, y: p.y, halfW: 1, halfH: 1 });
      }
    }

    for (const r of list) {
      const e = graph.edges.find((x) => x.id === r.id);
      const a = pos.get(e?.to ?? '');
      const b = pos.get(e?.from ?? '');
      if (!e || !a || !b) continue;
      const geo = curvedGeometry(a.x, a.y, b.x, b.y, residualBend(graph, e), true);
      const at = placeLabel(geo, labelHalfWidth(String(r.amount)), obstacles);
      obstacles.push(at);
      out.set(r.id, { geo, at });
    }
    return out;
  }, [frame, graph, edgeGeo, labelSpot, pos]);

  /** The frame is fitted to what is drawn, not to the authored canvas. */
  const view = useMemo(() => graphView(graph), [graph]);

  /** A connection being dragged off a node's rim handle. */
  const [linkDrag, setLinkDrag] = useState<{ from: NodeId; x: number; y: number } | null>(null);
  /** Where the cursor is, so a pending connection can follow it. */
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [hoverEdge, setHoverEdge] = useState<EdgeId | null>(null);

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

  /**
   * Dragging a node's rim handle onto another node connects the two. Picking a
   * tool first, clicking one node, then clicking the other works as well, but
   * this is the path that costs no trip to the toolbar.
   */
  function handleLinkStart(evt: React.MouseEvent<SVGCircleElement>, id: NodeId) {
    if (!onConnect) return;
    evt.preventDefault();
    evt.stopPropagation();
    const svg = evt.currentTarget.ownerSVGElement;
    const from = graph.nodes.find((n) => n.id === id);
    if (!svg || !from) return;
    const rect = svg.getBoundingClientRect();
    setLinkDrag({ from: id, x: from.x, y: from.y });

    const move = (ev: MouseEvent) => {
      const p = toGraph(rect, ev.clientX, ev.clientY);
      setLinkDrag({ from: id, x: p.x, y: p.y });
    };
    const up = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      setLinkDrag(null);
      const p = toGraph(rect, ev.clientX, ev.clientY);
      const target = graph.nodes.find(
        (n) => n.id !== id && Math.hypot(n.x - p.x, n.y - p.y) <= R + 8,
      );
      if (target) onConnect(id, target.id);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
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
      onNodeDragEnd?.();
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
      cursor={canvasCursor === 'default' ? undefined : canvasCursor}
      onClick={(e) => {
        if (!onCanvasClick) return;
        const p = svgPoint(e);
        onCanvasClick(p.x, p.y);
      }}
      onMouseMove={(e) => {
        if (!linkFrom) return;
        setPointer(svgPoint(e));
      }}
      onMouseLeave={() => setPointer(null)}
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
        const label = edgeLabelText.get(e.id) ?? '';
        // Fading a node's neighbours reads well during a run and gets in the way
        // while editing, where every edge stays a target.
        const dim =
          !onEdgeClick && hoveredNode != null && e.from !== hoveredNode && e.to !== hoveredNode
            ? 0.35
            : 1;

        const isPicked = selectedEdge === e.id;
        const labelAt =
          labelSpot.get(e.id) ??
          { x: geo.midX, y: geo.midY, halfW: labelHalfWidth(label), halfH: LABEL_HALF_H };

        return (
          <g key={e.id} opacity={dim}>
            {/* A two pixel line is a hard target, so the editor gets a wide one. */}
            {onEdgeClick && (
              <path
                d={geo.path}
                fill="none"
                stroke="transparent"
                strokeWidth={18}
                strokeLinecap="round"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverEdge(e.id)}
                onMouseLeave={() => setHoverEdge((h) => (h === e.id ? null : h))}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onEdgeClick(e.id);
                }}
              />
            )}
            {(isPicked || hoverEdge === e.id) && (
              <path
                d={geo.path}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={style.width + 6}
                strokeLinecap="round"
                opacity={isPicked ? 0.28 : 0.14}
              />
            )}
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
                  x={labelAt.x - labelAt.halfW}
                  y={labelAt.y - LABEL_HALF_H}
                  width={labelAt.halfW * 2}
                  height={LABEL_HALF_H * 2}
                  rx={6}
                  fill="var(--surface)"
                  stroke={
                    isPicked
                      ? 'var(--accent)'
                      : isCut
                        ? 'var(--state-current)'
                        : 'var(--line)'
                  }
                  strokeWidth={isCut || isPicked ? 1.6 : 1}
                />
                <text
                  x={labelAt.x}
                  y={labelAt.y + 4}
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
        const placed = residualLabel.get(r.id);
        if (!placed) return null;
        const { geo, at } = placed;
        const text = String(r.amount);
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
            {/* A capsule, so the amount stays readable where an arc runs under it */}
            <rect
              x={at.x - at.halfW}
              y={at.y - LABEL_HALF_H}
              width={at.halfW * 2}
              height={LABEL_HALF_H * 2}
              rx={6}
              fill="var(--surface)"
              stroke="var(--state-frontier)"
              strokeWidth={1}
            />
            <text
              x={at.x}
              y={at.y + 4}
              textAnchor="middle"
              fontSize={11}
              fontFamily="'JetBrains Mono', monospace"
              fill="var(--state-frontier)"
            >
              {text}
            </text>
          </g>
        );
      })}

      {/* The connection being made, following the cursor until it lands. */}
      {(() => {
        const from = linkDrag
          ? graph.nodes.find((n) => n.id === linkDrag.from)
          : linkFrom
            ? graph.nodes.find((n) => n.id === linkFrom)
            : undefined;
        const to = linkDrag ?? pointer;
        if (!from || !to) return null;
        return (
          <line
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="var(--accent)"
            strokeWidth={2.5}
            strokeDasharray="7 5"
            strokeLinecap="round"
            pointerEvents="none"
          />
        );
      })()}

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
        const role =
          n.id === sourceNode
            ? { label: 'מקור', color: 'var(--state-frontier)' }
            : n.id === sinkNode
              ? { label: 'בור', color: 'var(--state-done)' }
              : null;
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
            {role && (
              <text
                x={n.x}
                y={n.y - R - 9}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fontFamily="'IBM Plex Sans Hebrew', sans-serif"
                fill={role.color}
                stroke="var(--surface)"
                strokeWidth={3}
                strokeLinejoin="round"
                paintOrder="stroke"
              >
                {role.label}
              </text>
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
              fill={role && !frame ? roleFill(role.color) : style.fill}
              stroke={role && !frame ? role.color : style.stroke}
              strokeWidth={role && !frame ? 3 : style.width}
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
            {/*
              * The handle only shows on the node you are pointing at, so the
              * graph stays clean until you reach for it.
              */}
            {onConnect && (isHovered || isSelected) && !linkDrag && (
              <g
                style={{ cursor: 'crosshair' }}
                onMouseDown={(ev) => handleLinkStart(ev as unknown as React.MouseEvent<SVGCircleElement>, n.id)}
              >
                <circle
                  cx={n.x + at.mark.ux * (R + 9)}
                  cy={n.y + at.mark.uy * (R + 9)}
                  r={8}
                  fill="var(--accent)"
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
                <path
                  d={`M ${n.x + at.mark.ux * (R + 9) - 3.6} ${n.y + at.mark.uy * (R + 9)} h 7.2
                      M ${n.x + at.mark.ux * (R + 9)} ${n.y + at.mark.uy * (R + 9) - 3.6} v 7.2`}
                  stroke="#fff"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  pointerEvents="none"
                />
              </g>
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
