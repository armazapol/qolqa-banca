import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const API_TARGET = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/shell-react',
  server: {
    port: 5173,
    host: 'localhost',
    // Mismo origen también en desarrollo (ADR-0019): cookies SameSite=Strict y sin CORS,
    // igual que el rewrite /api/* de Vercel en producción.
    proxy: { '/api': { target: API_TARGET, changeOrigin: false } },
  },
  preview: {
    port: 5173,
    host: 'localhost',
  },
  plugins: [tailwindcss(), reactRouter()],
  // Pre-optimiza las dependencias de todas las rutas al arrancar: sin recargas
  // inesperadas la primera vez que se visita cada ruta en desarrollo.
  optimizeDeps: { entries: ['./app/**/*.tsx'] },
  build: {
    reportCompressedSize: true,
  },
}));
