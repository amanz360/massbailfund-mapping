import { Box, Typography } from '@mui/material'
import type { DecisionMakerDetail } from '../../types/models'
import RelationshipItem from './RelationshipItem'

interface DecisionMakerRelationshipsProps {
  entity: DecisionMakerDetail
  expandedMechanismId?: string | null
  onNavigate?: (nodeId: string) => void
}

export default function DecisionMakerRelationships({
  entity,
  expandedMechanismId,
  onNavigate,
}: DecisionMakerRelationshipsProps) {
  // Context-aware: show role in expanded mechanism first
  const mechRoles = expandedMechanismId
    ? entity.mechanism_roles.filter((r) => r.mechanism.id === expandedMechanismId)
    : []

  return (
    <>
      {mechRoles.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
            Role in this Mechanism
          </Typography>
          {mechRoles.map((role) => (
            <RelationshipItem
              key={role.id}
              name={role.role_type}
              caption={role.description || undefined}
              color="primary.main"
              borderOpacity={0.33}
            />
          ))}
        </Box>
      )}

      {entity.mechanism_roles.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
            Connected Mechanisms
          </Typography>
          {entity.mechanism_roles.map((role) => (
            <RelationshipItem
              key={role.id}
              name={role.mechanism.name}
              caption={`${role.role_type}${role.description ? ` - ${role.description}` : ''}`}
              color="primary.main"
              onClick={() => onNavigate?.(role.mechanism.id)}
            />
          ))}
        </Box>
      )}

      {entity.institution_memberships.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
            Institution Memberships
          </Typography>
          {entity.institution_memberships.map((m) => (
            <RelationshipItem
              key={m.id}
              name={m.institution.name}
              caption={m.membership_type}
              color="secondary.main"
              onClick={() => onNavigate?.(m.institution.id)}
            />
          ))}
        </Box>
      )}

      {entity.aliases_as_source.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
            Can Act As
          </Typography>
          {entity.aliases_as_source.map((alias) => (
            <RelationshipItem
              key={alias.id}
              name={alias.target.name}
              caption={alias.description || undefined}
              color="secondary.main"
              onClick={() => onNavigate?.(alias.target.id)}
            />
          ))}
        </Box>
      )}

      {entity.aliases_as_target.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
            Acted As By
          </Typography>
          {entity.aliases_as_target.map((alias) => (
            <RelationshipItem
              key={alias.id}
              name={alias.source.name}
              caption={alias.description || undefined}
              color="secondary.main"
              onClick={() => onNavigate?.(alias.source.id)}
            />
          ))}
        </Box>
      )}
    </>
  )
}
