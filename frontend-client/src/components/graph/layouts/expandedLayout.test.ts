import { describe, it, expect } from 'vitest'
import { computeExpandedPositions } from './expandedLayout'
import type { ExpandedViewType } from '../types'
import type { GraphData, GraphEdge, GraphMembership, GraphNode } from '../../../types/models'

// ---------------------------------------------------------------------------
// Node bounding boxes, mirroring cytoscape-styles.ts. The layout must keep
// nodes apart at these sizes, so the geometry assertions below are written
// against them directly.
// ---------------------------------------------------------------------------

const BOX: Record<string, { w: number; h: number }> = {
  Mechanism: { w: 150, h: 150 },
  'Decision Maker': { w: 140, h: 100 },
  Institution: { w: 160, h: 70 },
}

/** Focus entity of an expanded view renders at the .center-* size. */
const CENTER_BOX: Record<ExpandedViewType, { w: number; h: number }> = {
  mechanism: { w: 170, h: 170 },
  dm: { w: 180, h: 130 },
  institution: { w: 180, h: 80 },
}

/** Required empty space between any two node bounding boxes. */
const MIN_CLEARANCE = 20

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

const node = (id: string, primary: string, secondary = ''): GraphNode => ({
  id,
  name: id,
  primary_type: primary,
  secondary_type: secondary,
  description: '',
})

const edge = (source: string, target: string): GraphEdge => ({
  id: `${source}~${target}`,
  source,
  target,
  relationship_type: '',
  description: '',
})

const membership = (institution: string, member: string): GraphMembership => ({
  id: `${institution}~${member}`,
  institution,
  member,
})

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

type Placed = { id: string; x: number; y: number; w: number; h: number }

function place(viewType: ExpandedViewType, focusId: string, data: GraphData): Placed[] {
  const positions = computeExpandedPositions(viewType, focusId, data)
  return [...positions.entries()].map(([id, p]) => {
    const box =
      id === focusId
        ? CENTER_BOX[viewType]
        : BOX[data.nodes.find((n) => n.id === id)!.primary_type]
    return { id, x: p.x, y: p.y, w: box.w, h: box.h }
  })
}

/**
 * Empty space between two boxes along their most-separated axis. Two boxes
 * only overlap when this is negative, so it is the value that must stay
 * above MIN_CLEARANCE.
 */
function clearance(a: Placed, b: Placed): number {
  const gapX = Math.abs(a.x - b.x) - (a.w + b.w) / 2
  const gapY = Math.abs(a.y - b.y) - (a.h + b.h) / 2
  return Math.max(gapX, gapY)
}

/** Tightest pair in the layout, reported so failures name the colliding nodes. */
function tightestPair(
  viewType: ExpandedViewType,
  focusId: string,
  data: GraphData,
): { pair: string; clearance: number } {
  const placed = place(viewType, focusId, data)
  let worst = { pair: '<none>', clearance: Infinity }
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const c = clearance(placed[i], placed[j])
      if (c < worst.clearance) worst = { pair: `${placed[i].id} / ${placed[j].id}`, clearance: c }
    }
  }
  return worst
}

function expectNoOverlap(viewType: ExpandedViewType, focusId: string, data: GraphData) {
  const worst = tightestPair(viewType, focusId, data)
  expect(
    worst.clearance,
    `tightest pair ${worst.pair} has ${worst.clearance.toFixed(1)}px clearance`,
  ).toBeGreaterThanOrEqual(MIN_CLEARANCE)
}

// ---------------------------------------------------------------------------
// Fixtures reproducing the shapes that overlapped in live data
// ---------------------------------------------------------------------------

/** Two DMs whose membership union is five institutions (e.g. Bail Forfeitures). */
function fewDmsManyInstitutions(): GraphData {
  return {
    nodes: [
      node('m1', 'Mechanism', 'GroupA'),
      node('d1', 'Decision Maker'),
      node('d2', 'Decision Maker'),
      ...[1, 2, 3, 4, 5].map((i) => node(`i${i}`, 'Institution')),
    ],
    edges: [edge('m1', 'd1'), edge('m1', 'd2')],
    memberships: [
      membership('i1', 'd1'),
      membership('i2', 'd1'),
      membership('i3', 'd1'),
      membership('i3', 'd2'),
      membership('i4', 'd2'),
      membership('i5', 'd2'),
    ],
  }
}

/** A single DM belonging to three institutions — the DM column has zero span. */
function oneDmManyInstitutions(): GraphData {
  return {
    nodes: [
      node('m1', 'Mechanism', 'GroupA'),
      node('d1', 'Decision Maker'),
      ...[1, 2, 3].map((i) => node(`i${i}`, 'Institution')),
    ],
    edges: [edge('m1', 'd1')],
    memberships: [membership('i1', 'd1'), membership('i2', 'd1'), membership('i3', 'd1')],
  }
}

/** One DM wired to eleven mechanisms — the full parabolic arc. */
function dmWithManyMechanisms(): GraphData {
  const mechs = Array.from({ length: 11 }, (_, i) => node(`m${i + 1}`, 'Mechanism', 'GroupA'))
  return {
    nodes: [node('d1', 'Decision Maker'), ...mechs, node('i1', 'Institution'), node('i2', 'Institution')],
    edges: mechs.map((m) => edge(m.id, 'd1')),
    memberships: [membership('i1', 'd1'), membership('i2', 'd1')],
  }
}

/**
 * Worst live case: Executive Office of the Trial Court — 16 member DMs whose
 * mechanisms union to 11, all on one arc.
 */
function institutionWithFullGraph(): GraphData {
  const dms = Array.from({ length: 16 }, (_, i) => node(`d${i + 1}`, 'Decision Maker'))
  const mechs = Array.from({ length: 11 }, (_, i) => node(`m${i + 1}`, 'Mechanism', 'GroupA'))
  return {
    nodes: [node('inst1', 'Institution'), ...dms, ...mechs],
    // Each DM drives a couple of mechanisms; every mechanism is covered.
    edges: dms.flatMap((d, i) => [
      edge(mechs[i % mechs.length].id, d.id),
      edge(mechs[(i + 3) % mechs.length].id, d.id),
    ]),
    memberships: dms.map((d) => membership('inst1', d.id)),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeExpandedPositions — mechanism view', () => {
  it('places the focus mechanism, its DMs, and their institutions', () => {
    const data = fewDmsManyInstitutions()
    const positions = computeExpandedPositions('mechanism', 'm1', data)
    for (const n of data.nodes) expect(positions.has(n.id)).toBe(true)
  })

  it('keeps the institutions-left, DMs-centre, mechanism-right shape', () => {
    const data = fewDmsManyInstitutions()
    const positions = computeExpandedPositions('mechanism', 'm1', data)
    const x = (id: string) => positions.get(id)!.x
    const maxInstX = Math.max(...['i1', 'i2', 'i3', 'i4', 'i5'].map(x))
    const dmX = x('d1')
    expect(maxInstX).toBeLessThan(dmX)
    expect(dmX).toBeLessThan(x('m1'))
  })

  it('does not overlap when institutions outnumber DMs', () => {
    expectNoOverlap('mechanism', 'm1', fewDmsManyInstitutions())
  })

  it('grows the institution column past the DM column rather than compressing it', () => {
    const data = fewDmsManyInstitutions()
    const positions = computeExpandedPositions('mechanism', 'm1', data)
    const span = (ids: string[]) => {
      const ys = ids.map((id) => positions.get(id)!.y)
      return Math.max(...ys) - Math.min(...ys)
    }
    // 5 institutions cannot fit inside the vertical range of 2 DMs.
    expect(span(['i1', 'i2', 'i3', 'i4', 'i5'])).toBeGreaterThan(span(['d1', 'd2']))
  })

  it('does not stack institutions when the DM column has zero span', () => {
    expectNoOverlap('mechanism', 'm1', oneDmManyInstitutions())
  })

  it('handles a mechanism with no DMs', () => {
    const data: GraphData = {
      nodes: [node('m1', 'Mechanism', 'GroupA')],
      edges: [],
      memberships: [],
    }
    const positions = computeExpandedPositions('mechanism', 'm1', data)
    expect(positions.size).toBe(1)
    expect(positions.get('m1')!.y).toBe(0)
  })
})

describe('computeExpandedPositions — dm view', () => {
  it('places the centre DM at the origin with mechanisms right and institutions left', () => {
    const data = dmWithManyMechanisms()
    const positions = computeExpandedPositions('dm', 'd1', data)
    expect(positions.get('d1')).toEqual({ x: 0, y: 0 })
    expect(positions.get('m1')!.x).toBeGreaterThan(0)
    expect(positions.get('i1')!.x).toBeLessThan(0)
  })

  it('does not overlap mechanisms on a full parabolic arc', () => {
    expectNoOverlap('dm', 'd1', dmWithManyMechanisms())
  })

  it('does not overlap with only two mechanisms on the arc', () => {
    const data: GraphData = {
      nodes: [
        node('d1', 'Decision Maker'),
        node('m1', 'Mechanism', 'GroupA'),
        node('m2', 'Mechanism', 'GroupA'),
        node('i1', 'Institution'),
      ],
      edges: [edge('m1', 'd1'), edge('m2', 'd1')],
      memberships: [membership('i1', 'd1')],
    }
    expectNoOverlap('dm', 'd1', data)
  })

  it('handles a DM with no mechanisms or institutions', () => {
    const positions = computeExpandedPositions('dm', 'd1', {
      nodes: [node('d1', 'Decision Maker')],
      edges: [],
      memberships: [],
    })
    expect(positions.size).toBe(1)
  })
})

describe('computeExpandedPositions — institution view', () => {
  it('keeps the institution-left, DMs-centre, mechanisms-right shape', () => {
    const data = institutionWithFullGraph()
    const positions = computeExpandedPositions('institution', 'inst1', data)
    expect(positions.get('inst1')!.x).toBeLessThan(positions.get('d1')!.x)
    expect(positions.get('d1')!.x).toBeLessThan(positions.get('m1')!.x)
  })

  it('does not overlap with 16 DMs and an 11-mechanism arc', () => {
    expectNoOverlap('institution', 'inst1', institutionWithFullGraph())
  })

  it('does not overlap with a small membership', () => {
    const data: GraphData = {
      nodes: [
        node('inst1', 'Institution'),
        node('d1', 'Decision Maker'),
        node('d2', 'Decision Maker'),
        node('m1', 'Mechanism', 'GroupA'),
        node('m2', 'Mechanism', 'GroupA'),
      ],
      edges: [edge('m1', 'd1'), edge('m2', 'd2')],
      memberships: [membership('inst1', 'd1'), membership('inst1', 'd2')],
    }
    expectNoOverlap('institution', 'inst1', data)
  })

  it('handles an institution with no members', () => {
    const positions = computeExpandedPositions('institution', 'inst1', {
      nodes: [node('inst1', 'Institution')],
      edges: [],
      memberships: [],
    })
    expect(positions.size).toBe(1)
  })
})

describe('computeExpandedPositions — overlap sweep', () => {
  // Live data tops out around 16 DMs, 11 mechanisms and 6 institutions; sweep
  // past that so a future data import cannot walk into a colliding shape.
  const DM_COUNTS = [1, 2, 3, 4, 5, 8, 12, 16, 20]
  const MECH_COUNTS = [1, 2, 3, 5, 8, 11, 14]
  const INST_COUNTS = [1, 2, 3, 5, 8]

  /** Fully connected fixture: every DM drives every mechanism and joins every institution. */
  function dense(dmCount: number, mechCount: number, instCount: number): GraphData {
    const dms = Array.from({ length: dmCount }, (_, i) => node(`d${i + 1}`, 'Decision Maker'))
    const mechs = Array.from({ length: mechCount }, (_, i) => node(`m${i + 1}`, 'Mechanism', 'GroupA'))
    const insts = Array.from({ length: instCount }, (_, i) => node(`i${i + 1}`, 'Institution'))
    return {
      nodes: [...dms, ...mechs, ...insts],
      edges: dms.flatMap((d) => mechs.map((m) => edge(m.id, d.id))),
      memberships: dms.flatMap((d) => insts.map((i) => membership(i.id, d.id))),
    }
  }

  it.each(DM_COUNTS)('mechanism view stays clear with %i DMs', (dmCount) => {
    for (const instCount of INST_COUNTS) {
      expectNoOverlap('mechanism', 'm1', dense(dmCount, 1, instCount))
    }
  })

  it.each(MECH_COUNTS)('dm view stays clear with %i mechanisms', (mechCount) => {
    for (const instCount of INST_COUNTS) {
      expectNoOverlap('dm', 'd1', dense(1, mechCount, instCount))
    }
  })

  it.each(DM_COUNTS)('institution view stays clear with %i DMs', (dmCount) => {
    for (const mechCount of MECH_COUNTS) {
      expectNoOverlap('institution', 'i1', dense(dmCount, mechCount, 1))
    }
  })
})
