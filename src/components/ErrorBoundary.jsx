import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('App error boundary caught:', error, info)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
    if (typeof window !== 'undefined') window.location.assign('/')
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-5xl mb-4">😬</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Something broke</h1>
          <p className="text-sm text-gray-500 mb-6">
            We hit an unexpected error. Tap below to reload — your order data is safe.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-xs text-red-600 bg-red-50 p-3 rounded-lg mb-4 overflow-auto max-h-40">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          )}
          <button
            onClick={this.reset}
            className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Reload app
          </button>
        </div>
      </div>
    )
  }
}
