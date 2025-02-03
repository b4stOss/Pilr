import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Center, Container, Text, Title, Loader, Stack, Tabs } from '@mantine/core';
import { usePillTracking } from '../hooks/usePillTracking';
import { PillList } from '../components/PillList';
import { PillHistory } from '../components/PillHistory';
import Header from '../components/HeaderComponent';

export function PartnerPage() {
  const { user } = useAuth();
  const [linkedUserId, setLinkedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    todayPills,
    historyPills,
    error: pillError,
  } = usePillTracking({
    userId: linkedUserId || '',
    daysToFetch: 7,
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
        const { data } = await supabase
          .from('user_partners')
          .select('user_id')
          .eq('partner_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (mounted) {
          if (data) {
            setLinkedUserId(data.user_id);
          }
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
        <Header />
        <Center style={{ height: '80vh' }}>
          <Loader color="black" />
        </Center>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header />
        <Center style={{ height: '80vh' }}>
          <Text>{error}</Text>
        </Center>
      </Container>
    );
  }

  if (!linkedUserId) {
    return (
      <Container>
        <Header />
        <Center style={{ height: '80vh' }}>
          <Stack>
            <Text size="lg">No Active Links</Text>
            <Text size="sm">You are not currently linked to any users.</Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  return (
    <Container style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Stack mt="xl">
        {pillError && <Text size="sm">{pillError}</Text>}

        <Tabs defaultValue="today" color="black">
          <Tabs.List grow>
            <Tabs.Tab value="today">Today</Tabs.Tab>
            <Tabs.Tab value="history">History</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="today" pt="md">
            <Stack>
              <Title order={2}>Today's Pills</Title>
              <PillList
                pills={todayPills}
                onStatusChange={async () => {}} // Partners can't change status
              />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="history" pt="md">
            <Stack>
              <Title order={2}>Past 7 Days</Title>
              <PillHistory pills={historyPills} />
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
