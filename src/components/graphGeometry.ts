import type { GraphModel, NodeId } from '../algorithms/types';

/** Node radius, in graph units. Everything else is measured off it. */
export const R = 26;

/** How far a distance badge sits from the centre of its node. */
const BADGE_DIST = R + 15;

/** Half of the box a badge draws, so the frame can reserve room for it. */
const BADGE_HALF_W = 20;
const BADGE_HALF_H = 11;

/** The largest state mark drawn on a node, used when reserving frame space. */
export const MARK_R = 7;

/**
 * A state mark rides on the rim: far enough out to sit outside the ring, close
 * enough in to overlap it, so the two read as one piece rather than a loose
 * dot floating near a circle.
 */
export function markOffset(markR: number): number {
  return R + 1.5 + markR - 2;
}

/** Breathing room between the outermost mark and the edge of the frame. */
const FRAME_MARGIN = 14;

export interface Geometry {
  path: string;
  midX: number;
  midY: number;
}

export function straightGeometry(
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

export function curvedGeometry(
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

/** Edges that have a twin running the other way get bent apart. */
export function antiParallelEdges(graph: GraphModel): Set<string> {
  const set = new Set<string>();
  if (!graph.directed) return set;
  for (const e of graph.edges) {
    const rev = graph.edges.find((o) => o.from === e.to && o.to === e.from);
    if (rev) set.add(e.id);
  }
  return set;
}

export function nodePositions(graph: GraphModel): Map<NodeId, { x: number; y: number }> {
  const m = new Map<NodeId, { x: number; y: number }>();
  for (const n of graph.nodes) m.set(n.id, { x: n.x, y: n.y });
  return m;
}

/** Edge paths, shared by the renderer, the badge placement and the framing. */
export function edgeGeometry(graph: GraphModel): Map<string, Geometry> {
  const pos = nodePositions(graph);
  const antiParallel = antiParallelEdges(graph);
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
}

export interface BadgeSpot {
  x: number;
  y: number;
  ux: number;
  uy: number;
}

export interface NodeAnchors {
  /** Where the distance label goes. */
  badge: BadgeSpot;
  /** The direction the state mark rides on, as a unit vector. */
  mark: { ux: number; uy: number };
}

/**
 * A distance label pinned under the node collides with any edge that leaves
 * downward, and so does a state mark on the rim. Rank the gaps between this
 * node's own edges by how clear they are, then hand the widest to the label and
 * the next one to the mark, so the two never land on each other or on an edge.
 */
export function nodeAnchors(
  graph: GraphModel,
  edgeGeo: Map<string, Geometry>,
): Map<NodeId, NodeAnchors> {
  const pos = nodePositions(graph);
  const anchors = new Map<NodeId, NodeAnchors>();

  const obstacles = [
    ...[...edgeGeo.values()].map((g) => ({ x: g.midX, y: g.midY })),
    ...graph.nodes.map((o) => ({ x: o.x, y: o.y })),
  ];

  for (const n of graph.nodes) {
    const angles: number[] = [];
    for (const e of graph.edges) {
      const other = e.from === n.id ? pos.get(e.to) : e.to === n.id ? pos.get(e.from) : undefined;
      if (other) angles.push(Math.atan2(other.y - n.y, other.x - n.x));
    }

    // Below for the label and above right for the mark, when nothing is in the way
    let badgeAngle = Math.PI / 2;
    let markAngle = -Math.PI / 4;

    if (angles.length > 0) {
      angles.sort((a, b) => a - b);
      const gaps = angles.map((a, i) => {
        const next = i === angles.length - 1 ? angles[0] + Math.PI * 2 : angles[i + 1];
        return { angle: (a + next) / 2, gap: next - a };
      });

      const scored = gaps.map((g) => {
        const x = n.x + Math.cos(g.angle) * BADGE_DIST;
        const y = n.y + Math.sin(g.angle) * BADGE_DIST;
        let clearance = Infinity;
        for (const o of obstacles) {
          const d = Math.hypot(o.x - x, o.y - y);
          // The node's own centre is always BADGE_DIST away, so it is not an obstacle
          if (d > 1 && d < clearance) clearance = d;
        }
        return { ...g, clearance };
      });

      scored.sort((a, c) => {
        // Anything past 34 units is clear enough, so the wider gap decides
        const ca = Math.min(a.clearance, 34);
        const cc = Math.min(c.clearance, 34);
        return cc - ca || c.gap - a.gap;
      });

      badgeAngle = scored[0].angle;
      markAngle =
        scored.length > 1
          ? scored[1].angle
          : // One gap only, so the mark shares it, swung far enough round to clear
            badgeAngle - Math.min(scored[0].gap / 2 - 0.3, 1.2);
    }

    const ux = Math.cos(badgeAngle);
    const uy = Math.sin(badgeAngle);
    anchors.set(n.id, {
      badge: { x: n.x + ux * BADGE_DIST, y: n.y + uy * BADGE_DIST, ux, uy },
      mark: { ux: Math.cos(markAngle), uy: Math.sin(markAngle) },
    });
  }
  return anchors;
}

export interface GraphView {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The frame the canvas draws through. The authored width and height are the
 * space a graph may be laid out in, not the space it actually uses, so framing
 * on them leaves the drawing off centre and floating in air. Fit the box to
 * what is really on screen instead: node circles, rim marks, badge boxes and
 * weight labels, plus one uniform margin. Every preset and every graph a student edits
 * then frames the same way.
 */
export function graphView(graph: GraphModel): GraphView {
  if (graph.nodes.length === 0) {
    return { x: 0, y: 0, w: graph.width, h: graph.height };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = (x: number, y: number, halfW: number, halfH: number) => {
    minX = Math.min(minX, x - halfW);
    maxX = Math.max(maxX, x + halfW);
    minY = Math.min(minY, y - halfH);
    maxY = Math.max(maxY, y + halfH);
  };

  for (const n of graph.nodes) grow(n.x, n.y, R, R);

  const edgeGeo = edgeGeometry(graph);
  const markDist = markOffset(MARK_R);
  for (const [id, at] of nodeAnchors(graph, edgeGeo)) {
    grow(at.badge.x, at.badge.y, BADGE_HALF_W, BADGE_HALF_H);
    const n = graph.nodes.find((o) => o.id === id);
    if (n) grow(n.x + at.mark.ux * markDist, n.y + at.mark.uy * markDist, MARK_R, MARK_R);
  }

  if (graph.weighted || graph.flow) {
    for (const geo of edgeGeo.values()) grow(geo.midX, geo.midY, 26, 12);
  }

  return {
    x: minX - FRAME_MARGIN,
    y: minY - FRAME_MARGIN,
    w: maxX - minX + FRAME_MARGIN * 2,
    h: maxY - minY + FRAME_MARGIN * 2,
  };
}

/** The aspect the stage should reserve, as a CSS `aspect-ratio` value. */
export function graphAspect(graph: GraphModel): string {
  const view = graphView(graph);
  return `${view.w} / ${view.h}`;
}
