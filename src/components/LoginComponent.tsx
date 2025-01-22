import { Button, Container} from "@mantine/core";
import { useAuth } from "../contexts/AuthContext";

export function LoginComponent() {
  const { signInWithGoogle } = useAuth();

  return (
    <Container size="xs">
      <Button onClick={signInWithGoogle} color="rgba(0, 0, 0, 1)" variant="filled">
        Login
      </Button>
    </Container>
  );
}
