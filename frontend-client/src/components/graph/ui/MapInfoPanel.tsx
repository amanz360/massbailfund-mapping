import { useState } from 'react'
import { Box, Typography, IconButton, Collapse, useTheme, alpha, useMediaQuery } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'

// PLACEHOLDER — awaiting copy from MBF (Janhavi & Naomi)
const HOW_TO_PLACEHOLDER =
  'Placeholder: This map shows how the Massachusetts pretrial system works — ' +
  'the mechanisms that constrain people awaiting trial (outer ring), the ' +
  'decision makers who operate them (middle ring), and the institutions those ' +
  'decision makers belong to (center). Click any entity to explore its ' +
  'relationships. Final copy to come from MBF.'

/** One tier of the static judicial-hierarchy flowchart. */
function CourtBox({ label, color, small = false }: { label: string; color: string; small?: boolean }) {
  return (
    <Box
      sx={{
        backgroundColor: color,
        color: '#ffffff',
        borderRadius: 1,
        px: small ? 0.75 : 1.5,
        py: small ? 0.4 : 0.75,
        textAlign: 'center',
        fontWeight: 700,
        fontSize: small ? '0.6rem' : '0.75rem',
        lineHeight: 1.25,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
      }}
    >
      {label}
    </Box>
  )
}

function DownArrow() {
  return (
    <Typography sx={{ textAlign: 'center', color: 'text.secondary', lineHeight: 1, fontSize: '0.9rem', my: 0.25 }}>
      ↑
    </Typography>
  )
}

export function MapInfoPanel() {
  const theme = useTheme()
  const narrow = useMediaQuery(theme.breakpoints.down('md'))
  const [open, setOpen] = useState(!narrow)

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        left: 16,
        width: 280,
        // Reserve the bottom-left corner for GraphLegend (~200px tall with all
        // mechanism groups, offset 16px) — the panel scrolls internally instead.
        // The 56px floor keeps the header reachable on very short viewports.
        maxHeight: 'max(56px, calc(100% - 260px))',
        overflowY: 'auto',
        backgroundColor: alpha(theme.palette.background.paper, 0.95),
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        zIndex: 10,
      }}
    >
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}
      >
        <Typography variant="subtitle2" sx={{ fontFamily: '"Lora", serif', fontWeight: 700 }}>
          How to Use this Map
        </Typography>
        <IconButton
          size="small"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Collapse info panel' : 'Expand info panel'}
        >
          {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', lineHeight: 1.6, fontStyle: 'italic' }}>
            {HOW_TO_PLACEHOLDER}
          </Typography>

          <Typography
            variant="subtitle2"
            sx={{ fontFamily: '"Lora", serif', fontWeight: 700, mt: 2.5, mb: 1, textAlign: 'center' }}
          >
            Understanding the Hierarchy of the Mass Judicial System
          </Typography>

          {/* Flowchart reads bottom-up: trial courts appeal upward to the SJC */}
          <CourtBox label="Supreme Judicial Court" color={theme.palette.error.main} />
          <DownArrow />
          <CourtBox label="Appeals Court" color={theme.palette.warning.main} />
          <DownArrow />
          <CourtBox label="Superior Court Dept" color={theme.palette.success.main} />
          <DownArrow />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
            <CourtBox label="District Court" color={theme.palette.success.main} />
            <CourtBox label="Boston Muni. Court" color={theme.palette.success.main} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5, mt: 0.5 }}>
            <CourtBox small label="Juvenile Court" color={theme.palette.success.main} />
            <CourtBox small label="Housing Court" color={theme.palette.success.main} />
            <CourtBox small label="Land Court" color={theme.palette.success.main} />
            <CourtBox small label="Probate & Family" color={theme.palette.success.main} />
          </Box>
          <Box sx={{ mt: 0.5 }}>
            <Box
              sx={{
                backgroundColor: theme.palette.success.main,
                color: '#ffffff',
                borderRadius: 1,
                px: 1.5,
                py: 0.75,
                textAlign: 'center',
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Specialty Courts
              </Typography>
              <Typography sx={{ fontSize: '0.6rem', lineHeight: 1.5 }}>
                Veterans Court · Drug Court
                <br />
                Homeless Court · Mental Health Court
              </Typography>
            </Box>
          </Box>
        </Box>
      </Collapse>
    </Box>
  )
}
