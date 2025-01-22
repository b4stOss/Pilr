import "@mantine/core/styles.css";
import { AuthProvider } from "./contexts/AuthContext";
import { routes } from "./routes";
import { useRoutes } from "react-router-dom";

function Router() {
  return useRoutes(routes);
}

function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}

export default App;
