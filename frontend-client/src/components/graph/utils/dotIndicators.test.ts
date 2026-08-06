import { describe, it, expect } from 'vitest'
import { computeDmDots } from './dotIndicators'
import { buildGroupColors } from './groupColors'
import type { GraphData } from '../../../types/models'

const data: GraphData = {
  nodes: [
    { id: 'm1', name: 'GPS', primary_type: 'Mechanism', secondary_type: 'Electronic Monitoring', description: '' },
    { id: 'm2', name: '58A', primary_type: 'Mechanism', secondary_type: 'Preventative Detention', description: '' },
    { id: 'm3', name: 'SCRAM', primary_type: 'Mechanism', secondary_type: 'Electronic Monitoring', description: '' },
    { id: 'd1', name: 'Judges', primary_type: 'Decision Maker', secondary_type: '', description: '' },
  ],
  edges: [
    { id: 'e1', source: 'm1', target: 'd1', relationship_type: '', description: '' },
    { id: 'e2', source: 'm2', target: 'd1', relationship_type: '', description: '' },
    { id: 'e3', source: 'm3', target: 'd1', relationship_type: '', description: '' },
  ],
  memberships: [],
}

describe('computeDmDots', () => {
  it('produces one dot per distinct mechanism group, colored by group', () => {
    const colors = buildGroupColors(['Electronic Monitoring', 'Preventative Detention'])
    const dots = computeDmDots('d1', data, colors)
    expect(dots).toHaveLength(2) // two groups, not three mechanisms
    expect(decodeURIComponent(dots[0])).toContain('#009E73') // Electronic Monitoring sorts first
    expect(decodeURIComponent(dots[1])).toContain('#4A3AA7')
  })
})
