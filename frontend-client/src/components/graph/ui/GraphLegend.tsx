import { Box, Typography } from '@mui/material'

interface GraphLegendProps {
  institutionColors: Map<string, string>
  institutions: { id: string; name: string }[]
}

export const GraphLegend = ({ institutionColors, institutions }: GraphLegendProps) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        px: 1.5,
        py: 1,
        zIndex: 10,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 16, height: 10, borderRadius: 0.5, backgroundColor: 'primary.main', flexShrink: 0 }} />
        <Typography variant="caption" sx={{ color: '#333', lineHeight: 1.2 }}>Mechanism</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 12, height: 12, transform: 'rotate(45deg)', backgroundColor: 'secondary.main', border: '2px solid', borderColor: 'institution.main', flexShrink: 0 }} />
        <Typography variant="caption" sx={{ color: '#333', lineHeight: 1.2 }}>Decision Maker</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: 'institution.main', flexShrink: 0 }} />
        <Typography variant="caption" sx={{ color: '#333', lineHeight: 1.2 }}>Institution</Typography>
      </Box>
      <Box sx={{ mt: 0.75, borderTop: '1px solid', borderColor: 'divider', pt: 0.75 }}>
        <Typography variant="caption" sx={{ color: '#555', fontWeight: 600 }}>
          Institutions
        </Typography>
        {institutions.map((inst) => {
          const color = institutionColors.get(inst.id) || '#888'
          return (
            <Box key={inst.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                <Box sx={{
                  width: 9, height: 9, borderRadius: '50%',
                  backgroundColor: color, flexShrink: 0,
                }} />
                <Box sx={{
                  width: 9, height: 9, borderRadius: '50%',
                  border: `1.5px solid ${color}`,
                  backgroundColor: 'transparent', flexShrink: 0,
                }} />
              </Box>
              <Typography variant="caption" sx={{ color: '#333', lineHeight: 1.2 }}>
                {inst.name}
              </Typography>
            </Box>
          )
        })}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: '#777', lineHeight: 1.2 }}>
            ● Primary &middot; ○ External
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
