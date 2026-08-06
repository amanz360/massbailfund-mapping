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
    ...(options?.position && { position: { ...options.position } }),
  }
}

/**
 * Build a role edge element rendered DM → Mechanism regardless of stored
 * direction, so the map reads as one outward flow: Institution → DM → Mechanism.
 */
export function roleEdgeElement(
  edge: GraphEdge,
  nodeById: Map<string, GraphNode>,
  classes?: string,
): ElementDefinition | null {
  const source = nodeById.get(edge.source)
  const target = nodeById.get(edge.target)
  if (!source || !target) return null
  const types = new Set([source.primary_type, target.primary_type])
  if (!(types.has('Mechanism') && types.has('Decision Maker'))) return null
  const [dmId, mechId] =
    source.primary_type === 'Decision Maker'
      ? [edge.source, edge.target]
      : [edge.target, edge.source]
  return {
    data: { id: edge.id, source: dmId, target: mechId, relationship_type: edge.relationship_type },
    ...(classes && { classes }),
  }
}
