import { Box, Typography } from '@mui/material'
import type { InstitutionDetail } from '../../types/models'
import RelationshipItem from './RelationshipItem'

interface InstitutionRelationshipsProps {
  entity: InstitutionDetail
  onNavigate?: (nodeId: string) => void
}

export default function InstitutionRelationships({ entity, onNavigate }: InstitutionRelationshipsProps) {
  if (entity.members.length === 0) return null

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
        Members ({entity.members.length})
      </Typography>
      {entity.members.map((m) => (
        <RelationshipItem
          key={m.id}
          name={m.decision_maker.name}
          caption={m.membership_type}
          color="secondary.main"
          onClick={() => onNavigate?.(m.decision_maker.id)}
        />
      ))}
    </Box>
  )
}
