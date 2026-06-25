import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    // 가짜 canvas를 주입해 테스트하므로 jsdom 없이 node 환경으로 충분하다.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
