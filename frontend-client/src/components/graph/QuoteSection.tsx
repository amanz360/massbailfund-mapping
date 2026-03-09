import { useState } from 'react'
import { Box, Typography, Link, Collapse, ButtonBase, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote'
import type { MechanismQuoteItem } from '../../types/models'

interface QuoteSectionProps {
  quotes: MechanismQuoteItem[]
  compact?: boolean
}

export default function QuoteSection({ quotes, compact = false }: QuoteSectionProps) {
  const theme = useTheme()
  const [open, setOpen] = useState(!compact)

  if (quotes.length === 0) return null

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
          Interviews
        </Typography>
        <Typography
          sx={{
            fontSize: compact ? '0.7rem' : '0.75rem',
            fontWeight: 400,
            color: 'text.secondary',
          }}
        >
          {quotes.length}
        </Typography>
      </ButtonBase>

      <Collapse in={open} timeout={200}>
        {quotes.map((q) => (
          <Box
            key={q.id}
            sx={{
              mb: compact ? 1.5 : 2,
              pl: 2,
              borderLeft: '3px solid',
              borderColor: alpha(theme.palette.secondary.main, 0.09),
              '&:hover': { borderColor: alpha(theme.palette.secondary.main, 0.37) },
              transition: 'border-color 0.15s',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                lineHeight: 1.6,
                fontStyle: 'italic',
                color: 'text.secondary',
              }}
            >
              {q.quote}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
              <FormatQuoteIcon sx={{ fontSize: 14, color: 'text.primary', opacity: 0.5 }} />
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: 'text.primary', opacity: 0.7 }}
              >
                {q.speaker}
                {q.source_timestamp && (
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ fontWeight: 400, ml: 0.5 }}
                  >
                    at {q.source_timestamp}
                  </Typography>
                )}
              </Typography>
              {q.link && (
                <Link
                  href={q.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: 'text.primary', fontSize: '0.75rem', ml: 0.5 }}
                >
                  Source
                </Link>
              )}
            </Box>
          </Box>
        ))}
      </Collapse>
    </Box>
  )
}
