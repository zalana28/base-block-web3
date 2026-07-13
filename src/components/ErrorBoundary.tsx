import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-deep)',
          color: 'var(--text)',
          fontFamily: "'Press Start 2P', monospace",
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: '320px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💥</div>
            <h2 style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>GAME CRASHED</h2>
            <p style={{ fontSize: '0.5rem', color: 'var(--text-dim)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
              Something went wrong. Try reloading.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'var(--base-blue)',
                color: '#fff',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.5rem',
                fontFamily: 'inherit',
              }}
            >
              RELOAD
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
