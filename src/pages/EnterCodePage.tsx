import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Text,
  Button,
  TextInput,
  Stack,
  ThemeIcon,
  ActionIcon,
} from '@mantine/core';
import { IconUsers, IconArrowLeft, IconKey } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import { useInviteCode } from '../hooks/useInviteCode';

export function EnterCodePage() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { validateAndUseCode } = useInviteCode({ userId: user?.id || '' });

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format input as XXX-XXX
  const handleCodeChange = (value: string) => {
    // Remove non-alphanumeric characters and uppercase
    let cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Limit to 6 characters
    if (cleaned.length > 6) {
      cleaned = cleaned.slice(0, 6);
    }

    // Add dash after 3 characters for display
    if (cleaned.length > 3) {
      cleaned = cleaned.slice(0, 3) + '-' + cleaned.slice(3);
    }

    setCode(cleaned);
    setError(null);
  };

  const handleSubmit = async () => {
    if (code.replace('-', '').length !== 6) {
      setError('Please enter a 6-character code');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await validateAndUseCode(code);

    if (result.success) {
      await refreshProfile();
      navigate('/partner', { replace: true });
    } else {
      setError(result.error || 'Failed to link account');
    }

    setIsLoading(false);
  };

  return (
    <Container
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box
        component="header"
        py="sm"
        style={{
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <IconArrowLeft size={20} />
        </ActionIcon>
        <Text
          size="md"
          fw={600}
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          Connect Accounts
        </Text>
      </Box>

      {/* Content */}
      <Stack
        align="center"
        justify="flex-start"
        gap="xl"
        style={{ flex: 1 }}
        pt="xl"
      >
        {/* Hero section */}
        <Stack align="center" gap="md">
          <ThemeIcon
            size={64}
            radius="xl"
            variant="light"
            color="gray"
          >
            <IconUsers size={32} />
          </ThemeIcon>

          <Text size="xl" fw={700} c="dark" ta="center">
            Enter Invite Code
          </Text>

          <Text size="sm" c="dimmed" ta="center" maw={280}>
            Enter the 6-digit code shared by your partner to sync your reminders.
          </Text>
        </Stack>

        {/* Code input */}
        <Box w="100%" maw={340}>
          <TextInput
            value={code}
            onChange={(e) => handleCodeChange(e.currentTarget.value)}
            placeholder="ABC-XYZ"
            size="xl"
            error={error}
            styles={{
              input: {
                textAlign: 'center',
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: '0.2em',
                fontFamily: 'monospace',
                height: 72,
                borderRadius: 16,
                textTransform: 'uppercase',
              },
            }}
            maxLength={7}
          />
        </Box>

        {/* Spacer */}
        <Box style={{ flex: 1 }} />

        {/* Actions */}
        <Stack w="100%" maw={340} gap="md" pb="xl">
          <Button
            color="dark"
            size="lg"
            onClick={handleSubmit}
            loading={isLoading}
            disabled={code.replace('-', '').length !== 6}
            leftSection={<IconKey size={20} />}
            fullWidth
          >
            Link Account
          </Button>

          <Button
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => navigate(-1)}
          >
            Where do I find this code?
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
