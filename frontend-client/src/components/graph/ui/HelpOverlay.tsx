import { Box, Typography, Link } from '@mui/material'

export const HELP_STORAGE_KEY = 'mbf-graph-hint-seen'

interface HelpOverlayProps {
  visible: boolean
  onDismiss: () => void
}

export const HelpOverlay = ({ visible, onDismiss }: HelpOverlayProps) => {
  if (!visible) return null

  const handleDismiss = () => {
    localStorage.setItem(HELP_STORAGE_KEY, '1')
    onDismiss()
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 5,
        textAlign: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid',
        borderColor: 'divider',
        px: 3.5,
        py: 2.5,
        borderRadius: 2,
        maxWidth: 340,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.95rem', mb: 1 }}>
        Explore the Pretrial System
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 14, height: 9, borderRadius: 0.5, backgroundColor: 'primary.main', flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Mechanisms</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 11, height: 11, transform: 'rotate(45deg)', backgroundColor: 'secondary.main', border: '2px solid', borderColor: 'institution.main', flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Decision Makers</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'institution.main', flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Institutions</Typography>
        </Box>
      </Box>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', lineHeight: 1.5 }}>
        Click any node to see details. Double-click to explore its connections. Press <strong>Esc</strong> or click the background to return.
      </Typography>
      <Link
        component="button"
        onClick={handleDismiss}
        sx={{
          display: 'block',
          mt: 1.5,
          fontSize: '0.8rem',
          color: 'primary.main',
          textDecoration: 'none',
          '&:hover': { textDecoration: 'underline' },
        }}
      >
        Got it
      </Link>
    </Box>
  )
}
