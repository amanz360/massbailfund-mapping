import type { Core } from 'cytoscape'
import type cytoscape from 'cytoscape'
import type { GraphData } from '../../../types/models'

export type MechCorridors = Map<
  string,
  {
    center: { x: number; y: number }
    direction: { dx: number; dy: number }
    nodes: cytoscape.NodeSingular[]
  }
>

const DM_OFFSET = 80
const DM_SPREAD = 30 // perpendicular spacing between DMs in the same corridor
const EXTERNAL_WEIGHT = 0.3

const CORRIDOR_PUSH = 120 // pixels to push mechanisms away from missing institutions
const MECH_SPREAD = 40 // perpendicular spacing between mechanisms in the same corridor

/**
 * Seed DM node positions so fcose converges to the same layout every time.
 * DMs start offset from their best institution toward their secondary institution
 * (or outward from center if they have only one primary).
 */
export function seedDmPositions(
  cy: Core,
  data: GraphData,
  _institutionColors: Map<string, string>,
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
    const primaryInsts =
      data?.memberships
        .filter((m) => m.member === node.id() && m.membership_type === 'Primary')
        .map((m) => m.institution) ?? []
    if (primaryInsts.length === 0) return

    const bestInstId = primaryInsts.reduce((best, id) =>
      (instMemberCount.get(id) ?? Infinity) < (instMemberCount.get(best) ?? Infinity) ? id : best,
    )
    const bestPos = instPositions.get(bestInstId)
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
      dx = bestPos.x
      dy = bestPos.y
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

    let ax = 0,
      ay = 0
    connectedDMs.forEach((dm) => {
      const p = dm.position()
      ax += p.x
      ay += p.y
    })
    ax /= connectedDMs.length
    ay /= connectedDMs.length

    // Push away from missing institutions — corridor mechanisms separate
    // by moving away from institutions they DON'T connect to
    const gravityEdges = node.connectedEdges('.gravity-edge')
    const instIds = gravityEdges
      .map((e) => (e.source().id() === node.id() ? e.target().id() : e.source().id()))
      .sort()
    const connectedInstSet = new Set(instIds)
    const allInstNodeIds = Array.from(instPositions.keys())
    const missingInsts = allInstNodeIds.filter((id) => !connectedInstSet.has(id))
    const numInst = instIds.length
    if (missingInsts.length > 0 && missingInsts.length < allInstNodeIds.length) {
      let mx = 0,
        my = 0
      missingInsts.forEach((id) => {
        const p = instPositions.get(id)!
        mx += p.x
        my += p.y
      })
      mx /= missingInsts.length
      my /= missingInsts.length
      const pushDx = ax - mx,
        pushDy = ay - my
      const pushMag = Math.sqrt(pushDx * pushDx + pushDy * pushDy) || 1
      ax += (pushDx / pushMag) * CORRIDOR_PUSH
      ay += (pushDy / pushMag) * CORRIDOR_PUSH
    }
    // Mark corridor mechanisms (dual-institution) for longer edge lengths
    node.data('_numInst', numInst)
    const corridorKey = instIds.join(',')

    if (!mechCorridors.has(corridorKey)) {
      // Direction from center toward the average position
      mechCorridors.set(corridorKey, {
        center: { x: ax, y: ay },
        direction: { dx: ax, dy: ay },
        nodes: [],
      })
    }
    mechCorridors.get(corridorKey)!.nodes.push(node)
  })

  for (const [, { direction, nodes }] of mechCorridors) {
    const len = Math.sqrt(direction.dx * direction.dx + direction.dy * direction.dy) || 1
    const ndx = direction.dx / len
    const ndy = direction.dy / len
    const pdx = -ndy
    const pdy = ndx

    // Compute each mechanism's base position individually (they may differ)
    // then apply perpendicular spread
    nodes.forEach((node, i) => {
      const connectedDMs = node
        .connectedEdges('.landing-edge')
        .connectedNodes('[primary_type="Decision Maker"]')
        .filter((n) => n.id() !== node.id())
      // Build gravity weight lookup: institution → weight for this mechanism
      const gravityEdges = node.connectedEdges('.gravity-edge')
      const instWeights = new Map<string, number>()
      gravityEdges.forEach((e) => {
        const instId = e.source().id() === node.id() ? e.target().id() : e.source().id()
        instWeights.set(instId, e.data('_gravityWeight') ?? 1)
      })
      // Weight each DM's position by the gravity weight to their best institution
      let ax = 0,
        ay = 0,
        totalW = 0
      connectedDMs.forEach((dm) => {
        // Find this DM's best institution
        const dmPrimaryInsts =
          data?.memberships
            .filter((m) => m.member === dm.id() && m.membership_type === 'Primary')
            .map((m) => m.institution) ?? []
        const dmBestInst =
          dmPrimaryInsts.length > 0
            ? dmPrimaryInsts.reduce((best, id) =>
                (instMemberCount.get(id) ?? Infinity) < (instMemberCount.get(best) ?? Infinity)
                  ? id
                  : best,
              )
            : null
        const w = (dmBestInst ? instWeights.get(dmBestInst) : null) ?? 1
        const p = dm.position()
        ax += p.x * w
        ay += p.y * w
        totalW += w
      })
      ax /= totalW || 1
      ay /= totalW || 1

      // Push away from missing institutions — corridor separation
      const connectedInstSet = new Set<string>()
      instWeights.forEach((_w, instId) => connectedInstSet.add(instId))
      const allInstNodeIds = Array.from(instPositions.keys())
      const missingInsts = allInstNodeIds.filter((id) => !connectedInstSet.has(id))
      if (missingInsts.length > 0 && missingInsts.length < allInstNodeIds.length) {
        let mx = 0,
          my = 0
        missingInsts.forEach((id) => {
          const p = instPositions.get(id)!
          mx += p.x
          my += p.y
        })
        mx /= missingInsts.length
        my /= missingInsts.length
        const pushDx = ax - mx,
          pushDy = ay - my
        const pushMag = Math.sqrt(pushDx * pushDx + pushDy * pushDy) || 1
        ax += (pushDx / pushMag) * CORRIDOR_PUSH
        ay += (pushDy / pushMag) * CORRIDOR_PUSH
      }

      const perpOffset = (i - (nodes.length - 1) / 2) * MECH_SPREAD
      node.position({
        x: ax + pdx * perpOffset,
        y: ay + pdy * perpOffset,
      })
    })
  }

  return mechCorridors
}
