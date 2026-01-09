import { Center, Title, Text, Stack, Button, Paper, Group, ThemeIcon } from '@mantine/core';
import { IconBrandGoogle, IconPill, IconBell, IconHeart } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { signInWithGoogle } = useAuth();

  return (
    <Center style={{ height: '100%', padding: '24px' }}>
      <Stack align="center" gap="xl" style={{ maxWidth: 400, width: '100%' }}>
        {/* Title */}
        <Title order={1} style={{ fontSize: 42, letterSpacing: '-0.02em' }}>
          Pilr.
        </Title>

        {/* Tagline */}
        <Text size="lg" c="dimmed" ta="center" maw={300}>
          Your daily pill companion. Simple reminders, peace of mind.
        </Text>

        {/* Features */}
        <Paper p="lg" radius="lg" bg="gray.0" w="100%">
          <Stack gap="sm">
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon size="sm" radius="xl" color="dark" variant="light">
                <IconBell size={12} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">Smart daily reminders</Text>
            </Group>
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon size="sm" radius="xl" color="dark" variant="light">
                <IconPill size={12} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">Track your pill history</Text>
            </Group>
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon size="sm" radius="xl" color="red" variant="light">
                <IconHeart size={12} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">Partner alerts for extra support</Text>
            </Group>
          </Stack>
        </Paper>

        {/* Login Button */}
        <Button
          size="lg"
          color="dark"
          fullWidth
          leftSection={<IconBrandGoogle size={20} />}
          onClick={signInWithGoogle}
        >
          Continue with Google
        </Button>

        <Text size="xs" c="dimmed" ta="center">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </Stack>
    </Center>
  );
}
