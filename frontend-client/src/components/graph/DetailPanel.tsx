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
import MechanismRelationships from './MechanismRelationships'
import DecisionMakerRelationships from './DecisionMakerRelationships'
import InstitutionRelationships from './InstitutionRelationships'

interface DetailPanelProps {
  onClose?: () => void
  onNavigate?: (nodeId: string) => void
  expandedMechanismId?: string | null
}

export default function DetailPanel({ onClose, onNavigate, expandedMechanismId }: DetailPanelProps) {
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
      {isMechanismDetail(entity) && (
        <MechanismRelationships entity={entity} onNavigate={onNavigate} />
      )}
      {isDecisionMakerDetail(entity) && (
        <DecisionMakerRelationships
          entity={entity}
          expandedMechanismId={expandedMechanismId}
          onNavigate={onNavigate}
        />
      )}
      {isInstitutionDetail(entity) && (
        <InstitutionRelationships entity={entity} onNavigate={onNavigate} />
      )}
    </Box>
  )
}
