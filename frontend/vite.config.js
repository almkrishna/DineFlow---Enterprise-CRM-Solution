import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Pre-bundle every major dep in one pass so React is never split across
  // mismatched optimizer chunks (caused "Invalid hook call" dual-React crashes).
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-dev-runtime',
      'react-router-dom',
      'framer-motion',
      'axios',
      'lucide-react',
      'recharts',
      'qrcode.react',
    ],
  },
  server: {
    port: 5173,
    // Fail loudly if 5173 is taken instead of silently moving to 5174
    // (QR codes and open tabs all point at 5173).
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
});
