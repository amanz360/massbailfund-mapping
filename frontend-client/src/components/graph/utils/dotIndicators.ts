import type { GraphData } from '../../../types/models'
import type cytoscape from 'cytoscape'

const DOT_SIZE = 10

/** Generate an SVG data URI for a small circle dot indicator. */
export function generateDotSvg(color: string, filled: boolean): string {
  const s = DOT_SIZE
  const r = 3.5
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">
    <circle cx="${s / 2}" cy="${s / 2}" r="${r}"
            fill="${filled ? color : 'none'}" stroke="${color}" stroke-width="${filled ? 0 : 1.5}"/>
  </svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

/** Compute dot indicator SVGs for a DM node based on its institution memberships. */
export function computeDmDots(
  dmId: string,
  data: GraphData,
  institutionColors: Map<string, string>,
): string[] {
  const dots: { uri: string; filled: boolean; name: string }[] = []

  for (const m of data.memberships) {
    if (m.member !== dmId) continue
    const color = institutionColors.get(m.institution)
    if (!color) continue

    const filled = m.membership_type === 'Primary'
    const uri = generateDotSvg(color, filled)
    const inst = data.nodes.find((n) => n.id === m.institution)
    dots.push({ uri, filled, name: inst?.name ?? '' })
  }

  // Primary (filled) dots first, then alphabetical by institution name
  dots.sort((a, b) => {
    if (a.filled !== b.filled) return a.filled ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return dots.map((d) => d.uri)
}

/** Apply institution dot indicators to a cytoscape DM node. */
export function applyDotIndicators(node: cytoscape.NodeSingular, data: GraphData, institutionColors: Map<string, string>) {
  const uris = computeDmDots(node.id(), data, institutionColors)
  if (uris.length === 0) return

  const sz = `${DOT_SIZE}px`
  const widths = uris.map(() => sz)
  const heights = uris.map(() => sz)

  // Center dots inside the diamond, just above the label text
  const pos_x: string[] = []
  const pos_y: string[] = []
  const totalWidth = uris.length * DOT_SIZE + (uris.length - 1) * 2 // 2px gap between dots
  const startX = 50 - (totalWidth / 2 / 140) * 100 // 140px = DM diamond width
  for (let i = 0; i < uris.length; i++) {
    const offsetPx = i * (DOT_SIZE + 2)
    pos_x.push(`${startX + (offsetPx / 140) * 100}%`)
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
