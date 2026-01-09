import { useState } from 'react';
import { Paper, Text, Button, Stack, Group, Box, CopyButton, Loader, TextInput } from '@mantine/core';
import { IconCopy, IconCheck, IconRefresh } from '@tabler/icons-react';
import { useInviteCode } from '../hooks/useInviteCode';
import { supabase } from '../lib/supabase';
import { formatTimeRemaining } from '../utils';

interface InviteCodeCardProps {
  userId: string;
  firstName: string | null;
  onFirstNameSaved: () => void;
}

export function InviteCodeCard({ userId, firstName, onFirstNameSaved }: InviteCodeCardProps) {
  const { activeCode, isLoading, error, generateCode } = useInviteCode({ userId });
  const [nameInput, setNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleGenerateWithName = async () => {
    if (!nameInput.trim()) {
      setSaveError('Please enter your first name');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ first_name: nameInput.trim() })
        .eq('id', userId);

      if (updateError) throw updateError;

      onFirstNameSaved();
      await generateCode();
    } catch (err) {
      console.error('Error saving name:', err);
      setSaveError('Failed to save name');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Paper p="xl" radius="lg" shadow="sm" bg="white">
        <Stack align="center" py="xl">
          <Loader color="dark" size="sm" />
        </Stack>
      </Paper>
    );
  }

  // No active code - show generate button (with name input if needed)
  if (!activeCode) {
    const needsName = !firstName;

    return (
      <Paper p="xl" radius="lg" shadow="sm" bg="white">
        <Stack align="center" gap="lg">
          <Box ta="center">
            <Text size="xl" fw={700} c="dark" mb={4}>
              Invite a Partner
            </Text>
            <Text size="sm" c="dimmed">
              {needsName
                ? "Enter your first name so your partner knows who they're linking with."
                : 'Generate a code to share with your partner so they can link their account.'}
            </Text>
          </Box>

          {needsName && (
            <TextInput
              placeholder="Your first name"
              value={nameInput}
              onChange={(e) => setNameInput(e.currentTarget.value)}
              size="md"
              style={{ width: '100%' }}
            />
          )}

          {(error || saveError) && (
            <Text size="sm" c="red">
              {error || saveError}
            </Text>
          )}

          <Button
            color="dark"
            size="md"
            onClick={needsName ? handleGenerateWithName : generateCode}
            loading={isSaving}
            leftSection={<IconRefresh size={18} />}
            fullWidth
          >
            Generate Invite Code
          </Button>
        </Stack>
      </Paper>
    );
  }

  // Has active code - display it
  const timeRemaining = formatTimeRemaining(activeCode.expires_at);

  return (
    <Paper p="xl" radius="lg" shadow="sm" bg="white" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Top accent bar */}
      <Box
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: 'var(--mantine-color-dark-9)',
        }}
      />

      <Stack align="center" gap="md">
        <Box ta="center">
          <Text size="lg" fw={600} c="dark" mb={4}>
            Share this code with your partner
          </Text>
          <Text size="sm" c="dimmed">
            They need to enter this in their app to link with you.
          </Text>
        </Box>

        {/* Code display */}
        <Box ta="center" py="md">
          <Text
            size="xs"
            fw={600}
            tt="uppercase"
            c="dimmed"
            style={{ letterSpacing: '0.1em' }}
            mb={8}
          >
            Your Unique Code
          </Text>
          <Text
            ff="monospace"
            fz={42}
            fw={700}
            c="dark"
            style={{ letterSpacing: '0.15em' }}
          >
            {activeCode.code}
          </Text>
        </Box>

        {/* Copy button */}
        <CopyButton value={activeCode.code}>
          {({ copied, copy }) => (
            <Button
              color="dark"
              size="md"
              onClick={copy}
              leftSection={copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
              fullWidth
            >
              {copied ? 'Copied!' : 'Copy Code'}
            </Button>
          )}
        </CopyButton>

        {/* Time remaining badge */}
        <Group gap={6} py={4} px={12} style={{ backgroundColor: '#f5f5f5', borderRadius: 20 }}>
          <Box
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#9CA3AF',
            }}
          />
          <Text size="xs" c="dimmed" fw={500}>
            {timeRemaining}
          </Text>
        </Group>

        {/* Regenerate link */}
        <Button variant="subtle" color="gray" size="xs" onClick={generateCode}>
          Generate new code
        </Button>
      </Stack>
    </Paper>
  );
}
