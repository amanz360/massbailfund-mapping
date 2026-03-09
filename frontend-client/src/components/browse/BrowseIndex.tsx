import { useMemo, useState } from 'react'
import { Box, Typography, Link, Chip, TextField, InputAdornment, GlobalStyles, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import SearchIcon from '@mui/icons-material/Search'
import Masonry from 'react-masonry-css'
import { Link as RouterLink } from 'react-router-dom'
import type { GlossaryTermItem, ResourceItem, MechanismDetail } from '../../types/models'
import type { Section } from '../../views/Browse'
import { useBrowseData } from '../../views/Browse'
import { buildInstitutionColors, displayHostname } from '../../utils/entities'

interface BrowseIndexProps {
  activeSection: Section
  glossary: GlossaryTermItem[]
  generalResources: ResourceItem[]
  mechanismDetails: MechanismDetail[]
}

export default function BrowseIndex({
  activeSection,
  glossary,
  generalResources,
  mechanismDetails,
}: BrowseIndexProps) {
  const { mechanisms, decisionMakers, institutions } = useBrowseData()

  // Mechanisms grouped by subcategory
  const mechanismsBySubcategory = useMemo(() => {
    const grouped = new Map<string, typeof mechanisms>()
    for (const m of mechanisms) {
      const sub = m.subcategory || 'Other'
      const existing = grouped.get(sub)
      if (existing) existing.push(m)
      else grouped.set(sub, [m])
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([subcategory, items]) => ({
        subcategory,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      }))
  }, [mechanisms])

  // Decision makers grouped by authority type
  const dmsByAuthority = useMemo(() => {
    const grouped = new Map<string, typeof decisionMakers>()
    for (const dm of decisionMakers) {
      const auth = dm.authority_type || 'Other'
      const existing = grouped.get(auth)
      if (existing) existing.push(dm)
      else grouped.set(auth, [dm])
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([authority, items]) => ({
        authority,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      }))
  }, [decisionMakers])

  // DM role counts — derived from mechanism details
  const dmRoleCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const detail of mechanismDetails) {
      for (const role of detail.roles) {
        const dmId = role.decision_maker.id
        counts.set(dmId, (counts.get(dmId) ?? 0) + 1)
      }
    }
    return counts
  }, [mechanismDetails])

  // DM → institution memberships (with type) and institution member counts
  const { dmInstitutions, institutionsWithCounts } = useMemo(() => {
    const dmInst = new Map<string, { instId: string; type: string }[]>()
    const instCounts = institutions.map((inst) => {
      const members = inst.members ?? []
      for (const m of members) {
        const entry = { instId: inst.id, type: m.membership_type }
        const existing = dmInst.get(m.decision_maker.id)
        if (existing) existing.push(entry)
        else dmInst.set(m.decision_maker.id, [entry])
      }
      return { ...inst, memberCount: members.length }
    })
    return { dmInstitutions: dmInst, institutionsWithCounts: instCounts }
  }, [institutions])

  // Build mechanism detail lookup by ID
  const mechanismDetailMap = useMemo(() => {
    const map = new Map<string, MechanismDetail>()
    for (const d of mechanismDetails) map.set(d.id, d)
    return map
  }, [mechanismDetails])

  return (
    <>
    <GlobalStyles styles={{
      '.browse-masonry': { display: 'flex', gap: '16px', width: 'auto' },
      '.browse-masonry-column': { backgroundClip: 'padding-box' },
      '@keyframes cardSlideIn': {
        from: { opacity: 0, transform: 'translateY(8px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
    }} />
    <Box
      key={activeSection}
      sx={{
        maxWidth: 960,
        mx: 'auto',
        py: 4,
        px: 3,
        '@keyframes browseFadeIn': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        animation: 'browseFadeIn 0.25s ease-out',
      }}
    >
      {activeSection === 'mechanisms' && (
        <MechanismsSection groups={mechanismsBySubcategory} detailMap={mechanismDetailMap} />
      )}
      {activeSection === 'decision-makers' && (
        <DecisionMakersSection
          dmGroups={dmsByAuthority}
          dmRoleCounts={dmRoleCounts}
          institutions={institutionsWithCounts}
          dmInstitutions={dmInstitutions}
        />
      )}
      {activeSection === 'glossary' && <GlossarySection glossary={glossary} />}
      {activeSection === 'resources' && <ResourcesSection resources={generalResources} />}
    </Box>
    </>
  )
}

/* ── Section Components ── */

function MechanismsSection({
  groups,
  detailMap,
}: {
  groups: { subcategory: string; items: { id: string; name: string }[] }[]
  detailMap: Map<string, MechanismDetail>
}) {
  const theme = useTheme()
  return (
    <>
      <Typography variant="h5" sx={{ color: 'text.primary', mb: 0.5 }}>
        Mechanisms
      </Typography>
      <Typography
        sx={{ color: 'text.secondary', mb: 3, fontSize: '0.9rem', maxWidth: 720, lineHeight: 1.6 }}
      >
        The legal processes, court procedures, and monitoring systems that make up the pretrial
        system.
      </Typography>

      {groups.map(({ subcategory, items }, groupIdx) => (
        <Box key={subcategory} sx={{ mb: 3.5, ...(groupIdx > 0 && { pt: 2, borderTop: '1px solid', borderColor: 'divider' }) }}>
          <Typography
            variant="overline"
            sx={{
              color: 'primary.main',
              fontWeight: 700,
              fontSize: '0.8rem',
              letterSpacing: '0.08em',
              display: 'block',
              mb: 1,
            }}
          >
            {subcategory}
          </Typography>
          <Masonry
            breakpointCols={{ default: 2, 600: 1 }}
            className="browse-masonry"
            columnClassName="browse-masonry-column"
          >
            {items.map((m, idx) => {
              const detail = detailMap.get(m.id)
              const description = detail?.description
              const hasDescription = !!description
              const dmCount = detail?.roles.length ?? 0
              const refCount = detail?.references.length ?? 0
              const quoteCount = detail?.quotes.length ?? 0
              const timelineCount = detail?.timeline_entries.length ?? 0
              const resourceCount = detail?.resources.length ?? 0
              const infoCount = refCount + quoteCount + timelineCount + resourceCount
              return (
                <Box
                  key={m.id}
                  component={RouterLink}
                  to={`entity/${m.id}`}
                  sx={{
                    display: 'block',
                    textDecoration: 'none',
                    color: 'inherit',
                    mb: 2,
                    p: 2,
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    borderLeft: '3px solid',
                    borderLeftColor: alpha(theme.palette.primary.main, 0.2),
                    '&:hover': {
                      borderLeftColor: 'primary.main',
                      backgroundColor: alpha(theme.palette.primary.main, 0.024),
                    },
                    transition: 'all 0.15s',
                    opacity: 0,
                    animation: 'cardSlideIn 0.3s ease-out forwards',
                    animationDelay: `${Math.min(idx * 40, 400)}ms`,
                  }}
                >
                  <Typography sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.95rem' }}>
                    {m.name}
                  </Typography>
                  {hasDescription && (
                    <Typography
                      sx={{
                        mt: 0.75,
                        color: 'text.secondary',
                        fontSize: '0.85rem',
                        lineHeight: 1.6,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {description}
                    </Typography>
                  )}
                  <Box sx={{ mt: 1, display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
                    {dmCount > 0 && (
                      <Chip
                        label={`${dmCount} decision maker${dmCount !== 1 ? 's' : ''}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem', height: 22 }}
                      />
                    )}
                    {refCount > 0 && (
                      <Chip
                        label={`${refCount} reference${refCount !== 1 ? 's' : ''}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem', height: 22 }}
                      />
                    )}
                    {resourceCount > 0 && (
                      <Chip
                        label={`${resourceCount} source${resourceCount !== 1 ? 's' : ''}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem', height: 22 }}
                      />
                    )}
                    {quoteCount > 0 && (
                      <Chip
                        label={`${quoteCount} quote${quoteCount !== 1 ? 's' : ''}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem', height: 22 }}
                      />
                    )}
                    {timelineCount > 0 && (
                      <Chip
                        label={`${timelineCount} event${timelineCount !== 1 ? 's' : ''}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem', height: 22 }}
                      />
                    )}
                    {!hasDescription && infoCount === 0 && dmCount === 0 && (
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', fontStyle: 'italic' }}>
                        No information yet
                      </Typography>
                    )}
                  </Box>
                </Box>
              )
            })}
          </Masonry>
        </Box>
      ))}
    </>
  )
}

function DecisionMakersSection({
  dmGroups,
  dmRoleCounts,
  institutions,
  dmInstitutions,
}: {
  dmGroups: { authority: string; items: { id: string; name: string }[] }[]
  dmRoleCounts: Map<string, number>
  institutions: { id: string; name: string; memberCount: number }[]
  dmInstitutions: Map<string, { instId: string; type: string }[]>
}) {
  const theme = useTheme()
  const instColorMap = useMemo(() => buildInstitutionColors(institutions), [institutions])

  // Institution name lookup
  const instNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const inst of institutions) map.set(inst.id, inst.name)
    return map
  }, [institutions])

  return (
    <>
      <Typography variant="h5" sx={{ color: 'text.primary', mb: 0.5 }}>
        Decision Makers
      </Typography>
      <Typography sx={{ color: 'text.secondary', mb: 3, fontSize: '0.9rem', lineHeight: 1.6 }}>
        The individuals, offices, and agencies who hold power within the pretrial system.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' },
          gap: 5,
          alignItems: 'flex-start',
        }}
      >
        {/* Decision Makers */}
        <Box>
          {dmGroups.map(({ authority, items }, groupIdx) => (
            <Box key={authority} sx={{ mb: 2.5, ...(groupIdx > 0 && { pt: 2, borderTop: '1px solid', borderColor: 'divider' }) }}>
              <Typography
                variant="overline"
                sx={{
                  color: 'primary.main',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  letterSpacing: '0.08em',
                  display: 'block',
                  mb: 0.5,
                }}
              >
                {authority}
              </Typography>
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                {items.map((dm, idx) => {
                  const roleCount = dmRoleCounts.get(dm.id) ?? 0
                  const memberships = dmInstitutions.get(dm.id) ?? []
                  return (
                    <Box
                      component="li"
                      key={dm.id}
                      sx={{
                        mb: 0.75,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        '@keyframes listFadeIn': {
                          from: { opacity: 0 },
                          to: { opacity: 1 },
                        },
                        opacity: 0,
                        animation: 'listFadeIn 0.25s ease-out forwards',
                        animationDelay: `${Math.min(idx * 25, 300)}ms`,
                      }}
                    >
                      <Link
                        component={RouterLink}
                        to={`entity/${dm.id}`}
                        sx={{
                          color: 'primary.main',
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {dm.name}
                      </Link>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto', flexShrink: 0 }}>
                        {memberships.map((m) => {
                          const isPrimary = m.type.toLowerCase() === 'primary'
                          const dotColor = instColorMap.get(m.instId) ?? '#999'
                          return (
                            <Box
                              key={m.instId}
                              component="span"
                              title={`${instNames.get(m.instId) ?? ''} (${m.type})`}
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: isPrimary ? dotColor : 'transparent',
                                border: '1.5px solid',
                                borderColor: dotColor,
                                flexShrink: 0,
                              }}
                            />
                          )
                        })}
                        <Typography
                          component="span"
                          sx={{
                            color: 'text.disabled',
                            fontSize: '0.78rem',
                            flexShrink: 0,
                            minWidth: 44,
                            textAlign: 'right',
                          }}
                        >
                          {roleCount} role{roleCount !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Institutions */}
        {institutions.length > 0 && (
          <Box>
            <Typography
              variant="overline"
              sx={{
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '0.8rem',
                letterSpacing: '0.08em',
                display: 'block',
                mb: 1,
              }}
            >
              Institutions
            </Typography>
            {institutions.map((inst) => (
              <Box
                key={inst.id}
                component={RouterLink}
                to={`entity/${inst.id}`}
                sx={{
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit',
                  mb: 1.5,
                  p: 2,
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                  borderLeft: '3px solid',
                  borderLeftColor: instColorMap.get(inst.id) ?? alpha(theme.palette.secondary.main, 0.2),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.secondary.main, 0.024),
                  },
                  transition: 'all 0.15s',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: instColorMap.get(inst.id) ?? '#999',
                      flexShrink: 0,
                    }}
                  />
                  <Typography sx={{ color: 'primary.main', fontWeight: 600 }}>
                    {inst.name}
                  </Typography>
                </Box>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mt: 0.25, pl: 2.5 }}>
                  {inst.memberCount} member{inst.memberCount !== 1 ? 's' : ''}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </>
  )
}

function GlossarySection({ glossary }: { glossary: GlossaryTermItem[] }) {
  const theme = useTheme()
  const [filter, setFilter] = useState('')

  const filteredGlossary = useMemo(() => {
    if (!filter.trim()) return glossary
    const q = filter.toLowerCase()
    return glossary.filter(
      (t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q),
    )
  }, [glossary, filter])

  if (glossary.length === 0) {
    return <Typography sx={{ color: 'text.secondary' }}>No glossary terms available.</Typography>
  }

  return (
    <>
      <Typography variant="h5" sx={{ color: 'text.primary', mb: 0.5 }}>
        Legal Glossary
      </Typography>
      <Typography sx={{ color: 'text.secondary', mb: 2, fontSize: '0.9rem', lineHeight: 1.6 }}>
        Key legal terms and definitions used throughout the pretrial system.
      </Typography>
      <TextField
        size="small"
        placeholder="Filter terms..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 3, width: '100%', maxWidth: 320 }}
      />
      {filteredGlossary.length === 0 && (
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          No terms match &ldquo;{filter}&rdquo;
        </Typography>
      )}
      <Masonry
        breakpointCols={{ default: 2, 600: 1 }}
        className="browse-masonry"
        columnClassName="browse-masonry-column"
      >
        {filteredGlossary.map((term, idx) => (
          <Box
            key={term.id}
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
              borderLeft: '3px solid',
              borderLeftColor: alpha(theme.palette.primary.main, 0.2),
              '&:hover': {
                borderLeftColor: 'primary.main',
                backgroundColor: alpha(theme.palette.primary.main, 0.024),
              },
              transition: 'all 0.15s',
              opacity: 0,
              animation: 'cardSlideIn 0.3s ease-out forwards',
              animationDelay: `${Math.min(idx * 40, 400)}ms`,
            }}
          >
            <Typography sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.95rem' }}>
              {term.term}
            </Typography>
            <Typography
              sx={{ color: 'text.secondary', fontSize: '0.9rem', lineHeight: 1.6, mt: 0.5 }}
            >
              {term.definition}
            </Typography>
            {term.mechanisms.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {term.mechanisms.map((e) => (
                  <Chip
                    key={e.id}
                    label={e.name}
                    size="small"
                    component={RouterLink}
                    to={`entity/${e.id}`}
                    clickable
                    sx={{ textDecoration: 'none' }}
                  />
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Masonry>
    </>
  )
}

function ResourcesSection({ resources }: { resources: ResourceItem[] }) {
  const theme = useTheme()
  if (resources.length === 0) {
    return <Typography sx={{ color: 'text.secondary' }}>No resources available.</Typography>
  }

  return (
    <>
      <Typography variant="h5" sx={{ color: 'text.primary', mb: 0.5 }}>
        General Pretrial Resources
      </Typography>
      <Typography sx={{ color: 'text.secondary', mb: 3, fontSize: '0.9rem', lineHeight: 1.6 }}>
        Reports, articles, and reference materials about the Massachusetts pretrial system.
      </Typography>
      <Masonry
        breakpointCols={{ default: 2, 600: 1 }}
        className="browse-masonry"
        columnClassName="browse-masonry-column"
      >
        {resources.map((resource, idx) => (
          <Box
            key={resource.id}
            sx={{
              p: 2,
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
              borderLeft: '3px solid',
              borderLeftColor: alpha(theme.palette.primary.main, 0.2),
              '&:hover': {
                borderLeftColor: 'primary.main',
                backgroundColor: alpha(theme.palette.primary.main, 0.024),
              },
              transition: 'all 0.15s',
              mb: 2,
              overflow: 'hidden',
              overflowWrap: 'break-word',
              opacity: 0,
              animation: 'cardSlideIn 0.3s ease-out forwards',
              animationDelay: `${Math.min(idx * 40, 400)}ms`,
            }}
          >
            {resource.url ? (
              <Link
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ fontWeight: 600, fontSize: '0.95rem' }}
              >
                {resource.title || displayHostname(resource.url)} ↗
              </Link>
            ) : resource.title ? (
              <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                {resource.title}
              </Typography>
            ) : null}

            {resource.description && (
              <Typography
                sx={{
                  mt: 0.5,
                  color: 'text.secondary',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-line',
                }}
              >
                {resource.description}
              </Typography>
            )}

            {resource.key_points.length > 0 && (
              <Box
                sx={{
                  mt: 1,
                  p: 1.5,
                  backgroundColor: 'action.hover',
                  borderRadius: 1,
                }}
              >
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
                {resource.tags
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean)
                  .map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
              </Box>
            )}
          </Box>
        ))}
      </Masonry>
    </>
  )
}
