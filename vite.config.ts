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
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      },
      manifest: {
        name: 'Pilr',
        short_name: 'Pilr',
        description: 'Pill reminder app',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
          {
            src: '/192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      devOptions: {
        enabled: true,
        // 'module' requis en dev pour les imports ES (Chrome/Edge uniquement)
        // En prod, le SW est bundlé en 'classic' → compatible tous navigateurs
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: {
    allowedHosts: ['localhost', '.ngrok-free.app'],
    https: getHttpsConfig(),
  },
});
