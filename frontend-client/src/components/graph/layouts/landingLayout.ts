import type { Core } from 'cytoscape'
import type cytoscape from 'cytoscape'
import type { GraphData } from '../../../types/models'
import { applyDotIndicators, computeInstMemberCount, getBestInstitution } from '../utils'
import { DM_SPREAD, seedDmPositions, seedMechanismPositions } from './landingSeeding'

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
    const bestInst = getBestInstitution(node.id(), data.memberships, instMemberCount)
    if (bestInst) {
      const color = institutionColors.get(bestInst)
      if (color) {
        node.style({
          'border-width': 2.5,
          'border-color': color,
        })
      }
    }
  })

  // Apply institution colors and landing size class
  cy.nodes('[primary_type="Institution"]').forEach((node) => {
    const color = institutionColors.get(node.id()) || fallbackInstitutionColor
    node.addClass('landing-institution')
    node.style('background-color', color)
  })
}

/**
 * Pin institution nodes at evenly-spaced circle positions.
 */
export function pinInstitutions(
  cy: Core,
  radius: number,
): {
  instPositions: Map<string, { x: number; y: number }>
} {
  const institutions = cy.nodes('[primary_type="Institution"]')
  const instPositions = new Map<string, { x: number; y: number }>()
  institutions.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / institutions.length - Math.PI / 2
    const pos = {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    }
    node.position(pos)
    instPositions.set(node.id(), pos)
  })

  return { instPositions }
}

/**
 * Nudge overlapping node pairs apart. Institution nodes are pinned —
 * when one side of a pair is an institution, only the other node moves.
 */
function nudgeOverlaps(cy: Core, minDist: number = 160, maxPasses: number = 10): void {
  for (let pass = 0; pass < maxPasses; pass++) {
    let moved = false
    const nodes = cy.nodes()
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const dx = b.position('x') - a.position('x')
        const dy = b.position('y') - a.position('y')
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < minDist && dist > 0) {
          const push = minDist - dist
          const nx = dx / dist
          const ny = dy / dist
          const aIsInst = a.data('primary_type') === 'Institution'
          const bIsInst = b.data('primary_type') === 'Institution'
          if (aIsInst && bIsInst) continue // both pinned, skip
          if (aIsInst) {
            // Only move b away
            b.position({ x: b.position('x') + nx * push, y: b.position('y') + ny * push })
          } else if (bIsInst) {
            // Only move a away
            a.position({ x: a.position('x') - nx * push, y: a.position('y') - ny * push })
          } else {
            // Neither is an institution — split evenly
            const half = push / 2
            a.position({ x: a.position('x') - nx * half, y: a.position('y') - ny * half })
            b.position({ x: b.position('x') + nx * half, y: b.position('y') + ny * half })
          }
          moved = true
        }
      }
    }
    if (!moved) break
  }
}

/**
 * Compute institution circle radius from the data so the layout adapts
 * to the number of institutions and the size of DM clusters.
 *
 * The chord between adjacent points on a circle is 2r × sin(π/n).
 * We size the radius so that chord ≥ widest DM cluster + padding,
 * guaranteeing adjacent institutional territories don't overlap.
 */
function computeRadius(numInstitutions: number, maxDmsPerInst: number): number {
  if (numInstitutions <= 1) return 0 // single institution sits at origin
  const clusterWidth = Math.max(maxDmsPerInst - 1, 0) * DM_SPREAD
  const padding = 150 // breathing room between adjacent clusters
  const minChord = clusterWidth + padding
  const radius = minChord / (2 * Math.sin(Math.PI / numInstitutions))
  return Math.max(radius, 300) // floor for very small graphs
}

/**
 * Orchestrate the full landing layout pipeline:
 * decorations → pin institutions → seed DMs → seed mechanisms →
 * nudge overlaps → preset layout.
 *
 * Returns the layout instance so the caller can store it and stop it later.
 */
export function applyLandingLayout(
  cy: Core,
  data: GraphData,
  institutionColors: Map<string, string>,
  fallbackInstitutionColor: string,
): cytoscape.Layouts {
  // 1. Compute primary member counts per institution (used for DM border color)
  const instMemberCount = computeInstMemberCount(data.memberships)

  // 2. Apply DM decorations (dot indicators, border colors, institution styling)
  applyDmDecorations(cy, data, institutionColors, instMemberCount, fallbackInstitutionColor)

  // 3. Pin institutions at evenly-spaced circle positions
  //    Radius scales with institution count and largest DM cluster.
  //    Use best-institution counts (not raw primary memberships) since
  //    each DM only clusters at one institution in the seeded layout.
  const numInstitutions = cy.nodes('[primary_type="Institution"]').length
  const bestInstCounts = new Map<string, number>()
  for (const dm of data.nodes.filter((n) => n.primary_type === 'Decision Maker')) {
    const bestInst = getBestInstitution(dm.id, data.memberships, instMemberCount)
    if (bestInst) bestInstCounts.set(bestInst, (bestInstCounts.get(bestInst) ?? 0) + 1)
  }
  const maxDmsPerInst = Math.max(...bestInstCounts.values(), 0)
  const radius = computeRadius(numInstitutions, maxDmsPerInst)
  const { instPositions } = pinInstitutions(cy, radius)

  // 4. Seed DM positions along corridors
  seedDmPositions(cy, data, instPositions, instMemberCount)

  // 5. Seed mechanism positions along corridors
  seedMechanismPositions(cy, data, instPositions, instMemberCount)

  // 6. Nudge any overlapping nodes apart
  nudgeOverlaps(cy)

  // 7. Capture final positions, then run preset layout to animate from origin
  const positions = new Map<string, { x: number; y: number }>()
  cy.nodes().forEach((node) => {
    positions.set(node.id(), { ...node.position() })
  })

  const layout = cy.layout({
    name: 'preset',
    positions: (node: cytoscape.NodeSingular) => positions.get(node.id()) || { x: 0, y: 0 },
    animate: true,
    animationDuration: 800,
  } as cytoscape.LayoutOptions)
  layout.run()
  layout.one('layoutstop', () => {
    cy.fit(undefined, 15)
  })

  return layout
}
