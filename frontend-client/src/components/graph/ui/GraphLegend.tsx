import { Box, Typography, useTheme, alpha } from '@mui/material'
import { GROUP_FALLBACK_COLOR } from '../utils'

interface GraphLegendProps {
  groups: { name: string; color: string }[]
}

export const GraphLegend = ({ groups }: GraphLegendProps) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        backgroundColor: alpha(theme.palette.background.paper, 0.9),
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        px: 1.5,
        py: 1,
        zIndex: 10,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Neutral fill, matching the pre-decoration mechanism color — a group
            color here would read as one specific group's key. */}
        <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: GROUP_FALLBACK_COLOR, flexShrink: 0 }} />
        <Typography variant="caption" sx={{ color: 'text.primary', lineHeight: 1.2 }}>Mechanism</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 12, height: 12, transform: 'rotate(45deg)', backgroundColor: '#E8C97E', border: '2px solid #000F35', flexShrink: 0 }} />
        <Typography variant="caption" sx={{ color: 'text.primary', lineHeight: 1.2 }}>Decision Maker</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 16, height: 10, borderRadius: 0.5, backgroundColor: '#000F35', flexShrink: 0 }} />
        <Typography variant="caption" sx={{ color: 'text.primary', lineHeight: 1.2 }}>Institution</Typography>
      </Box>
      {groups.length > 0 && (
        <Box sx={{ mt: 0.75, borderTop: '1px solid', borderColor: 'divider', pt: 0.75 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Mechanism Groups
          </Typography>
          {groups.map((g) => (
            <Box key={g.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
              <Box sx={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: g.color, flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: 'text.primary', lineHeight: 1.2 }}>
                {g.name}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
