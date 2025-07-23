// Error boundary component to catch and display React errors
import { Component } from 'react'
import type { ReactNode } from 'react'
import { Box, Typography, Button, Paper } from '@mui/material'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 3
          }}
        >
          <Paper sx={{ p: 4, maxWidth: 600 }}>
            <Typography variant="h5" gutterBottom color="error">
              出错了 Something went wrong
            </Typography>
            <Typography variant="body1" paragraph>
              {this.state.error?.message || '发生了未知错误 An unknown error occurred'}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => window.location.reload()}
              >
                刷新页面 Refresh Page
              </Button>
            </Box>
          </Paper>
        </Box>
      )
    }

    return this.props.children
  }
}