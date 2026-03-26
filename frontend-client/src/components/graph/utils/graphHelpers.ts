import type { GraphData } from '../../../types/models'

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
