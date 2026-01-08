import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { AuthProvider } from './contexts/AuthContext';
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
        <Suspense
          fallback={
            <Center style={{ height: '100vh' }}>
              <Loader color="black" />
            </Center>
          }
        >
          <Router />
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
