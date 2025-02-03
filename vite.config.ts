// vite.config.ts
import { defineConfig, ServerOptions } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';

// Helper function to load SSL certificates in development
const getHttpsConfig = (): ServerOptions['https'] => {
  if (process.env.NODE_ENV !== 'production') {
    try {
      return {
        key: fs.readFileSync('localhost+2-key.pem'),
        cert: fs.readFileSync('localhost+2.pem'),
      };
    } catch {
      console.warn('SSL certificates not found, falling back to HTTP');
      return undefined;
    }
  }
  return undefined;
};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Use generateSW strategy instead of your current custom SW
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      // Your web app manifest
      manifest: {
        name: 'Pilr',
        short_name: 'Pilr',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
          {
            src: './192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: './512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      // Enable PWA in development
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    allowedHosts: ['localhost', '.ngrok-free.app'],
    https: getHttpsConfig(),
  },
});
