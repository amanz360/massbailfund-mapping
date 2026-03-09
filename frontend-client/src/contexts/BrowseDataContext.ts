import { createContext, useContext } from 'react'
import type {
  MechanismDetail,
  DecisionMakerDetail,
  InstitutionDetail,
} from '../types/models'

export interface BrowseData {
  mechanisms: MechanismDetail[]
  decisionMakers: DecisionMakerDetail[]
  institutions: InstitutionDetail[]
}

export const BrowseDataContext = createContext<BrowseData>({
  mechanisms: [],
  decisionMakers: [],
  institutions: [],
})

export function useBrowseData() {
  return useContext(BrowseDataContext)
}
