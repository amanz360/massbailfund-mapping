import type { Core } from 'cytoscape'
import type cytoscape from 'cytoscape'
import type { GraphData } from '../../../types/models'
import { getBestInstitution } from '../utils'

export type MechCorridors = Map<
  string,
  {
    center: { x: number; y: number }
    direction: { dx: number; dy: number }
    nodes: cytoscape.NodeSingular[]
  }
>

const DM_OFFSET = 130 // px from institution center to first DM along corridor direction
const DM_SPREAD = 70 // perpendicular spacing between DMs — nudge pass separates overlaps
const EXTERNAL_WEIGHT = 0.3 // pull weight for external memberships (vs 1.0 for primary)

const MECH_SPREAD = 70 // perpendicular spacing between mechanisms — nudge pass separates overlaps
const PERIPHERAL_PUSH = 140 // px to push single-institution mechanisms past their institution

/**
 * Seed DM node positions deterministically from institutional memberships.
 * DMs start offset from their best institution toward their secondary institution
 * (or outward from center if they have only one primary).
 */
export function seedDmPositions(
  cy: Core,
  data: GraphData,
  instPositions: Map<string, { x: number; y: number }>,
  instMemberCount: Map<string, number>,
): void {
  // First pass: compute each DM's corridor direction and group by corridor key
  const dmCorridors = new Map<
    string,
    {
      direction: { dx: number; dy: number }
      bestPos: { x: number; y: number }
      nodes: cytoscape.NodeSingular[]
    }
  >()
  cy.nodes('[primary_type="Decision Maker"]').forEach((node) => {
    const bestInstId = getBestInstitution(node.id(), data.memberships, instMemberCount)
    if (!bestInstId) return
    const bestPos = instPositions.get(bestInstId)

    const primaryInsts =
      data?.memberships
        .filter((m) => m.member === node.id() && m.membership_type === 'Primary')
        .map((m) => m.institution) ?? []
    if (!bestPos) return

    const secondaryIds = primaryInsts.filter((id) => id !== bestInstId).sort()
    const externalIds = (
      data?.memberships
        .filter(
          (m) =>
            m.member === node.id() &&
            m.membership_type === 'External' &&
            m.institution !== bestInstId,
        )
        .map((m) => m.institution) ?? []
    )
      .filter((id) => !secondaryIds.includes(id))
      .sort()
    // Corridor key: best institution + sorted secondary + external institutions
    const corridorKey = `${bestInstId}|${secondaryIds.join(',')}|${externalIds.join(',')}`

    let dx: number, dy: number
    if (secondaryIds.length > 0 || externalIds.length > 0) {
      // Weighted average: primaries at 1.0, externals at EXTERNAL_WEIGHT
      let wx = 0,
        wy = 0,
        totalW = 0
      for (const id of secondaryIds) {
        const p = instPositions.get(id)
        if (p) {
          wx += p.x * 1.0
          wy += p.y * 1.0
          totalW += 1.0
        }
      }
      for (const id of externalIds) {
        const p = instPositions.get(id)
        if (p) {
          wx += p.x * EXTERNAL_WEIGHT
          wy += p.y * EXTERNAL_WEIGHT
          totalW += EXTERNAL_WEIGHT
        }
      }
      dx = wx / totalW - bestPos.x
      dy = wy / totalW - bestPos.y
    } else {
      // Point inward (toward graph center) so DMs fill the interior
      dx = -bestPos.x
      dy = -bestPos.y
    }

    if (!dmCorridors.has(corridorKey)) {
      dmCorridors.set(corridorKey, { direction: { dx, dy }, bestPos, nodes: [] })
    }
    dmCorridors.get(corridorKey)!.nodes.push(node)
  })

  // Second pass: place DMs, fanning out perpendicular to corridor direction
  for (const [, { direction, bestPos, nodes }] of dmCorridors) {
    const len = Math.sqrt(direction.dx * direction.dx + direction.dy * direction.dy) || 1
    const ndx = direction.dx / len
    const ndy = direction.dy / len
    // Perpendicular vector
    const pdx = -ndy
    const pdy = ndx

    nodes.forEach((node, i) => {
      // Center the fan: offset from -(n-1)/2 to +(n-1)/2
      const perpOffset = (i - (nodes.length - 1) / 2) * DM_SPREAD
      node.position({
        x: bestPos.x + ndx * DM_OFFSET + pdx * perpOffset,
        y: bestPos.y + ndy * DM_OFFSET + pdy * perpOffset,
      })
    })
  }
}

/**
 * Seed mechanism node positions: average connected DM positions, push away from
 * missing institutions, then fan out perpendicular to corridor direction.
 * Returns the mechCorridors map needed by buildPlacementConstraints.
 */
/**
 * Compute institution affinity for a mechanism: count how many of its
 * connected DMs have each institution as their "best" institution.
 * Returns a map of institution ID → DM count (the affinity weight).
 */
function computeMechInstAffinity(
  mechId: string,
  data: GraphData,
  instMemberCount: Map<string, number>,
): Map<string, number> {
  const affinity = new Map<string, number>()
  for (const edge of data.edges) {
    const dmId = edge.source === mechId ? edge.target : edge.target === mechId ? edge.source : null
    if (!dmId) continue
    const dmNode = data.nodes.find((n) => n.id === dmId)
    if (dmNode?.primary_type !== 'Decision Maker') continue
    const bestInstId = getBestInstitution(dmId, data.memberships, instMemberCount)
    if (bestInstId) {
      affinity.set(bestInstId, (affinity.get(bestInstId) ?? 0) + 1)
    }
  }
  return affinity
}

export function seedMechanismPositions(
  cy: Core,
  data: GraphData,
  instPositions: Map<string, { x: number; y: number }>,
  instMemberCount: Map<string, number>,
): MechCorridors {
  const mechCorridors: MechCorridors = new Map()

  cy.nodes('[primary_type="Mechanism"]').forEach((node) => {
    const connectedDMs = node
      .connectedEdges('.landing-edge')
      .connectedNodes('[primary_type="Decision Maker"]')
      .filter((n) => n.id() !== node.id())
    if (connectedDMs.length === 0) return

    // Compute institution affinity from the data model (not graph edges)
    const instAffinity = computeMechInstAffinity(node.id(), data, instMemberCount)
    const instIds = [...instAffinity.keys()].sort()

    // Weighted average of connected DM positions (weighted by institution affinity)
    let ax = 0,
      ay = 0,
      totalW = 0
    connectedDMs.forEach((dm) => {
      const dmBestInst = getBestInstitution(dm.id(), data.memberships, instMemberCount)
      const w = (dmBestInst ? instAffinity.get(dmBestInst) : null) ?? 1
      const p = dm.position()
      ax += p.x * w
      ay += p.y * w
      totalW += w
    })
    ax /= totalW || 1
    ay /= totalW || 1

    const corridorKey = instIds.join(',')
    if (!mechCorridors.has(corridorKey)) {
      mechCorridors.set(corridorKey, {
        center: { x: ax, y: ay },
        direction: { dx: ax, dy: ay },
        nodes: [],
      })
    }
    mechCorridors.get(corridorKey)!.nodes.push(node)

    // Store this node's computed base position for the spread pass
    node.scratch('_seedBase', { x: ax, y: ay })
  })

  // Apply perpendicular spread within each corridor.
  // Single-institution corridors get placed alongside their institution on the
  // circle's arc; multi-institution corridors use the weighted DM average.
  for (const [key, { direction, nodes }] of mechCorridors) {
    const instCount = key.split(',').length

    // Single-institution corridor: compute a shared arc position so all
    // mechanisms in this corridor cluster together beside their institution.
    if (instCount === 1) {
      const instPos = instPositions.get(key)
      if (instPos) {
        const instAngle = Math.atan2(instPos.y, instPos.x)
        const instRadius = Math.sqrt(instPos.x * instPos.x + instPos.y * instPos.y)
        // Use the group's average DM direction to pick which side of institution
        let avgDmX = 0, avgDmY = 0
        nodes.forEach((n) => { const b = n.scratch('_seedBase') as { x: number; y: number }; avgDmX += b.x; avgDmY += b.y })
        avgDmX /= nodes.length; avgDmY /= nodes.length
        const dmAngle = Math.atan2(avgDmY, avgDmX)
        const side = Math.sin(dmAngle - instAngle) >= 0 ? 1 : -1
        const offsetAngle = instAngle + side * 0.35 // ~20° arc offset
        const base = { x: Math.cos(offsetAngle) * instRadius, y: Math.sin(offsetAngle) * instRadius }

        // Spread along the arc tangent (perpendicular to radial direction)
        const tdx = -Math.sin(offsetAngle)
        const tdy = Math.cos(offsetAngle)
        nodes.forEach((node, i) => {
          const perpOffset = (i - (nodes.length - 1) / 2) * MECH_SPREAD
          node.position({ x: base.x + tdx * perpOffset, y: base.y + tdy * perpOffset })
          node.removeScratch('_seedBase')
        })
        continue
      }
    }

    // Multi-institution corridor: spread perpendicular to corridor direction
    const len = Math.sqrt(direction.dx * direction.dx + direction.dy * direction.dy) || 1
    const ndx = direction.dx / len
    const ndy = direction.dy / len
    const pdx = -ndy
    const pdy = ndx

    nodes.forEach((node, i) => {
      const base = node.scratch('_seedBase') as { x: number; y: number }
      const perpOffset = (i - (nodes.length - 1) / 2) * MECH_SPREAD
      node.position({
        x: base.x + pdx * perpOffset,
        y: base.y + pdy * perpOffset,
      })
      node.removeScratch('_seedBase')
    })
  }

  return mechCorridors
}
