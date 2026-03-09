import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Box, CircularProgress, Typography, IconButton, Link, Tooltip, useTheme } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import LinkIcon from '@mui/icons-material/Link'
import { useDispatch, useSelector } from 'react-redux'
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape'
import fcose from 'cytoscape-fcose'
import type { AppDispatch } from '../../store/store'

cytoscape.use(fcose)
import { selectGraphData, selectGraphLoading } from '../../store/slices/graphSlice'
import { selectEntity, clearDetail } from '../../store/slices/detailSlice'
import type { GraphData, GraphNode, GraphEdge } from '../../types/models'
import { cytoscapeStyles } from './cytoscape-styles'
import { buildInstitutionColorsFromGraph } from '../../utils/entities'

const DOT_SIZE = 10

/** Generate an SVG data URI for a small circle dot indicator. */
function generateDotSvg(color: string, filled: boolean): string {
  const s = DOT_SIZE
  const r = 3.5
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">
    <circle cx="${s / 2}" cy="${s / 2}" r="${r}"
            fill="${filled ? color : 'none'}" stroke="${color}" stroke-width="${filled ? 0 : 1.5}"/>
  </svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

/** Compute dot indicator SVGs for a DM node based on its institution memberships. */
function computeDmDots(
  dmId: string,
  data: GraphData,
  institutionColors: Map<string, string>,
): string[] {
  const dots: { uri: string; order: number }[] = []

  for (const m of data.memberships) {
    if (m.member !== dmId) continue
    const color = institutionColors.get(m.institution)
    if (!color) continue

    const filled = m.membership_type === 'Primary'
    const uri = generateDotSvg(color, filled)
    // Primary first, then alphabetical by institution id
    const order = (filled ? 0 : 1) * 100 + (m.institution.charCodeAt(0))
    dots.push({ uri, order })
  }

  dots.sort((a, b) => a.order - b.order)
  return dots.map((d) => d.uri)
}

/** Apply institution dot indicators to a cytoscape DM node. */
function applyDotIndicators(node: cytoscape.NodeSingular, data: GraphData, institutionColors: Map<string, string>) {
  const uris = computeDmDots(node.id(), data, institutionColors)
  if (uris.length === 0) return

  const sz = `${DOT_SIZE}px`
  const widths = uris.map(() => sz)
  const heights = uris.map(() => sz)

  // Center dots inside the diamond, just above the label text
  const pos_x: string[] = []
  const pos_y: string[] = []
  const totalWidth = uris.length * DOT_SIZE + (uris.length - 1) * 2 // 2px gap between dots
  const startX = 50 - (totalWidth / 2 / 140) * 100 // 140px = DM diamond width
  for (let i = 0; i < uris.length; i++) {
    const offsetPx = i * (DOT_SIZE + 2)
    pos_x.push(`${startX + (offsetPx / 140) * 100}%`)
    pos_y.push('18%')
  }

  node.style({
    'background-image': uris,
    'background-width': widths,
    'background-height': heights,
    'background-position-x': pos_x,
    'background-position-y': pos_y,
    'background-clip': 'none',
    'background-image-containment': 'over',
    'bounds-expansion': '6px',
  })
}

/**
 * After layout, ensure edge labels fit by pushing outer nodes further
 * from the center node when the visible edge gap is too narrow.
 */
function ensureEdgeLabelsFit(cy: Core) {
  const CHAR_WIDTH = 6.2  // approx px per char at 10px font
  const EXTRA_PAD = 30     // breathing room around label

  cy.edges('.expanded-edge').forEach((edge) => {
    const label: string = edge.data('relationship_type') || ''
    if (!label) return

    const labelLen = label.length * CHAR_WIDTH + EXTRA_PAD

    const src = edge.source()
    const tgt = edge.target()
    const sp = src.position()
    const tp = tgt.position()

    const dx = tp.x - sp.x
    const dy = tp.y - sp.y
    const centerDist = Math.sqrt(dx * dx + dy * dy)
    if (centerDist === 0) return

    // Approximate half-size of each node along the edge direction
    const angle = Math.atan2(Math.abs(dy), Math.abs(dx))
    const srcR = Math.min(src.outerWidth() / 2 / Math.max(Math.cos(angle), 0.01),
                          src.outerHeight() / 2 / Math.max(Math.sin(angle), 0.01))
    const tgtR = Math.min(tgt.outerWidth() / 2 / Math.max(Math.cos(angle), 0.01),
                          tgt.outerHeight() / 2 / Math.max(Math.sin(angle), 0.01))
    // Clamp to reasonable half-diagonal
    const srcHalf = Math.min(srcR, Math.sqrt((src.outerWidth() / 2) ** 2 + (src.outerHeight() / 2) ** 2))
    const tgtHalf = Math.min(tgtR, Math.sqrt((tgt.outerWidth() / 2) ** 2 + (tgt.outerHeight() / 2) ** 2))

    const gap = centerDist - srcHalf - tgtHalf

    if (labelLen > gap) {
      const needed = labelLen - gap
      // Move whichever node is NOT the center
      const isSrcCenter = src.hasClass('center-mechanism') || src.hasClass('center-dm')
      const outer = isSrcCenter ? tgt : src
      const center = isSrcCenter ? src : tgt
      const cp = center.position()
      const op = outer.position()
      const odx = op.x - cp.x
      const ody = op.y - cp.y
      const oDist = Math.sqrt(odx * odx + ody * ody)
      if (oDist > 0) {
        const scale = (oDist + needed) / oDist
        outer.position({ x: cp.x + odx * scale, y: cp.y + ody * scale })
      }
    }
  })
}

interface SystemMapProps {
  onNodeSelect?: (nodeId: string | null) => void
  onMechanismExpand?: (mechanismId: string | null) => void
  onDmExpand?: (dmId: string | null) => void
  onInstitutionExpand?: (institutionId: string | null) => void
  focusNodeId?: string | null
  focusCounter?: number
  /** Increment to return to the landing view from outside */
  resetCounter?: number
}

/**
 * Simple hash of a string to a number, used for deterministic initial positions.
 */
function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return h
}

/**
 * Order mechanisms around a circle so those sharing many decision makers
 * are placed adjacent, minimizing edge crossings.
 */
function orderMechanismsForCircle(
  mechanisms: GraphNode[],
  edges: GraphEdge[],
): GraphNode[] {
  if (mechanisms.length <= 2) return mechanisms

  const mechIds = new Set(mechanisms.map((m) => m.id))

  // Map each DM to the set of mechanisms it connects to
  const dmToMechs = new Map<string, Set<string>>()
  for (const edge of edges) {
    const isSrcMech = mechIds.has(edge.source)
    const isTgtMech = mechIds.has(edge.target)
    if (isSrcMech && !isTgtMech) {
      if (!dmToMechs.has(edge.target)) dmToMechs.set(edge.target, new Set())
      dmToMechs.get(edge.target)!.add(edge.source)
    } else if (!isSrcMech && isTgtMech) {
      if (!dmToMechs.has(edge.source)) dmToMechs.set(edge.source, new Set())
      dmToMechs.get(edge.source)!.add(edge.target)
    }
  }

  // Count shared DMs between each pair of mechanisms
  const similarity = new Map<string, Map<string, number>>()
  for (const m of mechanisms) similarity.set(m.id, new Map())

  for (const [, mechs] of dmToMechs) {
    const arr = [...mechs]
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const cur = similarity.get(arr[i])!.get(arr[j]) ?? 0
        similarity.get(arr[i])!.set(arr[j], cur + 1)
        similarity.get(arr[j])!.set(arr[i], cur + 1)
      }
    }
  }

  // Greedy nearest-neighbor starting from highest-connectivity mechanism
  const placed: GraphNode[] = []
  const remaining = new Set(mechanisms.map((m) => m.id))

  let startId = mechanisms[0].id
  let maxTotal = -1
  for (const m of mechanisms) {
    let total = 0
    for (const [, count] of similarity.get(m.id)!) total += count
    if (total > maxTotal) {
      maxTotal = total
      startId = m.id
    }
  }
  placed.push(mechanisms.find((m) => m.id === startId)!)
  remaining.delete(startId)

  while (remaining.size > 0) {
    const lastId = placed[placed.length - 1].id
    const sim = similarity.get(lastId)!

    let bestId = ''
    let bestScore = -1
    for (const id of remaining) {
      const score = sim.get(id) ?? 0
      if (score > bestScore || (score === bestScore && !bestId)) {
        bestScore = score
        bestId = id
      }
    }

    if (!bestId) bestId = remaining.values().next().value!
    placed.push(mechanisms.find((m) => m.id === bestId)!)
    remaining.delete(bestId)
  }

  return placed
}

/**
 * Order DMs around an institution ring so those sharing many mechanisms
 * are placed adjacent, minimizing edge crossings.
 */
/**
 * Compute positions for the expanded institution view with tripartite flow layout.
 * Institution on the left, DMs in a vertical stack in the center,
 * mechanisms in a parabolic curve on the right.
 * Uses barycenter heuristic to order DMs and mechanisms to minimise edge crossings.
 */
function computeInstitutionExpandedPositions(
  data: GraphData,
  institutionId: string,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()

  const primaryDmIds = data.memberships
    .filter((m) => m.institution === institutionId && m.membership_type === 'Primary')
    .map((m) => m.member)
  const dmIdSet = new Set(primaryDmIds)

  // Find mechanisms connected to those DMs
  const mechIdSet = new Set<string>()
  for (const edge of data.edges) {
    if (dmIdSet.has(edge.source)) {
      const target = data.nodes.find((n) => n.id === edge.target)
      if (target?.primary_type === 'Mechanism') mechIdSet.add(edge.target)
    }
    if (dmIdSet.has(edge.target)) {
      const source = data.nodes.find((n) => n.id === edge.source)
      if (source?.primary_type === 'Mechanism') mechIdSet.add(edge.source)
    }
  }

  // Build DM ↔ mechanism adjacency
  const dmToMechs = new Map<string, string[]>()
  const mechToDms = new Map<string, string[]>()
  for (const dmId of dmIdSet) dmToMechs.set(dmId, [])
  for (const mechId of mechIdSet) mechToDms.set(mechId, [])
  for (const edge of data.edges) {
    if (dmIdSet.has(edge.source) && mechIdSet.has(edge.target)) {
      dmToMechs.get(edge.source)!.push(edge.target)
      mechToDms.get(edge.target)!.push(edge.source)
    }
    if (dmIdSet.has(edge.target) && mechIdSet.has(edge.source)) {
      dmToMechs.get(edge.target)!.push(edge.source)
      mechToDms.get(edge.source)!.push(edge.target)
    }
  }

  // Barycenter heuristic: iteratively sort DMs by average mechanism rank
  // and mechanisms by average DM rank to minimise edge crossings.
  let dmOrder = [...dmIdSet].sort((a, b) => {
    const nameA = data.nodes.find((n) => n.id === a)?.name || ''
    const nameB = data.nodes.find((n) => n.id === b)?.name || ''
    return nameA.localeCompare(nameB)
  })
  let mechOrder = [...mechIdSet].sort((a, b) => {
    const nameA = data.nodes.find((n) => n.id === a)?.name || ''
    const nameB = data.nodes.find((n) => n.id === b)?.name || ''
    return nameA.localeCompare(nameB)
  })

  for (let iter = 0; iter < 6; iter++) {
    // Score each DM by average rank of its connected mechanisms
    const mechRank = new Map<string, number>()
    mechOrder.forEach((id, i) => mechRank.set(id, i))

    const dmScored = dmOrder.map((dmId) => {
      const mechs = dmToMechs.get(dmId) || []
      const ranks = mechs.map((id) => mechRank.get(id) ?? 0)
      const score = ranks.length > 0 ? ranks.reduce((s, r) => s + r, 0) / ranks.length : mechOrder.length / 2
      return { id: dmId, score }
    })
    dmScored.sort((a, b) => a.score - b.score)
    dmOrder = dmScored.map((d) => d.id)

    // Score each mechanism by average rank of its connected DMs
    const dmRank = new Map<string, number>()
    dmOrder.forEach((id, i) => dmRank.set(id, i))

    const mechScored = mechOrder.map((mechId) => {
      const dms = mechToDms.get(mechId) || []
      const ranks = dms.map((id) => dmRank.get(id) ?? 0)
      const score = ranks.length > 0 ? ranks.reduce((s, r) => s + r, 0) / ranks.length : dmOrder.length / 2
      return { id: mechId, score }
    })
    mechScored.sort((a, b) => a.score - b.score)
    mechOrder = mechScored.map((s) => s.id)
  }

  const DM_COUNT = dmOrder.length
  const MECH_COUNT = mechOrder.length

  // --- Institution on the left ---
  positions.set(institutionId, { x: -200, y: 0 })

  // --- DMs in vertical stack at center ---
  const DM_SPACING = DM_COUNT <= 4 ? 120 : Math.max(110, Math.ceil(480 / DM_COUNT))
  const dmTotalHeight = (DM_COUNT - 1) * DM_SPACING
  for (let i = 0; i < DM_COUNT; i++) {
    positions.set(dmOrder[i], {
      x: 0,
      y: -dmTotalHeight / 2 + i * DM_SPACING,
    })
  }

  // --- Mechanisms: parabolic curved column on the right ---
  const VERT_SPACING = 95
  const BASE_DIST = 200
  const CURVE = Math.min(100, MECH_COUNT * 14)

  for (let i = 0; i < MECH_COUNT; i++) {
    const t = MECH_COUNT === 1 ? 0 : (i / (MECH_COUNT - 1)) * 2 - 1
    const y = t * (MECH_COUNT - 1) * VERT_SPACING / 2
    const x = BASE_DIST + CURVE * (1 - t * t)
    positions.set(mechOrder[i], { x, y })
  }

  return positions
}

/**
 * Compute positions for expanded mechanism view with tripartite flow layout.
 * Institutions on the left, DMs in a vertical stack in the center, mechanism on the right.
 */
function computeMechanismExpandedPositions(
  data: GraphData,
  mechanismId: string,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()

  // Collect connected DM IDs (deduplicated)
  const dmIdSet = new Set<string>()
  for (const edge of data.edges) {
    if (edge.source === mechanismId) {
      const target = data.nodes.find((n) => n.id === edge.target)
      if (target?.primary_type === 'Decision Maker') dmIdSet.add(edge.target)
    }
    if (edge.target === mechanismId) {
      const source = data.nodes.find((n) => n.id === edge.source)
      if (source?.primary_type === 'Decision Maker') dmIdSet.add(edge.source)
    }
  }
  // Collect primary institutions of those DMs (deduplicated)
  const instIdSet = new Set<string>()
  for (const m of data.memberships) {
    if (dmIdSet.has(m.member) && m.membership_type === 'Primary') {
      instIdSet.add(m.institution)
    }
  }
  const instIds = [...instIdSet]

  // Build DM ↔ institution adjacency for primary memberships in this view
  const dmToInsts = new Map<string, string[]>()
  const instToDms = new Map<string, string[]>()
  for (const dmId of dmIdSet) dmToInsts.set(dmId, [])
  for (const instId of instIds) instToDms.set(instId, [])
  for (const m of data.memberships) {
    if (dmIdSet.has(m.member) && m.membership_type === 'Primary' && instIdSet.has(m.institution)) {
      dmToInsts.get(m.member)!.push(m.institution)
      instToDms.get(m.institution)!.push(m.member)
    }
  }

  // Barycenter heuristic: iteratively sort DMs by average institution rank
  // and institutions by average DM rank to minimise membership edge crossings.
  let instOrder = [...instIds].sort((a, b) => {
    const nameA = data.nodes.find((n) => n.id === a)?.name || ''
    const nameB = data.nodes.find((n) => n.id === b)?.name || ''
    return nameA.localeCompare(nameB)
  })
  let dmOrder = [...dmIdSet]

  for (let iter = 0; iter < 6; iter++) {
    // Score each DM by average rank of its connected institutions
    const instRank = new Map<string, number>()
    instOrder.forEach((id, i) => instRank.set(id, i))

    const dmScored = dmOrder.map((dmId) => {
      const insts = dmToInsts.get(dmId) || []
      const ranks = insts.map((id) => instRank.get(id) ?? 0)
      const score = ranks.length > 0 ? ranks.reduce((s, r) => s + r, 0) / ranks.length : instOrder.length / 2
      return { id: dmId, score }
    })
    dmScored.sort((a, b) => a.score - b.score)
    dmOrder = dmScored.map((d) => d.id)

    // Score each institution by average rank of its connected DMs
    const dmRank = new Map<string, number>()
    dmOrder.forEach((id, i) => dmRank.set(id, i))

    const instScored = instOrder.map((instId) => {
      const dms = instToDms.get(instId) || []
      const ranks = dms.map((id) => dmRank.get(id) ?? 0)
      const score = ranks.length > 0 ? ranks.reduce((s, r) => s + r, 0) / ranks.length : dmOrder.length / 2
      return { id: instId, score }
    })
    instScored.sort((a, b) => a.score - b.score)
    instOrder = instScored.map((s) => s.id)
  }

  const dmIds = dmOrder
  const DM_COUNT = dmIds.length

  // --- Mechanism on the right ---
  positions.set(mechanismId, { x: 250, y: 0 })

  // --- DMs in vertical stack at center ---
  // DM diamonds are 100px tall; scale spacing for large counts
  const DM_SPACING = DM_COUNT <= 4 ? 120 : Math.max(110, Math.ceil(480 / DM_COUNT))
  const dmTotalHeight = (DM_COUNT - 1) * DM_SPACING
  for (let i = 0; i < DM_COUNT; i++) {
    positions.set(dmIds[i], {
      x: 0,
      y: -dmTotalHeight / 2 + i * DM_SPACING,
    })
  }

  // --- Institutions on the left, evenly spaced and ordered by barycenter ---
  if (instOrder.length > 0) {
    const INST_X = -200
    const INST_COUNT = instOrder.length
    // Span the same vertical range as the DM stack
    const instTotalHeight = INST_COUNT === 1 ? 0 : dmTotalHeight
    const instSpacing = INST_COUNT === 1 ? 0 : instTotalHeight / (INST_COUNT - 1)

    for (let i = 0; i < INST_COUNT; i++) {
      positions.set(instOrder[i], {
        x: INST_X,
        y: -instTotalHeight / 2 + i * instSpacing,
      })
    }
  }

  return positions
}

/**
 * Compute positions for expanded DM view with tripartite flow layout.
 * Institutions on the left, DM at center, mechanisms in a radial arc on the right.
 */
function computeDmExpandedPositions(
  data: GraphData,
  dmId: string,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()

  // DM at center
  positions.set(dmId, { x: 0, y: 0 })

  // Collect connected mechanism IDs (deduplicated)
  const mechIdSet = new Set<string>()
  for (const edge of data.edges) {
    if (edge.source === dmId) {
      const target = data.nodes.find((n) => n.id === edge.target)
      if (target?.primary_type === 'Mechanism') mechIdSet.add(edge.target)
    }
    if (edge.target === dmId) {
      const source = data.nodes.find((n) => n.id === edge.source)
      if (source?.primary_type === 'Mechanism') mechIdSet.add(edge.source)
    }
  }
  const mechIds = [...mechIdSet]

  // Collect primary institution IDs
  const instIds = data.memberships
    .filter((m) => m.member === dmId && m.membership_type === 'Primary')
    .map((m) => m.institution)

  const MECH_COUNT = mechIds.length
  const INST_COUNT = instIds.length

  // --- Mechanisms: curved column on the right side ---
  // Vertical stack with a parabolic bulge — mechanisms at the center of the
  // fan are pushed further right, creating a natural arc/fan feel without
  // the uneven spacing that a circular arc produces for rectangular nodes.
  const VERT_SPACING = 95  // vertical gap between mechanism centers (nodes are 60px tall)
  const BASE_DIST = 200    // horizontal distance from center for top/bottom mechanisms
  const CURVE = Math.min(100, MECH_COUNT * 14) // extra rightward push at the fan center

  for (let i = 0; i < MECH_COUNT; i++) {
    const t = MECH_COUNT === 1 ? 0 : (i / (MECH_COUNT - 1)) * 2 - 1 // -1 to 1
    const y = t * (MECH_COUNT - 1) * VERT_SPACING / 2
    const x = BASE_DIST + CURVE * (1 - t * t) // parabola: max at center, min at edges
    positions.set(mechIds[i], { x, y })
  }

  // --- Institutions: left side ---
  if (INST_COUNT > 0) {
    const INST_RADIUS = 200
    if (INST_COUNT === 1) {
      positions.set(instIds[0], { x: -INST_RADIUS, y: 0 })
    } else {
      // Spread vertically on the left — institution circles are ~95px
      const instSpacing = 120
      const totalHeight = (INST_COUNT - 1) * instSpacing
      for (let i = 0; i < INST_COUNT; i++) {
        positions.set(instIds[i], {
          x: -INST_RADIUS,
          y: -totalHeight / 2 + i * instSpacing,
        })
      }
    }
  }

  return positions
}

/**
 * Compute positions for all nodes in a circular layout.
 * Mechanisms on an inner ring, decision makers on an outer ring
 * positioned near their connected mechanisms.
 */
function computeCircularPositions(
  data: GraphData,
  orderedMechanisms: GraphNode[],
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  const mechIds = new Set(orderedMechanisms.map((m) => m.id))

  const MECH_COUNT = orderedMechanisms.length
  const INNER_RADIUS = Math.max(300, MECH_COUNT * 27)
  const OUTER_RADIUS_BASE = INNER_RADIUS + 210

  // Place mechanisms evenly on inner ring (start at top)
  const mechAngles = new Map<string, number>()
  for (let i = 0; i < MECH_COUNT; i++) {
    const angle = (2 * Math.PI * i) / MECH_COUNT - Math.PI / 2
    mechAngles.set(orderedMechanisms[i].id, angle)
    positions.set(orderedMechanisms[i].id, {
      x: Math.cos(angle) * INNER_RADIUS,
      y: Math.sin(angle) * INNER_RADIUS,
    })
  }

  // For each DM, compute mean angle of connected mechanisms
  const dms = data.nodes.filter((n) => n.primary_type === 'Decision Maker')
  const placements: { id: string; angle: number; connCount: number }[] = []

  for (const dm of dms) {
    const connAngles: number[] = []
    for (const edge of data.edges) {
      let mechId: string | null = null
      if (edge.source === dm.id && mechIds.has(edge.target)) mechId = edge.target
      if (edge.target === dm.id && mechIds.has(edge.source)) mechId = edge.source
      if (mechId && mechAngles.has(mechId)) {
        connAngles.push(mechAngles.get(mechId)!)
      }
    }

    if (connAngles.length === 0) {
      const h = hashCode(dm.id)
      placements.push({ id: dm.id, angle: ((h >>> 0) % 628) / 100, connCount: 0 })
      continue
    }

    // Circular mean angle
    let sinSum = 0
    let cosSum = 0
    for (const a of connAngles) {
      sinSum += Math.sin(a)
      cosSum += Math.cos(a)
    }
    placements.push({
      id: dm.id,
      angle: Math.atan2(sinSum, cosSum),
      connCount: connAngles.length,
    })
  }

  // Sort by angle for orderly placement
  placements.sort((a, b) => a.angle - b.angle)

  // Split DMs: highly connected ones go inside the circle, others outside
  const INNER_DM_THRESHOLD = 3
  const innerIds = new Set(
    placements.filter((p) => p.connCount >= INNER_DM_THRESHOLD).map((p) => p.id),
  )

  const CENTER_RADIUS = INNER_RADIUS * 0.35
  const MAX_INNER_R = INNER_RADIUS * 0.65

  for (const p of placements) {
    if (innerIds.has(p.id)) {
      // Highly connected DMs go inside the mechanism ring
      positions.set(p.id, {
        x: Math.cos(p.angle) * CENTER_RADIUS,
        y: Math.sin(p.angle) * CENTER_RADIUS,
      })
    } else {
      // Others go on the outer ring
      const radius = OUTER_RADIUS_BASE + (p.connCount > 1 ? 50 : 0)
      positions.set(p.id, {
        x: Math.cos(p.angle) * radius,
        y: Math.sin(p.angle) * radius,
      })
    }
  }

  // Collision resolution — all DMs checked against each other
  const dmPos = placements.map((p) => ({
    id: p.id,
    inner: innerIds.has(p.id),
    ...positions.get(p.id)!,
  }))
  for (let iter = 0; iter < 30; iter++) {
    let moved = false
    for (let i = 0; i < dmPos.length; i++) {
      for (let j = i + 1; j < dmPos.length; j++) {
        const a = dmPos[i]
        const b = dmPos[j]
        let dx = b.x - a.x
        let dy = b.y - a.y
        let dist = Math.sqrt(dx * dx + dy * dy)
        // Jitter identical positions so they don't stay stacked
        if (dist < 0.01) {
          const jitter = 0.1 * (i + 1)
          b.x += jitter
          b.y += jitter
          dx = b.x - a.x
          dy = b.y - a.y
          dist = Math.sqrt(dx * dx + dy * dy)
        }
        // DM diamonds are taller; inner DMs (high-connectivity) need more spacing
        const minDist = (a.inner && b.inner) ? 190 : 170
        if (dist < minDist) {
          const push = (minDist - dist) / 2
          const nx = dx / dist
          const ny = dy / dist
          a.x -= nx * push
          a.y -= ny * push
          b.x += nx * push
          b.y += ny * push
          moved = true
        }
      }
    }
    // Push DMs away from mechanism nodes too
    for (const dp of dmPos) {
      for (const mech of orderedMechanisms) {
        const mp = positions.get(mech.id)!
        const dx = dp.x - mp.x
        const dy = dp.y - mp.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const minDist = 170
        if (dist > 0 && dist < minDist) {
          const push = minDist - dist
          const nx = dx / dist
          const ny = dy / dist
          dp.x += nx * push
          dp.y += ny * push
          moved = true
        }
      }
    }
    for (const dp of dmPos) {
      const r = Math.sqrt(dp.x * dp.x + dp.y * dp.y)
      if (dp.inner) {
        // Keep inside the mechanism ring
        if (r > MAX_INNER_R) {
          const scale = MAX_INNER_R / r
          dp.x *= scale
          dp.y *= scale
        }
      } else {
        // Keep outside the mechanism ring with enough gap for edges
        const minOuterR = INNER_RADIUS + 200
        if (r < minOuterR) {
          const scale = minOuterR / r
          dp.x *= scale
          dp.y *= scale
        }
      }
    }
    if (!moved) break
  }
  for (const dp of dmPos) positions.set(dp.id, { x: dp.x, y: dp.y })

  // Place institution nodes in a vertical column to the left of the main graph
  const institutions = data.nodes.filter((n) => n.primary_type === 'Institution')
  if (institutions.length > 0) {
    // Find bounding box of all mechanism + DM positions
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const [id, pos] of positions) {
      if (institutions.some((inst) => inst.id === id)) continue
      minX = Math.min(minX, pos.x)
      maxX = Math.max(maxX, pos.x)
      minY = Math.min(minY, pos.y)
      maxY = Math.max(maxY, pos.y)
    }

    const centerY = (minY + maxY) / 2
    const instX = minX - 200 // Column to the left of the graph
    const spacing = 130 // Vertical spacing between institutions
    const startY = centerY - ((institutions.length - 1) * spacing) / 2

    for (let i = 0; i < institutions.length; i++) {
      positions.set(institutions[i].id, {
        x: instX,
        y: startY + i * spacing,
      })
    }
  }

  return positions
}

export default function SystemMap({ onNodeSelect, onMechanismExpand, onDmExpand, onInstitutionExpand, focusNodeId, focusCounter, resetCounter }: SystemMapProps) {
  const theme = useTheme()
  const dispatch = useDispatch<AppDispatch>()
  const graphData = useSelector(selectGraphData)
  const graphLoading = useSelector(selectGraphLoading)

  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const layoutRef = useRef<cytoscape.Layouts | null>(null)
  const hasRenderedRef = useRef(false)

  const [currentLevel, setCurrentLevel] = useState<'landing' | 'expanded' | 'expanded-dm' | 'expanded-institution'>('landing')
  const [expandedMechanismId, setExpandedMechanismId] = useState<string | null>(null)
  const [expandedDmId, setExpandedDmId] = useState<string | null>(null)
  const [expandedInstitutionId, setExpandedInstitutionId] = useState<string | null>(null)
  const [hintDismissed, setHintDismissed] = useState(() => !!localStorage.getItem('mbf-graph-hint-seen'))
  const [linkCopied, setLinkCopied] = useState(false)

  // Derive institution colors from graph data
  const institutionColors = useMemo(
    () => graphData ? buildInstitutionColorsFromGraph(graphData.nodes) : new Map<string, string>(),
    [graphData],
  )

  // Derive expanded entity name for breadcrumb
  const expandedEntityName = useMemo(() => {
    if (!graphData) return ''
    const expandedId = expandedMechanismId || expandedDmId || expandedInstitutionId
    if (expandedId) {
      return graphData.nodes.find((n) => n.id === expandedId)?.name ?? ''
    }
    return ''
  }, [graphData, expandedMechanismId, expandedDmId, expandedInstitutionId])

  // Build Level 1 elements: All mechanisms + all decision makers + edges
  // Returns elements (starting at origin for animation) and target positions
  const buildLanding = useCallback(
    (data: GraphData): { elements: ElementDefinition[]; positions: Map<string, { x: number; y: number }> } => {
      const elements: ElementDefinition[] = []

      const mechanisms = data.nodes.filter((n) => n.primary_type === 'Mechanism')
      const orderedMechs = orderMechanismsForCircle(mechanisms, data.edges)
      const positions = computeCircularPositions(data, orderedMechs)

      // Add mechanism nodes
      for (const node of orderedMechs) {
        elements.push({
          data: {
            id: node.id,
            name: node.name,
            primary_type: node.primary_type,
            secondary_type: node.secondary_type,
          },
          position: { x: 0, y: 0 },
        })
      }

      // Add decision maker nodes
      for (const node of data.nodes) {
        if (node.primary_type !== 'Decision Maker') continue
        elements.push({
          data: {
            id: node.id,
            name: node.name,
            primary_type: node.primary_type,
            secondary_type: node.secondary_type,
          },
          position: { x: 0, y: 0 },
        })
      }

      // Add institution nodes
      for (const node of data.nodes) {
        if (node.primary_type !== 'Institution') continue
        elements.push({
          data: {
            id: node.id,
            name: node.name,
            primary_type: node.primary_type,
            secondary_type: node.secondary_type,
          },
          position: { x: 0, y: 0 },
        })
      }

      // Add edges between mechanisms and decision makers
      for (const edge of data.edges) {
        const sourceNode = data.nodes.find((n) => n.id === edge.source)
        const targetNode = data.nodes.find((n) => n.id === edge.target)
        if (!sourceNode || !targetNode) continue
        const types = new Set([sourceNode.primary_type, targetNode.primary_type])
        if (types.has('Mechanism') && types.has('Decision Maker')) {
          elements.push({
            data: {
              id: edge.id,
              source: edge.source,
              target: edge.target,
              relationship_type: edge.relationship_type,
            },
            classes: 'landing-edge',
          })
        }
      }

      // For each DM, add only the single membership edge to the institution
      // with the fewest primary members (same heuristic as border color).
      // This creates decisive clustering — each DM is pulled into one neighborhood.
      const instCounts = new Map<string, number>()
      for (const m of data.memberships) {
        if (m.membership_type === 'Primary') {
          instCounts.set(m.institution, (instCounts.get(m.institution) ?? 0) + 1)
        }
      }
      const dmBestInst = new Map<string, { membership: typeof data.memberships[0] }>()
      for (const m of data.memberships) {
        if (m.membership_type !== 'Primary') continue
        const existing = dmBestInst.get(m.member)
        if (!existing || (instCounts.get(m.institution) ?? Infinity) < (instCounts.get(existing.membership.institution) ?? Infinity)) {
          dmBestInst.set(m.member, { membership: m })
        }
      }
      for (const [, { membership: m }] of dmBestInst) {
        elements.push({
          data: {
            id: `landing-membership-${m.id}`,
            source: m.member,
            target: m.institution,
            relationship_type: m.membership_type,
          },
          classes: 'membership-edge',
        })
      }

      // Add invisible gravity edges from mechanisms to institutions.
      // For each mechanism, count how many of its DMs belong to each institution
      // (using the same "best institution" heuristic). This lets fcose naturally
      // position mechanisms between the institutions their DMs belong to.
      const mechNodes = data.nodes.filter((n) => n.primary_type === 'Mechanism')
      for (const mech of mechNodes) {
        // Count DMs per institution for this mechanism
        const instAffinity = new Map<string, number>()
        for (const edge of data.edges) {
          const dmId = edge.source === mech.id ? edge.target : edge.target === mech.id ? edge.source : null
          if (!dmId) continue
          const dmNode = data.nodes.find((n) => n.id === dmId)
          if (dmNode?.primary_type !== 'Decision Maker') continue
          const bestInst = dmBestInst.get(dmId)
          if (bestInst) {
            const instId = bestInst.membership.institution
            instAffinity.set(instId, (instAffinity.get(instId) ?? 0) + 1)
          }
        }
        // Add an invisible edge to each institution with affinity > 0
        for (const [instId, count] of instAffinity) {
          elements.push({
            data: {
              id: `gravity-${mech.id}-${instId}`,
              source: mech.id,
              target: instId,
              _gravityWeight: count,
            },
            classes: 'gravity-edge',
          })
        }
      }

      return { elements, positions }
    },
    [],
  )

  // Build Level 2 elements: Selected mechanism + connected DMs
  const buildExpanded = useCallback(
    (data: GraphData, mechanismId: string): ElementDefinition[] => {
      const elements: ElementDefinition[] = []

      const mechanism = data.nodes.find((n) => n.id === mechanismId)
      if (!mechanism) return elements

      elements.push({
        data: {
          id: mechanism.id,
          name: mechanism.name,
          primary_type: mechanism.primary_type,
          secondary_type: mechanism.secondary_type,
        },
        classes: 'center-mechanism',
      })

      const connectedDmIds = new Set<string>()
      const relevantEdges: typeof data.edges = []
      for (const edge of data.edges) {
        if (edge.source === mechanismId) {
          const target = data.nodes.find((n) => n.id === edge.target)
          if (target?.primary_type === 'Decision Maker') {
            connectedDmIds.add(edge.target)
            relevantEdges.push(edge)
          }
        }
        if (edge.target === mechanismId) {
          const source = data.nodes.find((n) => n.id === edge.source)
          if (source?.primary_type === 'Decision Maker') {
            connectedDmIds.add(edge.source)
            relevantEdges.push(edge)
          }
        }
      }

      for (const dmId of connectedDmIds) {
        const dm = data.nodes.find((n) => n.id === dmId)
        if (!dm) continue
        elements.push({
          data: {
            id: dm.id,
            name: dm.name,
            primary_type: dm.primary_type,
            secondary_type: dm.secondary_type,
          },
          classes: 'expanded-dm',
        })
      }

      for (const edge of relevantEdges) {
        elements.push({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            relationship_type: edge.relationship_type,
          },
          classes: 'expanded-edge',
        })
      }

      // Add primary institution nodes and membership edges for connected DMs
      const addedInsts = new Set<string>()
      for (const dmId of connectedDmIds) {
        for (const m of data.memberships) {
          if (m.member === dmId && m.membership_type === 'Primary') {
            if (!addedInsts.has(m.institution)) {
              const inst = data.nodes.find((n) => n.id === m.institution)
              if (!inst) continue
              elements.push({
                data: {
                  id: inst.id,
                  name: inst.name,
                  primary_type: inst.primary_type,
                  secondary_type: inst.secondary_type,
                },
              })
              addedInsts.add(m.institution)
            }
            elements.push({
              data: {
                id: `mech-dm-inst-${dmId}-${m.institution}`,
                source: dmId,
                target: m.institution,
                relationship_type: 'Member',
              },
              classes: 'membership-edge',
            })
          }
        }
      }

      return elements
    },
    [],
  )

  // Build DM-centric expanded view: Selected DM + connected mechanisms + edges
  const buildExpandedDm = useCallback(
    (data: GraphData, dmId: string): ElementDefinition[] => {
      const elements: ElementDefinition[] = []

      const dm = data.nodes.find((n) => n.id === dmId)
      if (!dm) return elements

      elements.push({
        data: {
          id: dm.id,
          name: dm.name,
          primary_type: dm.primary_type,
          secondary_type: dm.secondary_type,
        },
        classes: 'center-dm',
      })

      const connectedMechIds = new Set<string>()
      const relevantEdges: typeof data.edges = []
      for (const edge of data.edges) {
        if (edge.source === dmId) {
          const target = data.nodes.find((n) => n.id === edge.target)
          if (target?.primary_type === 'Mechanism') {
            connectedMechIds.add(edge.target)
            relevantEdges.push(edge)
          }
        }
        if (edge.target === dmId) {
          const source = data.nodes.find((n) => n.id === edge.source)
          if (source?.primary_type === 'Mechanism') {
            connectedMechIds.add(edge.source)
            relevantEdges.push(edge)
          }
        }
      }

      for (const mechId of connectedMechIds) {
        const mech = data.nodes.find((n) => n.id === mechId)
        if (!mech) continue
        elements.push({
          data: {
            id: mech.id,
            name: mech.name,
            primary_type: mech.primary_type,
            secondary_type: mech.secondary_type,
          },
        })
      }

      for (const edge of relevantEdges) {
        elements.push({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            relationship_type: edge.relationship_type,
          },
          classes: 'expanded-edge',
        })
      }

      // Add primary institution nodes and membership edges
      for (const m of data.memberships) {
        if (m.member === dmId && m.membership_type === 'Primary') {
          const inst = data.nodes.find((n) => n.id === m.institution)
          if (!inst) continue
          elements.push({
            data: {
              id: inst.id,
              name: inst.name,
              primary_type: inst.primary_type,
              secondary_type: inst.secondary_type,
            },
          })
          elements.push({
            data: {
              id: `dm-inst-${dmId}-${m.institution}`,
              source: dmId,
              target: m.institution,
              relationship_type: 'Member',
            },
            classes: 'membership-edge',
          })
        }
      }

      return elements
    },
    [],
  )

  // Build expanded institution view: institution center + primary DMs + connected mechanisms
  const buildExpandedInstitution = useCallback(
    (data: GraphData, institutionId: string): ElementDefinition[] => {
      const elements: ElementDefinition[] = []

      const institution = data.nodes.find((n) => n.id === institutionId)
      if (!institution) return elements

      elements.push({
        data: {
          id: institution.id,
          name: institution.name,
          primary_type: institution.primary_type,
          secondary_type: institution.secondary_type,
        },
        classes: 'center-institution',
      })

      // Primary DMs of this institution
      const primaryDmIds = data.memberships
        .filter((m) => m.institution === institutionId && m.membership_type === 'Primary')
        .map((m) => m.member)
      const dmIdSet = new Set(primaryDmIds)

      for (const dmId of primaryDmIds) {
        const dm = data.nodes.find((n) => n.id === dmId)
        if (!dm) continue
        elements.push({
          data: {
            id: dm.id,
            name: dm.name,
            primary_type: dm.primary_type,
            secondary_type: dm.secondary_type,
          },
          classes: 'expanded-dm',
        })
      }

      // Add edges from DMs to institution (arrows point toward institution)
      for (const dmId of primaryDmIds) {
        elements.push({
          data: {
            id: `inst-${institutionId}-${dmId}`,
            source: dmId,
            target: institutionId,
            relationship_type: 'Member',
          },
          classes: 'membership-edge',
        })
      }

      // Add mechanisms connected to those DMs and their edges
      const addedMechs = new Set<string>()
      for (const edge of data.edges) {
        let dm: string | null = null
        let mech: string | null = null

        if (dmIdSet.has(edge.source)) {
          const target = data.nodes.find((n) => n.id === edge.target)
          if (target?.primary_type === 'Mechanism') { dm = edge.source; mech = edge.target }
        }
        if (dmIdSet.has(edge.target)) {
          const source = data.nodes.find((n) => n.id === edge.source)
          if (source?.primary_type === 'Mechanism') { dm = edge.target; mech = edge.source }
        }
        if (!dm || !mech) continue

        if (!addedMechs.has(mech)) {
          const mechNode = data.nodes.find((n) => n.id === mech)!
          elements.push({
            data: {
              id: mechNode.id,
              name: mechNode.name,
              primary_type: mechNode.primary_type,
              secondary_type: mechNode.secondary_type,
            },
          })
          addedMechs.add(mech)
        }

        elements.push({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            relationship_type: edge.relationship_type,
          },
          classes: 'expanded-edge',
        })
      }

      return elements
    },
    [],
  )

  const renderLanding = useCallback(() => {
    if (!cyRef.current || !graphData) return
    const cy = cyRef.current
    layoutRef.current?.stop()
    cy.elements().remove()
    cy.resize()

    const { elements } = buildLanding(graphData)
    cy.add(elements)

    // Compute primary member counts per institution (used for DM border + edge elasticity)
    const instMemberCount = new Map<string, number>()
    for (const m of graphData.memberships) {
      if (m.membership_type === 'Primary') {
        instMemberCount.set(m.institution, (instMemberCount.get(m.institution) ?? 0) + 1)
      }
    }
    const maxMembers = Math.max(...instMemberCount.values(), 1)

    // Apply institution dot indicators to DM nodes
    cy.nodes('[primary_type="Decision Maker"]').forEach((node) => {
      applyDotIndicators(node, graphData, institutionColors)

      // Color DM border by primary institution with fewest members
      // (same heuristic as edge elasticity — smaller institution = stronger affinity)
      const primaryInsts = graphData.memberships
        .filter((m) => m.member === node.id() && m.membership_type === 'Primary')
        .map((m) => m.institution)
      if (primaryInsts.length > 0) {
        const bestInst = primaryInsts.reduce((best, id) =>
          (instMemberCount.get(id) ?? Infinity) < (instMemberCount.get(best) ?? Infinity) ? id : best,
        )
        const color = institutionColors.get(bestInst)
        if (color) {
          node.style({
            'border-width': 2.5,
            'border-color': color,
          })
        }
      }
    })

    // Apply institution colors and enlarge institution nodes in landing view
    cy.nodes('[primary_type="Institution"]').forEach((node) => {
      const color = institutionColors.get(node.id()) || theme.palette.institution.main
      node.style({
        'background-color': color,
        width: '120px',
        height: '120px',
        'font-size': '13px',
        'text-max-width': '90px',
      })
    })

    // Pin institutions at evenly-spaced positions to anchor neighborhoods
    const institutions = cy.nodes('[primary_type="Institution"]')
    const INST_RADIUS = 420
    const fixedNodeConstraint: { nodeId: string; position: { x: number; y: number } }[] = []
    institutions.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / institutions.length - Math.PI / 2
      fixedNodeConstraint.push({
        nodeId: node.id(),
        position: {
          x: Math.cos(angle) * INST_RADIUS,
          y: Math.sin(angle) * INST_RADIUS,
        },
      })
    })

    const layout = cy.layout({
      name: 'fcose',
      animate: true,
      animationDuration: 800,
      quality: 'default',
      nodeRepulsion: () => 18000,
      // Short membership edges pull DMs close to institutions;
      // long mechanism edges push mechanisms to the outer ring
      idealEdgeLength: (edge: cytoscape.EdgeSingular) => {
        if (edge.hasClass('gravity-edge')) {
          // Higher affinity → shorter ideal distance to institution
          const weight = edge.data('_gravityWeight') ?? 1
          return Math.max(60, 180 - 40 * weight)
        }
        if (edge.hasClass('membership-edge')) return 100
        return 140 // mechanism↔DM edges
      },
      edgeElasticity: (edge: cytoscape.EdgeSingular) => {
        if (edge.hasClass('gravity-edge')) {
          // Stronger pull for higher affinity (more DMs in that institution)
          const weight = edge.data('_gravityWeight') ?? 1
          return 0.2 + 0.1 * weight
        }
        if (edge.hasClass('membership-edge')) {
          // Find which endpoint is the institution
          const srcType = edge.source().data('primary_type')
          const instId = srcType === 'Institution' ? edge.source().id() : edge.target().id()
          const count = instMemberCount.get(instId) ?? 1
          // Smaller institution → higher elasticity (stronger pull)
          return 0.2 + 1 * (1 - count / maxMembers)
        }
        return 0.5 // mechanism edge pull
      },
      gravity: 0.15,
      gravityRange: 3.8,
      numIter: 5000,
      nodeDimensionsIncludeLabels: true,
      padding: 50,
      fixedNodeConstraint,
    } as cytoscape.LayoutOptions)
    layoutRef.current = layout
    layout.run()
    layout.one('layoutstop', () => {
      cy.fit(undefined, 15)
    })
    setCurrentLevel('landing')

    setExpandedMechanismId(null)
    setExpandedDmId(null)
    setExpandedInstitutionId(null)
    onMechanismExpand?.(null)
    onDmExpand?.(null)
    onInstitutionExpand?.(null)
    onNodeSelect?.(null)
    dispatch(clearDetail())
  }, [graphData, buildLanding, institutionColors, theme.palette.institution.main, onNodeSelect, onMechanismExpand, onDmExpand, onInstitutionExpand, dispatch])

  const renderExpanded = useCallback(
    (mechanismId: string) => {
      if (!cyRef.current || !graphData) return
      const cy = cyRef.current

      const mechanism = graphData.nodes.find((n) => n.id === mechanismId)
      if (!mechanism) return

      // The concentric layout crashes if the container has zero dimensions
      // (e.g. during route transitions before the browser has painted).
      // Defer until the container is laid out.
      const container = containerRef.current
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        requestAnimationFrame(() => renderExpandedRef.current(mechanismId))
        return
      }


      layoutRef.current?.stop()
      cy.elements().remove()
      cy.resize()
      cy.add(buildExpanded(graphData, mechanismId))

      // Apply institution dot indicators to DM nodes
      cy.nodes('[primary_type="Decision Maker"]').forEach((node) => {
        applyDotIndicators(node, graphData, institutionColors)
      })

      // Apply institution colors to institution nodes
      cy.nodes('[primary_type="Institution"]').forEach((node) => {
        const color = institutionColors.get(node.id()) || theme.palette.institution.main
        node.style('background-color', color)
      })

      const positions = computeMechanismExpandedPositions(graphData, mechanismId)

      const layout = cy.layout({
        name: 'preset',
        positions: (node: cytoscape.NodeSingular) => positions.get(node.id()) || { x: 0, y: 0 },
        animate: true,
        animationDuration: 400,
      } as cytoscape.LayoutOptions)
      layoutRef.current = layout
      layout.run()
      layout.one('layoutstop', () => {
        cy.fit(undefined, 60)
      })

      setCurrentLevel('expanded')
      setExpandedMechanismId(mechanismId)
      setExpandedDmId(null)
      setExpandedInstitutionId(null)
      localStorage.setItem('mbf-graph-hint-seen', '1')
      onMechanismExpand?.(mechanismId)
      onDmExpand?.(null)
      onInstitutionExpand?.(null)
      onNodeSelect?.(mechanismId)
      dispatch(selectEntity(mechanismId))
    },
    [graphData, buildExpanded, institutionColors, theme.palette.institution.main, onNodeSelect, onMechanismExpand, onDmExpand, onInstitutionExpand, dispatch],
  )

  const renderExpandedDm = useCallback(
    (dmId: string) => {
      if (!cyRef.current || !graphData) return
      const cy = cyRef.current

      const dm = graphData.nodes.find((n) => n.id === dmId)
      if (!dm) return

      const container = containerRef.current
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        requestAnimationFrame(() => renderExpandedDmRef.current(dmId))
        return
      }

      layoutRef.current?.stop()
      cy.elements().remove()
      cy.resize()
      cy.add(buildExpandedDm(graphData, dmId))

      // Apply institution dot indicators to the center DM node
      applyDotIndicators(cy.getElementById(dmId), graphData, institutionColors)

      // Apply institution colors to institution nodes
      cy.nodes('[primary_type="Institution"]').forEach((node) => {
        const color = institutionColors.get(node.id()) || theme.palette.institution.main
        node.style('background-color', color)
      })

      const positions = computeDmExpandedPositions(graphData, dmId)

      const layout = cy.layout({
        name: 'preset',
        positions: (node: cytoscape.NodeSingular) => positions.get(node.id()) || { x: 0, y: 0 },
        animate: true,
        animationDuration: 400,
      } as cytoscape.LayoutOptions)
      layoutRef.current = layout
      layout.run()
      layout.one('layoutstop', () => {
        ensureEdgeLabelsFit(cy)
        cy.fit(undefined, 60)
      })

      setCurrentLevel('expanded-dm')
      setExpandedDmId(dmId)
      setExpandedMechanismId(null)
      setExpandedInstitutionId(null)
      localStorage.setItem('mbf-graph-hint-seen', '1')
      onMechanismExpand?.(null)
      onDmExpand?.(dmId)
      onInstitutionExpand?.(null)
      onNodeSelect?.(dmId)
      dispatch(selectEntity(dmId))
    },
    [graphData, buildExpandedDm, institutionColors, theme.palette.institution.main, onNodeSelect, onMechanismExpand, onDmExpand, onInstitutionExpand, dispatch],
  )

  const renderExpandedInstitution = useCallback(
    (institutionId: string) => {
      if (!cyRef.current || !graphData) return
      const cy = cyRef.current

      const institution = graphData.nodes.find((n) => n.id === institutionId)
      if (!institution) return

      const container = containerRef.current
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        requestAnimationFrame(() => renderExpandedInstitutionRef.current(institutionId))
        return
      }

      layoutRef.current?.stop()
      cy.elements().remove()
      cy.resize()
      cy.add(buildExpandedInstitution(graphData, institutionId))

      // Apply institution color to center node
      const color = institutionColors.get(institutionId) || theme.palette.institution.main
      cy.getElementById(institutionId).style('background-color', color)

      // Apply DM dot indicators
      cy.nodes('[primary_type="Decision Maker"]').forEach((node) => {
        applyDotIndicators(node, graphData, institutionColors)
      })

      const positions = computeInstitutionExpandedPositions(graphData, institutionId)

      const layout = cy.layout({
        name: 'preset',
        positions: (node: cytoscape.NodeSingular) => positions.get(node.id()) || { x: 0, y: 0 },
        animate: true,
        animationDuration: 400,
      } as cytoscape.LayoutOptions)
      layoutRef.current = layout
      layout.run()
      layout.one('layoutstop', () => {
        cy.fit(undefined, 60)
      })

      setCurrentLevel('expanded-institution')
      setExpandedInstitutionId(institutionId)
      setExpandedMechanismId(null)
      setExpandedDmId(null)
      localStorage.setItem('mbf-graph-hint-seen', '1')
      onMechanismExpand?.(null)
      onDmExpand?.(null)
      onInstitutionExpand?.(institutionId)
      onNodeSelect?.(institutionId)
      dispatch(selectEntity(institutionId))
    },
    [graphData, buildExpandedInstitution, institutionColors, theme.palette.institution.main, onNodeSelect, onMechanismExpand, onDmExpand, onInstitutionExpand, dispatch],
  )

  const handleDmClick = useCallback(
    (dmId: string) => {
      if (!cyRef.current || !graphData) return
      const cy = cyRef.current

      cy.nodes('.active-dm').removeClass('active-dm')
      cy.getElementById(dmId).addClass('active-dm')

      const dm = graphData.nodes.find((n) => n.id === dmId)
      if (!dm) return

      onNodeSelect?.(dmId)
      dispatch(selectEntity(dmId))
    },
    [graphData, onNodeSelect, dispatch],
  )

  // Refs so event handlers always see the latest callbacks
  const currentLevelRef = useRef(currentLevel)
  useEffect(() => { currentLevelRef.current = currentLevel }, [currentLevel])

  const renderExpandedRef = useRef(renderExpanded)
  useEffect(() => { renderExpandedRef.current = renderExpanded }, [renderExpanded])

  const renderExpandedDmRef = useRef(renderExpandedDm)
  useEffect(() => { renderExpandedDmRef.current = renderExpandedDm }, [renderExpandedDm])

  const renderExpandedInstitutionRef = useRef(renderExpandedInstitution)
  useEffect(() => { renderExpandedInstitutionRef.current = renderExpandedInstitution }, [renderExpandedInstitution])

  const handleDmClickRef = useRef(handleDmClick)
  useEffect(() => { handleDmClickRef.current = handleDmClick }, [handleDmClick])

  const renderLandingRef = useRef(renderLanding)
  useEffect(() => { renderLandingRef.current = renderLanding }, [renderLanding])

  const onNodeSelectRef = useRef(onNodeSelect)
  useEffect(() => { onNodeSelectRef.current = onNodeSelect }, [onNodeSelect])

  const graphDataRef = useRef(graphData)
  useEffect(() => { graphDataRef.current = graphData }, [graphData])

  // Handle external focusNodeId (from Browse view or search)
  useEffect(() => {
    if (!focusNodeId || !graphData || !cyRef.current) return

    const node = graphData.nodes.find((n) => n.id === focusNodeId)
    if (!node) return

    if (node.primary_type === 'Mechanism') {
      renderExpanded(focusNodeId)
    } else if (node.primary_type === 'Decision Maker') {
      renderExpandedDm(focusNodeId)
    } else if (node.primary_type === 'Institution') {
      renderExpandedInstitution(focusNodeId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNodeId, focusCounter, graphData])

  // Handle external reset (e.g. detail panel close button)
  useEffect(() => {
    if (!resetCounter || !cyRef.current) return
    renderLanding()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetCounter])

  // Initialize cytoscape and render when graphData is available
  useEffect(() => {
    if (!containerRef.current || !graphData) return

    if (!cyRef.current) {
      const cy = cytoscape({
        container: containerRef.current,
        style: cytoscapeStyles,
        userZoomingEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false,
        selectionType: 'single',
      })

      cy.on('tap', 'node', (evt) => {
        const nodeData = evt.target.data()

        if (currentLevelRef.current === 'landing') {
          if (nodeData.primary_type === 'Mechanism') {
            renderExpandedRef.current(nodeData.id)
          } else if (nodeData.primary_type === 'Decision Maker') {
            renderExpandedDmRef.current(nodeData.id)
          } else if (nodeData.primary_type === 'Institution') {
            renderExpandedInstitutionRef.current(nodeData.id)
          }
        } else if (currentLevelRef.current === 'expanded') {
          if (nodeData.primary_type === 'Decision Maker') {
            handleDmClickRef.current(nodeData.id)
          } else if (nodeData.primary_type === 'Mechanism') {
            // Click the center mechanism to open its detail panel
            evt.target.cy().nodes('.active-dm').removeClass('active-dm')
            onNodeSelectRef.current?.(nodeData.id)
            dispatch(selectEntity(nodeData.id))
          } else if (nodeData.primary_type === 'Institution') {
            onNodeSelectRef.current?.(nodeData.id)
            dispatch(selectEntity(nodeData.id))
          }
        } else if (currentLevelRef.current === 'expanded-dm') {
          if (nodeData.primary_type === 'Mechanism') {
            onNodeSelectRef.current?.(nodeData.id)
            dispatch(selectEntity(nodeData.id))
          } else if (nodeData.primary_type === 'Decision Maker') {
            onNodeSelectRef.current?.(nodeData.id)
            dispatch(selectEntity(nodeData.id))
          } else if (nodeData.primary_type === 'Institution') {
            onNodeSelectRef.current?.(nodeData.id)
            dispatch(selectEntity(nodeData.id))
          }
        } else if (currentLevelRef.current === 'expanded-institution') {
          if (nodeData.primary_type === 'Decision Maker') {
            // Click a DM to show its detail
            evt.target.cy().nodes('.active-dm').removeClass('active-dm')
            evt.target.addClass('active-dm')
            onNodeSelectRef.current?.(nodeData.id)
            dispatch(selectEntity(nodeData.id))
          } else if (nodeData.primary_type === 'Mechanism') {
            onNodeSelectRef.current?.(nodeData.id)
            dispatch(selectEntity(nodeData.id))
          } else if (nodeData.primary_type === 'Institution') {
            // Re-click center institution to re-open its detail
            onNodeSelectRef.current?.(nodeData.id)
            dispatch(selectEntity(nodeData.id))
          }
        }
      })

      // Double-click to navigate between expanded views
      cy.on('dbltap', 'node', (evt) => {
        const nodeData = evt.target.data()

        if (currentLevelRef.current === 'expanded' && nodeData.primary_type === 'Decision Maker') {
          renderExpandedDmRef.current(nodeData.id)
        } else if (currentLevelRef.current === 'expanded' && nodeData.primary_type === 'Institution') {
          renderExpandedInstitutionRef.current(nodeData.id)
        } else if (currentLevelRef.current === 'expanded-dm' && nodeData.primary_type === 'Mechanism') {
          renderExpandedRef.current(nodeData.id)
        } else if (currentLevelRef.current === 'expanded-dm' && nodeData.primary_type === 'Institution') {
          renderExpandedInstitutionRef.current(nodeData.id)
        } else if (currentLevelRef.current === 'expanded-institution' && nodeData.primary_type === 'Decision Maker') {
          renderExpandedDmRef.current(nodeData.id)
        } else if (currentLevelRef.current === 'expanded-institution' && nodeData.primary_type === 'Mechanism') {
          renderExpandedRef.current(nodeData.id)
        }
      })

      cy.on('mouseover', 'edge', (evt) => {
        if (currentLevelRef.current === 'landing' && !evt.target.hasClass('gravity-edge')) {
          evt.target.addClass('hover-edge')
        }
      })

      cy.on('mouseout', 'edge', (evt) => {
        evt.target.removeClass('hover-edge')
      })

      // Node hover: highlight connected subgraph, dim the rest
      cy.on('mouseover', 'node', (evt) => {
        const node = evt.target
        const data = graphDataRef.current

        // Institution hover on landing: highlight members + their mechanisms
        if (data && node.data('primary_type') === 'Institution' && currentLevelRef.current === 'landing') {
          const instId = node.id()
          const memberIds = new Set(
            data.memberships
              .filter((m) => m.institution === instId && m.membership_type === 'Primary')
              .map((m) => m.member),
          )
          const mechIds = new Set(
            data.edges
              .filter((e) => memberIds.has(e.target) || memberIds.has(e.source))
              .flatMap((e) => [e.source, e.target]),
          )
          const relatedIds = new Set([...memberIds, ...mechIds, instId])

          cy.elements().addClass('dimmed')
          cy.nodes().forEach((n) => {
            if (relatedIds.has(n.id())) n.removeClass('dimmed').addClass('highlighted')
          })
          cy.edges().forEach((e) => {
            if (e.hasClass('gravity-edge')) return // never show gravity edges
            const src = e.data('source')
            const tgt = e.data('target')
            if (e.hasClass('membership-edge')) {
              // Only highlight membership edges TO this institution
              if (src === instId || tgt === instId) {
                e.removeClass('dimmed').addClass('highlighted')
              }
            } else if ((memberIds.has(src) || memberIds.has(tgt)) && (mechIds.has(src) || mechIds.has(tgt))) {
              e.removeClass('dimmed').addClass('highlighted')
            }
          })
          return
        }

        // Mechanism hover on landing: highlight connected DMs + their primary institutions
        if (data && node.data('primary_type') === 'Mechanism' && currentLevelRef.current === 'landing') {
          const mechId = node.id()
          // Find connected DMs
          const dmIds = new Set(
            data.edges
              .filter((e) => e.source === mechId || e.target === mechId)
              .flatMap((e) => [e.source, e.target])
              .filter((id) => id !== mechId && data.nodes.find((n) => n.id === id)?.primary_type === 'Decision Maker'),
          )
          // Find primary institutions of those DMs
          const instIds = new Set(
            data.memberships
              .filter((m) => dmIds.has(m.member) && m.membership_type === 'Primary')
              .map((m) => m.institution),
          )
          const relatedIds = new Set([mechId, ...dmIds, ...instIds])

          cy.elements().addClass('dimmed')
          cy.nodes().forEach((n) => {
            if (relatedIds.has(n.id())) n.removeClass('dimmed').addClass('highlighted')
          })
          cy.edges().forEach((e) => {
            if (e.hasClass('gravity-edge')) return // never show gravity edges
            const src = e.data('source')
            const tgt = e.data('target')
            if (e.hasClass('membership-edge')) {
              // Highlight membership edges between highlighted DMs and institutions
              if ((dmIds.has(src) && instIds.has(tgt)) || (dmIds.has(tgt) && instIds.has(src))) {
                e.removeClass('dimmed').addClass('highlighted')
              }
            } else if ((src === mechId && dmIds.has(tgt)) || (tgt === mechId && dmIds.has(src))) {
              e.removeClass('dimmed').addClass('highlighted')
            }
          })
          return
        }

        const connectedEdges = node.connectedEdges()
        const connectedNodes = connectedEdges.connectedNodes()

        cy.elements().addClass('dimmed')
        node.removeClass('dimmed').addClass('highlighted')
        connectedEdges.removeClass('dimmed').addClass('highlighted')
        connectedNodes.removeClass('dimmed').addClass('highlighted')
      })

      cy.on('mouseout', 'node', () => {
        cyRef.current?.elements().removeClass('dimmed highlighted')
      })

      // Background tap returns to landing from expanded views
      cy.on('tap', (evt) => {
        if (evt.target === cy && currentLevelRef.current !== 'landing') {
          renderLandingRef.current()
        }
      })

      cyRef.current = cy
    }

    // Only render on first initialization, not on graphData refetch.
    // If we have a focusNodeId from navigation (e.g. Browse → Home),
    // render expanded view directly. The focusNodeId effect can't handle
    // this case because cy doesn't exist yet when it runs (effect ordering).
    if (!hasRenderedRef.current) {
      hasRenderedRef.current = true
      if (focusNodeId) {
        const node = graphData.nodes.find((n) => n.id === focusNodeId)
        if (node?.primary_type === 'Mechanism') {
          renderExpanded(focusNodeId)
        } else if (node?.primary_type === 'Decision Maker') {
          renderExpandedDm(focusNodeId)
        } else if (node?.primary_type === 'Institution') {
          renderExpandedInstitution(focusNodeId)
        } else {
          renderLanding()
        }
      } else {
        renderLanding()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData])

  // Cleanup on unmount only (not on graphData change)
  useEffect(() => {
    return () => {
      layoutRef.current?.stop()
      layoutRef.current = null
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
      hasRenderedRef.current = false
    }
  }, [])

  const handleReset = useCallback(() => {
    renderLanding()
  }, [renderLanding])

  // Escape key returns to landing from expanded views
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentLevelRef.current !== 'landing') {
        renderLandingRef.current()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleZoomIn = useCallback(() => {
    if (!cyRef.current) return
    const cy = cyRef.current
    cy.animate({ zoom: cy.zoom() * 1.3, center: { eles: cy.elements() } }, { duration: 200 })
  }, [])

  const handleZoomOut = useCallback(() => {
    if (!cyRef.current) return
    const cy = cyRef.current
    cy.animate({ zoom: cy.zoom() / 1.3, center: { eles: cy.elements() } }, { duration: 200 })
  }, [])

  const handleFitAll = useCallback(() => {
    if (!cyRef.current) return
    cyRef.current.animate({ fit: { eles: cyRef.current.elements(), padding: 30 } }, { duration: 300 })
  }, [])

  if (graphLoading && !graphData) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading system map...</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ position: 'relative', height: '100%' }}>
      <Box
        ref={containerRef}
        sx={{
          height: '100%',
          backgroundColor: 'background.default',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}
      />
      {/* Help overlay — shown on first visit or when ? is clicked */}
      {!hintDismissed && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 5,
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid',
            borderColor: 'divider',
            px: 3.5,
            py: 2.5,
            borderRadius: 2,
            maxWidth: 340,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }}
        >
          <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.95rem', mb: 1 }}>
            Explore the Pretrial System
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 14, height: 9, borderRadius: 0.5, backgroundColor: 'primary.main', flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Mechanisms</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 11, height: 11, transform: 'rotate(45deg)', backgroundColor: 'secondary.main', border: '2px solid', borderColor: 'institution.main', flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Decision Makers</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'institution.main', flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Institutions</Typography>
            </Box>
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', lineHeight: 1.5 }}>
            Click any node to see details. Double-click to explore its connections. Press <strong>Esc</strong> or click the background to return.
          </Typography>
          <Link
            component="button"
            onClick={() => {
              localStorage.setItem('mbf-graph-hint-seen', '1')
              setHintDismissed(true)
            }}
            sx={{
              display: 'block',
              mt: 1.5,
              fontSize: '0.8rem',
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Got it
          </Link>
        </Box>
      )}
      {/* Breadcrumb */}
      {currentLevel !== 'landing' && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            backgroundColor: 'rgba(255,255,255,0.92)',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            px: 1.5,
            py: 0.75,
            zIndex: 10,
            maxWidth: '60%',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Link
              component="button"
              onClick={handleReset}
              sx={{
                color: 'primary.main',
                textDecoration: 'none',
                fontSize: '0.85rem',
                '&:hover': { textDecoration: 'underline' },
                whiteSpace: 'nowrap',
              }}
            >
              &larr; System Map
            </Link>
            <Typography sx={{ color: 'text.disabled', fontSize: '0.85rem' }}>/</Typography>
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: '0.85rem',
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {expandedEntityName}
            </Typography>
            <Tooltip title={linkCopied ? 'Copied!' : 'Copy link'} arrow>
              <IconButton
                size="small"
                aria-label="Copy link to this view"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  setLinkCopied(true)
                  setTimeout(() => setLinkCopied(false), 2000)
                }}
                sx={{ ml: 0.5, width: 24, height: 24 }}
              >
                <LinkIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: 'text.disabled',
              mt: 0.25,
              display: 'block',
              fontSize: '0.7rem',
            }}
          >
            <strong>Click</strong> a node for details · <strong>Double-click</strong> to explore · <strong>Esc</strong> to return
          </Typography>
        </Box>
      )}
      {/* Legend */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          px: 1.5,
          py: 1,
          zIndex: 10,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 16, height: 10, borderRadius: 0.5, backgroundColor: 'primary.main', flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: '#333', lineHeight: 1.2 }}>Mechanism</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, transform: 'rotate(45deg)', backgroundColor: 'secondary.main', border: '2px solid', borderColor: 'institution.main', flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: '#333', lineHeight: 1.2 }}>Decision Maker</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: 'institution.main', flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: '#333', lineHeight: 1.2 }}>Institution</Typography>
        </Box>
        <Box sx={{ mt: 0.75, borderTop: '1px solid', borderColor: 'divider', pt: 0.75 }}>
          <Typography variant="caption" sx={{ color: '#555', fontWeight: 600 }}>
            Institutions
          </Typography>
          {graphData?.nodes
            .filter((n) => n.primary_type === 'Institution')
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((inst) => {
              const color = institutionColors.get(inst.id) || '#888'
              return (
                <Box key={inst.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                    <Box sx={{
                      width: 9, height: 9, borderRadius: '50%',
                      backgroundColor: color, flexShrink: 0,
                    }} />
                    <Box sx={{
                      width: 9, height: 9, borderRadius: '50%',
                      border: `1.5px solid ${color}`,
                      backgroundColor: 'transparent', flexShrink: 0,
                    }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#333', lineHeight: 1.2 }}>
                    {inst.name}
                  </Typography>
                </Box>
              )
            })}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#777', lineHeight: 1.2 }}>
              ● Primary &middot; ○ External
            </Typography>
          </Box>
        </Box>
      </Box>
      {/* Floating map controls */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          zIndex: 10,
        }}
      >
        <IconButton
          onClick={handleZoomIn}
          size="small"
          aria-label="Zoom in"
          sx={{
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': { backgroundColor: 'background.paper' },
            width: 36,
            height: 36,
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
        <IconButton
          onClick={handleZoomOut}
          size="small"
          aria-label="Zoom out"
          sx={{
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': { backgroundColor: 'background.paper' },
            width: 36,
            height: 36,
          }}
        >
          <RemoveIcon fontSize="small" />
        </IconButton>
        <IconButton
          onClick={handleFitAll}
          size="small"
          aria-label="Fit all nodes in view"
          sx={{
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': { backgroundColor: 'background.paper' },
            width: 36,
            height: 36,
          }}
        >
          <ZoomOutMapIcon fontSize="small" />
        </IconButton>
        <IconButton
          onClick={() => setHintDismissed(false)}
          size="small"
          aria-label="Show help"
          sx={{
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': { backgroundColor: 'background.paper' },
            width: 36,
            height: 36,
            mt: 1,
          }}
        >
          <HelpOutlineIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  )
}
