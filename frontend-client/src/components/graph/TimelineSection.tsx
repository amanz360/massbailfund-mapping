import { useState } from 'react'
import { Box, Typography, Link, Collapse, ButtonBase, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import type { MechanismTimelineEntryItem } from '../../types/models'
import { displayHostname } from '../../utils/entities'

interface TimelineSectionProps {
  entries: MechanismTimelineEntryItem[]
  compact?: boolean
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  if (d.getMonth() === 0 && d.getDate() === 1) {
    return String(d.getFullYear())
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
}

export default function TimelineSection({ entries, compact = false }: TimelineSectionProps) {
  const theme = useTheme()
  const [open, setOpen] = useState(!compact)

  if (entries.length === 0) return null

  return (
    <Box sx={{ mb: compact ? 1.5 : 3 }}>
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
          borderColor: alpha(theme.palette.secondary.main, 0.09),
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
            color: 'text.primary',
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
            color: 'text.primary',
            flex: 1,
            textAlign: 'left',
          }}
        >
          Legislative Timeline
        </Typography>
        <Typography
          sx={{
            fontSize: compact ? '0.7rem' : '0.75rem',
            fontWeight: 400,
            color: 'text.secondary',
          }}
        >
          {entries.length}
        </Typography>
      </ButtonBase>

      <Collapse in={open} timeout={200}>
        {entries.map((entry) => {
          const year = formatDate(entry.date)
          return (
            <Box
              key={entry.id}
              sx={{
                mb: compact ? 1 : 1.5,
                display: 'flex',
                gap: 1.5,
              }}
            >
              {/* Date column */}
              <Box
                sx={{
                  width: compact ? 36 : 44,
                  flexShrink: 0,
                  textAlign: 'right',
                  pt: 0.25,
                }}
              >
                {year && (
                  <Typography
                    sx={{
                      fontSize: compact ? '0.7rem' : '0.75rem',
                      fontWeight: 700,
                      color: 'primary.main',
                      lineHeight: 1.4,
                    }}
                  >
                    {year}
                  </Typography>
                )}
              </Box>

              {/* Vertical line + content */}
              <Box
                sx={{
                  flex: 1,
                  pl: 1.5,
                  borderLeft: '2px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.19),
                }}
              >
                {entry.title && entry.title !== entry.description && (
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, lineHeight: 1.4, mb: 0.25 }}
                  >
                    {entry.title}
                  </Typography>
                )}
                <Typography
                  variant="body2"
                  sx={{ lineHeight: 1.6, color: 'text.secondary' }}
                >
                  {entry.description}
                </Typography>
                {entry.link && (
                  <Link
                    href={entry.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: 'primary.main', fontSize: '0.75rem', display: 'inline-block', mt: 0.25 }}
                  >
                    {displayHostname(entry.link)}
                  </Link>
                )}
              </Box>
            </Box>
          )
        })}
      </Collapse>
    </Box>
  )
}
