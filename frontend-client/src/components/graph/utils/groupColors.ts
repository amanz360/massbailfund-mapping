import type { GraphData } from '../../../types/models'

// Mechanism-group color system. Colors are keyed by subcategory NAME so admin
// renames or merges never silently reshuffle the other groups' colors.
// Palette validated for CVD + normal-vision separation on the #F2EDF4 surface.
export const PINNED_GROUP_COLORS: Record<string, string> = {
  'Court Enforcement/Compliance': '#D55E00',
  'Electronic Monitoring': '#009E73',
  'Pretrial Condition of Release': '#EDA100',
  'Preventative Detention': '#4A3AA7',
  'Service Provider': '#CC79A7',
}

export const GROUP_PALETTE = ['#4A3AA7', '#D55E00', '#009E73', '#EDA100', '#CC79A7']
export const GROUP_FALLBACK_COLOR = '#4A5568'

const WHITE_LABEL_FILLS = new Set(['#4A3AA7', '#4A5568'])

/** Label color readable on the given group fill. */
export function groupLabelColor(fill: string): string {
  return WHITE_LABEL_FILLS.has(fill) ? '#FFFFFF' : '#000F35'
}

/**
 * Map each subcategory to a color. Known names use pinned colors; unknown
 * names take unused palette slots alphabetically, then the gray fallback.
 */
export function buildGroupColors(subcategories: string[]): Map<string, string> {
  const result = new Map<string, string>()
  const unique = [...new Set(subcategories.filter((s) => s))].sort((a, b) => a.localeCompare(b))
  const used = new Set<string>()
  for (const name of unique) {
    // Own-property guard: `name` is admin-authored data, so a subcategory
    // called e.g. "constructor" must not resolve to an inherited Object member.
    // (hasOwnProperty rather than Object.hasOwn — the app targets ES2020.)
    const pinned = Object.prototype.hasOwnProperty.call(PINNED_GROUP_COLORS, name)
      ? PINNED_GROUP_COLORS[name]
      : undefined
    if (pinned) {
      result.set(name, pinned)
      used.add(pinned)
    }
  }
  const free = GROUP_PALETTE.filter((c) => !used.has(c))
  for (const name of unique) {
    if (!result.has(name)) result.set(name, free.shift() ?? GROUP_FALLBACK_COLOR)
  }
  return result
}

/** Distinct sorted mechanism groups a DM participates in (via role edges). */
export function dmGroups(dmId: string, data: GraphData): string[] {
  const nodeById = new Map(data.nodes.map((n) => [n.id, n]))
  const groups = new Set<string>()
  for (const e of data.edges) {
    const otherId = e.source === dmId ? e.target : e.target === dmId ? e.source : null
    if (!otherId) continue
    const other = nodeById.get(otherId)
    if (other?.primary_type === 'Mechanism' && other.secondary_type) {
      groups.add(other.secondary_type)
    }
  }
  return [...groups].sort((a, b) => a.localeCompare(b))
}
