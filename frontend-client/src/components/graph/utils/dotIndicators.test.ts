import { describe, it, expect } from 'vitest'
import { computeDmDots, computeDotLayout, DOT_SIZE } from './dotIndicators'
import { buildGroupColors } from './groupColors'
import { cytoscapeStyles } from '../cytoscape-styles'
import type { GraphData } from '../../../types/models'

const data: GraphData = {
  nodes: [
    { id: 'm1', name: 'GPS', primary_type: 'Mechanism', secondary_type: 'Electronic Monitoring', description: '' },
    { id: 'm2', name: '58A', primary_type: 'Mechanism', secondary_type: 'Preventative Detention', description: '' },
    { id: 'm3', name: 'SCRAM', primary_type: 'Mechanism', secondary_type: 'Electronic Monitoring', description: '' },
    { id: 'd1', name: 'Judges', primary_type: 'Decision Maker', secondary_type: '', description: '' },
  ],
  edges: [
    { id: 'e1', source: 'm1', target: 'd1', relationship_type: '', description: '' },
    { id: 'e2', source: 'm2', target: 'd1', relationship_type: '', description: '' },
    { id: 'e3', source: 'm3', target: 'd1', relationship_type: '', description: '' },
  ],
  memberships: [],
}

describe('computeDmDots', () => {
  it('produces one dot per distinct mechanism group, colored by group', () => {
    const colors = buildGroupColors(['Electronic Monitoring', 'Preventative Detention'])
    const dots = computeDmDots('d1', data, colors)
    expect(dots).toHaveLength(2) // two groups, not three mechanisms
    expect(decodeURIComponent(dots[0])).toContain('#009E73') // Electronic Monitoring sorts first
    expect(decodeURIComponent(dots[1])).toContain('#4A3AA7')
  })
})

// The dot row has to sit inside the DM diamond, so the geometry is checked
// against the live stylesheet rather than against numbers copied by hand.
const dmStyle = cytoscapeStyles.find((s) => s.selector === 'node[primary_type="Decision Maker"]')!
  .style as unknown as Record<string, string>
const NODE_W = parseFloat(dmStyle.width)
const NODE_H = parseFloat(dmStyle.height)

/**
 * Resolve a percentage background position the way cytoscape does:
 * `offset = (nodeSize - imageSize) * pct` from the node's top-left corner
 * (drawInscribedImage in cytoscape.cjs.js).
 */
function pxFromPct(pct: string, nodeSize: number): number {
  return (parseFloat(pct) / 100) * (nodeSize - DOT_SIZE)
}

/**
 * Width of the diamond silhouette `d` px from the node's vertical center.
 * Cytoscape's diamond is the polygon [0,1, 1,0, 0,-1, -1,0] — a rhombus whose
 * vertices are the midpoints of the bounding box edges.
 */
function diamondWidthAt(d: number): number {
  return NODE_W * (1 - Math.abs(d) / (NODE_H / 2))
}

/** Row extent in node-local px, plus how far its top edge sits above center. */
function rowGeometry(count: number) {
  const { x, y } = computeDotLayout(count)
  const lefts = x.map((p) => pxFromPct(p, NODE_W))
  return {
    x,
    y,
    left: lefts[0],
    right: lefts[count - 1] + DOT_SIZE,
    lefts,
    topAboveCenter: NODE_H / 2 - pxFromPct(y[0], NODE_H),
  }
}

describe('computeDotLayout', () => {
  it('is built for the DM node the stylesheet actually declares', () => {
    // dotIndicators.ts hard-codes these; resizing the diamond or changing its
    // shape means the dot row has to be re-fitted.
    expect([NODE_W, NODE_H, dmStyle.shape]).toEqual([140, 100, 'diamond'])
  })

  it('centers a single dot on the diamond axis', () => {
    const { left, right } = rowGeometry(1)
    expect((left + right) / 2).toBeCloseTo(NODE_W / 2, 6)
  })

  it('keeps every row centered and inside the diamond silhouette', () => {
    for (let n = 1; n <= 8; n++) {
      const { x, y, left, right, topAboveCenter } = rowGeometry(n)
      expect(x).toHaveLength(n)
      expect(y).toHaveLength(n)
      // The row's top edge is where the diamond is narrowest over its height,
      // so fitting there fits the whole dot.
      expect(right - left).toBeLessThanOrEqual(diamondWidthAt(topAboveCenter))
      // Centered on the vertical axis
      expect((left + right) / 2).toBeCloseTo(NODE_W / 2, 6)
    }
  })

  it('spaces dots without overlap up to the five pinned groups', () => {
    for (let n = 2; n <= 5; n++) {
      const { lefts } = rowGeometry(n)
      for (let i = 1; i < lefts.length; i++) {
        expect(lefts[i] - lefts[i - 1]).toBeGreaterThanOrEqual(DOT_SIZE)
      }
    }
  })

  it('sits above the centered label with room for three lines of 11px text', () => {
    const { topAboveCenter } = rowGeometry(5)
    expect(topAboveCenter - DOT_SIZE).toBeGreaterThanOrEqual(16.5)
  })
})
