export type ViewLevel = 'landing' | 'expanded-mechanism' | 'expanded-dm' | 'expanded-institution'
export type ExpandedViewType = 'mechanism' | 'dm' | 'institution'

export interface SystemMapProps {
  onNodeSelect?: (nodeId: string | null) => void
  onMechanismExpand?: (mechanismId: string | null) => void
  onDmExpand?: (dmId: string | null) => void
  onInstitutionExpand?: (institutionId: string | null) => void
  focusNodeId?: string | null
  focusCounter?: number
  /** Increment to return to the landing view from outside */
  resetCounter?: number
}
