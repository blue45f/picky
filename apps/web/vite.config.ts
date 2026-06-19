import { defineConfig } from 'vite';
import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
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
