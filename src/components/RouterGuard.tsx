import { Navigate, useLocation } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';

interface RouterGuardProps {
  children: React.ReactNode;
  /**
   * Route type determines the guard behavior:
   * - 'public': Accessible without auth (login page). Redirects to home if already authenticated.
   * - 'onboarding': Requires auth but allows incomplete onboarding (role selection, reminder setup, notifications)
   * - 'protected': Requires auth AND completed onboarding. Redirects based on role.
   */
  type: 'public' | 'onboarding' | 'protected';
}

/**
 * Centralized routing guard that handles all auth/onboarding redirects.
 * Replaces scattered useEffect redirects across components.
 */
export function RouterGuard({ children, type }: RouterGuardProps) {
  const { user, loading, profileLoaded, activeRole } = useAuth();
  const location = useLocation();

  // Show loader while auth or profile is loading
  if (loading || !profileLoaded) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader color="dark" />
      </Center>
    );
  }

  // === PUBLIC ROUTES (login page) ===
  if (type === 'public') {
    // If user is authenticated, redirect to appropriate page
    if (user) {
      if (activeRole === 'pill_taker') {
        return <Navigate to="/home" replace />;
      }
      if (activeRole === 'partner') {
        return <Navigate to="/partner" replace />;
      }
      // User exists but no role = needs onboarding
      return <Navigate to="/role" replace />;
    }
    // Not authenticated, show public content
    return <>{children}</>;
  }

  // === ONBOARDING ROUTES (role, setup-reminder, notifications) ===
  if (type === 'onboarding') {
    // Must be authenticated
    if (!user) {
      return <Navigate to="/" replace />;
    }
    // If user already has a role, redirect to their home page
    if (activeRole === 'pill_taker') {
      return <Navigate to="/home" replace />;
    }
    if (activeRole === 'partner') {
      return <Navigate to="/partner" replace />;
    }
    // User is in onboarding flow, allow access
    return <>{children}</>;
  }

  // === PROTECTED ROUTES (home, partner, enter-code) ===
  if (type === 'protected') {
    // Must be authenticated
    if (!user) {
      return <Navigate to="/" replace />;
    }
    // Must have completed onboarding
    if (!activeRole) {
      return <Navigate to="/role" replace />;
    }

    // Role-based access control
    const currentPath = location.pathname;

    // Pill taker routes
    if (activeRole === 'pill_taker') {
      // Pill takers can only access /home
      if (currentPath !== '/home') {
        return <Navigate to="/home" replace />;
      }
    }

    // Partner routes
    if (activeRole === 'partner') {
      // Partners can access /partner and /enter-code
      const partnerRoutes = ['/partner', '/enter-code'];
      if (!partnerRoutes.includes(currentPath)) {
        return <Navigate to="/partner" replace />;
      }
    }

    return <>{children}</>;
  }

  // Fallback (should never reach here)
  return <>{children}</>;
}
