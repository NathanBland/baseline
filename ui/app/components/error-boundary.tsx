import React from "react"
import { motion } from "motion/react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle>Something went wrong</CardTitle>
                <CardDescription>
                  We encountered an unexpected error. This has been logged and our team will investigate.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {this.state.error && (
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                      Error Details
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded border text-xs font-mono overflow-auto max-h-32">
                      <div className="text-red-600 font-semibold">{this.state.error.name}</div>
                      <div className="text-gray-800">{this.state.error.message}</div>
                      {this.state.error.stack && (
                        <div className="mt-2 text-gray-600 whitespace-pre-wrap">
                          {this.state.error.stack}
                        </div>
                      )}
                    </div>
                  </details>
                )}
                
                <div className="flex gap-2">
                  <Button onClick={this.handleRetry} className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={this.handleGoHome} className="flex-1">
                    <Home className="w-4 h-4 mr-2" />
                    Go Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )
    }

    return this.props.children
  }
}

// React Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error caught by error handler:', error, errorInfo)
    // In a real app, you'd send this to an error reporting service
  }
}

// Higher-order component for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Specific error boundary for chat components
export function ChatErrorFallback({ error, retry }: { error?: Error; retry: () => void }) {
  return (
    <div className="flex items-center justify-center h-64 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-sm"
      >
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Chat Error</h3>
        <p className="text-gray-600 mb-4 text-sm">
          There was a problem loading the chat. This might be due to network issues or unexpected data.
        </p>
        <div className="space-y-2">
          <Button onClick={retry} size="sm" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
          {error && (
            <details className="text-xs">
              <summary className="cursor-pointer">Technical Details</summary>
              <div className="mt-1 p-2 bg-gray-50 rounded text-left">
                {error.message}
              </div>
            </details>
          )}
        </div>
      </motion.div>
    </div>
  )
}
