import type { DecisionMakerDetail, GraphNode, MechanismReference, MechanismTimelineEntryItem } from '../types/models'

// ── Institution colors ────────────────────────────────────────────────

export const INSTITUTION_PALETTE = [
  '#4A5568', // slate
  '#0D9488', // teal
  '#D97706', // amber
  '#7C3AED', // violet
  '#DC2626', // red
  '#2563EB', // blue
  '#059669', // emerald
  '#C2410C', // orange
]

/** Deterministic institution → color mapping based on alphabetical name order. */
export function buildInstitutionColors(items: { id: string; name: string }[]): Map<string, string> {
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name))
  const colors = new Map<string, string>()
  for (let i = 0; i < sorted.length; i++) {
    colors.set(sorted[i].id, INSTITUTION_PALETTE[i % INSTITUTION_PALETTE.length])
  }
  return colors
}

/** Overload for GraphNode[] — filters to institutions first. */
export function buildInstitutionColorsFromGraph(nodes: GraphNode[]): Map<string, string> {
  return buildInstitutionColors(
    nodes.filter((n) => n.primary_type === 'Institution'),
  )
}

// ── Auto-description for Decision Makers ──────────────────────────────

/** Generate a synthetic description for DMs that lack a real one. */
export function generateDmAutoDescription(entity: DecisionMakerDetail): string | null {
  if (entity.description) return null
  const mechNames = entity.mechanism_roles.map((r) => r.mechanism.name)
  const unique = [...new Set(mechNames)]
  if (unique.length === 0) return null
  const preview = unique.slice(0, 3).join(', ')
  const suffix = unique.length > 3 ? `, and ${unique.length - 3} more` : ''
  const label = entity.authority_type || 'decision maker'
  const article = /^[aeiou]/i.test(label) ? 'an' : 'a'
  return `${entity.name} is ${article} ${label} connected to ${unique.length} mechanism${unique.length !== 1 ? 's' : ''} including ${preview}${suffix}.`
}

// ── Timeline sorting ──────────────────────────────────────────────────

/** Sort timeline entries by date ascending, nulls last. */
export function sortTimelineEntries(entries: MechanismTimelineEntryItem[]): MechanismTimelineEntryItem[] {
  return [...entries].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date.localeCompare(b.date)
  })
}

// ── Reference grouping ────────────────────────────────────────────────

/** Group references by category, sorted alphabetically. */
export function groupReferencesByCategory(refs: MechanismReference[]): [string, MechanismReference[]][] {
  const grouped = new Map<string, MechanismReference[]>()
  for (const ref of refs) {
    const existing = grouped.get(ref.category)
    if (existing) existing.push(ref)
    else grouped.set(ref.category, [ref])
  }
  return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b))
}

// ── URL display ───────────────────────────────────────────────────────

/** Extract a display-friendly hostname from a URL, with fallback. */
export function displayHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
