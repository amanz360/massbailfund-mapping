import { useEffect, useState } from 'react'
import { Box, Typography, Link, Chip, Button, IconButton, Tooltip, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import MapIcon from '@mui/icons-material/Map'
import LinkIcon from '@mui/icons-material/Link'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import type { DecisionMakerDetail } from '../../types/models'
import { generateDmAutoDescription } from '../../utils/entities'

interface Props {
  entity: DecisionMakerDetail
}

export default function DecisionMakerDetailPage({ entity }: Props) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    document.title = `${entity.name} | Mass Bail Fund`
  }, [entity.name])

  const autoDescription = generateDmAutoDescription(entity)

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, mb: 0.5 }}>
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        {entity.authority_type && (
          <Chip
            label={entity.authority_type}
            size="small"
            sx={{ backgroundColor: alpha(theme.palette.secondary.main, 0.09), color: 'secondary.main' }}
          />
        )}
      </Box>

      {/* Description (real or auto-generated) */}
      {(entity.description || autoDescription) && (
        <Typography sx={{ mb: 3, color: 'text.secondary', lineHeight: 1.7, fontStyle: entity.description ? 'normal' : 'italic' }}>
          {entity.description || autoDescription}
        </Typography>
      )}

      {/* Mechanism Roles — primary content */}
      {entity.mechanism_roles.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ color: 'text.primary', mb: 1.5 }}>
            Mechanism Roles ({entity.mechanism_roles.length})
          </Typography>
          {entity.mechanism_roles.map((role) => (
            <Box
              key={role.id}
              sx={{
                mb: 2,
                pl: 2,
                borderLeft: '3px solid',
                borderColor: alpha(theme.palette.primary.main, 0.2),
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography component="span" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.9rem' }}>
                  {role.role_type}
                </Typography>
                <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                  in
                </Typography>
                <Link
                  component={RouterLink}
                  to={`/browse/entity/${role.mechanism.id}`}
                  sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  {role.mechanism.name}
                </Link>
              </Box>
              {role.description && (
                <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: '0.9rem', lineHeight: 1.7 }}>
                  {role.description}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Institution Memberships */}
      {entity.institution_memberships.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ color: 'text.primary', mb: 1.5 }}>
            Institution Memberships
          </Typography>
          {entity.institution_memberships.map((m) => (
            <Box key={m.id} sx={{ mb: 1.5, display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Link
                component={RouterLink}
                to={`/browse/entity/${m.institution.id}`}
                sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                {m.institution.name}
              </Link>
              <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                ({m.membership_type})
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Aliases */}
      {entity.aliases_as_source.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ color: 'text.primary', mb: 1.5 }}>
            Can Act As
          </Typography>
          {entity.aliases_as_source.map((alias) => (
            <Box key={alias.id} sx={{ mb: 1.5 }}>
              <Link
                component={RouterLink}
                to={`/browse/entity/${alias.target.id}`}
                sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                {alias.target.name}
              </Link>
              {alias.description && (
                <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {alias.description}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}

      {entity.aliases_as_target.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ color: 'text.primary', mb: 1.5 }}>
            Acted As By
          </Typography>
          {entity.aliases_as_target.map((alias) => (
            <Box key={alias.id} sx={{ mb: 1.5 }}>
              <Link
                component={RouterLink}
                to={`/browse/entity/${alias.source.id}`}
                sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                {alias.source.name}
              </Link>
              {alias.description && (
                <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {alias.description}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Empty state */}
      {!entity.description && entity.mechanism_roles.length === 0 &&
        entity.institution_memberships.length === 0 &&
        entity.aliases_as_source.length === 0 &&
        entity.aliases_as_target.length === 0 && (
        <Typography sx={{ color: 'text.secondary' }}>
          No information available yet.
        </Typography>
      )}
    </Box>
  )
}
