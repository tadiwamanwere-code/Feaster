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

    const msg = String(this.state.error?.message || this.state.error || 'Unknown error')
    const stack = String(this.state.error?.stack || '').slice(0, 1500)

    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-black/10 p-6 text-center">
          <div className="text-5xl mb-4">😬</div>
          <h1 className="text-xl font-bold text-black mb-2">Something broke</h1>
          <p className="text-sm text-black/60 mb-4">
            We hit an unexpected error. Reload below — your order data is safe.
          </p>

          <details className="text-left mb-4 bg-red-50 border border-red-200 rounded-lg overflow-hidden">
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-red-700">
              Show error details
            </summary>
            <pre className="text-[10px] text-red-700 px-3 pb-3 overflow-auto max-h-60 whitespace-pre-wrap break-words">
              {msg}{stack ? '\n\n' + stack : ''}
            </pre>
          </details>

          <button
            onClick={this.reset}
            className="w-full px-4 py-3 bg-black text-white rounded-xl text-sm font-bold"
          >
            Reload app
          </button>
        </div>
      </div>
    )
  }
}
