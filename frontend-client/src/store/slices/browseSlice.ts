import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState } from '../store'
import type {
  MechanismDetail,
  DecisionMakerDetail,
  InstitutionDetail,
  GlossaryTermItem,
  ResourceItem,
} from '../../types/models'
import {
  fetchMechanisms,
  fetchDecisionMakers,
  fetchInstitutions,
  fetchGlossary,
  fetchGeneralResources,
} from '../../api/entities'

interface BrowseState {
  mechanisms: MechanismDetail[]
  decisionMakers: DecisionMakerDetail[]
  institutions: InstitutionDetail[]
  glossary: GlossaryTermItem[]
  generalResources: ResourceItem[]
  loading: boolean
  error: string | null
}

const initialState: BrowseState = {
  mechanisms: [],
  decisionMakers: [],
  institutions: [],
  glossary: [],
  generalResources: [],
  loading: false,
  error: null,
}

export const loadBrowseData = createAsyncThunk('browse/loadBrowseData', async () => {
  const [mechanisms, decisionMakers, institutions, glossary, generalResources] = await Promise.all([
    fetchMechanisms().catch(() => [] as MechanismDetail[]),
    fetchDecisionMakers().catch(() => [] as DecisionMakerDetail[]),
    fetchInstitutions().catch(() => [] as InstitutionDetail[]),
    fetchGlossary().catch(() => [] as GlossaryTermItem[]),
    fetchGeneralResources().catch(() => [] as ResourceItem[]),
  ])
  return { mechanisms, decisionMakers, institutions, glossary, generalResources }
})

const browseSlice = createSlice({
  name: 'browse',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadBrowseData.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadBrowseData.fulfilled, (state, action) => {
        state.loading = false
        state.mechanisms = action.payload.mechanisms
        state.decisionMakers = action.payload.decisionMakers
        state.institutions = action.payload.institutions
        state.glossary = action.payload.glossary
        state.generalResources = action.payload.generalResources
      })
      .addCase(loadBrowseData.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Failed to load data'
      })
  },
})

export const selectBrowseLoading = (state: RootState) => state.browse.loading
export const selectBrowseError = (state: RootState) => state.browse.error
export const selectMechanisms = (state: RootState) => state.browse.mechanisms
export const selectDecisionMakers = (state: RootState) => state.browse.decisionMakers
export const selectInstitutions = (state: RootState) => state.browse.institutions
export const selectGlossary = (state: RootState) => state.browse.glossary
export const selectGeneralResources = (state: RootState) => state.browse.generalResources

export const selectEntityById = (state: RootState, id: string | null) => {
  if (!id) return null
  const { mechanisms, decisionMakers, institutions } = state.browse
  return mechanisms.find((m) => m.id === id)
    ?? decisionMakers.find((dm) => dm.id === id)
    ?? institutions.find((inst) => inst.id === id)
    ?? null
}

export default browseSlice.reducer
