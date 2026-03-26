import type { ElementDefinition } from 'cytoscape'
import type { GraphData } from '../../../types/models'
import type { ExpandedViewType } from '../types'
import { getConnectedByType } from '../utils/graphHelpers'

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

// ── Mechanism-expanded view ───────────────────────────────────────────

function buildMechanismExpanded(data: GraphData, mechanismId: string): ElementDefinition[] {
  const elements: ElementDefinition[] = []

  const mechanism = data.nodes.find((n) => n.id === mechanismId)
  if (!mechanism) return elements

  elements.push({
    data: {
      id: mechanism.id,
      name: mechanism.name,
      primary_type: mechanism.primary_type,
      secondary_type: mechanism.secondary_type,
    },
    classes: 'center-mechanism',
  })

  const { nodeIds: connectedDmIds, edges: relevantEdges } = getConnectedByType(
    mechanismId,
    data,
    'Decision Maker',
  )

  for (const dmId of connectedDmIds) {
    const dm = data.nodes.find((n) => n.id === dmId)
    if (!dm) continue
    elements.push({
      data: {
        id: dm.id,
        name: dm.name,
        primary_type: dm.primary_type,
        secondary_type: dm.secondary_type,
      },
      classes: 'expanded-dm',
    })
  }

  for (const edge of relevantEdges) {
    elements.push({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        relationship_type: edge.relationship_type,
      },
      classes: 'expanded-edge',
    })
  }

  // Add primary institution nodes and membership edges for connected DMs
  const addedInsts = new Set<string>()
  for (const dmId of connectedDmIds) {
    for (const m of data.memberships) {
      if (m.member === dmId && m.membership_type === 'Primary') {
        if (!addedInsts.has(m.institution)) {
          const inst = data.nodes.find((n) => n.id === m.institution)
          if (!inst) continue
          elements.push({
            data: {
              id: inst.id,
              name: inst.name,
              primary_type: inst.primary_type,
              secondary_type: inst.secondary_type,
            },
          })
          addedInsts.add(m.institution)
        }
        elements.push({
          data: {
            id: `mech-dm-inst-${dmId}-${m.institution}`,
            source: dmId,
            target: m.institution,
            relationship_type: 'Member',
          },
          classes: 'membership-edge',
        })
      }
    }
  }

  return elements
}

// ── DM-expanded view ──────────────────────────────────────────────────

function buildDmExpanded(data: GraphData, dmId: string): ElementDefinition[] {
  const elements: ElementDefinition[] = []

  const dm = data.nodes.find((n) => n.id === dmId)
  if (!dm) return elements

  elements.push({
    data: {
      id: dm.id,
      name: dm.name,
      primary_type: dm.primary_type,
      secondary_type: dm.secondary_type,
    },
    classes: 'center-dm',
  })

  const { nodeIds: connectedMechIds, edges: relevantEdges } = getConnectedByType(
    dmId,
    data,
    'Mechanism',
  )

  for (const mechId of connectedMechIds) {
    const mech = data.nodes.find((n) => n.id === mechId)
    if (!mech) continue
    elements.push({
      data: {
        id: mech.id,
        name: mech.name,
        primary_type: mech.primary_type,
        secondary_type: mech.secondary_type,
      },
    })
  }

  for (const edge of relevantEdges) {
    elements.push({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        relationship_type: edge.relationship_type,
      },
      classes: 'expanded-edge',
    })
  }

  // Add primary institution nodes and membership edges
  for (const m of data.memberships) {
    if (m.member === dmId && m.membership_type === 'Primary') {
      const inst = data.nodes.find((n) => n.id === m.institution)
      if (!inst) continue
      elements.push({
        data: {
          id: inst.id,
          name: inst.name,
          primary_type: inst.primary_type,
          secondary_type: inst.secondary_type,
        },
      })
      elements.push({
        data: {
          id: `dm-inst-${dmId}-${m.institution}`,
          source: dmId,
          target: m.institution,
          relationship_type: 'Member',
        },
        classes: 'membership-edge',
      })
    }
  }

  return elements
}

// ── Institution-expanded view ─────────────────────────────────────────

function buildInstitutionExpanded(data: GraphData, institutionId: string): ElementDefinition[] {
  const elements: ElementDefinition[] = []

  const institution = data.nodes.find((n) => n.id === institutionId)
  if (!institution) return elements

  elements.push({
    data: {
      id: institution.id,
      name: institution.name,
      primary_type: institution.primary_type,
      secondary_type: institution.secondary_type,
    },
    classes: 'center-institution',
  })

  // Primary DMs of this institution
  const primaryDmIds = data.memberships
    .filter((m) => m.institution === institutionId && m.membership_type === 'Primary')
    .map((m) => m.member)
  const dmIdSet = new Set(primaryDmIds)

  for (const dmId of primaryDmIds) {
    const dm = data.nodes.find((n) => n.id === dmId)
    if (!dm) continue
    elements.push({
      data: {
        id: dm.id,
        name: dm.name,
        primary_type: dm.primary_type,
        secondary_type: dm.secondary_type,
      },
      classes: 'expanded-dm',
    })
  }

  // Add edges from DMs to institution (arrows point toward institution)
  for (const dmId of primaryDmIds) {
    elements.push({
      data: {
        id: `inst-${institutionId}-${dmId}`,
        source: dmId,
        target: institutionId,
        relationship_type: 'Member',
      },
      classes: 'membership-edge',
    })
  }

  // Add mechanisms connected to those DMs and their edges
  const addedMechs = new Set<string>()
  for (const edge of data.edges) {
    let dm: string | null = null
    let mech: string | null = null

    if (dmIdSet.has(edge.source)) {
      const target = data.nodes.find((n) => n.id === edge.target)
      if (target?.primary_type === 'Mechanism') { dm = edge.source; mech = edge.target }
    }
    if (dmIdSet.has(edge.target)) {
      const source = data.nodes.find((n) => n.id === edge.source)
      if (source?.primary_type === 'Mechanism') { dm = edge.target; mech = edge.source }
    }
    if (!dm || !mech) continue

    if (!addedMechs.has(mech)) {
      const mechNode = data.nodes.find((n) => n.id === mech)!
      elements.push({
        data: {
          id: mechNode.id,
          name: mechNode.name,
          primary_type: mechNode.primary_type,
          secondary_type: mechNode.secondary_type,
        },
      })
      addedMechs.add(mech)
    }

    elements.push({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        relationship_type: edge.relationship_type,
      },
      classes: 'expanded-edge',
    })
  }

  return elements
}
