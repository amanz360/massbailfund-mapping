import type { ElementDefinition } from 'cytoscape'
import type { GraphData } from '../../../types/models'
import type { ExpandedViewType } from '../types'
import { nodeElement, getConnectedByType, roleEdgeElement } from '../utils'

/**
 * Build expanded-view elements for any of the three expanded views
 * (mechanism, DM, institution). Each view centers on the focus entity
 * and fans out to connected nodes of the other types.
 */
export function buildExpandedElements(
  viewType: ExpandedViewType,
  focusEntityId: string,
  data: GraphData,
): ElementDefinition[] {
  switch (viewType) {
    case 'mechanism':
      return buildMechanismExpanded(data, focusEntityId)
    case 'dm':
      return buildDmExpanded(data, focusEntityId)
    case 'institution':
      return buildInstitutionExpanded(data, focusEntityId)
  }
}

function membershipEdge(id: string, institutionId: string, dmId: string): ElementDefinition {
  return {
    data: { id, source: institutionId, target: dmId, relationship_type: 'Member' },
    classes: 'membership-edge expanded-membership',
  }
}

// ── Mechanism-expanded view ───────────────────────────────────────────

function buildMechanismExpanded(data: GraphData, mechanismId: string): ElementDefinition[] {
  const elements: ElementDefinition[] = []
  const nodeById = new Map(data.nodes.map((n) => [n.id, n]))

  const mechanism = nodeById.get(mechanismId)
  if (!mechanism) return elements

  elements.push(nodeElement(mechanism, { classes: 'center-mechanism' }))

  const { nodeIds: connectedDmIds, edges: relevantEdges } = getConnectedByType(
    mechanismId,
    data,
    'Decision Maker',
  )

  for (const dmId of connectedDmIds) {
    const dm = nodeById.get(dmId)
    if (dm) elements.push(nodeElement(dm, { classes: 'expanded-dm' }))
  }

  for (const edge of relevantEdges) {
    const el = roleEdgeElement(edge, nodeById, 'expanded-edge')
    if (el) elements.push(el)
  }

  // Institutions of the connected DMs, with membership edges
  const addedInsts = new Set<string>()
  for (const dmId of connectedDmIds) {
    for (const m of data.memberships) {
      if (m.member !== dmId) continue
      if (!addedInsts.has(m.institution)) {
        const inst = nodeById.get(m.institution)
        if (!inst) continue
        elements.push(nodeElement(inst))
        addedInsts.add(m.institution)
      }
      elements.push(membershipEdge(`mech-dm-inst-${dmId}-${m.institution}`, m.institution, dmId))
    }
  }

  return elements
}

// ── DM-expanded view ──────────────────────────────────────────────────

function buildDmExpanded(data: GraphData, dmId: string): ElementDefinition[] {
  const elements: ElementDefinition[] = []
  const nodeById = new Map(data.nodes.map((n) => [n.id, n]))

  const dm = nodeById.get(dmId)
  if (!dm) return elements

  elements.push(nodeElement(dm, { classes: 'center-dm' }))

  const { nodeIds: connectedMechIds, edges: relevantEdges } = getConnectedByType(
    dmId,
    data,
    'Mechanism',
  )

  for (const mechId of connectedMechIds) {
    const mech = nodeById.get(mechId)
    if (mech) elements.push(nodeElement(mech))
  }

  for (const edge of relevantEdges) {
    const el = roleEdgeElement(edge, nodeById, 'expanded-edge')
    if (el) elements.push(el)
  }

  // Every institution this DM belongs to
  for (const m of data.memberships) {
    if (m.member !== dmId) continue
    const inst = nodeById.get(m.institution)
    if (!inst) continue
    elements.push(nodeElement(inst))
    elements.push(membershipEdge(`dm-inst-${dmId}-${m.institution}`, m.institution, dmId))
  }

  return elements
}

// ── Institution-expanded view ─────────────────────────────────────────

function buildInstitutionExpanded(data: GraphData, institutionId: string): ElementDefinition[] {
  const elements: ElementDefinition[] = []
  const nodeById = new Map(data.nodes.map((n) => [n.id, n]))

  const institution = nodeById.get(institutionId)
  if (!institution) return elements

  elements.push(nodeElement(institution, { classes: 'center-institution' }))

  const memberDmIds = data.memberships
    .filter((m) => m.institution === institutionId)
    .map((m) => m.member)
  const dmIdSet = new Set(memberDmIds)

  for (const dmId of memberDmIds) {
    const dm = nodeById.get(dmId)
    if (dm) elements.push(nodeElement(dm, { classes: 'expanded-dm' }))
  }

  for (const dmId of memberDmIds) {
    elements.push(membershipEdge(`inst-${institutionId}-${dmId}`, institutionId, dmId))
  }

  // Mechanisms connected to those DMs and their edges
  const addedMechs = new Set<string>()
  for (const edge of data.edges) {
    let dm: string | null = null
    let mech: string | null = null

    if (dmIdSet.has(edge.source) && nodeById.get(edge.target)?.primary_type === 'Mechanism') {
      dm = edge.source
      mech = edge.target
    }
    if (dmIdSet.has(edge.target) && nodeById.get(edge.source)?.primary_type === 'Mechanism') {
      dm = edge.target
      mech = edge.source
    }
    if (!dm || !mech) continue

    if (!addedMechs.has(mech)) {
      const mechNode = nodeById.get(mech)
      if (!mechNode) continue
      elements.push(nodeElement(mechNode))
      addedMechs.add(mech)
    }

    const el = roleEdgeElement(edge, nodeById, 'expanded-edge')
    if (el) elements.push(el)
  }

  return elements
}
