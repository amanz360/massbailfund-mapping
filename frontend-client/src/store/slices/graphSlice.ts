import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState } from '../store'
import type { GraphData } from '../../types/models'
import { fetchGraph } from '../../api/entities'

interface GraphState {
  data: GraphData | null
  loading: boolean
  error: string | null
}

const initialState: GraphState = {
  data: null,
  loading: false,
  error: null,
}

export const loadGraph = createAsyncThunk('graph/loadGraph', async () => {
  return await fetchGraph()
})

const graphSlice = createSlice({
  name: 'graph',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadGraph.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadGraph.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload
      })
      .addCase(loadGraph.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Failed to load graph'
      })
  },
})

export const selectGraphData = (state: RootState) => state.graph.data
export const selectGraphLoading = (state: RootState) => state.graph.loading
export const selectGraphError = (state: RootState) => state.graph.error

export default graphSlice.reducer
