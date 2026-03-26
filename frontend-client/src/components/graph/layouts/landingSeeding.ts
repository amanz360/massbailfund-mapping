import type { Core } from 'cytoscape'
import type cytoscape from 'cytoscape'
import type { GraphData } from '../../../types/models'
import { getBestInstitution } from '../utils'

const DM_OFFSET = 130 // px from institution center to first DM along corridor direction
export const DM_SPREAD = 70 // perpendicular spacing between DMs — nudge pass separates overlaps
const EXTERNAL_WEIGHT = 0.3 // pull weight for external memberships (vs 1.0 for primary)

const MECH_SPREAD = 70 // tangent spacing between single-institution mechanisms on the arc

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
 * Seed mechanism positions from connected DM positions.
 *
 * Multi-institution mechanisms sit at the average of their connected
 * DM positions — the DMs are already biased toward their best
 * institution, so the average naturally reflects institutional pull.
 *
 * Single-institution mechanisms are placed alongside their institution
 * on the circle arc, slightly inside the institution radius so
 * institutions define the graph boundary.
 */
export function seedMechanismPositions(
  cy: Core,
  data: GraphData,
  instPositions: Map<string, { x: number; y: number }>,
  instMemberCount: Map<string, number>,
): void {
  // Collect single-institution mechanisms by institution for arc placement
  const singleInstGroups = new Map<
    string,
    { nodes: cytoscape.NodeSingular[]; dmSumX: number; dmSumY: number }
  >()

  cy.nodes('[primary_type="Mechanism"]').forEach((node) => {
    const connectedDMs = node
      .connectedEdges('.landing-edge')
      .connectedNodes('[primary_type="Decision Maker"]')
      .filter((n) => n.id() !== node.id())
    if (connectedDMs.length === 0) return

    // Find distinct institutions this mechanism connects to via its DMs
    const instIds = new Set<string>()
    let ax = 0,
      ay = 0
    connectedDMs.forEach((dm) => {
      const bestInstId = getBestInstitution(dm.id(), data.memberships, instMemberCount)
      if (bestInstId) instIds.add(bestInstId)
      const p = dm.position()
      ax += p.x
      ay += p.y
    })
    ax /= connectedDMs.length
    ay /= connectedDMs.length

    if (instIds.size === 1) {
      // Single-institution: collect for arc placement below
      const instId = [...instIds][0]
      if (!singleInstGroups.has(instId)) {
        singleInstGroups.set(instId, { nodes: [], dmSumX: 0, dmSumY: 0 })
      }
      const group = singleInstGroups.get(instId)!
      group.nodes.push(node)
      group.dmSumX += ax
      group.dmSumY += ay
    } else {
      // Multi-institution: place at DM average directly
      node.position({ x: ax, y: ay })
    }
  })

  // Place single-institution mechanisms alongside their institution on the
  // circle arc, slightly inside the radius so institutions define the boundary.
  for (const [instId, group] of singleInstGroups) {
    const instPos = instPositions.get(instId)
    if (!instPos) continue

    const instAngle = Math.atan2(instPos.y, instPos.x)
    const instRadius = Math.sqrt(instPos.x * instPos.x + instPos.y * instPos.y)

    // Use the group's average DM direction to pick which side of institution
    const avgDmX = group.dmSumX / group.nodes.length
    const avgDmY = group.dmSumY / group.nodes.length
    const dmAngle = Math.atan2(avgDmY, avgDmX)
    const side = Math.sin(dmAngle - instAngle) >= 0 ? 1 : -1
    const offsetAngle = instAngle + side * 0.45 // ~26° arc offset
    const arcRadius = instRadius * 0.85
    const base = {
      x: Math.cos(offsetAngle) * arcRadius,
      y: Math.sin(offsetAngle) * arcRadius,
    }

    // Spread along the arc tangent (perpendicular to radial direction)
    const tdx = -Math.sin(offsetAngle)
    const tdy = Math.cos(offsetAngle)
    group.nodes.forEach((node, i) => {
      const perpOffset = (i - (group.nodes.length - 1) / 2) * MECH_SPREAD
      node.position({
        x: base.x + tdx * perpOffset,
        y: base.y + tdy * perpOffset,
      })
    })
  }
}
