import { describe, it, expect, afterEach } from 'vitest'
import cytoscape, { type Core } from 'cytoscape'
import { ensureEdgeLabelsFit } from './edgeLabelSpacing'
import { computeExpandedPositions } from './expandedLayout'
import { buildExpandedElements } from '../elements'
import { cytoscapeStyles } from '../cytoscape-styles'
import type { ExpandedViewType } from '../types'
import type { GraphData, GraphEdge, GraphMembership, GraphNode } from '../../../types/models'

/**
 * The preset layout is verified overlap-free by expandedLayout.test.ts, but
 * ensureEdgeLabelsFit runs *after* it on layoutstop and moves nodes. These
 * tests re-assert the same clearance guarantee on the post-pass positions,
 * with real node boxes measured from a headless Cytoscape instance.
 */

/** Required empty space between any two node bounding boxes. */
const MIN_CLEARANCE = 20

/** Longest plausible admin-authored relationship_type. */
const LONG_LABEL = 'Sets, reviews and revokes conditions of pretrial release'
const MEDIUM_LABEL = 'Orders electronic monitoring'

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

const edge = (source: string, target: string, relationship_type: string): GraphEdge => ({
  id: `${source}~${target}`,
  source,
  target,
  relationship_type,
  description: '',
})

const membership = (institution: string, member: string): GraphMembership => ({
  id: `${institution}~${member}`,
  institution,
  member,
})

/** One DM wired to `mechCount` mechanisms — the full parabolic arc. */
function dmWithMechanisms(mechCount: number, label: string, instCount = 2): GraphData {
  const mechs = Array.from({ length: mechCount }, (_, i) => node(`m${i + 1}`, 'Mechanism', 'GroupA'))
  const insts = Array.from({ length: instCount }, (_, i) => node(`i${i + 1}`, 'Institution'))
  return {
    nodes: [node('d1', 'Decision Maker'), ...mechs, ...insts],
    edges: mechs.map((m) => edge(m.id, 'd1', label)),
    memberships: insts.map((i) => membership(i.id, 'd1')),
  }
}

/** One mechanism driven by `dmCount` DMs, each in its own institution. */
function mechanismWithDms(dmCount: number, label: string): GraphData {
  const dms = Array.from({ length: dmCount }, (_, i) => node(`d${i + 1}`, 'Decision Maker'))
  const insts = Array.from({ length: dmCount }, (_, i) => node(`i${i + 1}`, 'Institution'))
  return {
    nodes: [node('m1', 'Mechanism', 'GroupA'), ...dms, ...insts],
    edges: dms.map((d) => edge('m1', d.id, label)),
    memberships: dms.map((d, i) => membership(insts[i].id, d.id)),
  }
}

/** An institution whose members fan out to a shared mechanism arc. */
function institutionWithMembers(dmCount: number, mechCount: number, label: string): GraphData {
  const dms = Array.from({ length: dmCount }, (_, i) => node(`d${i + 1}`, 'Decision Maker'))
  const mechs = Array.from({ length: mechCount }, (_, i) => node(`m${i + 1}`, 'Mechanism', 'GroupA'))
  return {
    nodes: [node('inst1', 'Institution'), ...dms, ...mechs],
    edges: dms.flatMap((d, i) => [
      edge(mechs[i % mechCount].id, d.id, label),
      edge(mechs[(i + 3) % mechCount].id, d.id, label),
    ]),
    memberships: dms.map((d) => membership('inst1', d.id)),
  }
}

// ---------------------------------------------------------------------------
// Headless rendering
// ---------------------------------------------------------------------------

let cy: Core | null = null

afterEach(() => {
  cy?.destroy()
  cy = null
})

/**
 * Reproduce what useGraphNavigation does for an expanded view: build the
 * elements, apply the preset positions, then hand the instance back so the
 * caller can run the post-layout label pass.
 */
function renderExpanded(viewType: ExpandedViewType, focusId: string, data: GraphData): Core {
  const instance = cytoscape({
    headless: true,
    styleEnabled: true,
    style: cytoscapeStyles,
    elements: buildExpandedElements(viewType, focusId, data),
  })
  const positions = computeExpandedPositions(viewType, focusId, data)
  instance.nodes().forEach((n) => {
    n.position(positions.get(n.id()) ?? { x: 0, y: 0 })
  })
  cy = instance
  return instance
}

// ---------------------------------------------------------------------------
// Geometry helpers — same definition as expandedLayout.test.ts, but reading
// the boxes off the live stylesheet instead of a hard-coded table.
// ---------------------------------------------------------------------------

type Placed = { id: string; x: number; y: number; w: number; h: number }

function placedNodes(instance: Core): Placed[] {
  return instance.nodes().map((n) => ({
    id: n.id(),
    x: n.position().x,
    y: n.position().y,
    w: n.outerWidth(),
    h: n.outerHeight(),
  }))
}

/** Empty space between two boxes along their most-separated axis. */
function clearance(a: Placed, b: Placed): number {
  const gapX = Math.abs(a.x - b.x) - (a.w + b.w) / 2
  const gapY = Math.abs(a.y - b.y) - (a.h + b.h) / 2
  return Math.max(gapX, gapY)
}

function tightestPair(instance: Core): { pair: string; clearance: number } {
  const placed = placedNodes(instance)
  let worst = { pair: '<none>', clearance: Infinity }
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const c = clearance(placed[i], placed[j])
      if (c < worst.clearance) worst = { pair: `${placed[i].id} / ${placed[j].id}`, clearance: c }
    }
  }
  return worst
}

function expectNoOverlapAfterLabelFit(
  viewType: ExpandedViewType,
  focusId: string,
  data: GraphData,
) {
  const instance = renderExpanded(viewType, focusId, data)
  ensureEdgeLabelsFit(instance)
  const worst = tightestPair(instance)
  expect(
    worst.clearance,
    `after ensureEdgeLabelsFit, tightest pair ${worst.pair} has ${worst.clearance.toFixed(1)}px clearance`,
  ).toBeGreaterThanOrEqual(MIN_CLEARANCE)
}

/** Shortest DM↔mechanism centre distance across every labelled edge. */
function shortestRoleEdge(instance: Core): number {
  let shortest = Infinity
  instance.edges('.expanded-edge').forEach((e) => {
    const sp = e.source().position()
    const tp = e.target().position()
    shortest = Math.min(shortest, Math.hypot(tp.x - sp.x, tp.y - sp.y))
  })
  return shortest
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ensureEdgeLabelsFit — clearance is preserved', () => {
  it('leaves the arc clear in the DM view with a long relationship label', () => {
    expectNoOverlapAfterLabelFit('dm', 'd1', dmWithMechanisms(11, LONG_LABEL))
  })

  it('leaves the arc clear in the DM view with a medium relationship label', () => {
    expectNoOverlapAfterLabelFit('dm', 'd1', dmWithMechanisms(11, MEDIUM_LABEL))
  })

  it('leaves the DM column clear in the mechanism view with a long label', () => {
    expectNoOverlapAfterLabelFit('mechanism', 'm1', mechanismWithDms(8, LONG_LABEL))
  })

  it('leaves the columns clear in the institution view with a long label', () => {
    expectNoOverlapAfterLabelFit('institution', 'inst1', institutionWithMembers(16, 11, LONG_LABEL))
  })

  it.each([1, 2, 3, 5, 8, 11, 14])(
    'dm view stays clear with %i mechanisms on a long label',
    (mechCount) => {
      for (const instCount of [1, 2, 3, 5]) {
        expectNoOverlapAfterLabelFit('dm', 'd1', dmWithMechanisms(mechCount, LONG_LABEL, instCount))
      }
    },
  )

  it.each([1, 2, 3, 4, 5, 8, 12, 16])(
    'mechanism view stays clear with %i DMs on a long label',
    (dmCount) => {
      expectNoOverlapAfterLabelFit('mechanism', 'm1', mechanismWithDms(dmCount, LONG_LABEL))
    },
  )

  it.each([1, 2, 3, 5, 8, 12, 16])(
    'institution view stays clear with %i DMs on a long label',
    (dmCount) => {
      for (const mechCount of [1, 3, 8, 11]) {
        expectNoOverlapAfterLabelFit(
          'institution',
          'inst1',
          institutionWithMembers(dmCount, mechCount, LONG_LABEL),
        )
      }
    },
  )
})

describe('ensureEdgeLabelsFit — labels still get their room', () => {
  it('opens up the DM↔mechanism gap when the label does not fit', () => {
    const data = dmWithMechanisms(3, LONG_LABEL)
    const instance = renderExpanded('dm', 'd1', data)
    const before = shortestRoleEdge(instance)
    ensureEdgeLabelsFit(instance)
    expect(shortestRoleEdge(instance)).toBeGreaterThan(before)
  })

  it('leaves positions untouched when every label already fits', () => {
    const data = dmWithMechanisms(3, 'Sets')
    const instance = renderExpanded('dm', 'd1', data)
    const before = placedNodes(instance).map((p) => `${p.id}:${p.x},${p.y}`)
    ensureEdgeLabelsFit(instance)
    expect(placedNodes(instance).map((p) => `${p.id}:${p.x},${p.y}`)).toEqual(before)
  })

  it('does nothing for edges with no relationship label', () => {
    const data = dmWithMechanisms(3, '')
    const instance = renderExpanded('dm', 'd1', data)
    const before = placedNodes(instance).map((p) => `${p.id}:${p.x},${p.y}`)
    ensureEdgeLabelsFit(instance)
    expect(placedNodes(instance).map((p) => `${p.id}:${p.x},${p.y}`)).toEqual(before)
  })
})
