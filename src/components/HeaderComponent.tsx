import { Flex, Title, Group } from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@mantine/core';

const Header = () => {
  const { user, signOut, signInWithGoogle } = useAuth();

  return (
    <>
      <Flex mih={50} gap="md" justify="space-between" align="center" direction="row" pt="xl">
        <Title>Pilr.</Title>
        <Group>
          {user ? (
            <Button onClick={signOut} color="rgba(0, 0, 0, 1)" variant="filled">
              Logout
            </Button>
          ) : (
            <Button onClick={signInWithGoogle} color="rgba(0, 0, 0, 1)" variant="filled">
              Login
            </Button>
          )}
        </Group>
      </Flex>
    </>
  );
};

export default Header;
