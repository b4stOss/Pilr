import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Center,
  Container,
  Text,
  Loader,
  Stack,
  Box,
  Button,
  ThemeIcon,
} from '@mantine/core';
import { IconKey, IconDeviceMobile } from '@tabler/icons-react';
import { usePillTracking } from '../hooks/usePillTracking';
import { CalendarHistory } from '../components/CalendarHistory';
import { ComplianceStats } from '../components/ComplianceStats';
import { TodayStatusCard } from '../components/TodayStatusCard';
import Header from '../components/HeaderComponent';
import { PillTakerUserSelect, PartnershipWithPillTaker } from '../types';
import { getDisplayName } from '../utils';

export function PartnerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [linkedUser, setLinkedUser] = useState<PillTakerUserSelect | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    todayPills,
    allPills,
    pillsByDate,
    error: pillError,
  } = usePillTracking({
    userId: linkedUser?.id || '',
  });

  useEffect(() => {
    let mounted = true;

    const fetchLinkedUser = async () => {
      if (!user?.id) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        setError(null);

        // Fetch partnership with pill_taker profile
        const { data, error: fetchError } = await supabase
          .from('partnerships')
          .select('pill_taker_id, status, users!partnerships_pill_taker_id_fkey(id, email, first_name)')
          .eq('partner_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (mounted) {
          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching linked user:', fetchError);
            setError('Failed to fetch user link');
          }

          // Type assertion for Supabase relation query result
          const partnership = data as PartnershipWithPillTaker | null;
          setLinkedUser(partnership?.users ?? null);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.error('Error fetching linked user:', err);
          setError('Failed to fetch user link');
          setIsLoading(false);
        }
      }
    };

    fetchLinkedUser();

    return () => {
      mounted = false;
    };
  }, [user]);

  if (isLoading) {
    return (
      <Container>
        <Center style={{ height: '80vh' }}>
          <Loader color="dark" />
        </Center>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Center style={{ height: '80vh' }}>
          <Text c="red">{error}</Text>
        </Center>
      </Container>
    );
  }

  // No active link - show empty state with CTA
  if (!linkedUser) {
    return (
      <Container
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Header />

        {/* Empty state content */}
        <Stack
          align="center"
          justify="center"
          gap="xl"
          style={{ flex: 1 }}
          pb={60}
        >
          {/* Illustration */}
          <Box
            style={{
              width: 160,
              height: 160,
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ThemeIcon
              size={80}
              radius="xl"
              variant="transparent"
              color="dark"
            >
              <IconDeviceMobile size={64} stroke={1.5} />
            </ThemeIcon>
          </Box>

          {/* Text content */}
          <Stack align="center" gap="xs">
            <Text size="xl" fw={700} c="dark">
              No Active Links
            </Text>
            <Text size="sm" c="dimmed" ta="center" maw={300}>
              It looks like you haven't connected with your partner yet. Link accounts to stay in sync and receive reminders.
            </Text>
          </Stack>

          {/* CTA */}
          <Button
            color="dark"
            size="lg"
            leftSection={<IconKey size={20} />}
            onClick={() => navigate('/enter-code')}
          >
            Enter Invitation Code
          </Button>

        </Stack>
      </Container>
    );
  }

  // Has active link - show dashboard
  const displayName = getDisplayName(linkedUser);

  return (
    <Container
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: 24,
      }}
    >
      <Header />

      {/* Content */}
      <Stack gap="md" style={{ flex: 1 }} mt="lg">
        {pillError && (
          <Text size="sm" c="red">
            {pillError}
          </Text>
        )}

        {/* Today Status Card */}
        <TodayStatusCard pills={todayPills} name={displayName} />

        {/* Calendar */}
        <CalendarHistory pillsByDate={pillsByDate} />

        {/* Compliance Stats */}
        <ComplianceStats pills={allPills} />
      </Stack>
    </Container>
  );
}
