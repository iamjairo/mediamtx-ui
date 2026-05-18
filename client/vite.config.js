import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy targets — Express backend serves the API on :3000
const EXPRESS_TARGET = 'http://localhost:3000';

// Path prefixes that must be forwarded to the Express backend (not handled by Vite).
const BACKEND_PATHS = [
  '/mediamtx',
  '/go2rtc',
  '/login',
  '/logout',
  '/auth',
  '/csrf-token',
  '/api',
  '/images',
  '/settings',
  '/help',
];

const proxy = Object.fromEntries(
  BACKEND_PATHS.map((p) => [p, { target: EXPRESS_TARGET, changeOrigin: true, secure: false, ws: true }])
);

export default defineConfig({
  // Relative base so the bundle can be served from any origin or file:// (desktop wrappers).
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    proxy,
    fs: {
      // Allow Vite to serve the existing CSS + font assets from server/public/
      // during the migration. Once the migration is complete and assets move
      // into client/public, this can be removed.
      allow: ['..'],
    },
  },
  build: {
    // Built output lives under client/dist; Express will serve this in production.
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-router') || id.includes('@remix-run/router')) return 'vendor-router';
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) return 'vendor-react';
          if (id.includes('lucide-react')) return 'vendor-icons';
        },
      },
    },
  },
});
