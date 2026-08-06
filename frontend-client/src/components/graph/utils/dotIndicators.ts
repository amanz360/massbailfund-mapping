import type { GraphData } from '../../../types/models'
import type cytoscape from 'cytoscape'
import { dmGroups, GROUP_FALLBACK_COLOR } from './groupColors'

// ── Dot row geometry ───────────────────────────────────────────────────
//
// The DM node is a 140x100 diamond (see cytoscape-styles.ts). Two facts about
// cytoscape drive the math below, both from drawInscribedImage in its source:
//
//  1. A percentage background position resolves CSS-style against the *free*
//     span, not the node span: `imageLeft = nodeLeft + (nodeW - imageW) * pct`
//     (and likewise for y). So percentages divide by `NODE_W - DOT_SIZE`. The
//     node size used is `node.width()`, i.e. the styled 140px, border excluded.
//  2. The `diamond` shape is the polygon [0,1, 1,0, 0,-1, -1,0] — a rhombus
//     whose vertices are the midpoints of the bounding box edges. Its
//     silhouette `d` px from the vertical center is only `140 * (1 - d/50)`
//     wide, so a row placed high in the node has very little room.
//
// The row sits ROW_OFFSET_Y above center. Its top edge (ROW_OFFSET_Y +
// DOT_SIZE/2 = 26px up) is the narrowest span it occupies, giving
// 140 * (1 - 26/50) = 67.2px of usable width. groupColors.ts pins five groups,
// and a five-dot row is 5*8 + 4*3 = 52px — inside 67.2 with ~7.5px of
// clearance per side. The row's bottom edge is 18px above center, clearing a
// three-line 11px label. Should the palette ever grow past six groups, the
// step clamp below tightens spacing instead of letting dots spill outside.

export const DOT_SIZE = 8
const DOT_GAP = 3
const ROW_OFFSET_Y = 22
const NODE_W = 140
const NODE_H = 100

/** Width of the diamond silhouette `d` px from the node's vertical center. */
function diamondWidthAt(d: number): number {
  return NODE_W * (1 - Math.abs(d) / (NODE_H / 2))
}

const ROW_MAX_WIDTH = diamondWidthAt(ROW_OFFSET_Y + DOT_SIZE / 2)

/**
 * Percentage background positions for a horizontally centered row of `count`
 * dots, sized and placed to stay inside the diamond silhouette.
 */
export function computeDotLayout(count: number): { x: string[]; y: string[] } {
  const step =
    count > 1
      ? Math.min(DOT_SIZE + DOT_GAP, (ROW_MAX_WIDTH - DOT_SIZE) / (count - 1))
      : 0
  const rowWidth = DOT_SIZE + (count - 1) * step
  const rowLeft = (NODE_W - rowWidth) / 2
  const rowTop = NODE_H / 2 - ROW_OFFSET_Y - DOT_SIZE / 2

  const yPct = `${((rowTop / (NODE_H - DOT_SIZE)) * 100).toFixed(3)}%`
  const x: string[] = []
  const y: string[] = []
  for (let i = 0; i < count; i++) {
    x.push(`${(((rowLeft + i * step) / (NODE_W - DOT_SIZE)) * 100).toFixed(3)}%`)
    y.push(yPct)
  }
  return { x, y }
}

/** SVG data URI for a filled group dot with a white separating ring. */
export function generateDotSvg(color: string): string {
  const s = DOT_SIZE
  // The 1px stroke straddles the circle path, so the drawn edge reaches
  // r + 0.5; keep it a hair inside the viewport to avoid clipping the ring.
  const r = s / 2 - 0.75
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">
    <circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="${color}" stroke="#FFFFFF" stroke-width="1"/>
  </svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

/** Dot indicator SVGs for a DM node — one per connected mechanism group. */
export function computeDmDots(
  dmId: string,
  data: GraphData,
  groupColors: Map<string, string>,
): string[] {
  return dmGroups(dmId, data).map((g) =>
    generateDotSvg(groupColors.get(g) ?? GROUP_FALLBACK_COLOR),
  )
}

/** Apply mechanism-group dot indicators to a cytoscape DM node. */
export function applyDotIndicators(
  node: cytoscape.NodeSingular,
  data: GraphData,
  groupColors: Map<string, string>,
) {
  const uris = computeDmDots(node.id(), data, groupColors)
  if (uris.length === 0) return

  const sz = `${DOT_SIZE}px`
  const widths = uris.map(() => sz)
  const heights = uris.map(() => sz)
  const { x: pos_x, y: pos_y } = computeDotLayout(uris.length)

  node.style({
    'background-image': uris,
    'background-width': widths,
    'background-height': heights,
    'background-position-x': pos_x,
    'background-position-y': pos_y,
    // The row fits within the silhouette, so no bounds expansion is needed;
    // 'over' keeps the dots painted on top of the gold fill.
    'background-clip': 'none',
    'background-image-containment': 'over',
  })
}
