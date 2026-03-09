import { useMemo } from 'react'
import { Box, CircularProgress, Typography, Button, ButtonBase, LinearProgress, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import PersonIcon from '@mui/icons-material/Person'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import { Routes, Route, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  selectMechanisms,
  selectDecisionMakers,
  selectInstitutions,
  selectGlossary,
  selectGeneralResources,
  selectBrowseLoading,
  selectBrowseError,
} from '../store/slices/browseSlice'
import { BrowseDataContext } from '../contexts/BrowseDataContext'
import BrowseIndex from '../components/browse/BrowseIndex'
import EntityDetailRouter from '../components/browse/EntityDetailRouter'

export type Section = 'mechanisms' | 'decision-makers' | 'glossary' | 'resources'

const VALID_SECTIONS: Section[] = ['mechanisms', 'decision-makers', 'glossary', 'resources']

export default function Browse() {
  const theme = useTheme()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  // Read all data from Redux (loaded at app root)
  const mechanisms = useSelector(selectMechanisms)
  const decisionMakers = useSelector(selectDecisionMakers)
  const institutions = useSelector(selectInstitutions)
  const glossary = useSelector(selectGlossary)
  const generalResources = useSelector(selectGeneralResources)
  const loading = useSelector(selectBrowseLoading)
  const error = useSelector(selectBrowseError)

  // Section state from URL
  const sectionParam = searchParams.get('section') as Section | null
  const activeSection: Section =
    sectionParam && VALID_SECTIONS.includes(sectionParam) ? sectionParam : 'mechanisms'

  // Detect entity detail view
  const isEntityDetail = location.pathname.includes('/entity/')

  // Determine which sidebar section to highlight for entity detail pages
  const entitySectionHighlight: Section | null = useMemo(() => {
    if (!isEntityDetail) return null
    const match = location.pathname.match(/\/entity\/(.+)/)
    const entityId = match?.[1]
    if (!entityId) return null
    if (mechanisms.some((m) => m.id === entityId)) return 'mechanisms'
    if (decisionMakers.some((dm) => dm.id === entityId)) return 'decision-makers'
    if (institutions.some((inst) => inst.id === entityId)) return 'decision-makers'
    return null
  }, [isEntityDetail, mechanisms, decisionMakers, institutions, location.pathname])

  const displaySection = isEntityDetail ? entitySectionHighlight : activeSection

  const sections: { key: Section; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'mechanisms', label: 'Mechanisms', count: mechanisms.length, icon: <AccountTreeIcon sx={{ fontSize: 18 }} /> },
    { key: 'decision-makers', label: 'Decision Makers', count: decisionMakers.length, icon: <PersonIcon sx={{ fontSize: 18 }} /> },
    { key: 'glossary', label: 'Glossary', count: glossary.length, icon: <MenuBookIcon sx={{ fontSize: 18 }} /> },
    { key: 'resources', label: 'Resources', count: generalResources.length, icon: <LibraryBooksIcon sx={{ fontSize: 18 }} /> },
  ]

  const handleSectionClick = (key: Section) => {
    navigate(`/browse?section=${key}`)
  }

  // Context value for detail pages
  const browseData = useMemo<BrowseData>(() => ({
    mechanisms,
    decisionMakers,
    institutions,
  }), [mechanisms, decisionMakers, institutions])

  if (loading && mechanisms.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading data...</Typography>
      </Box>
    )
  }

  if (error && mechanisms.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
        <Typography color="error">{error}</Typography>
        <Button variant="outlined" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Box>
    )
  }

  return (
    <BrowseDataContext.Provider value={browseData}>
      <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* Desktop Sidebar */}
        <Box
          sx={{
            width: 220,
            flexShrink: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            py: 3,
            px: 0,
            overflow: 'auto',
            display: { xs: 'none', md: 'block' },
          }}
        >
          <Typography
            sx={{
              px: 2.5,
              mb: 2,
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'text.disabled',
            }}
          >
            Browse
          </Typography>
          {sections.map(({ key, label, count, icon }) => (
            <ButtonBase
              key={key}
              onClick={() => handleSectionClick(key)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                width: '100%',
                px: 2.5,
                py: 1,
                textAlign: 'left',
                borderLeft: '3px solid',
                borderColor: displaySection === key ? 'primary.main' : 'transparent',
                backgroundColor: displaySection === key ? alpha(theme.palette.primary.main, 0.03) : 'transparent',
                '&:hover': {
                  backgroundColor: displaySection === key ? alpha(theme.palette.primary.main, 0.03) : 'action.hover',
                },
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: -2,
                },
                transition: 'all 0.1s',
              }}
            >
              <Box sx={{ color: displaySection === key ? 'primary.main' : 'text.secondary', display: 'flex' }}>
                {icon}
              </Box>
              <Typography
                sx={{
                  fontSize: '0.9rem',
                  fontWeight: displaySection === key ? 600 : 400,
                  color: displaySection === key ? 'primary.main' : 'text.primary',
                  flex: 1,
                }}
              >
                {label}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: displaySection === key ? 'primary.main' : 'text.disabled',
                  fontWeight: 500,
                }}
              >
                {count}
              </Typography>
            </ButtonBase>
          ))}
        </Box>

        {/* Content column (with mobile nav) */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Mobile horizontal nav */}
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              borderBottom: '1px solid',
              borderColor: 'divider',
              overflowX: 'auto',
              flexShrink: 0,
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
            }}
          >
            {sections.map(({ key, label, icon }) => (
              <ButtonBase
                key={key}
                onClick={() => handleSectionClick(key)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 2,
                  py: 1.25,
                  whiteSpace: 'nowrap',
                  borderBottom: '2px solid',
                  borderColor: displaySection === key ? 'primary.main' : 'transparent',
                  color: displaySection === key ? 'primary.main' : 'text.secondary',
                  transition: 'all 0.1s',
                }}
              >
                {icon}
                <Typography
                  sx={{
                    fontSize: '0.85rem',
                    fontWeight: displaySection === key ? 600 : 400,
                  }}
                >
                  {label}
                </Typography>
              </ButtonBase>
            ))}
          </Box>

          {/* Loading bar for initial data load */}
          {loading && <LinearProgress sx={{ flexShrink: 0 }} />}

          {/* Scrollable content */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Routes>
              <Route
                index
                element={
                  <BrowseIndex
                    activeSection={activeSection}
                    glossary={glossary}
                    generalResources={generalResources}
                    mechanismDetails={mechanisms}
                  />
                }
              />
              <Route path="entity/:id" element={<EntityDetailRouter />} />
            </Routes>
          </Box>
        </Box>
      </Box>
    </BrowseDataContext.Provider>
  )
}
