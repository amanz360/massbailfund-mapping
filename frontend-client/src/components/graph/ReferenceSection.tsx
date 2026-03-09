import { useState } from 'react'
import { Box, Typography, Link, Collapse, ButtonBase, useTheme } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import type { MechanismReference } from '../../types/models'
import { displayHostname } from '../../utils/entities'

interface ReferenceSectionProps {
  title: string
  references: MechanismReference[]
  accentColor?: string
  compact?: boolean
}

export default function ReferenceSection({
  title,
  references,
  accentColor,
  compact = false,
}: ReferenceSectionProps) {
  const theme = useTheme()
  const accent = accentColor ?? theme.palette.secondary.main
  const [open, setOpen] = useState(!compact)

  if (references.length === 0) return null

  return (
    <Box sx={{ mb: compact ? 1.5 : 3 }}>
      {/* Category header — clickable to toggle */}
      <ButtonBase
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          gap: 0.5,
          mb: open ? 1.5 : 0,
          pb: open ? 0.5 : 0,
          borderBottom: open ? '1px solid' : 'none',
          borderColor: `${accent}18`,
          borderRadius: 0.5,
          userSelect: 'none',
          '&:hover': { opacity: 0.8 },
          '&.Mui-focusVisible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        <ExpandMoreIcon
          sx={{
            fontSize: compact ? 16 : 18,
            color: accent,
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s',
          }}
        />
        <Typography
          sx={{
            fontSize: compact ? '0.75rem' : '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: accent,
            flex: 1,
            textAlign: 'left',
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            fontSize: compact ? '0.7rem' : '0.75rem',
            fontWeight: 400,
            color: 'text.secondary',
          }}
        >
          {references.length}
        </Typography>
      </ButtonBase>

      {/* Items */}
      <Collapse in={open} timeout={200}>
        {references.map((ref) => (
          <Box
            key={ref.id}
            sx={{
              mb: compact ? 1 : 1.5,
              pl: 2,
              borderLeft: '3px solid',
              borderColor: `${accent}30`,
              '&:hover': { borderColor: `${accent}80` },
              transition: 'border-color 0.15s',
            }}
          >
            <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
              {ref.description}
            </Typography>
            {ref.link && ref.link.length > 0 && (
              <Link
                href={ref.link}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: accent, fontSize: '0.75rem', display: 'inline-block', mt: 0.5 }}
              >
                {displayHostname(ref.link)}
              </Link>
            )}
          </Box>
        ))}
      </Collapse>
    </Box>
  )
}
