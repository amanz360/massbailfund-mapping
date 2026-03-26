import { useState, useCallback, useRef, useEffect } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import cytoscape, { type Core } from 'cytoscape'
import fcose from 'cytoscape-fcose'
import type { AppDispatch } from '../../../store/store'
import type { GraphData } from '../../../types/models'
import type { ViewLevel, ExpandedViewType } from '../types'
import { selectEntity, clearDetail } from '../../../store/slices/detailSlice'
import { cytoscapeStyles } from '../cytoscape-styles'
import { buildLandingElements } from '../elements/landingElements'
import { buildExpandedElements } from '../elements/expandedElements'
import { applyLandingLayout } from '../layouts/landingFcose'
import { computeExpandedPositions } from '../layouts/expandedLayout'
import { ensureEdgeLabelsFit } from '../layouts/edgeLabelSpacing'
import { applyDotIndicators } from '../utils/dotIndicators'

cytoscape.use(fcose)

export function useGraphNavigation(
  cyRef: MutableRefObject<Core | null>,
  containerRef: RefObject<HTMLDivElement | null>,
  layoutRef: MutableRefObject<any>,
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
  const [currentLevel, setCurrentLevel] = useState<ViewLevel>('landing')
  const [expandedMechanismId, setExpandedMechanismId] = useState<string | null>(null)
  const [expandedDmId, setExpandedDmId] = useState<string | null>(null)
  const [expandedInstitutionId, setExpandedInstitutionId] = useState<string | null>(null)
  const [cyReady, setCyReady] = useState(false)

  // Derive expanded entity name for breadcrumb
  const expandedEntityName = (() => {
    if (!graphData) return ''
    const expandedId = expandedMechanismId || expandedDmId || expandedInstitutionId
    if (expandedId) {
      return graphData.nodes.find((n) => n.id === expandedId)?.name ?? ''
    }
    return ''
  })()

  const renderLanding = useCallback(() => {
    if (!cyRef.current || !graphData) return
    const cy = cyRef.current
    layoutRef.current?.stop()
    cy.elements().remove()
    cy.resize()

    const elements = buildLandingElements(graphData, institutionColors)
    cy.add(elements)

    const layout = applyLandingLayout(cy, graphData, institutionColors, fallbackInstitutionColor)
    layoutRef.current = layout

    setCurrentLevel('landing')
    setExpandedMechanismId(null)
    setExpandedDmId(null)
    setExpandedInstitutionId(null)
    callbacks.onMechanismExpand?.(null)
    callbacks.onDmExpand?.(null)
    callbacks.onInstitutionExpand?.(null)
    callbacks.onNodeSelect?.(null)
    dispatch(clearDetail())
  }, [graphData, institutionColors, fallbackInstitutionColor, dispatch, callbacks])

  const renderExpanded = useCallback((viewType: ExpandedViewType, entityId: string) => {
    if (!cyRef.current || !graphData) return
    const cy = cyRef.current
    const entity = graphData.nodes.find((n) => n.id === entityId)
    if (!entity) return

    layoutRef.current?.stop()
    cy.elements().remove()
    cy.resize()

    const elements = buildExpandedElements(viewType, entityId, graphData, institutionColors)
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
      positions: (node: any) => positions.get(node.id()) || { x: 0, y: 0 },
      animate: true,
      animationDuration: 400,
    } as any)
    layoutRef.current = layout
    layout.run()
    layout.one('layoutstop', () => {
      ensureEdgeLabelsFit(cy)
      cy.fit(undefined, 60)
    })

    // Update state + notify parent
    const levelMap = { mechanism: 'expanded', dm: 'expanded-dm', institution: 'expanded-institution' } as const
    setCurrentLevel(levelMap[viewType])

    setExpandedMechanismId(viewType === 'mechanism' ? entityId : null)
    setExpandedDmId(viewType === 'dm' ? entityId : null)
    setExpandedInstitutionId(viewType === 'institution' ? entityId : null)

    callbacks.onMechanismExpand?.(viewType === 'mechanism' ? entityId : null)
    callbacks.onDmExpand?.(viewType === 'dm' ? entityId : null)
    callbacks.onInstitutionExpand?.(viewType === 'institution' ? entityId : null)
    callbacks.onNodeSelect?.(entityId)
    dispatch(selectEntity(entityId))
  }, [graphData, institutionColors, fallbackInstitutionColor, dispatch, callbacks])

  // Ref sync effects — keep refs in sync so event handlers see latest values
  const currentLevelRef = useRef(currentLevel)
  useEffect(() => { currentLevelRef.current = currentLevel }, [currentLevel])

  const renderLandingRef = useRef(renderLanding)
  useEffect(() => { renderLandingRef.current = renderLanding }, [renderLanding])

  const renderExpandedRef = useRef(renderExpanded)
  useEffect(() => { renderExpandedRef.current = renderExpanded }, [renderExpanded])

  const graphDataRef = useRef(graphData)
  useEffect(() => { graphDataRef.current = graphData }, [graphData])

  const onNodeSelectRef = useRef(callbacks.onNodeSelect)
  useEffect(() => { onNodeSelectRef.current = callbacks.onNodeSelect }, [callbacks.onNodeSelect])

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData])

  return {
    currentLevel,
    currentLevelRef,
    expandedEntityName,
    cyReady,
    renderLanding,
    renderExpanded,
    renderLandingRef,
    renderExpandedRef,
    graphDataRef,
    onNodeSelectRef,
  }
}
