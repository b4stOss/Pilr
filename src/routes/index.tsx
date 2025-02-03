import { RouteObject, Navigate } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { PartnerPage } from '../pages/PartnerPage';
import { RoleSelectionPage } from '../pages/RoleSelectionPage';
import { NotificationPermissionPage } from '../pages/NotificationPermissionPage';

// Layout wrapper component
function WithLayout({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}

// Basic auth check
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <>{children}</> : <Navigate to="/" />;
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <WithLayout>
        <LoginPage />
      </WithLayout>
    ),
  },
  {
    path: '/role',
    element: (
      <RequireAuth>
        <WithLayout>
          <RoleSelectionPage />
        </WithLayout>
      </RequireAuth>
    ),
  },
  {
    path: '/notifications',
    element: (
      <RequireAuth>
        <WithLayout>
          <NotificationPermissionPage />
        </WithLayout>
      </RequireAuth>
    ),
  },
  {
    path: '/home',
    element: (
      <RequireAuth>
        <WithLayout>
          <HomePage />
        </WithLayout>
      </RequireAuth>
    ),
  },
  {
    path: '/partner',
    element: (
      <RequireAuth>
        <WithLayout>
          <PartnerPage />
        </WithLayout>
      </RequireAuth>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" />,
  },
];
