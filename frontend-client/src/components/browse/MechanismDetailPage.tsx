import { useEffect, useMemo, useState } from 'react'
import { Box, Typography, Tab, Tabs, Link, Chip, Button, IconButton, Tooltip, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import MapIcon from '@mui/icons-material/Map'
import LinkIcon from '@mui/icons-material/Link'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import type { MechanismDetail } from '../../types/models'
import { groupReferencesByCategory, sortTimelineEntries, displayHostname } from '../../utils/entities'
import { useBrowseData } from '../../views/Browse'
import ReferenceSection from '../graph/ReferenceSection'
import QuoteSection from '../graph/QuoteSection'
import TimelineSection from '../graph/TimelineSection'

interface Props {
  entity: MechanismDetail
}

export default function MechanismDetailPage({ entity }: Props) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [tabIndex, setTabIndex] = useState(0)
  const [linkCopied, setLinkCopied] = useState(false)
  const { mechanisms } = useBrowseData()

  useEffect(() => {
    document.title = `${entity.name} | Mass Bail Fund`
  }, [entity.name])

  const referencesByCategory = useMemo(
    () => groupReferencesByCategory(entity.references),
    [entity],
  )

  const sortedTimeline = useMemo(
    () => sortTimelineEntries(entity.timeline_entries),
    [entity],
  )

  const relatedMechanisms = useMemo(() => {
    if (!entity.subcategory) return []
    return mechanisms
      .filter((m) => m.subcategory === entity.subcategory && m.id !== entity.id)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [mechanisms, entity])

  const hasOverviewContent =
    entity.description ||
    entity.references.length > 0 ||
    entity.quotes.length > 0 ||
    entity.timeline_entries.length > 0
  const hasResources = entity.resources.length > 0
  const hasGlossary = entity.glossary_terms.length > 0

  // Dynamic tab indices since Sources and Glossary are conditional
  let nextTab = 2
  const sourcesTabIndex = hasResources ? nextTab++ : -1
  const glossaryTabIndex = hasGlossary ? nextTab++ : -1

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Link
          component={RouterLink}
          to="/browse?section=mechanisms"
          sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          &larr; Mechanisms
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
        {entity.subcategory && (
          <Chip
            label={entity.subcategory}
            size="small"
            sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.09), color: 'primary.main' }}
          />
        )}
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          {entity.roles.length} decision maker{entity.roles.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tabIndex}
        onChange={(_, v: number) => setTabIndex(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Overview" sx={{ textTransform: 'none' }} />
        <Tab
          label={`Decision Makers (${entity.roles.length})`}
          sx={{ textTransform: 'none' }}
        />
        {hasResources && (
          <Tab
            label={`Sources (${entity.resources.length})`}
            sx={{ textTransform: 'none' }}
          />
        )}
        {hasGlossary && (
          <Tab
            label={`Glossary (${entity.glossary_terms.length})`}
            sx={{ textTransform: 'none' }}
          />
        )}
      </Tabs>

      {/* Overview */}
      {tabIndex === 0 && (
        <Box>
          {hasOverviewContent ? (
            <>
              {entity.description && (
                <Typography sx={{ mb: 3, color: 'text.primary', lineHeight: 1.7 }}>
                  {entity.description}
                </Typography>
              )}
              {entity.quotes.length > 0 && (
                <QuoteSection quotes={entity.quotes} />
              )}
              {sortedTimeline.length > 0 && (
                <TimelineSection entries={sortedTimeline} />
              )}
              {referencesByCategory.map(([category, refs]) => (
                <ReferenceSection key={category} title={category} references={refs} />
              ))}
            </>
          ) : (
            <Typography sx={{ color: 'text.secondary', mb: 3 }}>
              No information available yet.
            </Typography>
          )}
          {relatedMechanisms.length > 0 && (
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
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
                Related {entity.subcategory} Mechanisms
              </Typography>
              {relatedMechanisms.map((m) => (
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
        </Box>
      )}

      {/* Roles */}
      {tabIndex === 1 && (
        <Box>
          {entity.roles.length > 0 ? (
            entity.roles.map((role) => (
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
                  <Link
                    component={RouterLink}
                    to={`/browse/entity/${role.decision_maker.id}`}
                    sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    {role.decision_maker.name}
                  </Link>
                </Box>
                {role.description && (
                  <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: '0.9rem', lineHeight: 1.7 }}>
                    {role.description}
                  </Typography>
                )}
              </Box>
            ))
          ) : (
            <Typography sx={{ color: 'text.secondary' }}>No decision makers defined.</Typography>
          )}
        </Box>
      )}

      {/* Sources */}
      {hasResources && tabIndex === sourcesTabIndex && (
        <Box>
          {entity.resources.map((resource) => (
            <Box
              key={resource.id}
              sx={{ mb: 2.5, p: 2, borderRadius: 1, border: 1, borderColor: 'divider' }}
            >
              {resource.url ? (
                <Link
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ fontWeight: 600, fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                >
                  {resource.title || displayHostname(resource.url)} ↗
                </Link>
              ) : resource.title ? (
                <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {resource.title}
                </Typography>
              ) : null}

              {resource.image && (
                <Box
                  component="img"
                  src={resource.image}
                  alt={resource.title || 'Resource image'}
                  sx={{ mt: 1, maxWidth: '100%', borderRadius: 1, border: 1, borderColor: 'divider' }}
                />
              )}

              {resource.description && (
                <Typography sx={{ mt: 0.75, color: 'text.secondary', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {resource.description}
                </Typography>
              )}

              {resource.key_points.length > 0 && (
                <Box sx={{ mt: 1, p: 1.5, backgroundColor: 'action.hover', borderRadius: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', mb: 0.5 }}>
                    Key facts
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {resource.key_points.map((point, i) => (
                      <Box
                        component="li"
                        key={i}
                        sx={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'text.secondary' }}
                      >
                        {point}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {resource.tags && (
                <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {resource.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Glossary */}
      {hasGlossary && tabIndex === glossaryTabIndex && (
        <Box>
          {entity.glossary_terms.map((term) => (
            <Box key={term.id} sx={{ mb: 2.5 }}>
              <Typography sx={{ fontWeight: 600 }}>{term.term}</Typography>
              <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {term.definition}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
