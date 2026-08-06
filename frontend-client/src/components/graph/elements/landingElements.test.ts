import { describe, it, expect } from 'vitest'
import { buildLandingElements } from './landingElements'
import type { GraphData } from '../../../types/models'

const data: GraphData = {
  nodes: [
    { id: 'i1', name: 'District Courts', primary_type: 'Institution', secondary_type: '', description: '' },
    { id: 'i2', name: 'Superior Court', primary_type: 'Institution', secondary_type: '', description: '' },
    { id: 'd1', name: 'Judges', primary_type: 'Decision Maker', secondary_type: '', description: '' },
    { id: 'm1', name: 'GPS', primary_type: 'Mechanism', secondary_type: 'Electronic Monitoring', description: '' },
  ],
  edges: [
    // API emits Mechanism → DM
    { id: 'e1', source: 'm1', target: 'd1', relationship_type: 'Orders', description: '' },
  ],
  memberships: [
    { id: 'mem1', institution: 'i1', member: 'd1' },
    { id: 'mem2', institution: 'i2', member: 'd1' },
  ],
}

describe('buildLandingElements', () => {
  it('emits one membership edge per membership — no best-institution filtering', () => {
    const edges = buildLandingElements(data).filter((el) => el.classes === 'membership-edge')
    expect(edges).toHaveLength(2) // both institutions connect (the Superior/District fix)
  })

  it('membership edges flow Institution → DM', () => {
    const edge = buildLandingElements(data).find((el) => el.data.id === 'landing-membership-mem1')!
    expect(edge.data.source).toBe('i1')
    expect(edge.data.target).toBe('d1')
  })

  it('role edges flow DM → Mechanism (flipped from API direction)', () => {
    const edge = buildLandingElements(data).find((el) => el.data.id === 'e1')!
    expect(edge.data.source).toBe('d1')
    expect(edge.data.target).toBe('m1')
  })

  it('emits no hidden-membership edges', () => {
    const hidden = buildLandingElements(data).filter(
      (el) => typeof el.classes === 'string' && el.classes.includes('hidden'),
    )
    expect(hidden).toHaveLength(0)
  })
})
