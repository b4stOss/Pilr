import { Container } from '@mantine/core';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <Container
      size="xs"
      style={{
        height: '100vh',
        maxWidth: 440,
      }}
    >
      {children}
    </Container>
  );
}
