// src/components/PartnerManagement.tsx
import { Button, Card, Group, Stack, Text, Collapse, List } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { UserProfile } from '../types';

interface PartnerManagementProps {
  activePartner: UserProfile | null;
  availablePartners: UserProfile[];
  onAddPartner: (partnerId: string) => Promise<void>;
  onRemovePartner: (partnerId: string) => Promise<void>;
}

export function PartnerManagement({ activePartner, availablePartners, onAddPartner, onRemovePartner }: PartnerManagementProps) {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <Card withBorder radius="md" p="md">
      <Stack>
        <Group justify="center">
          <Text>Partner Management</Text>
          <Button variant="light" color="black" size="xs" onClick={toggle}>
            {opened ? 'Close' : 'Manage'}
          </Button>
        </Group>

        <Collapse in={opened}>
          {activePartner && (
            <Group>
              <Text size="sm">{activePartner.email}</Text>
              <Button variant="light" color="red" size="xs" onClick={() => onRemovePartner(activePartner.id)}>
                Remove
              </Button>
            </Group>
          )}
          {!activePartner && availablePartners.length > 0 && (
            <>
              <Text size="sm" mt="md">
                Available Partners:
              </Text>
              <List spacing="xs" size="sm">
                {availablePartners.map((partner) => (
                  <List.Item key={partner.id}>
                    <Group>
                      <Text size="sm">{partner.email}</Text>
                      <Button variant="outline" color="green" size="xs" onClick={() => onAddPartner(partner.id)}>
                        Add
                      </Button>
                    </Group>
                  </List.Item>
                ))}
              </List>
            </>
          )}

          {!activePartner && availablePartners.length === 0 && <Text>No partners available</Text>}
        </Collapse>
      </Stack>
    </Card>
  );
}
