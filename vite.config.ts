import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.pnpm-store/**',
        '**/.git/**',
        '**/dist/**',
      ],
      usePolling: false,
    },
    hmr: {
      clientPort: 443,
      protocol: 'wss',
    },
    allowedHosts: true,
  },
});
