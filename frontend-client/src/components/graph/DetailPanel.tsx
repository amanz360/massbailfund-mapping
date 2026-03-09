import { Box, Typography, Chip, IconButton, Link, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import { Link as RouterLink } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '../../store/store'
import { selectSelectedEntityId, clearDetail } from '../../store/slices/detailSlice'
import { selectEntityById } from '../../store/slices/browseSlice'
import { isMechanismDetail, isDecisionMakerDetail, isInstitutionDetail } from '../../types/models'
import { generateDmAutoDescription, sortTimelineEntries, groupReferencesByCategory } from '../../utils/entities'
import ReferenceSection from './ReferenceSection'
import QuoteSection from './QuoteSection'
import TimelineSection from './TimelineSection'

interface DetailPanelProps {
  onClose?: () => void
  onNavigate?: (nodeId: string) => void
  expandedMechanismId?: string | null
  expandedDmId?: string | null
  expandedInstitutionId?: string | null
}

export default function DetailPanel({ onClose, onNavigate, expandedMechanismId, expandedDmId, expandedInstitutionId }: DetailPanelProps) {
  const theme = useTheme()
  const dispatch = useDispatch()
  const selectedId = useSelector(selectSelectedEntityId)
  const entity = useSelector((state: RootState) => selectEntityById(state, selectedId))

  const handleClose = () => {
    dispatch(clearDetail())
    onClose?.()
  }

  if (!entity) return null

  const primaryType = isMechanismDetail(entity) ? 'Mechanism'
    : isDecisionMakerDetail(entity) ? 'Decision Maker'
    : 'Institution'

  // Group references by category (Mechanisms only)
  const referencesByCategory = isMechanismDetail(entity)
    ? groupReferencesByCategory(entity.references)
    : []

  // Auto-generated description for DMs with no description
  const autoDescription = isDecisionMakerDetail(entity)
    ? generateDmAutoDescription(entity)
    : null

  // Determine chip color based on primary type
  const chipSx =
    primaryType === 'Mechanism'
      ? { backgroundColor: alpha(theme.palette.primary.main, 0.13), color: 'primary.main' }
      : primaryType === 'Institution'
        ? { backgroundColor: alpha(theme.palette.institution.main, 0.13), color: 'institution.main' }
        : { backgroundColor: alpha(theme.palette.secondary.main, 0.13), color: 'secondary.main' }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 'bold',
              color: 'text.primary',
              mb: 1,
            }}
          >
            {entity.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip label={isMechanismDetail(entity)
              ? entity.subcategory
              : isDecisionMakerDetail(entity)
                ? entity.authority_type
                : 'Institution'
            } size="small" sx={chipSx} />
          <Link
            component={RouterLink}
            to={`/browse/entity/${entity.id}`}
            sx={{
              fontSize: '0.8rem',
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            View full details &rarr;
          </Link>
        </Box>
        </Box>
        <IconButton onClick={handleClose} size="small" sx={{ ml: 1 }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Description (real or auto-generated) */}
      {(entity.description || autoDescription) && (
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', lineHeight: 1.7, mb: 3, fontStyle: entity.description ? 'normal' : 'italic' }}
        >
          {entity.description || autoDescription}
        </Typography>
      )}

      {/* Quotes */}
      {isMechanismDetail(entity) && entity.quotes.length > 0 && (
        <QuoteSection quotes={entity.quotes} compact />
      )}

      {/* Timeline */}
      {isMechanismDetail(entity) && entity.timeline_entries.length > 0 && (
        <TimelineSection
          entries={sortTimelineEntries(entity.timeline_entries)}
          compact
        />
      )}

      {/* References by Category */}
      {referencesByCategory.map(([category, refs]) => (
        <ReferenceSection
          key={category}
          title={category}
          references={refs}
          compact
        />
      ))}

      {/* Relationships — context-aware */}
      {(() => {
        const isExpandedMech = !!expandedMechanismId

        // Mechanism in expanded view: hide relationships (visible on graph)
        if (isExpandedMech && primaryType === 'Mechanism') return null

        if (isMechanismDetail(entity)) {
          // Mechanism: show roles (connected decision makers)
          if (entity.roles.length === 0) return null
          return (
            <Box sx={{ mb: 3 }}>
              <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
                Connected Decision Makers
              </Typography>
              {entity.roles.map((role) => (
                <Box
                  key={role.id}
                  sx={{
                    mb: 1.5,
                    pl: 2,
                    borderLeft: '3px solid',
                    borderColor: alpha(theme.palette.secondary.main, 0.2),
                  }}
                >
                  <Link
                    component="button"
                    variant="subtitle2"
                    onClick={() => onNavigate?.(role.decision_maker.id)}
                    sx={{ color: 'secondary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' }, textAlign: 'left' }}
                  >
                    {role.decision_maker.name}
                  </Link>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {role.role_type}
                    {role.description ? ` - ${role.description}` : ''}
                  </Typography>
                </Box>
              ))}
            </Box>
          )
        }

        if (isDecisionMakerDetail(entity)) {
          // DM in mechanism-expanded view: show role in current mechanism first
          const mechRelSection = isExpandedMech && (() => {
            const mechRoles = entity.mechanism_roles.filter(
              (r) => r.mechanism.id === expandedMechanismId
            )
            if (mechRoles.length === 0) return null
            return (
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
                  Role in this Mechanism
                </Typography>
                {mechRoles.map((role) => (
                  <Box
                    key={role.id}
                    sx={{
                      mb: 1.5,
                      pl: 2,
                      borderLeft: '3px solid',
                      borderColor: alpha(theme.palette.primary.main, 0.33),
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>
                      {role.role_type}
                    </Typography>
                    {role.description && (
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, mt: 0.5 }}>
                        {role.description}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            )
          })()

          return (
            <>
              {mechRelSection}
              {entity.mechanism_roles.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
                    Connected Mechanisms
                  </Typography>
                  {entity.mechanism_roles.map((role) => (
                    <Box
                      key={role.id}
                      sx={{
                        mb: 1.5,
                        pl: 2,
                        borderLeft: '3px solid',
                        borderColor: alpha(theme.palette.primary.main, 0.2),
                      }}
                    >
                      <Link
                        component="button"
                        variant="subtitle2"
                        onClick={() => onNavigate?.(role.mechanism.id)}
                        sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' }, textAlign: 'left' }}
                      >
                        {role.mechanism.name}
                      </Link>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {role.role_type}
                        {role.description ? ` - ${role.description}` : ''}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {entity.institution_memberships.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
                    Institution Memberships
                  </Typography>
                  {entity.institution_memberships.map((m) => (
                    <Box
                      key={m.id}
                      sx={{
                        mb: 1,
                        pl: 2,
                        borderLeft: '3px solid',
                        borderColor: alpha(theme.palette.secondary.main, 0.2),
                      }}
                    >
                      <Link
                        component="button"
                        variant="subtitle2"
                        onClick={() => onNavigate?.(m.institution.id)}
                        sx={{ color: 'secondary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' }, textAlign: 'left' }}
                      >
                        {m.institution.name}
                      </Link>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {m.membership_type}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {entity.aliases_as_source.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
                    Can Act As
                  </Typography>
                  {entity.aliases_as_source.map((alias) => (
                    <Box
                      key={alias.id}
                      sx={{
                        mb: 1.5,
                        pl: 2,
                        borderLeft: '3px solid',
                        borderColor: alpha(theme.palette.secondary.main, 0.2),
                      }}
                    >
                      <Link
                        component="button"
                        variant="subtitle2"
                        onClick={() => onNavigate?.(alias.target.id)}
                        sx={{ color: 'secondary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' }, textAlign: 'left' }}
                      >
                        {alias.target.name}
                      </Link>
                      {alias.description && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {alias.description}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
              {entity.aliases_as_target.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
                    Acted As By
                  </Typography>
                  {entity.aliases_as_target.map((alias) => (
                    <Box
                      key={alias.id}
                      sx={{
                        mb: 1.5,
                        pl: 2,
                        borderLeft: '3px solid',
                        borderColor: alpha(theme.palette.secondary.main, 0.2),
                      }}
                    >
                      <Link
                        component="button"
                        variant="subtitle2"
                        onClick={() => onNavigate?.(alias.source.id)}
                        sx={{ color: 'secondary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' }, textAlign: 'left' }}
                      >
                        {alias.source.name}
                      </Link>
                      {alias.description && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {alias.description}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </>
          )
        }

        if (isInstitutionDetail(entity)) {
          return (
            <>
              {entity.members.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
                    Members ({entity.members.length})
                  </Typography>
                  {entity.members.map((m) => (
                    <Box
                      key={m.id}
                      sx={{
                        mb: 1,
                        pl: 2,
                        borderLeft: '3px solid',
                        borderColor: alpha(theme.palette.secondary.main, 0.2),
                      }}
                    >
                      <Link
                        component="button"
                        variant="subtitle2"
                        onClick={() => onNavigate?.(m.decision_maker.id)}
                        sx={{ color: 'secondary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' }, textAlign: 'left' }}
                      >
                        {m.decision_maker.name}
                      </Link>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {m.membership_type}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </>
          )
        }

        return null
      })()}
    </Box>
  )
}
