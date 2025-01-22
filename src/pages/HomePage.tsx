import { Center, Container, Flex, Title, Text } from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/HeaderComponent';
import { TimeInput } from '@mantine/dates';
import { useState } from 'react';

export function HomePage() {
  const { user } = useAuth();
  const [value, setValue] = useState('');

  return (
    <Container style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Center style={{ flex: 1 }}>
        <Flex mih={50} gap="sm" justify="flex-start" align="center" direction="column" wrap="wrap">
          <Title order={4}>Welcome {user?.email}</Title>
          <TimeInput
            value={value}
            onChange={(event) => setValue(event.currentTarget.value)}
            size="md"
            label="Select reminder time"
            description="We'll send you a notification every day at this time."
          />
          <Text>{value}</Text>
        </Flex>
      </Center>
    </Container>
  );
}
