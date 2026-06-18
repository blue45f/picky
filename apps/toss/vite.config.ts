import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // shamefully-hoist 모노레포에서 web(React19)과 toss(React18)가 섞이지 않도록
  // 이 앱의 React 18 단일 인스턴스로 강제 정렬해요. (invalid hook 방지)
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
});
