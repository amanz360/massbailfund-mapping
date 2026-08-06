import type { Core, EdgeSingular, NodeSingular } from 'cytoscape'

const CHAR_WIDTH = 6.2 // approx px per char at the 10px edge-label font
const EXTRA_PAD = 30 // breathing room around the label
const MAX_PASSES = 8 // fixed-point passes — node half-extents shift as the angle flattens
const MAX_SHIFT = 800 // hard cap so one pathological label cannot explode the viewport

/**
 * Distance from a node's centre to its bounding box along direction (dx, dy).
 * This is what the edge actually has to clear before the label starts.
 */
function halfExtentAlong(node: NodeSingular, dx: number, dy: number): number {
  const angle = Math.atan2(Math.abs(dy), Math.abs(dx))
  return Math.min(
    node.outerWidth() / 2 / Math.max(Math.cos(angle), 0.01),
    node.outerHeight() / 2 / Math.max(Math.sin(angle), 0.01),
  )
}

/**
 * Extra horizontal separation this edge still needs once the mechanism column
 * has been shifted right by `shift`. Zero when the label already fits.
 */
function horizontalShortfall(edge: EdgeSingular, shift: number): number {
  const label: string = edge.data('relationship_type') || ''
  if (!label) return 0

  const src = edge.source()
  const tgt = edge.target()
  const sp = src.position()
  const tp = tgt.position()

  const dx = tp.x + shift - sp.x
  const dy = tp.y - sp.y
  // A rightward shift only helps when the target really is to the right.
  if (dx <= 0) return 0

  const dist = Math.hypot(dx, dy)
  const needed =
    label.length * CHAR_WIDTH +
    EXTRA_PAD +
    halfExtentAlong(src, dx, dy) +
    halfExtentAlong(tgt, dx, dy)
  if (dist >= needed) return 0

  // Horizontal separation that reaches `needed` at the current node angles.
  // needed > dist >= |dy|, so the radicand is positive.
  return Math.sqrt(needed * needed - dy * dy) - dx
}

/**
 * After the preset layout, make room for the edge labels.
 *
 * The mechanism column (every `.expanded-edge` target — `roleEdgeElement`
 * always emits DM → Mechanism, so the targets are exactly the right-hand
 * column of all three expanded views) is translated right as a rigid group by
 * a single offset sized for the tightest label.
 *
 * Translating the whole column rather than pushing individual nodes is what
 * keeps `computeExpandedPositions`' overlap guarantees intact:
 *   - distances *within* the column are unchanged by a rigid translation;
 *   - distances to every other node only widen along x, because the column
 *     sits to the right of them all — asserted below before moving anything,
 *     so a future layout change degrades to "label may not fit" rather than
 *     "nodes overlap".
 */
export function ensureEdgeLabelsFit(cy: Core) {
  const edges = cy.edges('.expanded-edge')
  if (edges.length === 0) return

  // The whole column moves, including mechanisms whose own edge is unlabelled,
  // so the group stays rigid.
  const movableIds = new Set(edges.targets().map((el) => el.id()))
  const movable = cy.nodes().filter((n) => movableIds.has(n.id()))
  if (movable.length === 0) return
  const stationary = cy.nodes().filter((n) => !movableIds.has(n.id()))

  // The half-extents depend on the edge angle, which flattens as the column
  // moves, so re-solve a few times instead of trusting the first estimate.
  let shift = 0
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let extra = 0
    edges.forEach((e) => {
      extra = Math.max(extra, horizontalShortfall(e, shift))
    })
    if (extra < 0.5) break
    shift = Math.min(MAX_SHIFT, shift + extra)
    if (shift >= MAX_SHIFT) break
  }
  if (shift <= 0) return

  if (stationary.length > 0) {
    const minMovableX = Math.min(...movable.map((n: NodeSingular) => n.position().x))
    const maxStationaryX = Math.max(...stationary.map((n: NodeSingular) => n.position().x))
    if (minMovableX < maxStationaryX) return
  }

  movable.forEach((n) => {
    const p = n.position()
    n.position({ x: p.x + shift, y: p.y })
  })
}
