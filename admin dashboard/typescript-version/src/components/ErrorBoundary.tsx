'use client'

import { Component, ReactNode } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
            p: 4,
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: 4,
              bgcolor: 'error.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
              opacity: 0.8,
            }}
          >
            <AlertTriangle size={40} />
          </Box>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </Typography>
          <Button
            variant="solid"
            colorScheme="primary"
            leftIcon={<RefreshCw size={18} />}
            onClick={this.handleRetry}
          >
            Try Again
          </Button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Box
              sx={{
                mt: 4,
                p: 2,
                bgcolor: 'error.main',
                color: 'white',
                borderRadius: 2,
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                textAlign: 'left',
                maxWidth: '100%',
                overflow: 'auto',
              }}
            >
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Error Details (Development Only):
              </Typography>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </Box>
          )}
        </Box>
      )
    }

    return this.props.children
  }
}
