import { useState, useCallback, useEffect, useRef } from 'react'
import { Box, Slide } from '@mui/material'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { RootState } from '../store/store'
import SystemMap from '../components/graph/SystemMap'
import DetailPanel from '../components/graph/DetailPanel'
import { selectSelectedEntityId } from '../store/slices/detailSlice'
import { selectEntityById } from '../store/slices/browseSlice'

export default function Home() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null)
  const [focusCounter, setFocusCounter] = useState(0)
  const [expandedMechanismId, setExpandedMechanismId] = useState<string | null>(null)
  const [expandedDmId, setExpandedDmId] = useState<string | null>(null)
  const [expandedInstitutionId, setExpandedInstitutionId] = useState<string | null>(null)
  const [resetCounter, setResetCounter] = useState(0)
  const selectedId = useSelector(selectSelectedEntityId)
  const entity = useSelector((state: RootState) => selectEntityById(state, selectedId))
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Flags to prevent circular URL <-> state updates
  const isProgrammaticNav = useRef(false)
  const skipNextUrlSync = useRef(false)
  const isInitialMount = useRef(true)

  // Handle focusNodeId passed from Browse view via navigation state
  useEffect(() => {
    const state = location.state as { focusNodeId?: string } | null
    if (state?.focusNodeId) {
      setFocusNodeId(state.focusNodeId)
      setFocusCounter((c) => c + 1)
      setSelectedNodeId(state.focusNodeId)
      navigate('/map', { replace: true, state: {} })
    }
  }, [location.state, navigate])

  // URL -> State: respond to back/forward navigation and initial load
  useEffect(() => {
    // Skip if this URL change was caused by our own state->URL sync
    if (isProgrammaticNav.current) {
      isProgrammaticNav.current = false
      return
    }

    const expandId = searchParams.get('expand')

    if (isInitialMount.current) {
      isInitialMount.current = false
      if (expandId) {
        // Initial load with ?expand=nodeId — render that expanded view
        skipNextUrlSync.current = true
        setFocusNodeId(expandId)
        setFocusCounter((c) => c + 1)
        setSelectedNodeId(expandId)
      }
      // No expand on initial mount — SystemMap handles default landing render
      return
    }

    // Back/forward navigation
    skipNextUrlSync.current = true
    if (expandId) {
      setFocusNodeId(expandId)
      setFocusCounter((c) => c + 1)
      setSelectedNodeId(expandId)
    } else {
      // No ?expand — return to landing
      setResetCounter((c) => c + 1)
    }
  }, [searchParams])

  // State -> URL: push history entry when graph state changes
  useEffect(() => {
    // Skip if this state change was caused by URL->State sync (back/forward)
    if (skipNextUrlSync.current) {
      skipNextUrlSync.current = false
      return
    }

    const expandId = expandedMechanismId || expandedDmId || expandedInstitutionId
    const currentParam = searchParams.get('expand')

    if (expandId && currentParam !== expandId) {
      isProgrammaticNav.current = true
      setSearchParams({ expand: expandId })
    } else if (!expandId && currentParam) {
      isProgrammaticNav.current = true
      setSearchParams({})
    }
  // searchParams intentionally excluded — we only read it for comparison,
  // this effect should only fire when expanded IDs change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedMechanismId, expandedDmId, expandedInstitutionId, setSearchParams])

  const handleClose = useCallback(() => {
    setSelectedNodeId(null)
    setResetCounter((c) => c + 1)
  }, [])

  const handleSearchSelect = useCallback((nodeId: string) => {
    setFocusNodeId(nodeId)
    setFocusCounter((c) => c + 1)
    setSelectedNodeId(nodeId)
  }, [])

  const showPanel = selectedNodeId !== null || entity !== null

  return (
    <Box sx={{ position: 'relative', height: '100%', display: 'flex' }}>
      {/* Map */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <SystemMap onNodeSelect={setSelectedNodeId} onMechanismExpand={setExpandedMechanismId} onDmExpand={setExpandedDmId} onInstitutionExpand={setExpandedInstitutionId} focusNodeId={focusNodeId} focusCounter={focusCounter} resetCounter={resetCounter} />
      </Box>
      {/* Detail panel */}
      <Slide direction="left" in={showPanel} mountOnEnter unmountOnExit>
        <Box
          sx={{
            width: { xs: '100%', md: 400 },
            flexShrink: 0,
            borderLeft: { xs: 'none', md: '1px solid' },
            borderColor: 'divider',
            overflow: 'auto',
            position: { xs: 'absolute', md: 'relative' },
            top: { xs: 0, md: 'auto' },
            right: { xs: 0, md: 'auto' },
            height: { xs: '100%', md: 'auto' },
            backgroundColor: { xs: 'background.paper', md: 'transparent' },
            zIndex: { xs: 10, md: 'auto' },
          }}
        >
          <DetailPanel onClose={handleClose} onNavigate={handleSearchSelect} expandedMechanismId={expandedMechanismId} expandedDmId={expandedDmId} expandedInstitutionId={expandedInstitutionId} />
        </Box>
      </Slide>
    </Box>
  )
}
