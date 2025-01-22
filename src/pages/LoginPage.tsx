import { Center, Flex, Title } from "@mantine/core";
import { LoginComponent } from "../components/LoginComponent";

export function LoginPage() {
  return (
    <Center style={{ height: "100%" }}>
      <Flex
        mih={50}
        justify="flex-start"
        align="center"
        direction="column"
        wrap="wrap"
        gap="xl"
      >
        <Title>PILR.</Title>
        <LoginComponent />
      </Flex>
    </Center>
  );
}
