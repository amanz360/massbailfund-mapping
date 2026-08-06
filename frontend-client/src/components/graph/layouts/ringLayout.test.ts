import { describe, it, expect } from 'vitest'
import {
  circularMean,
  computeDmAngles,
  computeInstitutionGrid,
  computeMechanismAngles,
  computeRingPositions,
} from './ringLayout'
import type { GraphData, GraphNode } from '../../../types/models'

const node = (id: string, primary: string, secondary = ''): GraphNode => ({
  id,
  name: id,
  primary_type: primary,
  secondary_type: secondary,
  description: '',
})

describe('circularMean', () => {
  it('averages angles across the wrap point', () => {
    // 350° and 10° average to 0°, not 180°
    const mean = circularMean([(350 * Math.PI) / 180, (10 * Math.PI) / 180])!
    expect(Math.abs(mean)).toBeLessThan(0.01)
  })

  it('returns null for empty input', () => {
    expect(circularMean([])).toBeNull()
  })
})

describe('computeInstitutionGrid', () => {
  it('places 6 institutions in a 2x3 grid centered on the origin', () => {
    const grid = computeInstitutionGrid([1, 2, 3, 4, 5, 6].map((i) => node(`i${i}`, 'Institution')))
    expect(grid.size).toBe(6)
    const xs = [...grid.values()].map((p) => p.x)
    const ys = [...grid.values()].map((p) => p.y)
    expect(new Set(xs).size).toBe(2) // two columns
    expect(new Set(ys).size).toBe(3) // three rows
    expect(xs.reduce((a, b) => a + b, 0)).toBeCloseTo(0)
    expect(ys.reduce((a, b) => a + b, 0)).toBeCloseTo(0)
  })

  it('places a single institution at the origin', () => {
    const grid = computeInstitutionGrid([node('i1', 'Institution')])
    expect(grid.get('i1')).toEqual({ x: 0, y: 0 })
  })
})

describe('computeMechanismAngles', () => {
  it('keeps subcategory groups contiguous on the ring', () => {
    const mechs = [
      node('a2', 'Mechanism', 'GroupA'),
      node('b1', 'Mechanism', 'GroupB'),
      node('a1', 'Mechanism', 'GroupA'),
      node('b2', 'Mechanism', 'GroupB'),
    ]
    const angles = computeMechanismAngles(mechs)
    const ordered = [...angles.entries()].sort((x, y) => x[1] - y[1]).map(([id]) => id)
    expect(ordered).toEqual(['a1', 'a2', 'b1', 'b2']) // sorted by (group, name) = contiguous arcs
  })
})

describe('computeDmAngles', () => {
  it('seats connected DMs on their affinity angle and leaves the rest elsewhere', () => {
    const mechs = [node('m1', 'Mechanism', 'GroupA')]
    const mechAngles = computeMechanismAngles(mechs)
    const dms = [node('dz', 'Decision Maker'), node('da', 'Decision Maker')]
    const data: GraphData = {
      nodes: [...dms, ...mechs],
      edges: [{ id: 'e1', source: 'm1', target: 'da', relationship_type: '', description: '' }],
      memberships: [],
    }
    const angles = computeDmAngles(dms, data, mechAngles)
    expect(angles.size).toBe(2)
    // da is wired to m1, so it takes m1's angle; dz has no pull and fills a
    // leftover slot rather than being dropped.
    expect(angles.get('da')).toBeCloseTo(mechAngles.get('m1')!)
    expect(angles.get('dz')).not.toBeCloseTo(mechAngles.get('m1')!)
  })
})

describe('computeRingPositions', () => {
  const data: GraphData = {
    nodes: [
      node('i1', 'Institution'),
      node('i2', 'Institution'),
      node('d1', 'Decision Maker'),
      node('d2', 'Decision Maker'),
      node('d3', 'Decision Maker'),
      node('m1', 'Mechanism', 'GroupA'),
      node('m2', 'Mechanism', 'GroupB'),
    ],
    edges: [
      { id: 'e1', source: 'm1', target: 'd1', relationship_type: '', description: '' },
      { id: 'e2', source: 'm2', target: 'd2', relationship_type: '', description: '' },
    ],
    memberships: [],
  }

  it('positions every node', () => {
    const pos = computeRingPositions(data)
    for (const n of data.nodes) expect(pos.has(n.id)).toBe(true)
  })

  it('orders nodes into rings: institutions inside DMs inside mechanisms', () => {
    const pos = computeRingPositions(data)
    const r = (id: string) => Math.hypot(pos.get(id)!.x, pos.get(id)!.y)
    const maxInst = Math.max(r('i1'), r('i2'))
    const minDm = Math.min(r('d1'), r('d2'), r('d3'))
    const maxDm = Math.max(r('d1'), r('d2'), r('d3'))
    const minMech = Math.min(r('m1'), r('m2'))
    expect(maxInst).toBeLessThan(minDm)
    expect(maxDm).toBeLessThan(minMech)
  })

  it('places a DM near its sole connected mechanism (affinity)', () => {
    const pos = computeRingPositions(data)
    const angle = (id: string) => Math.atan2(pos.get(id)!.y, pos.get(id)!.x)
    const diff = Math.abs(angle('d1') - angle('m1'))
    const wrapped = Math.min(diff, 2 * Math.PI - diff)
    // d1 should be closer in angle to m1 than to m2 (which is opposite)
    const diff2 = Math.abs(angle('d1') - angle('m2'))
    const wrapped2 = Math.min(diff2, 2 * Math.PI - diff2)
    expect(wrapped).toBeLessThan(wrapped2)
  })

  it('still places DMs with no mechanism connections', () => {
    const pos = computeRingPositions(data)
    expect(pos.has('d3')).toBe(true)
  })

  it('orders DMs by mechanism affinity rather than by input order', () => {
    // Three DMs, one per mechanism, listed in an order whose *cyclic* sequence
    // differs from the affinity sequence (dA, dC, dB vs. dA, dB, dC). Walking
    // the input array would strand dB and dC beside the wrong mechanisms.
    const pos = computeRingPositions({
      nodes: [
        node('dA', 'Decision Maker'),
        node('dC', 'Decision Maker'),
        node('dB', 'Decision Maker'),
        node('m1', 'Mechanism', 'GroupA'),
        node('m2', 'Mechanism', 'GroupB'),
        node('m3', 'Mechanism', 'GroupC'),
      ],
      edges: [
        { id: 'e1', source: 'm1', target: 'dA', relationship_type: '', description: '' },
        { id: 'e2', source: 'm2', target: 'dB', relationship_type: '', description: '' },
        { id: 'e3', source: 'm3', target: 'dC', relationship_type: '', description: '' },
      ],
      memberships: [],
    })
    const angle = (id: string) => Math.atan2(pos.get(id)!.y, pos.get(id)!.x)
    const gap = (a: string, b: string) => {
      const d = Math.abs(angle(a) - angle(b))
      return Math.min(d, 2 * Math.PI - d)
    }
    // Each DM must land nearer its own mechanism than either of the other two.
    for (const [dm, own, others] of [
      ['dA', 'm1', ['m2', 'm3']],
      ['dB', 'm2', ['m1', 'm3']],
      ['dC', 'm3', ['m1', 'm2']],
    ] as const) {
      for (const other of others) expect(gap(dm, own)).toBeLessThan(gap(dm, other))
    }
  })

  it('handles graphs with no DMs or mechanisms', () => {
    const pos = computeRingPositions({
      nodes: [node('i1', 'Institution')],
      edges: [],
      memberships: [],
    })
    expect(pos.size).toBe(1)
    expect(pos.get('i1')).toEqual({ x: 0, y: 0 })
  })

  it('handles empty graphs', () => {
    expect(computeRingPositions({ nodes: [], edges: [], memberships: [] }).size).toBe(0)
  })
})
