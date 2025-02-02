import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
// import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', '192.png', '512.png'],
      manifest: {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        ...require('./public/manifest.json'),
      },
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      // injectRegister: null,
      // injectManifest: {
      //   swSrc: 'src/sw.js', // Correct path to the service worker file
      //   swDest: 'sw.js', // final name in dist
      // },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    allowedHosts: [
      'localhost',
      '.ngrok-free.app', // This will allow all ngrok URLs
    ],
  },
});
