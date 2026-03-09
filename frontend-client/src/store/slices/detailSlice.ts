import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'

interface DetailState {
  selectedEntityId: string | null
}

const initialState: DetailState = {
  selectedEntityId: null,
}

const detailSlice = createSlice({
  name: 'detail',
  initialState,
  reducers: {
    selectEntity(state, action: PayloadAction<string>) {
      state.selectedEntityId = action.payload
    },
    clearDetail(state) {
      state.selectedEntityId = null
    },
  },
})

export const { selectEntity, clearDetail } = detailSlice.actions

export const selectSelectedEntityId = (state: RootState) => state.detail.selectedEntityId

export default detailSlice.reducer
