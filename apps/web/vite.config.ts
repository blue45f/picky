import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        xfwd: true,
      },
      '/share': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        xfwd: true,
        rewrite: (path) => path.replace(/^\/share\/([^/?#]+)/, '/api/polls/$1/share'),
      },
    },
  },
});
