import { RouteObject, Navigate } from "react-router-dom";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { MainLayout } from "../layouts/MainLayout";
import { useAuth } from "../contexts/AuthContext";

// Layout wrapper component
function WithLayout({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null; // or a loading spinner
  return user ? <>{children}</> : <Navigate to="/" />;
}

export const routes: RouteObject[] = [
  {
    path: "/",
    element: (
      <WithLayout>
        <LoginPage />
      </WithLayout>
    ),
  },
  {
    path: "/home",
    element: (
      <RequireAuth>
        <WithLayout>
          <HomePage />
        </WithLayout>
      </RequireAuth>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/" />,
  },
];
