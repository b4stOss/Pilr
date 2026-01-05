import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { MantineProvider } from '@mantine/core';
import { BrowserRouter } from 'react-router-dom';

// Enregistrement du SW via vite-plugin-pwa
// Le hook useNotifications utilise navigator.serviceWorker.ready pour le push
import { registerSW } from 'virtual:pwa-register';

registerSW({
  immediate: true,
  onRegistered(registration) {
    console.log('Service Worker registered:', registration?.scope);
  },
  onRegisterError(error) {
    console.error('Service Worker registration failed:', error);
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>,
);
