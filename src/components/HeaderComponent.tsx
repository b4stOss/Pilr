import { Flex, Title, Button } from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { user, signOut } = useAuth();

  return (
    <Flex mih={50} gap="md" justify="space-between" align="center" direction="row" pt="xl">
      <Title fw={800} size="h1">
        Pilr.
      </Title>

      {user && (
        <Button onClick={signOut} color="black" variant="filled" radius="xl">
          Logout
        </Button>
      )}
    </Flex>
  );
};

export default Header;
