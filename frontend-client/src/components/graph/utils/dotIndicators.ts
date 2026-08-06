import type { GraphData } from '../../../types/models'
import type cytoscape from 'cytoscape'
import { dmGroups, GROUP_FALLBACK_COLOR } from './groupColors'

const DOT_SIZE = 10
const DOT_GAP = 2
/** DM diamond width from cytoscape-styles.ts — cytoscape background positions
 *  are percentages of node width, so pixel offsets divide through by it. */
const DM_WIDTH = 140

/** SVG data URI for a filled group dot with a white separating ring. */
export function generateDotSvg(color: string): string {
  const s = DOT_SIZE
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">
    <circle cx="${s / 2}" cy="${s / 2}" r="3.5" fill="${color}" stroke="#FFFFFF" stroke-width="1"/>
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

  // Center the dot row horizontally inside the diamond, just above the label
  const pos_x: string[] = []
  const pos_y: string[] = []
  const totalWidth = uris.length * DOT_SIZE + (uris.length - 1) * DOT_GAP
  const startX = 50 - (totalWidth / 2 / DM_WIDTH) * 100
  for (let i = 0; i < uris.length; i++) {
    const offsetPx = i * (DOT_SIZE + DOT_GAP)
    pos_x.push(`${startX + (offsetPx / DM_WIDTH) * 100}%`)
    pos_y.push('18%')
  }

  node.style({
    'background-image': uris,
    'background-width': widths,
    'background-height': heights,
    'background-position-x': pos_x,
    'background-position-y': pos_y,
    'background-clip': 'none',
    'background-image-containment': 'over',
    'bounds-expansion': '6px',
  })
}
