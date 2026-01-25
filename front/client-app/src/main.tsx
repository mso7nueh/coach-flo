import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { Component, type ReactNode } from 'react'
import { Center, Text, Title, Stack, Button } from '@mantine/core'

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
        <Center h="100vh">
          <Stack align="center" gap="md" p="xl" style={{ border: '1px solid #eee', borderRadius: 8 }}>
            <Title order={2} c="red">Something went wrong</Title>
            <Text c="dimmed" style={{ maxWidth: 600, textAlign: 'center' }}>
              {this.state.error?.message}
            </Text>
            <Button onClick={() => window.location.reload()} variant="light" color="violet">
              Reload Page
            </Button>
          </Stack>
        </Center>
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
