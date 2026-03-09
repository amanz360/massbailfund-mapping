import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { Box, Typography, Button } from '@mui/material'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 2,
            p: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" sx={{ color: 'text.primary' }}>
            Something went wrong
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', maxWidth: 400 }}>
            An unexpected error occurred. Try refreshing the page.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => {
              this.setState({ hasError: false })
              window.location.hash = '#/'
              window.location.reload()
            }}
          >
            Refresh
          </Button>
        </Box>
      )
    }

    return this.props.children
  }
}
