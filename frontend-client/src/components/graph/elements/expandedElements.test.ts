import { describe, it, expect } from 'vitest'
import { buildExpandedElements } from './expandedElements'
import { roleEdgeElement } from '../utils'
import type { GraphData, GraphEdge, GraphNode } from '../../../types/models'

const data: GraphData = {
  nodes: [
    { id: 'i1', name: 'District Courts', primary_type: 'Institution', secondary_type: '', description: '' },
    { id: 'i2', name: 'Superior Court', primary_type: 'Institution', secondary_type: '', description: '' },
    { id: 'd1', name: 'Judges', primary_type: 'Decision Maker', secondary_type: '', description: '' },
    { id: 'm1', name: 'GPS', primary_type: 'Mechanism', secondary_type: 'Electronic Monitoring', description: '' },
  ],
  // API emits Mechanism → DM
  edges: [{ id: 'e1', source: 'm1', target: 'd1', relationship_type: 'Orders', description: '' }],
  memberships: [
    { id: 'mem1', institution: 'i1', member: 'd1' },
    { id: 'mem2', institution: 'i2', member: 'd1' },
  ],
}

describe('buildExpandedElements (dm view)', () => {
  it('includes every institution the DM belongs to', () => {
    const els = buildExpandedElements('dm', 'd1', data)
    const instNodes = els.filter((el) => el.data.id === 'i1' || el.data.id === 'i2')
    expect(instNodes).toHaveLength(2) // Superior AND District — no Primary filter
  })

  it('membership edges flow Institution → DM', () => {
    const els = buildExpandedElements('dm', 'd1', data)
    const memEdge = els.find((el) => el.data.id === 'dm-inst-d1-i1')!
    expect(memEdge.data.source).toBe('i1')
    expect(memEdge.data.target).toBe('d1')
  })

  it('membership edges carry the expanded-membership class', () => {
    const els = buildExpandedElements('dm', 'd1', data)
    const memEdge = els.find((el) => el.data.id === 'dm-inst-d1-i1')!
    expect(memEdge.classes).toBe('membership-edge expanded-membership')
  })

  it('role edges flow DM → Mechanism', () => {
    const els = buildExpandedElements('dm', 'd1', data)
    const roleEdge = els.find((el) => el.data.id === 'e1')!
    expect(roleEdge.data.source).toBe('d1')
    expect(roleEdge.data.target).toBe('m1')
  })
})

describe('buildExpandedElements (mechanism view)', () => {
  it('includes every institution of every connected DM', () => {
    const els = buildExpandedElements('mechanism', 'm1', data)
    const instNodes = els.filter((el) => el.data.id === 'i1' || el.data.id === 'i2')
    expect(instNodes).toHaveLength(2)
  })

  it('membership edges flow Institution → DM', () => {
    const els = buildExpandedElements('mechanism', 'm1', data)
    const memEdge = els.find((el) => el.data.id === 'mech-dm-inst-d1-i2')!
    expect(memEdge.data.source).toBe('i2')
    expect(memEdge.data.target).toBe('d1')
    expect(memEdge.classes).toBe('membership-edge expanded-membership')
  })

  it('role edges flow DM → Mechanism', () => {
    const els = buildExpandedElements('mechanism', 'm1', data)
    const roleEdge = els.find((el) => el.data.id === 'e1')!
    expect(roleEdge.data.source).toBe('d1')
    expect(roleEdge.data.target).toBe('m1')
  })
})

describe('buildExpandedElements (institution view)', () => {
  it('shows all members and their mechanisms', () => {
    const els = buildExpandedElements('institution', 'i1', data)
    expect(els.some((el) => el.data.id === 'd1')).toBe(true)
    expect(els.some((el) => el.data.id === 'm1')).toBe(true)
  })

  it('membership edges flow Institution → DM', () => {
    const els = buildExpandedElements('institution', 'i1', data)
    const memEdge = els.find((el) => el.data.id === 'inst-i1-d1')!
    expect(memEdge.data.source).toBe('i1')
    expect(memEdge.data.target).toBe('d1')
    expect(memEdge.classes).toBe('membership-edge expanded-membership')
  })

  it('role edges flow DM → Mechanism', () => {
    const els = buildExpandedElements('institution', 'i1', data)
    const roleEdge = els.find((el) => el.data.id === 'e1')!
    expect(roleEdge.data.source).toBe('d1')
    expect(roleEdge.data.target).toBe('m1')
  })

})

describe('buildExpandedElements (all views)', () => {
  // d1 belongs to two institutions and m1 connects to d1 — the fan-in/fan-out
  // cases where a node or edge could be emitted more than once.
  it.each([
    ['mechanism', 'm1'],
    ['dm', 'd1'],
    ['institution', 'i1'],
  ] as const)('emits no duplicate element ids (%s view)', (viewType, focusId) => {
    const ids = buildExpandedElements(viewType, focusId, data).map((el) => el.data.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('roleEdgeElement reject paths', () => {
  const nodeById = new Map<string, GraphNode>(data.nodes.map((n) => [n.id, n]))
  const edge = (source: string, target: string): GraphEdge => ({
    id: 'x1',
    source,
    target,
    relationship_type: 'Orders',
    description: '',
  })

  it('rejects membership-shaped edges (Institution ↔ DM)', () => {
    expect(roleEdgeElement(edge('i1', 'd1'), nodeById, 'expanded-edge')).toBeNull()
  })

  it('rejects edges with a missing endpoint', () => {
    expect(roleEdgeElement(edge('ghost', 'd1'), nodeById, 'expanded-edge')).toBeNull()
    expect(roleEdgeElement(edge('m1', 'ghost'), nodeById, 'expanded-edge')).toBeNull()
  })

  it('rejects DM → DM edges', () => {
    const withSecondDm = new Map(nodeById)
    withSecondDm.set('d2', {
      id: 'd2',
      name: 'Clerks',
      primary_type: 'Decision Maker',
      secondary_type: '',
      description: '',
    })
    expect(roleEdgeElement(edge('d1', 'd2'), withSecondDm, 'expanded-edge')).toBeNull()
  })

  it('rejects Mechanism → Mechanism edges', () => {
    const withSecondMech = new Map(nodeById)
    withSecondMech.set('m2', {
      id: 'm2',
      name: 'Cash Bail',
      primary_type: 'Mechanism',
      secondary_type: '',
      description: '',
    })
    expect(roleEdgeElement(edge('m1', 'm2'), withSecondMech, 'expanded-edge')).toBeNull()
  })
})
