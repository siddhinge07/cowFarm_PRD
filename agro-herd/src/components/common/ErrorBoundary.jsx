import React from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    localStorage.removeItem('agroherd_access_token');
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-farm-bg flex items-center justify-center p-4">
          <div className="bg-white rounded-card shadow-card p-6 md:p-8 max-w-lg w-full text-center border border-farm-border">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} />
            </div>
            <h2 className="text-xl font-bold text-farm-text-primary mb-2">Something went wrong</h2>
            <p className="text-sm text-farm-text-secondary mb-6">
              An unexpected error occurred while loading this page. You can reload or reset your session.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto btn-secondary flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                Clear Cache & Sign In
              </button>
            </div>

            {this.state.error && (
              <details className="text-left bg-gray-50 p-3 rounded text-xs text-red-600 font-mono overflow-auto max-h-36">
                <summary className="cursor-pointer font-sans text-gray-500 font-medium mb-1">
                  View Technical Details
                </summary>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
