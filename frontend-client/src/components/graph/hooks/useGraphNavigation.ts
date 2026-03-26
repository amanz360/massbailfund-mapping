import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import cytoscape, { type Core, type Layouts } from 'cytoscape'
import fcose from 'cytoscape-fcose'
import type { AppDispatch } from '../../../store/store'
import type { GraphData } from '../../../types/models'
import type { ViewLevel, ExpandedViewType } from '../types'
import { selectEntity, clearDetail } from '../../../store/slices/detailSlice'
import { cytoscapeStyles } from '../cytoscape-styles'
import { buildLandingElements, buildExpandedElements } from '../elements'
import { applyLandingLayout, computeExpandedPositions, ensureEdgeLabelsFit } from '../layouts'
import { applyDotIndicators } from '../utils'

cytoscape.use(fcose)

/**
 * Central coordinator for graph view state, Cytoscape lifecycle, and rendering.
 * Creates and owns the Cytoscape instance, manages which view is active
 * (landing, mechanism-expanded, etc.), and exposes renderLanding/renderExpanded
 * functions that build elements and apply layouts from the extracted modules.
 */
export function useGraphNavigation(
  graphData: GraphData | null,
  institutionColors: Map<string, string>,
  fallbackInstitutionColor: string,
  dispatch: AppDispatch,
  callbacks: {
    onNodeSelect?: (id: string | null) => void
    onMechanismExpand?: (id: string | null) => void
    onDmExpand?: (id: string | null) => void
    onInstitutionExpand?: (id: string | null) => void
  },
  initialFocusNodeId?: string | null,
) {
  // Cytoscape instance refs + cleanup
  const cyRef = useRef<Core | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const layoutRef = useRef<Layouts | null>(null)

  useEffect(() => {
    return () => {
      layoutRef.current?.stop()
      layoutRef.current = null
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
    }
  }, [])

  const [currentLevel, setCurrentLevel] = useState<ViewLevel>('landing')
  const [expandedEntityId, setExpandedEntityId] = useState<string | null>(null)
  const [cyReady, setCyReady] = useState(false)

  // Derive expanded entity name for breadcrumb
  const expandedEntityName = useMemo(() => {
    if (!graphData || !expandedEntityId) return ''
    return graphData.nodes.find((n) => n.id === expandedEntityId)?.name ?? ''
  }, [graphData, expandedEntityId])

  const renderLanding = useCallback(() => {
    if (!cyRef.current || !graphData) return
    const cy = cyRef.current
    layoutRef.current?.stop()
    cy.elements().remove()
    cy.resize()

    const elements = buildLandingElements(graphData)
    cy.add(elements)

    const layout = applyLandingLayout(cy, graphData, institutionColors, fallbackInstitutionColor)
    layoutRef.current = layout

    setCurrentLevel('landing')
    setExpandedEntityId(null)
    callbacks.onMechanismExpand?.(null)
    callbacks.onDmExpand?.(null)
    callbacks.onInstitutionExpand?.(null)
    callbacks.onNodeSelect?.(null)
    dispatch(clearDetail())
  }, [cyRef, layoutRef, graphData, institutionColors, fallbackInstitutionColor, dispatch, callbacks])

  const renderExpanded = useCallback((viewType: ExpandedViewType, entityId: string) => {
    if (!cyRef.current || !graphData) return
    const cy = cyRef.current
    const entity = graphData.nodes.find((n) => n.id === entityId)
    if (!entity) return

    layoutRef.current?.stop()
    cy.elements().remove()
    cy.resize()

    const elements = buildExpandedElements(viewType, entityId, graphData)
    cy.add(elements)

    // Apply decorations
    cy.nodes('[primary_type="Decision Maker"]').forEach((node) => {
      applyDotIndicators(node, graphData, institutionColors)
    })
    cy.nodes('[primary_type="Institution"]').forEach((node) => {
      const color = institutionColors.get(node.id()) || fallbackInstitutionColor
      node.style('background-color', color)
    })

    const positions = computeExpandedPositions(viewType, entityId, graphData)
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

    // Update state + notify parent
    setCurrentLevel(`expanded-${viewType}`)
    setExpandedEntityId(entityId)

    callbacks.onMechanismExpand?.(viewType === 'mechanism' ? entityId : null)
    callbacks.onDmExpand?.(viewType === 'dm' ? entityId : null)
    callbacks.onInstitutionExpand?.(viewType === 'institution' ? entityId : null)
    callbacks.onNodeSelect?.(entityId)
    dispatch(selectEntity(entityId))
  }, [cyRef, layoutRef, graphData, institutionColors, fallbackInstitutionColor, dispatch, callbacks])

  // Initialize cytoscape and do initial render when graphData is available
  useEffect(() => {
    if (!containerRef.current || !graphData) return
    if (cyRef.current) return  // Already initialized

    cyRef.current = cytoscape({
      container: containerRef.current,
      style: cytoscapeStyles,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      selectionType: 'single',
    })
    setCyReady(true)

    // Initial render
    if (initialFocusNodeId) {
      const node = graphData.nodes.find((n) => n.id === initialFocusNodeId)
      if (node?.primary_type === 'Mechanism') renderExpanded('mechanism', initialFocusNodeId)
      else if (node?.primary_type === 'Decision Maker') renderExpanded('dm', initialFocusNodeId)
      else if (node?.primary_type === 'Institution') renderExpanded('institution', initialFocusNodeId)
      else renderLanding()
    } else {
      renderLanding()
    }
  // One-time init when graphData first arrives; renderLanding/renderExpanded are stable callbacks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData])

  return {
    cyRef,
    containerRef,
    currentLevel,
    expandedEntityName,
    cyReady,
    renderLanding,
    renderExpanded,
  }
}
