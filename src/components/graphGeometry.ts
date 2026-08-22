import type { GraphEdge, GraphModel, NodeId } from '../algorithms/types';

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

/** How far apart a pair of opposite edges is pushed so both stay readable. */
const TWIN_BEND = 34;

/**
 * How far a residual arc bends off its edge. It is drawn from the edge's head
 * back to its tail, which is the same direction the opposite edge is drawn in,
 * so on a pair of opposite edges the arc bends to the same side as the twin and
 * lands on top of it: measured at 1.3 units apart, running parallel the whole
 * way. When a twin is there the arc goes outside it instead.
 */
export function residualBend(graph: GraphModel, edge: GraphEdge): number {
  const hasTwin = graph.edges.some((o) => o.from === edge.to && o.to === edge.from);
  return hasTwin ? TWIN_BEND + 24 : 30;
}

export interface Geometry {
  path: string;
  midX: number;
  midY: number;
  /** A point along the drawn edge, so a label can slide off a crossing. */
  pointAt: (t: number) => { x: number; y: number };
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
    pointAt: (t: number) => ({ x: sx + (ex - sx) * t, y: sy + (ey - sy) * t }),
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
    pointAt: (t: number) => {
      const u = 1 - t;
      return {
        x: u * u * sx + 2 * u * t * cx + t * t * ex,
        y: u * u * sy + 2 * u * t * cy + t * t * ey,
      };
    },
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

/** Half the height of any label capsule the canvas draws. */
export const LABEL_HALF_H = 11;

/** The half width of a label, from the same measurements the canvas draws with. */
export function labelHalfWidth(text: string): number {
  return text.length * 3.6 + 8;
}

/** Where along an edge a label may sit, tried in this order. */
const LABEL_STOPS = [0.5, 0.38, 0.62, 0.3, 0.7, 0.24, 0.76];

/** How far a label may step off its own line when sliding along it is not enough. */
const LABEL_LIFTS = [0, 16, -16];

/** Past this much daylight a spot is clear enough, so the middle keeps the label. */
const COMFORT = 5;

export interface PlacedLabel {
  x: number;
  y: number;
  halfW: number;
  halfH: number;
}

/** Daylight between two boxes. Negative means they overlap. */
function boxGap(a: PlacedLabel, b: PlacedLabel): number {
  return Math.max(
    Math.abs(a.x - b.x) - (a.halfW + b.halfW),
    Math.abs(a.y - b.y) - (a.halfH + b.halfH),
  );
}

function samplesOf(geo: Geometry): PlacedLabel[] {
  const out: PlacedLabel[] = [];
  for (let i = 1; i < 12; i += 1) {
    const p = geo.pointAt(i / 12);
    out.push({ x: p.x, y: p.y, halfW: 1, halfH: 1 });
  }
  return out;
}

/**
 * Slides a label along its own line to the spot with the most daylight around
 * it. A label pinned to the midpoint lands on whatever crosses there, and two
 * of them land on each other, which is what happened where the flow network's
 * s to t and u to v edges meet.
 */
export function placeLabel(
  geo: Geometry,
  halfW: number,
  obstacles: PlacedLabel[],
): PlacedLabel {
  let best: PlacedLabel | null = null;
  let bestGap = -Infinity;

  for (const t of LABEL_STOPS) {
    const at = geo.pointAt(t);
    // The curve's own direction, so a lift is square to the line it labels
    const a = geo.pointAt(Math.max(0, t - 0.02));
    const b = geo.pointAt(Math.min(1, t + 0.02));
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;

    for (const lift of LABEL_LIFTS) {
      const box: PlacedLabel = {
        x: at.x + nx * lift,
        y: at.y + ny * lift,
        halfW,
        halfH: LABEL_HALF_H,
      };
      let gap = Infinity;
      for (const o of obstacles) {
        gap = Math.min(gap, boxGap(box, o));
        if (gap <= bestGap) break;
      }
      // Sitting on its own line is what a label is for, so a lift has to earn it
      const score = lift === 0 ? gap : gap - 2;
      if (score > bestGap) {
        bestGap = score;
        best = box;
      }
    }
    // The midpoint is the natural home, so stop as soon as one is clear
    if (bestGap >= COMFORT) break;
  }

  return best ?? { ...geo.pointAt(0.5), halfW, halfH: LABEL_HALF_H };
}

/**
 * Every weight or capacity label, placed so that none of them lands on another
 * or on a line it does not belong to. Labels are measured, not assumed: a flow
 * badge reading 100/100 is two and a half times the width of a plain weight,
 * and treating them alike left the wide ones overlapping.
 */
export function edgeLabelSpots(
  graph: GraphModel,
  edgeGeo: Map<string, Geometry>,
  halfWidthOf?: (edgeId: string) => number,
): Map<string, PlacedLabel> {
  const spots = new Map<string, PlacedLabel>();
  const nodes: PlacedLabel[] = graph.nodes.map((n) => ({
    x: n.x,
    y: n.y,
    halfW: R,
    halfH: R,
  }));

  const samples = new Map<string, PlacedLabel[]>();
  for (const [id, geo] of edgeGeo) samples.set(id, samplesOf(geo));

  for (const e of graph.edges) {
    const geo = edgeGeo.get(e.id);
    if (!geo) continue;

    const obstacles: PlacedLabel[] = [...nodes, ...spots.values()];
    for (const [id, pts] of samples) {
      if (id === e.id) continue;
      obstacles.push(...pts);
    }

    const halfW = halfWidthOf?.(e.id) ?? labelHalfWidth(String(e.weight));
    spots.set(e.id, placeLabel(geo, halfW, obstacles));
  }
  return spots;
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
    for (const at of edgeLabelSpots(graph, edgeGeo).values()) {
      grow(at.x, at.y, at.halfW, at.halfH);
    }
  }

  if (graph.flow) {
    /*
     * Residual arcs arrive with the frame rather than with the graph, and they
     * bend outside their edge. Reserving their room up front keeps the frame
     * still through a run instead of resizing the moment flow appears.
     */
    const pos = nodePositions(graph);
    for (const e of graph.edges) {
      const a = pos.get(e.to);
      const b = pos.get(e.from);
      if (!a || !b) continue;
      const arc = curvedGeometry(a.x, a.y, b.x, b.y, residualBend(graph, e), true);
      for (let i = 0; i <= 8; i += 1) {
        const p = arc.pointAt(i / 8);
        grow(p.x, p.y, 4, 4);
      }
    }
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
