import type { GraphData, GraphNode } from '../../../types/models'

type Position = { x: number; y: number }

// Geometry constants — sized against node dimensions in cytoscape-styles.ts
const INST_COL_GAP = 210 // institution grid column pitch (node is 160 wide)
const INST_ROW_GAP = 110 // institution grid row pitch (node is 70 tall)
const DM_RING_CLEARANCE = 170 // gap between grid corner and DM ring
const DM_MIN_SPACING = 150 // min arc length between DM centers (diamond is 140 wide)
const MECH_RING_GAP = 230 // radial gap between DM ring and mechanism ring
const MECH_MIN_SPACING = 190 // min arc length between mechanism centers (circle is 150)
const START_ANGLE = -Math.PI / 2 // 12 o'clock

/** Circular mean of angles (handles wraparound); null when undefined. */
export function circularMean(angles: number[]): number | null {
  if (angles.length === 0) return null
  let sx = 0
  let sy = 0
  for (const a of angles) {
    sx += Math.cos(a)
    sy += Math.sin(a)
  }
  // Antipodal angles cancel out — the mean direction is genuinely undefined.
  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) return null
  return Math.atan2(sy, sx)
}

/** Institutions in a 2-column grid centered on the origin, sorted by name. */
export function computeInstitutionGrid(institutions: GraphNode[]): Map<string, Position> {
  const sorted = [...institutions].sort((a, b) => a.name.localeCompare(b.name))
  const cols = sorted.length > 1 ? 2 : 1
  const rows = Math.ceil(sorted.length / cols)
  const positions = new Map<string, Position>()
  sorted.forEach((n, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    positions.set(n.id, {
      x: (col - (cols - 1) / 2) * INST_COL_GAP,
      y: (row - (rows - 1) / 2) * INST_ROW_GAP,
    })
  })
  return positions
}

/**
 * Mechanism ring angles. Sorting by (subcategory, name) makes each group a
 * contiguous arc — the grouping is readable from position as well as color.
 */
export function computeMechanismAngles(mechanisms: GraphNode[]): Map<string, number> {
  const sorted = [...mechanisms].sort(
    (a, b) => a.secondary_type.localeCompare(b.secondary_type) || a.name.localeCompare(b.name),
  )
  const angles = new Map<string, number>()
  sorted.forEach((n, i) => {
    angles.set(n.id, START_ANGLE + (2 * Math.PI * i) / sorted.length)
  })
  return angles
}

/**
 * DM ring angles: each DM wants the circular mean of its connected mechanisms'
 * angles. DMs are sorted by desired angle and placed at evenly-spaced slots in
 * that cyclic order — affinity decides ordering, spacing stays collision-free.
 * DMs with no mechanism connections sort last (by name) and take leftover slots.
 */
export function computeDmAngles(
  dms: GraphNode[],
  data: GraphData,
  mechAngles: Map<string, number>,
): Map<string, number> {
  const desired = dms.map((dm) => {
    const angles: number[] = []
    for (const e of data.edges) {
      const otherId = e.source === dm.id ? e.target : e.target === dm.id ? e.source : null
      if (!otherId) continue
      const a = mechAngles.get(otherId)
      if (a !== undefined) angles.push(a)
    }
    return { id: dm.id, name: dm.name, mean: circularMean(angles) }
  })
  desired.sort((a, b) => {
    if (a.mean === null && b.mean === null) return a.name.localeCompare(b.name)
    if (a.mean === null) return 1
    if (b.mean === null) return -1
    return a.mean - b.mean || a.name.localeCompare(b.name)
  })
  const start = desired.find((d) => d.mean !== null)?.mean ?? START_ANGLE
  const result = new Map<string, number>()
  desired.forEach((d, i) => {
    result.set(d.id, start + (2 * Math.PI * i) / desired.length)
  })
  return result
}

/** Full landing layout: institution grid + DM ring + mechanism outer ring. */
export function computeRingPositions(data: GraphData): Map<string, Position> {
  const insts = data.nodes.filter((n) => n.primary_type === 'Institution')
  const dms = data.nodes.filter((n) => n.primary_type === 'Decision Maker')
  const mechs = data.nodes.filter((n) => n.primary_type === 'Mechanism')

  const positions = computeInstitutionGrid(insts)

  const cols = insts.length > 1 ? 2 : 1
  const rows = Math.max(Math.ceil(insts.length / cols), 1)
  const gridHalfW = ((cols - 1) * INST_COL_GAP) / 2 + 90 // + half institution width
  const gridHalfH = ((rows - 1) * INST_ROW_GAP) / 2 + 40 // + half institution height
  const gridCorner = Math.hypot(gridHalfW, gridHalfH)

  // Each ring clears the one inside it, and grows further out if its own
  // members would otherwise crowd each other along the arc.
  const dmRadius = Math.max(
    gridCorner + DM_RING_CLEARANCE,
    (dms.length * DM_MIN_SPACING) / (2 * Math.PI),
  )
  const mechRadius = Math.max(
    dmRadius + MECH_RING_GAP,
    (mechs.length * MECH_MIN_SPACING) / (2 * Math.PI),
  )

  const mechAngles = computeMechanismAngles(mechs)
  for (const [id, a] of mechAngles) {
    positions.set(id, { x: Math.cos(a) * mechRadius, y: Math.sin(a) * mechRadius })
  }
  const dmAngles = computeDmAngles(dms, data, mechAngles)
  for (const [id, a] of dmAngles) {
    positions.set(id, { x: Math.cos(a) * dmRadius, y: Math.sin(a) * dmRadius })
  }
  return positions
}
