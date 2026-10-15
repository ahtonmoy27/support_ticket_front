import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { ErrorState } from './ui'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  onReset?: () => void
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    } else {
      console.error('[ErrorBoundary caught unhandled error]:', error, errorInfo)
    }
  }

  resetErrorBoundary = () => {
    const msg = this.state.error?.message || ''
    if (
      msg.includes('dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('Failed to fetch dynamically imported')
    ) {
      window.location.reload()
      return
    }
    this.props.onReset?.()
    this.setState({ error: null })
  }

  override render() {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.fallback) {
      return this.props.fallback(error, this.resetErrorBoundary)
    }

    const isChunkError =
      error.message?.includes('dynamically imported module') ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch dynamically imported')

    const displayError = isChunkError
      ? new Error('A new version of SupportDesk was published. Please refresh to load the latest update.')
      : error

    return (
      <div className="error-boundary-wrapper">
        <ErrorState
          error={displayError}
          retry={this.resetErrorBoundary}
        />
      </div>
    )
  }
}
