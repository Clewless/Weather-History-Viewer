import { h, Component } from 'preact';
import type { ComponentType, VNode } from 'preact';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: { componentStack: string };
}

interface ErrorBoundaryProps {
  children: VNode;
  fallback?: ComponentType<{ error: Error | null; errorInfo?: { componentStack: string }; resetError: () => void }>;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    if (process.env.NODE_ENV === 'production') {
      // Replace with your error logging service, e.g., Sentry
      console.error('Logging error to service:', error, errorInfo);
    }
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback;
        return <Fallback 
          error={this.state.error || null} 
          errorInfo={this.state.errorInfo}
          resetError={this.resetError} 
        />;
      }
      
      return (
        <div class="error-boundary" role="alert">
          <h2>Something went wrong</h2>
          <p>We're sorry, but an error occurred in the application.</p>
          {this.state.error && (
            <details 
              style={{ 
                whiteSpace: 'pre-wrap',
                textAlign: 'left',
                maxWidth: '800px',
                margin: '0 auto',
                background: '#f8fafc',
                padding: '1rem',
                borderRadius: '0.5rem',
                color: '#64748b',
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }}
            >
              <summary>Error details</summary>
              {this.state.error.toString()}
              {this.state.errorInfo?.componentStack && (
                <div style={{ marginTop: '1rem' }}>
                  Component Stack:
                  {this.state.errorInfo.componentStack}
                </div>
              )}
            </details>
          )}
          <button class="retry-button" onClick={this.resetError}>
            Try again
          </button>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
            If the problem persists, please refresh the page or contact support.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}