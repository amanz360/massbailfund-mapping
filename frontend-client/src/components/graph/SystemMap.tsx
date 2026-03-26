import { useEffect, useState, useMemo, useCallback } from 'react'
import { Box, CircularProgress, Typography, useTheme } from '@mui/material'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '../../store/store'
import { selectGraphData, selectGraphLoading } from '../../store/slices/graphSlice'
import { buildInstitutionColorsFromGraph } from '../../utils/entities'
import type { SystemMapProps } from './types'
import { useGraphNavigation, useGraphEvents } from './hooks'
import { HelpOverlay, HELP_STORAGE_KEY, GraphBreadcrumb, GraphLegend, GraphControls } from './ui'

export default function SystemMap({
  onNodeSelect,
  onMechanismExpand,
  onDmExpand,
  onInstitutionExpand,
  focusNodeId,
  focusCounter,
  resetCounter,
}: SystemMapProps) {
  const theme = useTheme()
  const dispatch = useDispatch<AppDispatch>()
  const graphData = useSelector(selectGraphData)
  const graphLoading = useSelector(selectGraphLoading)

  // Memoize institution colors from graph data
  const institutionColors = useMemo(
    () => (graphData ? buildInstitutionColorsFromGraph(graphData.nodes) : new Map<string, string>()),
    [graphData],
  )

  // Navigation: creates cy, renders landing/expanded views, manages view state
  const callbacks = useMemo(
    () => ({
      onNodeSelect,
      onMechanismExpand,
      onDmExpand,
      onInstitutionExpand,
    }),
    [onNodeSelect, onMechanismExpand, onDmExpand, onInstitutionExpand],
  )

  const {
    cyRef,
    containerRef,
    currentLevel,
    expandedEntityName,
    cyReady,
    renderLanding,
    renderExpanded,
  } = useGraphNavigation(
    graphData,
    institutionColors,
    theme.palette.institution.main,
    dispatch,
    callbacks,
    focusNodeId,
  )

  // Event handlers: tap, double-tap, hover, escape key
  useGraphEvents(cyRef, cyReady, {
    currentLevel,
    graphData,
    renderLanding,
    renderExpanded,
    onNodeSelect,
    dispatch,
  })

  // External focus navigation (from Browse view or search).
  // Skip when cyRef.current is null — the initial focusNodeId is already
  // handled inside useGraphNavigation during first render.
  useEffect(() => {
    if (!focusNodeId || !graphData || !cyRef.current) return

    const node = graphData.nodes.find((n) => n.id === focusNodeId)
    if (!node) return

    if (node.primary_type === 'Mechanism') {
      renderExpanded('mechanism', focusNodeId)
    } else if (node.primary_type === 'Decision Maker') {
      renderExpanded('dm', focusNodeId)
    } else if (node.primary_type === 'Institution') {
      renderExpanded('institution', focusNodeId)
    }
    // Runs only on focusNodeId/focusCounter change; renderExpanded is accessed via ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNodeId, focusCounter, graphData])

  // External reset (e.g. detail panel close button)
  useEffect(() => {
    if (!resetCounter || !cyRef.current) return
    renderLanding()
    // Runs only on resetCounter change; renderLanding is accessed via ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetCounter])

  // Help overlay dismissed state (persisted to localStorage)
  const [hintDismissed, setHintDismissed] = useState(() => !!localStorage.getItem(HELP_STORAGE_KEY))

  const handleDismissHint = useCallback(() => setHintDismissed(true), [])
  const handleShowHelp = useCallback(() => setHintDismissed(false), [])

  // Institution list for legend
  const institutions = useMemo(
    () =>
      graphData
        ? graphData.nodes
            .filter((n) => n.primary_type === 'Institution')
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((n) => ({ id: n.id, name: n.name }))
        : [],
    [graphData],
  )

  // Loading state
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
      <HelpOverlay visible={!hintDismissed} onDismiss={handleDismissHint} />
      {currentLevel !== 'landing' && (
        <GraphBreadcrumb entityName={expandedEntityName} onReset={renderLanding} />
      )}
      <GraphLegend institutionColors={institutionColors} institutions={institutions} />
      <GraphControls cyRef={cyRef} onToggleHelp={handleShowHelp} />
    </Box>
  )
}
