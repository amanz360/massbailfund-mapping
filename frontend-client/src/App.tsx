import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { useDispatch } from 'react-redux'
import { theme } from './themes/theme'
import type { AppDispatch } from './store/store'
import { loadGraph } from './store/slices/graphSlice'
import { loadBrowseData } from './store/slices/browseSlice'
import ErrorBoundary from './components/layout/ErrorBoundary'
import PublicLayout from './components/layout/PublicLayout'
import Landing from './views/Landing'
import Home from './views/Home'
import Browse from './views/Browse'

function AppRoutes() {
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    dispatch(loadGraph())
    dispatch(loadBrowseData())
  }, [dispatch])

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<PublicLayout />}>
        <Route path="/map" element={<Home />} />
        <Route path="/browse/*" element={<Browse />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </HashRouter>
    </ThemeProvider>
  )
}

export default App
