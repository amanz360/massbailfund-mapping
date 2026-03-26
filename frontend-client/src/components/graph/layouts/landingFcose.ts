import type { Core } from 'cytoscape'
import type cytoscape from 'cytoscape'
import type { GraphData } from '../../../types/models'
import { applyDotIndicators } from '../utils/dotIndicators'
import { seedDmPositions, seedMechanismPositions } from './landingSeeding'
import type { MechCorridors } from './landingSeeding'

/**
 * Apply dot indicators to DM nodes, color DM borders by primary institution
 * (using instMemberCount to pick best institution), apply institution colors
 * and enlarge institution nodes.
 */
export function applyDmDecorations(
  cy: Core,
  data: GraphData,
  institutionColors: Map<string, string>,
  instMemberCount: Map<string, number>,
  fallbackInstitutionColor: string,
): void {
  // Apply institution dot indicators to DM nodes
  cy.nodes('[primary_type="Decision Maker"]').forEach((node) => {
    applyDotIndicators(node, data, institutionColors)

    // Color DM border by primary institution with fewest members
    // (same heuristic as edge elasticity — smaller institution = stronger affinity)
    const primaryInsts = data.memberships
      .filter((m) => m.member === node.id() && m.membership_type === 'Primary')
      .map((m) => m.institution)
    if (primaryInsts.length > 0) {
      const bestInst = primaryInsts.reduce((best, id) =>
        (instMemberCount.get(id) ?? Infinity) < (instMemberCount.get(best) ?? Infinity)
          ? id
          : best,
      )
      const color = institutionColors.get(bestInst)
      if (color) {
        node.style({
          'border-width': 2.5,
          'border-color': color,
        })
      }
    }
  })

  // Apply institution colors and enlarge institution nodes in landing view
  cy.nodes('[primary_type="Institution"]').forEach((node) => {
    const color = institutionColors.get(node.id()) || fallbackInstitutionColor
    node.style({
      'background-color': color,
      width: '120px',
      height: '120px',
      'font-size': '13px',
      'text-max-width': '90px',
    })
  })
}

/**
 * Pin institution nodes at evenly-spaced circle positions.
 * Returns the fixed-node constraints and derived instPositions map.
 */
export function pinInstitutions(
  cy: Core,
  institutionColors: Map<string, string>,
  radius: number,
): {
  fixedNodeConstraint: { nodeId: string; position: { x: number; y: number } }[]
  instPositions: Map<string, { x: number; y: number }>
} {
  const institutions = cy.nodes('[primary_type="Institution"]')
  const fixedNodeConstraint: { nodeId: string; position: { x: number; y: number } }[] = []
  institutions.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / institutions.length - Math.PI / 2
    fixedNodeConstraint.push({
      nodeId: node.id(),
      position: {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      },
    })
  })

  const instPositions = new Map(fixedNodeConstraint.map((c) => [c.nodeId, c.position]))
  return { fixedNodeConstraint, instPositions }
}

/**
 * Build relative placement constraints from corridor data.
 * Constrain all non-center corridors to maintain left/right ordering.
 * Tri-institution (center) mechanisms are excluded — they float freely.
 * Also finds tri-institution mechanism IDs for per-node repulsion.
 */
export function buildPlacementConstraints(
  cy: Core,
  mechCorridors: MechCorridors,
): {
  constraints: { left: string; right: string; gap?: number }[]
  triInstMechIds: Set<string>
} {
  const relativePlacementConstraint: { left: string; right: string; gap?: number }[] = []
  const constrainedCorridors: { avgX: number; nodes: cytoscape.NodeSingular[] }[] = []
  for (const [key, { nodes }] of mechCorridors) {
    if (key.split(',').length === 3) continue // skip tri-institution — let center float
    const avgX = nodes.reduce((s, n) => s + n.position('x'), 0) / nodes.length
    constrainedCorridors.push({ avgX, nodes })
  }
  constrainedCorridors.sort((a, b) => a.avgX - b.avgX)
  for (let i = 0; i < constrainedCorridors.length; i++) {
    for (let j = i + 1; j < constrainedCorridors.length; j++) {
      if (constrainedCorridors[j].avgX - constrainedCorridors[i].avgX < 30) continue
      for (const leftNode of constrainedCorridors[i].nodes) {
        for (const rightNode of constrainedCorridors[j].nodes) {
          relativePlacementConstraint.push({
            left: leftNode.id(),
            right: rightNode.id(),
          })
        }
      }
    }
  }

  // Track tri-institution mechanism IDs for per-node repulsion
  const triInstMechIds = new Set<string>()
  for (const [key, { nodes }] of mechCorridors) {
    if (key.split(',').length === 3) {
      nodes.forEach((n) => triInstMechIds.add(n.id()))
    }
  }

  return { constraints: relativePlacementConstraint, triInstMechIds }
}

/**
 * Build the fcose layout options object.
 * Receives instMemberCount and derives maxMembers internally.
 * Includes per-node nodeRepulsion, per-edge idealEdgeLength and edgeElasticity
 * callbacks, gravity settings, iteration count, and constraints.
 */
export function buildFcoseOptions(
  cy: Core,
  data: GraphData,
  fixedNodeConstraint: { nodeId: string; position: { x: number; y: number } }[],
  relativePlacementConstraint: { left: string; right: string; gap?: number }[],
  instMemberCount: Map<string, number>,
  triInstMechIds: Set<string>,
): cytoscape.LayoutOptions {
  const maxMembers = Math.max(...instMemberCount.values(), 1)

  return {
    name: 'fcose',
    randomize: false,
    animate: true,
    animationDuration: 800,
    quality: 'proof',
    nodeRepulsion: (node: cytoscape.NodeSingular) =>
      triInstMechIds.has(node.id()) ? 60000 : 25000,
    // Short membership edges pull DMs close to institutions;
    // long mechanism edges push mechanisms to the outer ring
    idealEdgeLength: (edge: cytoscape.EdgeSingular) => {
      if (edge.hasClass('gravity-edge')) {
        // Higher affinity → shorter ideal distance to institution
        const weight = edge.data('_gravityWeight') ?? 1
        return Math.max(60, 180 - 40 * weight)
      }
      if (edge.hasClass('membership-edge')) return 50
      if (edge.hasClass('hidden-membership-edge')) return 160 // secondary membership length
      // Corridor mechanisms get longer edges — more slack to sit in their corridor
      const mechNode = edge.connectedNodes('[primary_type="Mechanism"]')[0]
      if (mechNode && mechNode.data('_numInst') === 2) return 240
      return 180 // mechanism↔DM edges
    },
    edgeElasticity: (edge: cytoscape.EdgeSingular) => {
      if (edge.hasClass('gravity-edge')) {
        // Stronger pull for higher affinity (more DMs in that institution)
        const weight = edge.data('_gravityWeight') ?? 1
        return 0.2 + 0.3 * weight
      }
      if (edge.hasClass('hidden-membership-edge')) return 0.2 // secondary membership pull
      if (edge.hasClass('membership-edge')) {
        // Find which endpoint is the institution
        const srcType = edge.source().data('primary_type')
        const instId = srcType === 'Institution' ? edge.source().id() : edge.target().id()
        const count = instMemberCount.get(instId) ?? 1
        // Smaller institution → higher elasticity (stronger pull)
        return 0.2 + 0.3 * (1 - count / maxMembers)
      }
      // Corridor mechanisms: weaker spring — more freedom to sit in corridor
      const mechN = edge.connectedNodes('[primary_type="Mechanism"]')[0]
      if (mechN && mechN.data('_numInst') === 2) return 0.3
      return 0.5 // mechanism edge pull
    },
    gravity: 0.15,
    gravityRange: 3.8,
    initialEnergyOnIncremental: 0.08,
    numIter: 5000,
    nodeDimensionsIncludeLabels: true,
    padding: 50,
    fixedNodeConstraint,
    relativePlacementConstraint,
  } as cytoscape.LayoutOptions
}

/**
 * Orchestrate the full landing layout pipeline:
 * decorations → pin institutions → seed DMs → seed mechanisms →
 * build constraints → configure fcose → run layout.
 *
 * Returns the layout instance so the caller can store it and stop it later.
 */
export function applyLandingLayout(
  cy: Core,
  data: GraphData,
  institutionColors: Map<string, string>,
  fallbackInstitutionColor: string,
): cytoscape.Layouts {
  // 1. Compute primary member counts per institution (used for DM border + edge elasticity)
  const instMemberCount = new Map<string, number>()
  for (const m of data.memberships) {
    if (m.membership_type === 'Primary') {
      instMemberCount.set(m.institution, (instMemberCount.get(m.institution) ?? 0) + 1)
    }
  }

  // 2. Apply DM decorations (dot indicators, border colors, institution styling)
  applyDmDecorations(cy, data, institutionColors, instMemberCount, fallbackInstitutionColor)

  // 3. Pin institutions at evenly-spaced circle positions
  const { fixedNodeConstraint, instPositions } = pinInstitutions(cy, institutionColors, 420)

  // 4. Seed DM positions along corridors
  seedDmPositions(cy, data, institutionColors, instPositions, instMemberCount)

  // 5. Seed mechanism positions along corridors
  const mechCorridors = seedMechanismPositions(cy, data, instPositions, instMemberCount)

  // 6. Build placement constraints from corridor data
  const { constraints, triInstMechIds } = buildPlacementConstraints(cy, mechCorridors)

  // 7. Build fcose layout options
  const options = buildFcoseOptions(
    cy,
    data,
    fixedNodeConstraint,
    constraints,
    instMemberCount,
    triInstMechIds,
  )

  // 8. Run layout and fit on completion
  const layout = cy.layout(options)
  layout.run()
  layout.one('layoutstop', () => {
    cy.fit(undefined, 15)
  })

  return layout
}
