import { Box, Typography } from '@mui/material'
import type { MechanismDetail } from '../../types/models'
import RelationshipItem from './RelationshipItem'

interface MechanismRelationshipsProps {
  entity: MechanismDetail
  onNavigate?: (nodeId: string) => void
}

export default function MechanismRelationships({ entity, onNavigate }: MechanismRelationshipsProps) {
  if (entity.roles.length === 0) return null

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
        Connected Decision Makers
      </Typography>
      {entity.roles.map((role) => (
        <RelationshipItem
          key={role.id}
          name={role.decision_maker.name}
          caption={`${role.role_type}${role.description ? ` - ${role.description}` : ''}`}
          color="secondary.main"
          onClick={() => onNavigate?.(role.decision_maker.id)}
        />
      ))}
    </Box>
  )
}
