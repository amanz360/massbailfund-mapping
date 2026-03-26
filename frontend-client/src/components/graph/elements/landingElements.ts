import type { ElementDefinition } from 'cytoscape'
import type { GraphData } from '../../../types/models'
import { nodeElement, computeInstMemberCount, getBestInstitution } from '../utils'

/**
 * Build Level 1 (landing) elements: all mechanisms, decision makers,
 * institutions, and their connecting edges.  Every node starts at the
 * origin so the layout can animate them outward.
 */
export function buildLandingElements(
  data: GraphData,
): ElementDefinition[] {
  const elements: ElementDefinition[] = []

  const origin = { x: 0, y: 0 }

  // Add mechanism nodes
  for (const node of data.nodes.filter((n) => n.primary_type === 'Mechanism')) {
    elements.push(nodeElement(node, { position: origin }))
  }

  // Add decision maker nodes
  for (const node of data.nodes.filter((n) => n.primary_type === 'Decision Maker')) {
    elements.push(nodeElement(node, { position: origin }))
  }

  // Add institution nodes
  for (const node of data.nodes.filter((n) => n.primary_type === 'Institution')) {
    elements.push(nodeElement(node, { position: origin }))
  }

  // Add edges between mechanisms and decision makers
  for (const edge of data.edges) {
    const sourceNode = data.nodes.find((n) => n.id === edge.source)
    const targetNode = data.nodes.find((n) => n.id === edge.target)
    if (!sourceNode || !targetNode) continue
    const types = new Set([sourceNode.primary_type, targetNode.primary_type])
    if (types.has('Mechanism') && types.has('Decision Maker')) {
      elements.push({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          relationship_type: edge.relationship_type,
        },
        classes: 'landing-edge',
      })
    }
  }

  // For each DM, add only the single membership edge to the institution
  // with the fewest primary members (same heuristic as border color).
  // This creates decisive clustering — each DM is pulled into one neighborhood.
  const instCounts = computeInstMemberCount(data.memberships)
  const dmBestInst = new Map<string, { membership: (typeof data.memberships)[0] }>()
  for (const m of data.memberships) {
    if (m.membership_type !== 'Primary') continue
    const bestInstId = getBestInstitution(m.member, data.memberships, instCounts)
    if (bestInstId === m.institution) {
      dmBestInst.set(m.member, { membership: m })
    }
  }
  for (const [, { membership: m }] of dmBestInst) {
    elements.push({
      data: {
        id: `landing-membership-${m.id}`,
        source: m.member,
        target: m.institution,
        relationship_type: m.membership_type,
      },
      classes: 'membership-edge',
    })
  }
  // Secondary membership edges (non-best primary memberships) — hidden but affect layout
  for (const m of data.memberships) {
    if (m.membership_type !== 'Primary') continue
    const best = dmBestInst.get(m.member)
    if (best && best.membership.id === m.id) continue
    elements.push({
      data: {
        id: `landing-membership-hidden-${m.id}`,
        source: m.member,
        target: m.institution,
        relationship_type: m.membership_type,
      },
      classes: 'hidden-membership-edge',
    })
  }

  // Add invisible gravity edges from mechanisms to institutions.
  // For each mechanism, count how many of its DMs belong to each institution
  // (using the same "best institution" heuristic). This lets fcose naturally
  // position mechanisms between the institutions their DMs belong to.
  const mechNodes = data.nodes.filter((n) => n.primary_type === 'Mechanism')
  for (const mech of mechNodes) {
    // Count DMs per institution for this mechanism
    const instAffinity = new Map<string, number>()
    for (const edge of data.edges) {
      const dmId = edge.source === mech.id ? edge.target : edge.target === mech.id ? edge.source : null
      if (!dmId) continue
      const dmNode = data.nodes.find((n) => n.id === dmId)
      if (dmNode?.primary_type !== 'Decision Maker') continue
      const bestInstId = getBestInstitution(dmId, data.memberships, instCounts)
      if (bestInstId) {
        instAffinity.set(bestInstId, (instAffinity.get(bestInstId) ?? 0) + 1)
      }
    }
    // Add an invisible edge to each institution with affinity > 0
    for (const [instId, count] of instAffinity) {
      elements.push({
        data: {
          id: `gravity-${mech.id}-${instId}`,
          source: mech.id,
          target: instId,
          _gravityWeight: count,
        },
        classes: 'gravity-edge',
      })
    }
  }

  return elements
}
