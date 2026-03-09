import { useEffect, useMemo, useState } from 'react'
import { Box, Typography, Link, Button, IconButton, Tooltip } from '@mui/material'
import MapIcon from '@mui/icons-material/Map'
import LinkIcon from '@mui/icons-material/Link'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import type { InstitutionDetail } from '../../types/models'
import { buildInstitutionColors } from '../../utils/entities'
import { useBrowseData } from '../../views/Browse'

interface Props {
  entity: InstitutionDetail
}

export default function InstitutionDetailPage({ entity }: Props) {
  const navigate = useNavigate()
  const [linkCopied, setLinkCopied] = useState(false)
  const { institutions, mechanisms: mechanismDetails } = useBrowseData()

  useEffect(() => {
    document.title = `${entity.name} | Mass Bail Fund`
  }, [entity.name])

  const institutionColor = useMemo(() => {
    if (institutions.length === 0) return undefined
    return buildInstitutionColors(institutions).get(entity.id)
  }, [institutions, entity.id])

  // Group members by membership type
  const membersByType = useMemo(() => {
    const grouped = new Map<string, typeof entity.members>()
    for (const m of entity.members) {
      const existing = grouped.get(m.membership_type)
      if (existing) existing.push(m)
      else grouped.set(m.membership_type, [m])
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [entity])

  // Cross-reference: mechanisms where this institution's members hold roles
  const connectedMechanisms = useMemo(() => {
    if (mechanismDetails.length === 0) return []
    const memberIds = new Set(entity.members.map((m) => m.decision_maker.id))
    return mechanismDetails
      .filter((mech) => mech.roles.some((role) => memberIds.has(role.decision_maker.id)))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [mechanismDetails, entity])

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Link
          component={RouterLink}
          to="/browse?section=decision-makers"
          sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          &larr; Decision Makers
        </Link>
        <Button
          variant="outlined"
          size="small"
          startIcon={<MapIcon sx={{ fontSize: 16 }} />}
          onClick={() => navigate('/map', { state: { focusNodeId: entity.id } })}
          sx={{ textTransform: 'none', fontSize: '0.85rem' }}
        >
          View on Map
        </Button>
      </Box>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2, mb: 0.5 }}>
        {institutionColor && (
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              backgroundColor: institutionColor,
              flexShrink: 0,
            }}
          />
        )}
        <Typography variant="h4" sx={{ color: 'text.primary' }}>
          {entity.name}
        </Typography>
        <Tooltip title={linkCopied ? 'Copied!' : 'Copy link'} arrow>
          <IconButton
            size="small"
            aria-label="Copy link to this page"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              setLinkCopied(true)
              setTimeout(() => setLinkCopied(false), 2000)
            }}
            sx={{ width: 28, height: 28 }}
          >
            <LinkIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          {entity.members.length} member{entity.members.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Description */}
      {entity.description && (
        <Typography sx={{ mb: 3, color: 'text.primary', lineHeight: 1.7 }}>
          {entity.description}
        </Typography>
      )}

      {/* Members grouped by type */}
      {membersByType.map(([type, members]) => (
        <Box key={type} sx={{ mb: 3 }}>
          <Typography
            variant="overline"
            sx={{ color: 'text.primary', fontWeight: 700, letterSpacing: '0.08em', display: 'block', mb: 1 }}
          >
            {type} Members
          </Typography>
          <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
            {members.map((m) => (
              <Box component="li" key={m.id} sx={{ mb: 0.75 }}>
                <Link
                  component={RouterLink}
                  to={`/browse/entity/${m.decision_maker.id}`}
                  sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  {m.decision_maker.name}
                </Link>
              </Box>
            ))}
          </Box>
        </Box>
      ))}

      {/* Connected Mechanisms */}
      {connectedMechanisms.length > 0 && (
        <Box sx={{ mb: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography
            variant="overline"
            sx={{
              color: 'primary.main',
              fontWeight: 700,
              letterSpacing: '0.08em',
              display: 'block',
              mb: 1,
            }}
          >
            Connected Mechanisms ({connectedMechanisms.length})
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 1.5 }}>
            Mechanisms where members of this institution hold roles.
          </Typography>
          {connectedMechanisms.map((m) => (
            <Box key={m.id} sx={{ mb: 0.75 }}>
              <Link
                component={RouterLink}
                to={`/browse/entity/${m.id}`}
                sx={{
                  color: 'primary.main',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                {m.name}
              </Link>
            </Box>
          ))}
        </Box>
      )}

      {entity.members.length === 0 && !entity.description && (
        <Typography sx={{ color: 'text.secondary' }}>
          No information available yet.
        </Typography>
      )}
    </Box>
  )
}
