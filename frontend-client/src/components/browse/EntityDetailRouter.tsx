import { useMemo } from 'react'
import { Box, Typography, Link } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useBrowseData } from '../../views/Browse'
import { isMechanismDetail, isDecisionMakerDetail, isInstitutionDetail } from '../../types/models'
import MechanismDetailPage from './MechanismDetailPage'
import DecisionMakerDetailPage from './DecisionMakerDetailPage'
import InstitutionDetailPage from './InstitutionDetailPage'

export default function EntityDetailRouter() {
  const { id } = useParams<{ id: string }>()
  const { mechanisms, decisionMakers, institutions } = useBrowseData()

  const entity = useMemo(() => {
    if (!id) return null
    return mechanisms.find((m) => m.id === id)
      ?? decisionMakers.find((dm) => dm.id === id)
      ?? institutions.find((inst) => inst.id === id)
      ?? null
  }, [id, mechanisms, decisionMakers, institutions])

  // Data still loading
  if (!entity && mechanisms.length + decisionMakers.length + institutions.length === 0) {
    return null
  }

  // Entity not found
  if (!entity) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2 }}>
        <Link
          component={RouterLink}
          to="/browse"
          sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          &larr; Back
        </Link>
        <Typography sx={{ mt: 4, color: 'text.secondary' }}>
          Entity not found. It may have been removed or the link may be incorrect.
        </Typography>
      </Box>
    )
  }

  if (isMechanismDetail(entity)) return <MechanismDetailPage entity={entity} />
  if (isDecisionMakerDetail(entity)) return <DecisionMakerDetailPage entity={entity} />
  if (isInstitutionDetail(entity)) return <InstitutionDetailPage entity={entity} />

  return null
}
