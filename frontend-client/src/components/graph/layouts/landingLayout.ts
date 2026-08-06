import type { Core } from 'cytoscape'
import type cytoscape from 'cytoscape'
import type { GraphData } from '../../../types/models'
import { applyDotIndicators, groupLabelColor } from '../utils'
import { computeRingPositions } from './ringLayout'

/**
 * Apply data-driven decorations: mechanism fills + label colors by group,
 * and mechanism-group dot indicators on DMs.
 * Shared between landing and expanded views so nodes look consistent.
 */
export function applyNodeDecorations(
  cy: Core,
  data: GraphData,
  groupColors: Map<string, string>,
): void {
  cy.nodes('[primary_type="Mechanism"]').forEach((node) => {
    const color = groupColors.get(node.data('secondary_type'))
    if (color) {
      node.style({ 'background-color': color, color: groupLabelColor(color) })
    }
  })
  cy.nodes('[primary_type="Decision Maker"]').forEach((node) => {
    applyDotIndicators(node, data, groupColors)
  })
}

/**
 * Landing layout: institutions center grid, DMs middle ring, mechanisms
 * outer ring. Positions come from the pure ring module; this function
 * decorates nodes and runs the animated preset layout.
 */
export function applyLandingLayout(
  cy: Core,
  data: GraphData,
  groupColors: Map<string, string>,
): cytoscape.Layouts {
  applyNodeDecorations(cy, data, groupColors)

  const positions = computeRingPositions(data)
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
