import type { GraphData } from '../../../types/models'
import type { ExpandedViewType } from '../types'

type Position = { x: number; y: number }

/**
 * Barycenter heuristic: iteratively reorder two groups (A and B) so that
 * each element is placed at the average rank of its neighbours in the
 * opposite group.  This minimises edge crossings between the two columns.
 *
 * @param groupA  Initial ordering of group A ids
 * @param groupB  Initial ordering of group B ids
 * @param aToB    Adjacency: A-id → connected B-ids
 * @param bToA    Adjacency: B-id → connected A-ids
 * @param iterations  Number of refinement passes (default 6)
 * @returns  { orderedA, orderedB } — reordered arrays
 */
function barycenterReorder(
  groupA: string[],
  groupB: string[],
  aToB: Map<string, string[]>,
  bToA: Map<string, string[]>,
  iterations: number = 6,
): { orderedA: string[]; orderedB: string[] } {
  let orderA = [...groupA]
  let orderB = [...groupB]

  for (let iter = 0; iter < iterations; iter++) {
    // Score each A element by average rank of its connected B elements
    const bRank = new Map<string, number>()
    orderB.forEach((id, i) => bRank.set(id, i))

    const aScored = orderA.map((aId) => {
      const neighbors = aToB.get(aId) || []
      const ranks = neighbors.map((id) => bRank.get(id) ?? 0)
      const score =
        ranks.length > 0
          ? ranks.reduce((s, r) => s + r, 0) / ranks.length
          : orderB.length / 2
      return { id: aId, score }
    })
    aScored.sort((a, b) => a.score - b.score)
    orderA = aScored.map((d) => d.id)

    // Score each B element by average rank of its connected A elements
    const aRank = new Map<string, number>()
    orderA.forEach((id, i) => aRank.set(id, i))

    const bScored = orderB.map((bId) => {
      const neighbors = bToA.get(bId) || []
      const ranks = neighbors.map((id) => aRank.get(id) ?? 0)
      const score =
        ranks.length > 0
          ? ranks.reduce((s, r) => s + r, 0) / ranks.length
          : orderA.length / 2
      return { id: bId, score }
    })
    bScored.sort((a, b) => a.score - b.score)
    orderB = bScored.map((s) => s.id)
  }

  return { orderedA: orderA, orderedB: orderB }
}

/**
 * Place nodes along a parabolic arc (vertical stack with a horizontal
 * bulge at the centre).
 *
 * @returns Array of { id, x, y } for each node in order
 */
function parabolicArc(
  ids: string[],
  vertSpacing: number,
  baseDist: number,
  curve: number,
): { id: string; x: number; y: number }[] {
  const count = ids.length
  return ids.map((id, i) => {
    const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1 // -1 to 1
    const y = t * ((count - 1) * vertSpacing) / 2
    const x = baseDist + curve * (1 - t * t) // parabola: max at centre
    return { id, x, y }
  })
}

/**
 * Place nodes in an evenly-spaced vertical stack centred on y = 0.
 */
function verticalStack(
  ids: string[],
  x: number,
  spacing: number,
): { id: string; x: number; y: number }[] {
  const totalHeight = (ids.length - 1) * spacing
  return ids.map((id, i) => ({
    id,
    x,
    y: -totalHeight / 2 + i * spacing,
  }))
}

// ---------------------------------------------------------------------------
// View-specific implementations
// ---------------------------------------------------------------------------

/**
 * Expanded mechanism view.
 *
 * Layout: institutions left — DMs centre — mechanism right.
 * Uses barycenter heuristic for DM ↔ institution ordering.
 * Institution vertical span matches DM range.
 */
function computeMechanism(
  data: GraphData,
  mechanismId: string,
): Map<string, Position> {
  const positions = new Map<string, Position>()

  // Collect connected DM IDs
  const dmIdSet = new Set<string>()
  for (const edge of data.edges) {
    if (edge.source === mechanismId) {
      const target = data.nodes.find((n) => n.id === edge.target)
      if (target?.primary_type === 'Decision Maker') dmIdSet.add(edge.target)
    }
    if (edge.target === mechanismId) {
      const source = data.nodes.find((n) => n.id === edge.source)
      if (source?.primary_type === 'Decision Maker') dmIdSet.add(edge.source)
    }
  }

  // Collect primary institutions of those DMs
  const instIdSet = new Set<string>()
  for (const m of data.memberships) {
    if (dmIdSet.has(m.member) && m.membership_type === 'Primary') {
      instIdSet.add(m.institution)
    }
  }

  // Build DM ↔ institution adjacency
  const dmToInsts = new Map<string, string[]>()
  const instToDms = new Map<string, string[]>()
  for (const dmId of dmIdSet) dmToInsts.set(dmId, [])
  for (const instId of instIdSet) instToDms.set(instId, [])
  for (const m of data.memberships) {
    if (dmIdSet.has(m.member) && m.membership_type === 'Primary' && instIdSet.has(m.institution)) {
      dmToInsts.get(m.member)!.push(m.institution)
      instToDms.get(m.institution)!.push(m.member)
    }
  }

  // Initial orderings (institutions sorted by name, DMs unsorted)
  const instInitial = [...instIdSet].sort((a, b) => {
    const nameA = data.nodes.find((n) => n.id === a)?.name || ''
    const nameB = data.nodes.find((n) => n.id === b)?.name || ''
    return nameA.localeCompare(nameB)
  })
  const dmInitial = [...dmIdSet]

  // Barycenter reorder DMs ↔ institutions
  const { orderedA: dmOrder, orderedB: instOrder } = barycenterReorder(
    dmInitial,
    instInitial,
    dmToInsts,
    instToDms,
  )

  const DM_COUNT = dmOrder.length

  // Mechanism on the right — offset from DM column at x=0
  positions.set(mechanismId, { x: 250, y: 0 })

  // DMs in vertical stack at centre
  const DM_SPACING = DM_COUNT <= 4 ? 120 : Math.max(110, Math.ceil(480 / DM_COUNT))
  const dmTotalHeight = (DM_COUNT - 1) * DM_SPACING
  for (const { id, x, y } of verticalStack(dmOrder, 0, DM_SPACING)) {
    positions.set(id, { x, y })
  }

  // Institutions on the left, spanning the same vertical range as DMs
  if (instOrder.length > 0) {
    const INST_X = -200 // left column x-position, symmetric with mechanism at x=250
    const INST_COUNT = instOrder.length
    const instTotalHeight = INST_COUNT === 1 ? 0 : dmTotalHeight
    const instSpacing = INST_COUNT === 1 ? 0 : instTotalHeight / (INST_COUNT - 1)

    for (const { id, x, y } of verticalStack(instOrder, INST_X, instSpacing)) {
      positions.set(id, { x, y })
    }
  }

  return positions
}

/**
 * Expanded DM view.
 *
 * Layout: institutions left — DM centre — mechanisms right (parabolic arc).
 * No barycenter — uses simple iteration order.
 * Institutions use fixed 120px spacing.
 */
function computeDm(
  data: GraphData,
  dmId: string,
): Map<string, Position> {
  const positions = new Map<string, Position>()

  // DM at centre
  positions.set(dmId, { x: 0, y: 0 })

  // Collect connected mechanism IDs
  const mechIdSet = new Set<string>()
  for (const edge of data.edges) {
    if (edge.source === dmId) {
      const target = data.nodes.find((n) => n.id === edge.target)
      if (target?.primary_type === 'Mechanism') mechIdSet.add(edge.target)
    }
    if (edge.target === dmId) {
      const source = data.nodes.find((n) => n.id === edge.source)
      if (source?.primary_type === 'Mechanism') mechIdSet.add(edge.source)
    }
  }
  const mechIds = [...mechIdSet]

  // Collect primary institution IDs
  const instIds = data.memberships
    .filter((m) => m.member === dmId && m.membership_type === 'Primary')
    .map((m) => m.institution)

  const MECH_COUNT = mechIds.length
  const INST_COUNT = instIds.length

  // Mechanisms: parabolic arc on the right
  const VERT_SPACING = 95 // vertical gap between mechanism nodes
  const BASE_DIST = 200 // minimum horizontal distance from center DM to mechanism arc
  const CURVE = Math.min(100, MECH_COUNT * 14) // parabolic bulge — grows with mechanism count, capped at 100px

  for (const { id, x, y } of parabolicArc(mechIds, VERT_SPACING, BASE_DIST, CURVE)) {
    positions.set(id, { x, y })
  }

  // Institutions: left side with fixed 120px spacing
  if (INST_COUNT > 0) {
    const INST_RADIUS = 200 // horizontal distance from center DM to institution column
    if (INST_COUNT === 1) {
      positions.set(instIds[0], { x: -INST_RADIUS, y: 0 })
    } else {
      const instSpacing = 120
      const totalHeight = (INST_COUNT - 1) * instSpacing
      for (let i = 0; i < INST_COUNT; i++) {
        positions.set(instIds[i], {
          x: -INST_RADIUS,
          y: -totalHeight / 2 + i * instSpacing,
        })
      }
    }
  }

  return positions
}

/**
 * Expanded institution view.
 *
 * Layout: institution left — DMs centre — mechanisms right (parabolic arc).
 * Uses barycenter heuristic for DM ↔ mechanism ordering.
 */
function computeInstitution(
  data: GraphData,
  institutionId: string,
): Map<string, Position> {
  const positions = new Map<string, Position>()

  // Find DMs with primary membership at this institution
  const primaryDmIds = data.memberships
    .filter((m) => m.institution === institutionId && m.membership_type === 'Primary')
    .map((m) => m.member)
  const dmIdSet = new Set(primaryDmIds)

  // Find mechanisms connected to those DMs
  const mechIdSet = new Set<string>()
  for (const edge of data.edges) {
    if (dmIdSet.has(edge.source)) {
      const target = data.nodes.find((n) => n.id === edge.target)
      if (target?.primary_type === 'Mechanism') mechIdSet.add(edge.target)
    }
    if (dmIdSet.has(edge.target)) {
      const source = data.nodes.find((n) => n.id === edge.source)
      if (source?.primary_type === 'Mechanism') mechIdSet.add(edge.source)
    }
  }

  // Build DM ↔ mechanism adjacency
  const dmToMechs = new Map<string, string[]>()
  const mechToDms = new Map<string, string[]>()
  for (const dmId of dmIdSet) dmToMechs.set(dmId, [])
  for (const mechId of mechIdSet) mechToDms.set(mechId, [])
  for (const edge of data.edges) {
    if (dmIdSet.has(edge.source) && mechIdSet.has(edge.target)) {
      dmToMechs.get(edge.source)!.push(edge.target)
      mechToDms.get(edge.target)!.push(edge.source)
    }
    if (dmIdSet.has(edge.target) && mechIdSet.has(edge.source)) {
      dmToMechs.get(edge.target)!.push(edge.source)
      mechToDms.get(edge.source)!.push(edge.target)
    }
  }

  // Initial orderings (both sorted by name)
  const dmInitial = [...dmIdSet].sort((a, b) => {
    const nameA = data.nodes.find((n) => n.id === a)?.name || ''
    const nameB = data.nodes.find((n) => n.id === b)?.name || ''
    return nameA.localeCompare(nameB)
  })
  const mechInitial = [...mechIdSet].sort((a, b) => {
    const nameA = data.nodes.find((n) => n.id === a)?.name || ''
    const nameB = data.nodes.find((n) => n.id === b)?.name || ''
    return nameA.localeCompare(nameB)
  })

  // Barycenter reorder DMs ↔ mechanisms
  const { orderedA: dmOrder, orderedB: mechOrder } = barycenterReorder(
    dmInitial,
    mechInitial,
    dmToMechs,
    mechToDms,
  )

  const DM_COUNT = dmOrder.length
  const MECH_COUNT = mechOrder.length

  // Institution on the left — mirrors mechanism-expanded layout's INST_X
  positions.set(institutionId, { x: -200, y: 0 })

  // DMs in vertical stack at centre
  const DM_SPACING = DM_COUNT <= 4 ? 120 : Math.max(110, Math.ceil(480 / DM_COUNT))
  for (const { id, x, y } of verticalStack(dmOrder, 0, DM_SPACING)) {
    positions.set(id, { x, y })
  }

  // Mechanisms: parabolic arc on the right
  const VERT_SPACING = 95
  const BASE_DIST = 200
  const CURVE = Math.min(100, MECH_COUNT * 14)

  for (const { id, x, y } of parabolicArc(mechOrder, VERT_SPACING, BASE_DIST, CURVE)) {
    positions.set(id, { x, y })
  }

  return positions
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Unified entry point for computing expanded-view node positions.
 *
 * Dispatches to the view-specific layout based on `viewType`.
 * Each view uses a tripartite column layout but with different focus
 * placement, adjacency collection, ordering strategy, and spacing constants.
 */
export function computeExpandedPositions(
  viewType: ExpandedViewType,
  focusEntityId: string,
  data: GraphData,
): Map<string, Position> {
  switch (viewType) {
    case 'mechanism':
      return computeMechanism(data, focusEntityId)
    case 'dm':
      return computeDm(data, focusEntityId)
    case 'institution':
      return computeInstitution(data, focusEntityId)
  }
}
