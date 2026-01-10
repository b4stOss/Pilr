import { RouteObject } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { MainLayout } from '../layouts/MainLayout';
import { PartnerPage } from '../pages/PartnerPage';
import { EnterCodePage } from '../pages/EnterCodePage';
import { RoleSelectionPage } from '../pages/RoleSelectionPage';
import { ReminderSetupPage } from '../pages/ReminderSetupPage';
import { NotificationPermissionPage } from '../pages/NotificationPermissionPage';
import { RouterGuard } from '../components/RouterGuard';

function WithLayout({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}

export const routes: RouteObject[] = [
  // Public route (login)
  {
    path: '/',
    element: (
      <RouterGuard type="public">
        <WithLayout>
          <LoginPage />
        </WithLayout>
      </RouterGuard>
    ),
  },

  // Onboarding routes
  {
    path: '/role',
    element: (
      <RouterGuard type="onboarding">
        <WithLayout>
          <RoleSelectionPage />
        </WithLayout>
      </RouterGuard>
    ),
  },
  {
    path: '/setup-reminder',
    element: (
      <RouterGuard type="onboarding">
        <WithLayout>
          <ReminderSetupPage />
        </WithLayout>
      </RouterGuard>
    ),
  },
  {
    path: '/notifications',
    element: (
      <RouterGuard type="onboarding">
        <WithLayout>
          <NotificationPermissionPage />
        </WithLayout>
      </RouterGuard>
    ),
  },

  // Protected routes (require completed onboarding)
  {
    path: '/home',
    element: (
      <RouterGuard type="protected">
        <WithLayout>
          <HomePage />
        </WithLayout>
      </RouterGuard>
    ),
  },
  {
    path: '/partner',
    element: (
      <RouterGuard type="protected">
        <WithLayout>
          <PartnerPage />
        </WithLayout>
      </RouterGuard>
    ),
  },
  {
    path: '/enter-code',
    element: (
      <RouterGuard type="protected">
        <WithLayout>
          <EnterCodePage />
        </WithLayout>
      </RouterGuard>
    ),
  },

  // Catch-all redirect to login
  {
    path: '*',
    element: (
      <RouterGuard type="public">
        <WithLayout>
          <LoginPage />
        </WithLayout>
      </RouterGuard>
    ),
  },
];
