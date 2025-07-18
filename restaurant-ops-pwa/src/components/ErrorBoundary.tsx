// Error boundary component to catch and display React errors
import React, { Component } from 'react'
import type { ReactNode } from 'react'
import { Box, Typography, Button, Paper } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  handleReset = () => {
    // Clear local storage to fix potential data corruption
    localStorage.clear()
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 3,
          }}
        >
          <Paper elevation={3} sx={{ p: 4, maxWidth: 600, width: '100%' }}>
            <Box sx={{ textAlign: 'center' }}>
              <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom>
                出现了错误 / An Error Occurred
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                页面加载出现问题。这可能是由于浏览器缓存或本地数据损坏导致的。
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                The page failed to load. This might be due to browser cache or corrupted local data.
              </Typography>
              
              {this.state.error && (
                <Paper variant="outlined" sx={{ p: 2, mt: 2, mb: 3, bgcolor: 'grey.100' }}>
                  <Typography variant="caption" component="pre" sx={{ textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                    {this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </Typography>
                </Paper>
              )}

              <Button
                variant="contained"
                color="primary"
                onClick={this.handleReset}
                sx={{ mt: 2 }}
              >
                清除数据并重新开始 / Clear Data and Restart
              </Button>
            </Box>
          </Paper>
        </Box>
      )
    }

    return this.props.children
  }
}