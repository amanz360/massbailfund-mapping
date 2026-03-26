import type { Core } from 'cytoscape'

/**
 * After layout, ensure edge labels fit by pushing outer nodes further
 * from the center node when the visible edge gap is too narrow.
 */
export function ensureEdgeLabelsFit(cy: Core) {
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
      const isSrcCenter = src.hasClass('center-mechanism') || src.hasClass('center-dm') || src.hasClass('center-institution')
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
