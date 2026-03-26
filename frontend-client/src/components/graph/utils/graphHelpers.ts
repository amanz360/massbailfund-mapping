import type { ElementDefinition } from 'cytoscape'
import type { GraphData, GraphNode, GraphEdge } from '../../../types/models'

/**
 * Find all nodes of a given type connected to an entity via edges.
 * Checks both edge directions (source and target).
 * Returns the connected node IDs and the relevant edges.
 */
export function getConnectedByType(
  entityId: string,
  data: GraphData,
  targetType: string,
): { nodeIds: Set<string>; edges: GraphEdge[] } {
  const nodeIds = new Set<string>()
  const edges: GraphEdge[] = []
  for (const edge of data.edges) {
    if (edge.source === entityId) {
      const target = data.nodes.find((n) => n.id === edge.target)
      if (target?.primary_type === targetType) {
        nodeIds.add(edge.target)
        edges.push(edge)
      }
    }
    if (edge.target === entityId) {
      const source = data.nodes.find((n) => n.id === edge.source)
      if (source?.primary_type === targetType) {
        nodeIds.add(edge.source)
        edges.push(edge)
      }
    }
  }
  return { nodeIds, edges }
}

/**
 * Create a Cytoscape node element from a GraphNode.
 * Centralizes the data fields so adding a new field only requires one change.
 */
export function nodeElement(
  node: GraphNode,
  options?: { classes?: string; position?: { x: number; y: number } },
): ElementDefinition {
  return {
    data: {
      id: node.id,
      name: node.name,
      primary_type: node.primary_type,
      secondary_type: node.secondary_type,
    },
    ...(options?.classes && { classes: options.classes }),
    ...(options?.position && { position: options.position }),
  }
}

/**
 * Count primary members per institution.
 * Returns a map of institution ID -> number of DMs with primary membership.
 */
export function computeInstMemberCount(
  memberships: GraphData['memberships'],
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const m of memberships) {
    if (m.membership_type === 'Primary') {
      counts.set(m.institution, (counts.get(m.institution) ?? 0) + 1)
    }
  }
  return counts
}

/**
 * Find the "best" institution for a DM -- the one with fewest primary members.
 * Smaller institutions get stronger affinity, producing tighter clustering.
 * Returns the institution ID, or null if the DM has no primary memberships.
 */
export function getBestInstitution(
  dmId: string,
  memberships: GraphData['memberships'],
  instMemberCount: Map<string, number>,
): string | null {
  const primaryInsts = memberships
    .filter((m) => m.member === dmId && m.membership_type === 'Primary')
    .map((m) => m.institution)
  if (primaryInsts.length === 0) return null
  return primaryInsts.reduce((best, id) =>
    (instMemberCount.get(id) ?? Infinity) < (instMemberCount.get(best) ?? Infinity) ? id : best,
  )
}
