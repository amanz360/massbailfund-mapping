import { useState } from 'react'
import { Box, Typography, Link, Tooltip, IconButton } from '@mui/material'
import LinkIcon from '@mui/icons-material/Link'

interface GraphBreadcrumbProps {
  entityName: string
  onReset: () => void
}

export const GraphBreadcrumb = ({ entityName, onReset }: GraphBreadcrumbProps) => {
  const [linkCopied, setLinkCopied] = useState(false)

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        px: 1.5,
        py: 0.75,
        zIndex: 10,
        maxWidth: '60%',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Link
          component="button"
          onClick={onReset}
          sx={{
            color: 'primary.main',
            textDecoration: 'none',
            fontSize: '0.85rem',
            '&:hover': { textDecoration: 'underline' },
            whiteSpace: 'nowrap',
          }}
        >
          &larr; System Map
        </Link>
        <Typography sx={{ color: 'text.disabled', fontSize: '0.85rem' }}>/</Typography>
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: '0.85rem',
            color: 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {entityName}
        </Typography>
        <Tooltip title={linkCopied ? 'Copied!' : 'Copy link'} arrow>
          <IconButton
            size="small"
            aria-label="Copy link to this view"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              setLinkCopied(true)
              setTimeout(() => setLinkCopied(false), 2000)
            }}
            sx={{ ml: 0.5, width: 24, height: 24 }}
          >
            <LinkIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography
        variant="caption"
        sx={{
          color: 'text.disabled',
          mt: 0.25,
          display: 'block',
          fontSize: '0.7rem',
        }}
      >
        <strong>Click</strong> a node for details · <strong>Double-click</strong> to explore · <strong>Esc</strong> to return
      </Typography>
    </Box>
  )
}
