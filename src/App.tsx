import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { AuthProvider } from './contexts/AuthContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { routes } from './routes';
import { useRoutes } from 'react-router-dom';
import { Suspense } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Center, Loader } from '@mantine/core';

function Router() {
  return useRoutes(routes);
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <OnboardingProvider>
          <Suspense
            fallback={
              <Center style={{ height: '100vh' }}>
                <Loader color="black" />
              </Center>
            }
          >
            <Router />
          </Suspense>
        </OnboardingProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
