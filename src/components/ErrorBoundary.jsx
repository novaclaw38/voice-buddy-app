import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 16,
          alignItems: 'center', justifyContent: 'center',
          minHeight: '100%', padding: 24, textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: 'linear-gradient(160deg,#fef3ff,#e0f2ff)',
        }}>
          <div style={{ fontSize: 64 }}>🧸</div>
          <h1 style={{ margin: 0, color: '#5b21b6' }}>Oops! Buddy needs a nap.</h1>
          <p style={{ color: '#6b7280', maxWidth: 420 }}>
            Something went a little funny. Let's try starting over!
          </p>
          <button
            onClick={() => { window.location.href = '/' }}
            style={{
              marginTop: 8, padding: '14px 28px', fontSize: 18, fontWeight: 700,
              color: '#fff', background: '#7c3aed', border: 'none',
              borderRadius: 999, cursor: 'pointer',
              boxShadow: '0 8px 0 #5b21b6',
            }}
          >
            Start over
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
