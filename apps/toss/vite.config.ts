import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 브라우저 프리뷰 빌드(PREVIEW_NO_TDS=1)에서는 TDS를 대체 컴포넌트로 alias 해요.
// @toss/tds-mobile은 앱인토스 밖에서 런타임 가드로 예외를 던져 일반 브라우저 마운트를 막거든요.
// 실제 앱인토스(.ait) 빌드에는 영향이 없어요(env 미설정 시 alias 비활성).
const previewNoTds = process.env.PREVIEW_NO_TDS === '1';
const tdsShim = fileURLToPath(new URL('./src/tds-shim.tsx', import.meta.url));
// @picky/shared bare specifier를 소스로 직접 해소해요 — ait 빌드의 collect-package-version 플러그인이
// workspace 패키지(@picky/shared) 경로 추출에 실패하는 걸 우회하고, typecheck=src/runtime=dist 스테일니스도 없애요.
const sharedSrc = fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react({ babel: { plugins: [['babel-plugin-react-compiler', {}]] } })],
  // shamefully-hoist 모노레포에서 React 인스턴스가 섞이지 않도록(web·toss 둘 다 React 19)
  // 이 앱의 단일 React 인스턴스로 강제 정렬해요. (invalid hook 방지)
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@picky/shared': sharedSrc,
      ...(previewNoTds ? { '@toss/tds-mobile-ait': tdsShim, '@toss/tds-mobile': tdsShim } : {}),
    },
  },
});
