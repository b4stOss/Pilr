import { Container } from "@mantine/core";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <Container style={{ height: "100vh" }}>
        {children}
    </Container>
);
}
