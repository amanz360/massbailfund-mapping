import { useCallback, useEffect } from 'react'
import { Box, AppBar, Toolbar, ToggleButtonGroup, ToggleButton, Typography } from '@mui/material'
import MapIcon from '@mui/icons-material/Map'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import SearchBar from '../search/SearchBar'

const LOGO_WHITE_SRC = '/MBF_hybridlogo_white.png'
const LOGO_HEIGHT = 48

const BASE_TITLE = 'Mass Bail Fund'

export default function PublicLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const isMap = location.pathname === '/map' || location.pathname.startsWith('/map?')
  const isBrowse = location.pathname.startsWith('/browse')

  // Update document title based on current route
  useEffect(() => {
    if (isMap) {
      document.title = `Bail Reform Map | ${BASE_TITLE}`
    } else if (location.pathname.includes('/entity/')) {
      // Detail pages set their own title via their component
    } else {
      const params = new URLSearchParams(location.search)
      const section = params.get('section')
      const sectionLabels: Record<string, string> = {
        mechanisms: 'Mechanisms',
        'decision-makers': 'Decision Makers',
        glossary: 'Glossary',
        resources: 'Resources',
      }
      const label = section ? sectionLabels[section] : 'Mechanisms'
      document.title = `${label || 'Browse'} | ${BASE_TITLE}`
    }
  }, [isMap, isBrowse, location.pathname, location.search])

  const handleSearchSelect = useCallback((nodeId: string) => {
    if (isBrowse) {
      navigate(`/browse/entity/${nodeId}`)
    } else {
      navigate('/map', { state: { focusNodeId: nodeId } })
    }
  }, [navigate, isBrowse])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: { xs: 1, sm: 0 }, py: { xs: 1, sm: 0 } }}>
          <Box
            onClick={() => navigate('/')}
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <Box
              component="img"
              src={LOGO_WHITE_SRC}
              alt="Massachusetts Bail Fund"
              sx={{ height: LOGO_HEIGHT, display: { xs: 'none', sm: 'block' } }}
            />
            {/* Mobile: icon only */}
            <Box sx={{ width: LOGO_HEIGHT, height: LOGO_HEIGHT, overflow: 'hidden', flexShrink: 0, display: { xs: 'block', sm: 'none' } }}>
              <Box
                component="img"
                src={LOGO_WHITE_SRC}
                alt=""
                sx={{ height: LOGO_HEIGHT, objectFit: 'cover', objectPosition: 'left center' }}
              />
            </Box>
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
                ml: 1.5,
                borderLeft: '1px solid rgba(255,255,255,0.25)',
                pl: 1.5,
                lineHeight: 1.3,
                display: { xs: 'none', md: 'block' },
              }}
            >
              Mapping the Massachusetts<br />pretrial incarceration system
            </Typography>
          </Box>
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', mx: { xs: 0, sm: 2 }, order: { xs: 3, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}>
            <SearchBar onSelect={handleSearchSelect} />
          </Box>
          <ToggleButtonGroup
            value={isBrowse ? 'browse' : 'map'}
            exclusive
            size="small"
            sx={{ flexShrink: 0, ml: { xs: 'auto', sm: 0 } }}
          >
            <ToggleButton
              value="map"
              onClick={() => navigate('/map')}
              sx={{
                color: 'rgba(255,255,255,0.7)',
                borderColor: 'rgba(255,255,255,0.3)',
                '&.Mui-selected': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.15)' },
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                py: 0.25,
                px: 1.5,
              }}
            >
              <MapIcon sx={{ mr: 0.5, fontSize: 18 }} />
              Map
            </ToggleButton>
            <ToggleButton
              value="browse"
              onClick={() => navigate('/browse')}
              sx={{
                color: 'rgba(255,255,255,0.7)',
                borderColor: 'rgba(255,255,255,0.3)',
                '&.Mui-selected': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.15)' },
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                py: 0.25,
                px: 1.5,
              }}
            >
              <ViewModuleIcon sx={{ mr: 0.5, fontSize: 18 }} />
              Browse
            </ToggleButton>
          </ToggleButtonGroup>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Outlet />
      </Box>
    </Box>
  )
}
