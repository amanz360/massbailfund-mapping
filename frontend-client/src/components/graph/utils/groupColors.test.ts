import { describe, it, expect } from 'vitest'
import { buildGroupColors, groupLabelColor, dmGroups, GROUP_FALLBACK_COLOR } from './groupColors'
import type { GraphData } from '../../../types/models'

describe('buildGroupColors', () => {
  it('pins known subcategory names to their fixed colors', () => {
    const colors = buildGroupColors(['Electronic Monitoring', 'Preventative Detention'])
    expect(colors.get('Electronic Monitoring')).toBe('#009E73')
    expect(colors.get('Preventative Detention')).toBe('#4A3AA7')
  })

  it('assigns unused palette slots to unknown names, then falls back to gray', () => {
    const colors = buildGroupColors([
      'Court Enforcement/Compliance', 'Electronic Monitoring',
      'Pretrial Condition of Release', 'Preventative Detention',
      'Service Provider', 'Brand New Group', 'Another New Group',
    ])
    // all five palette hexes are pinned, so unknowns get the fallback
    expect(colors.get('Brand New Group')).toBe(GROUP_FALLBACK_COLOR)
    expect(colors.get('Another New Group')).toBe(GROUP_FALLBACK_COLOR)
  })

  it('gives a renamed (unknown) group an unused slot when one is free', () => {
    const colors = buildGroupColors(['Electronic Monitoring', 'Detention & Revocation'])
    expect(colors.get('Electronic Monitoring')).toBe('#009E73')
    const c = colors.get('Detention & Revocation')!
    expect(c).not.toBe('#009E73')
    expect(c).not.toBe(GROUP_FALLBACK_COLOR)
  })

  it('ignores empty subcategories', () => {
    expect(buildGroupColors(['', 'Service Provider']).size).toBe(1)
  })

  it('does not resolve inherited Object members as pinned colors', () => {
    const colors = buildGroupColors(['constructor', 'toString', '__proto__'])
    for (const name of ['constructor', 'toString', '__proto__']) {
      expect(typeof colors.get(name)).toBe('string')
      expect(colors.get(name)).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })
})

describe('groupLabelColor', () => {
  it('uses white on dark fills and navy on light fills', () => {
    expect(groupLabelColor('#4A3AA7')).toBe('#FFFFFF')
    expect(groupLabelColor('#EDA100')).toBe('#000F35')
    expect(groupLabelColor('#CC79A7')).toBe('#000F35')
  })
})

const data: GraphData = {
  nodes: [
    { id: 'm1', name: 'GPS', primary_type: 'Mechanism', secondary_type: 'Electronic Monitoring', description: '' },
    { id: 'm2', name: '58A', primary_type: 'Mechanism', secondary_type: 'Preventative Detention', description: '' },
    { id: 'd1', name: 'Judges', primary_type: 'Decision Maker', secondary_type: 'Judicial', description: '' },
  ],
  edges: [
    { id: 'e1', source: 'm1', target: 'd1', relationship_type: 'Orders', description: '' },
    { id: 'e2', source: 'm2', target: 'd1', relationship_type: 'Presides', description: '' },
  ],
  memberships: [],
}

describe('dmGroups', () => {
  it('returns sorted distinct subcategories of connected mechanisms', () => {
    expect(dmGroups('d1', data)).toEqual(['Electronic Monitoring', 'Preventative Detention'])
  })
  it('returns empty for a DM with no mechanism edges', () => {
    expect(dmGroups('unknown', data)).toEqual([])
  })
})
