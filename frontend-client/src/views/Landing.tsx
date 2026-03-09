import { Box, Typography, Button, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import MapIcon from '@mui/icons-material/Map'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import { useNavigate } from 'react-router-dom'

const LOGO_WHITE_SRC = '/MBF_hybridlogo_white.png'

export default function Landing() {
  const navigate = useNavigate()
  const theme = useTheme()

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'secondary.main',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 6,
        position: 'relative',
        overflow: 'hidden',
        // Subtle radial glow behind content
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.12)} 0%, transparent 70%)`,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        },
      }}
    >
      {/* Logo */}
      <Box
        component="img"
        src={LOGO_WHITE_SRC}
        alt="Massachusetts Bail Fund"
        sx={{
          height: { xs: 56, sm: 72 },
          mb: 4,
        }}
      />

      {/* Headline */}
      <Typography
        variant="h3"
        sx={{
          color: '#fff',
          textAlign: 'center',
          maxWidth: 640,
          mb: 2,
          fontSize: { xs: '1.6rem', sm: '2.2rem' },
          lineHeight: 1.3,
        }}
      >
        Mapping the Massachusetts
        <br />
        Pretrial Incarceration System
      </Typography>

      {/* Subhead */}
      <Typography
        sx={{
          color: 'rgba(255,255,255,0.65)',
          textAlign: 'center',
          maxWidth: 520,
          fontSize: { xs: '0.95rem', sm: '1.05rem' },
          lineHeight: 1.7,
          mb: 5,
        }}
      >
        An interactive tool from the Massachusetts Bail Fund exploring how legal mechanisms,
        decision makers, and institutions shape pretrial detention across the state.
      </Typography>

      {/* Entry point buttons */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          width: '100%',
          maxWidth: 480,
          justifyContent: 'center',
        }}
      >
        <Button
          variant="contained"
          size="large"
          startIcon={<MapIcon />}
          onClick={() => navigate('/map')}
          sx={{
            flex: 1,
            py: 1.5,
            fontSize: '1rem',
            backgroundColor: 'primary.main',
            '&:hover': { backgroundColor: 'primary.dark' },
          }}
        >
          Explore the Map
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<ViewModuleIcon />}
          onClick={() => navigate('/browse')}
          sx={{
            flex: 1,
            py: 1.5,
            fontSize: '1rem',
            color: '#fff',
            borderColor: 'rgba(255,255,255,0.35)',
            '&:hover': {
              borderColor: 'rgba(255,255,255,0.6)',
              backgroundColor: 'rgba(255,255,255,0.06)',
            },
          }}
        >
          Browse the System
        </Button>
      </Box>

      {/* Stats hint */}
      <Box
        sx={{
          mt: 5,
          display: 'flex',
          gap: { xs: 3, sm: 5 },
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        {[
          ['12', 'Mechanisms'],
          ['16', 'Decision Makers'],
          ['3', 'Institutions'],
        ].map(([count, label]) => (
          <Box key={label} sx={{ textAlign: 'center' }}>
            <Typography
              sx={{
                color: 'primary.light',
                fontSize: '1.5rem',
                fontWeight: 700,
                fontFamily: '"Lora", serif',
              }}
            >
              {count}
            </Typography>
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: '0.78rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
