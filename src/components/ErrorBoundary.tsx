// src/components/ErrorBoundary.tsx
import React, { ReactNode } from 'react';
import { Text, Button, Stack, Center } from '@mantine/core';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Center style={{ height: '100vh' }}>
          <Stack align="center">
            <Text>Something went wrong!</Text>
            <Button onClick={() => window.location.reload()} color="black">
              Reload Page
            </Button>
          </Stack>
        </Center>
      );
    }

    return this.props.children;
  }
}
