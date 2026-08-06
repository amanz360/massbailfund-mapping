import type { ElementDefinition } from 'cytoscape'
import type { GraphData } from '../../../types/models'
import { nodeElement, roleEdgeElement } from '../utils'

/**
 * Build Level 1 (landing) elements: every node and every edge.
 * Role edges render DM → Mechanism and membership edges render
 * Institution → DM, so the whole map flows outward from institutions.
 */
export function buildLandingElements(data: GraphData): ElementDefinition[] {
  const elements: ElementDefinition[] = []
  const origin = { x: 0, y: 0 }
  const nodeById = new Map(data.nodes.map((n) => [n.id, n]))

  for (const node of data.nodes) {
    elements.push(nodeElement(node, { position: origin }))
  }

  for (const edge of data.edges) {
    const el = roleEdgeElement(edge, nodeById, 'landing-edge')
    if (el) elements.push(el)
  }

  for (const m of data.memberships) {
    elements.push({
      data: {
        id: `landing-membership-${m.id}`,
        source: m.institution,
        target: m.member,
        relationship_type: 'Member',
      },
      classes: 'membership-edge',
    })
  }

  return elements
}
