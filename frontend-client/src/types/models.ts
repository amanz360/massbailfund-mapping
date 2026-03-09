// ── List types ─────────────────────────────────────────────────────────

export interface MechanismListItem {
  id: string
  name: string
  subcategory: string
}

export interface DecisionMakerListItem {
  id: string
  name: string
  authority_type: string
}

export interface InstitutionListItem {
  id: string
  name: string
}

// ── Reference types ────────────────────────────────────────────────────

export interface MechanismReference {
  id: string
  mechanism: string
  category: string
  description: string
  link: string
}

export interface MechanismQuoteItem {
  id: string
  mechanism: string
  speaker: string
  quote: string
  source_timestamp: string
  link: string
}

export interface MechanismTimelineEntryItem {
  id: string
  mechanism: string
  date: string | null
  title: string
  description: string
  link: string
}

// ── Relationship types ─────────────────────────────────────────────────

export interface MechanismRoleItem {
  id: string
  mechanism: MechanismListItem
  decision_maker: DecisionMakerListItem
  role_type: string
  description: string
}

export interface DecisionMakerAliasItem {
  id: string
  source: DecisionMakerListItem
  target: DecisionMakerListItem
  description: string
}

export interface InstitutionMembershipItem {
  id: string
  institution: InstitutionListItem
  decision_maker: DecisionMakerListItem
  membership_type: string
}

// ── Resource types ─────────────────────────────────────────────────────

export interface ResourceItem {
  id: string
  mechanism: string
  url: string
  title: string
  description: string
  key_points: string[]
  tags: string
  image: string | null
}

// ── Glossary types ─────────────────────────────────────────────────────

export interface GlossaryTermBrief {
  id: string
  term: string
  definition: string
}

export interface GlossaryTermItem {
  id: string
  term: string
  definition: string
  mechanisms: MechanismListItem[]
}

// ── Detail types ───────────────────────────────────────────────────────

export interface MechanismDetail extends MechanismListItem {
  description: string
  references: MechanismReference[]
  quotes: MechanismQuoteItem[]
  timeline_entries: MechanismTimelineEntryItem[]
  resources: ResourceItem[]
  roles: MechanismRoleItem[]
  glossary_terms: GlossaryTermBrief[]
}

export interface DecisionMakerDetail extends DecisionMakerListItem {
  description: string
  mechanism_roles: MechanismRoleItem[]
  institution_memberships: InstitutionMembershipItem[]
  aliases_as_source: DecisionMakerAliasItem[]
  aliases_as_target: DecisionMakerAliasItem[]
}

export interface InstitutionDetail extends InstitutionListItem {
  description: string
  members: InstitutionMembershipItem[]
}

// Union type for entity detail (used by detailSlice)
export type EntityDetail = MechanismDetail | DecisionMakerDetail | InstitutionDetail

// Type guards
export function isMechanismDetail(e: EntityDetail): e is MechanismDetail {
  return 'references' in e
}

export function isDecisionMakerDetail(e: EntityDetail): e is DecisionMakerDetail {
  return 'mechanism_roles' in e
}

export function isInstitutionDetail(e: EntityDetail): e is InstitutionDetail {
  return 'members' in e
}

// ── Graph types (unchanged — backend synthesizes primary_type) ─────────

export interface GraphNode {
  id: string
  name: string
  primary_type: string
  secondary_type: string
  description: string
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  relationship_type: string
  description: string
}

export interface GraphMembership {
  id: string
  institution: string
  member: string
  membership_type: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  memberships: GraphMembership[]
}
