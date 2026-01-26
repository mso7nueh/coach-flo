import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { Component, type ReactNode } from 'react'
import i18n from '@/shared/config/i18n'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '32px',
            maxWidth: '600px',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{ color: '#fa5252', marginTop: 0, fontSize: '24px' }}>Something went wrong</h2>
            <p style={{ color: '#495057', fontSize: '16px', lineHeight: '1.5', margin: '16px 0' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#6c7ae0',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 600,
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#5a67d8')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#6c7ae0')}
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
