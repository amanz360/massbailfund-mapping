import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type cytoscape from 'cytoscape'
import type { Core } from 'cytoscape'
import type { AppDispatch } from '../../../store/store'
import type { GraphData } from '../../../types/models'
import type { ViewLevel, ExpandedViewType } from '../types'
import { selectEntity } from '../../../store/slices/detailSlice'

/**
 * Registers all Cytoscape event handlers — tap, double-tap, hover, and
 * keyboard shortcuts. Creates stable refs internally so event handlers
 * registered once (on cyReady) always read current state.
 */
export function useGraphEvents(
  cyRef: MutableRefObject<Core | null>,
  cyReady: boolean,
  options: {
    currentLevel: ViewLevel
    graphData: GraphData | null
    renderLanding: () => void
    renderExpanded: (viewType: ExpandedViewType, entityId: string) => void
    onNodeSelect?: (id: string | null) => void
    dispatch: AppDispatch
  },
): void {
  const { currentLevel, graphData, renderLanding, renderExpanded, onNodeSelect, dispatch } = options

  // Ref synchronization — event handlers are registered once (on cyReady) and
  // read current state through stable refs to avoid stale closures.
  const currentLevelRef = useRef(currentLevel)
  useEffect(() => { currentLevelRef.current = currentLevel }, [currentLevel])

  const graphDataRef = useRef(graphData)
  useEffect(() => { graphDataRef.current = graphData }, [graphData])

  const renderLandingRef = useRef(renderLanding)
  useEffect(() => { renderLandingRef.current = renderLanding }, [renderLanding])

  const renderExpandedRef = useRef(renderExpanded)
  useEffect(() => { renderExpandedRef.current = renderExpanded }, [renderExpanded])

  const onNodeSelectRef = useRef(onNodeSelect)
  useEffect(() => { onNodeSelectRef.current = onNodeSelect }, [onNodeSelect])

  // Register all cytoscape event handlers once cy is ready
  useEffect(() => {
    const cy = cyRef.current
    if (!cy || !cyReady) return

    // --- Tap handler (single click) ---
    cy.on('tap', 'node', (evt) => {
      const nodeData = evt.target.data()

      // Landing view: navigate to expanded view for the clicked entity
      if (currentLevelRef.current === 'landing') {
        const typeMap: Record<string, ExpandedViewType> = {
          'Mechanism': 'mechanism',
          'Decision Maker': 'dm',
          'Institution': 'institution',
        }
        const viewType = typeMap[nodeData.primary_type]
        if (viewType) renderExpandedRef.current(viewType, nodeData.id)
        return
      }

      // Expanded views: select entity for detail panel
      // DM clicks toggle active-dm class (in mechanism and institution views)
      if (nodeData.primary_type === 'Decision Maker' &&
          (currentLevelRef.current === 'expanded-mechanism' || currentLevelRef.current === 'expanded-institution')) {
        evt.target.cy().nodes('.active-dm').removeClass('active-dm')
        evt.target.addClass('active-dm')
      } else if (nodeData.primary_type === 'Mechanism' && currentLevelRef.current === 'expanded-mechanism') {
        // Clicking center mechanism clears DM selection
        evt.target.cy().nodes('.active-dm').removeClass('active-dm')
      }

      onNodeSelectRef.current?.(nodeData.id)
      dispatch(selectEntity(nodeData.id))
    })

    // --- Double-tap handler (navigate between expanded views) ---
    cy.on('dbltap', 'node', (evt) => {
      const nodeData = evt.target.data()

      if (currentLevelRef.current === 'expanded-mechanism' && nodeData.primary_type === 'Decision Maker') {
        renderExpandedRef.current('dm', nodeData.id)
      } else if (currentLevelRef.current === 'expanded-mechanism' && nodeData.primary_type === 'Institution') {
        renderExpandedRef.current('institution', nodeData.id)
      } else if (currentLevelRef.current === 'expanded-dm' && nodeData.primary_type === 'Mechanism') {
        renderExpandedRef.current('mechanism', nodeData.id)
      } else if (currentLevelRef.current === 'expanded-dm' && nodeData.primary_type === 'Institution') {
        renderExpandedRef.current('institution', nodeData.id)
      } else if (currentLevelRef.current === 'expanded-institution' && nodeData.primary_type === 'Decision Maker') {
        renderExpandedRef.current('dm', nodeData.id)
      } else if (currentLevelRef.current === 'expanded-institution' && nodeData.primary_type === 'Mechanism') {
        renderExpandedRef.current('mechanism', nodeData.id)
      }
    })

    // --- Edge hover handlers ---
    cy.on('mouseover', 'edge', (evt) => {
      if (currentLevelRef.current === 'landing' && !evt.target.hasClass('hidden-membership-edge')) {
        evt.target.addClass('hover-edge')
      }
    })

    cy.on('mouseout', 'edge', (evt) => {
      evt.target.removeClass('hover-edge')
    })

    // --- Node hover: highlight connected subgraph, dim the rest ---
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
          if (e.hasClass('hidden-membership-edge')) return
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
          if (e.hasClass('hidden-membership-edge')) return
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

      // DM hover on landing: highlight connected mechanisms + all primary institutions
      if (data && node.data('primary_type') === 'Decision Maker' && currentLevelRef.current === 'landing') {
        const dmId = node.id()
        // Find connected mechanisms
        const mechIds = new Set(
          data.edges
            .filter((e) => e.source === dmId || e.target === dmId)
            .flatMap((e) => [e.source, e.target])
            .filter((id) => id !== dmId && data.nodes.find((n) => n.id === id)?.primary_type === 'Mechanism'),
        )
        // Find ALL primary institutions for this DM
        const instIds = new Set(
          data.memberships
            .filter((m) => m.member === dmId && m.membership_type === 'Primary')
            .map((m) => m.institution),
        )
        const relatedIds = new Set([dmId, ...mechIds, ...instIds])

        cy.elements().addClass('dimmed')
        cy.nodes().forEach((n) => {
          if (relatedIds.has(n.id())) n.removeClass('dimmed').addClass('highlighted')
        })
        cy.edges().forEach((e) => {
          const src = e.data('source')
          const tgt = e.data('target')
          // Reveal hidden membership edges for this DM so all primary institutions show
          if (e.hasClass('membership-edge') || e.hasClass('hidden-membership-edge')) {
            if ((src === dmId && instIds.has(tgt)) || (tgt === dmId && instIds.has(src))) {
              if (e.hasClass('hidden-membership-edge')) e.addClass('revealed')
              e.removeClass('dimmed').addClass('highlighted')
            }
          } else if ((src === dmId && mechIds.has(tgt)) || (tgt === dmId && mechIds.has(src))) {
            e.removeClass('dimmed').addClass('highlighted')
          }
        })
        return
      }

      // Default: highlight direct neighbors (for expanded views)
      const connectedEdges = node.connectedEdges().filter((e: cytoscape.EdgeSingular) => !e.hasClass('hidden-membership-edge'))
      const connectedNodes = connectedEdges.connectedNodes()

      cy.elements().addClass('dimmed')
      node.removeClass('dimmed').addClass('highlighted')
      connectedEdges.removeClass('dimmed').addClass('highlighted')
      connectedNodes.removeClass('dimmed').addClass('highlighted')
    })

    // --- Node mouseout: remove all dim/highlight ---
    cy.on('mouseout', 'node', () => {
      const c = cyRef.current
      if (!c) return
      c.elements().removeClass('dimmed highlighted')
      // Remove revealed class so hidden membership edges go back to invisible
      c.edges('.hidden-membership-edge').removeClass('revealed')
    })

    // --- Background tap: return to landing from expanded views ---
    cy.on('tap', (evt) => {
      if (evt.target === cy && currentLevelRef.current !== 'landing') {
        renderLandingRef.current()
      }
    })

    return () => {
      cy.removeAllListeners()
    }
  // Registers once when cy is ready; all mutable state is accessed via refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cyReady])

  // --- Escape key: return to landing from expanded views ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentLevelRef.current !== 'landing') {
        renderLandingRef.current()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentLevelRef, renderLandingRef])
}
