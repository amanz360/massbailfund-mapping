import api from './api'
import type {
  MechanismDetail,
  DecisionMakerDetail,
  InstitutionDetail,
  GlossaryTermItem,
  GraphData,
  ResourceItem,
} from '../types/models'

export const fetchGraph = () =>
  api.get<GraphData>('v1/graph/').then(r => r.data)

export const fetchMechanisms = () =>
  api.get<MechanismDetail[]>('v1/mechanisms/').then(r => r.data)

export const fetchDecisionMakers = () =>
  api.get<DecisionMakerDetail[]>('v1/decision-makers/').then(r => r.data)

export const fetchInstitutions = () =>
  api.get<InstitutionDetail[]>('v1/institutions/').then(r => r.data)

export const fetchGlossary = () =>
  api.get<GlossaryTermItem[]>('v1/glossary/').then(r => r.data)

export const fetchGeneralResources = () =>
  api.get<ResourceItem[]>('v1/resources/', { params: { general: 'true' } }).then(r => r.data)
