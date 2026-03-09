import { configureStore } from '@reduxjs/toolkit'
import graphReducer from './slices/graphSlice'
import detailReducer from './slices/detailSlice'
import browseReducer from './slices/browseSlice'

export const store = configureStore({
  reducer: {
    graph: graphReducer,
    detail: detailReducer,
    browse: browseReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
