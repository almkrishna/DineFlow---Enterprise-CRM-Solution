import React from 'react';

// Last line of defense: a friendly reload screen instead of a blank white page.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', background: '#0F0F1A', color: '#fff', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif', padding: 24, textAlign: 'center',
        }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#9ca3af', marginBottom: 24, maxWidth: 360 }}>
            A small hiccup on our side. Tap below to reload — your order is safe.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#FF6B35', color: '#fff', border: 'none', borderRadius: 12,
              padding: '14px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
