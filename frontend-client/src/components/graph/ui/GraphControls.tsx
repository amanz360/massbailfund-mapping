import { type RefObject, useCallback } from 'react'
import { Box, IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import type { Core } from 'cytoscape'

interface GraphControlsProps {
  cyRef: RefObject<Core | null>
  onToggleHelp: () => void
}

const controlButtonSx = {
  backgroundColor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  '&:hover': { backgroundColor: 'background.paper' },
  width: 36,
  height: 36,
} as const

export const GraphControls = ({ cyRef, onToggleHelp }: GraphControlsProps) => {
  const handleZoomIn = useCallback(() => {
    if (!cyRef.current) return
    const cy = cyRef.current
    cy.animate({ zoom: cy.zoom() * 1.3, center: { eles: cy.elements() } }, { duration: 200 })
  }, [cyRef])

  const handleZoomOut = useCallback(() => {
    if (!cyRef.current) return
    const cy = cyRef.current
    cy.animate({ zoom: cy.zoom() / 1.3, center: { eles: cy.elements() } }, { duration: 200 })
  }, [cyRef])

  const handleFitAll = useCallback(() => {
    if (!cyRef.current) return
    cyRef.current.animate({ fit: { eles: cyRef.current.elements(), padding: 30 } }, { duration: 300 })
  }, [cyRef])

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        zIndex: 10,
      }}
    >
      <IconButton onClick={handleZoomIn} size="small" aria-label="Zoom in" sx={controlButtonSx}>
        <AddIcon fontSize="small" />
      </IconButton>
      <IconButton onClick={handleZoomOut} size="small" aria-label="Zoom out" sx={controlButtonSx}>
        <RemoveIcon fontSize="small" />
      </IconButton>
      <IconButton onClick={handleFitAll} size="small" aria-label="Fit all nodes in view" sx={controlButtonSx}>
        <ZoomOutMapIcon fontSize="small" />
      </IconButton>
      <IconButton onClick={onToggleHelp} size="small" aria-label="Show help" sx={{ ...controlButtonSx, mt: 1 }}>
        <HelpOutlineIcon fontSize="small" />
      </IconButton>
    </Box>
  )
}
