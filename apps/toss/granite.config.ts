import { defineConfig } from '@apps-in-toss/web-framework/config';

// 앱인토스 콘솔에 등록한 pickflow 미니앱 설정.
// appName/displayName 은 콘솔 등록값과 반드시 동일해야 해요.
export default defineConfig({
  appName: 'pickflow', // 콘솔에 등록한 앱 ID (딥링크 intoss://pickflow)
  brand: {
    displayName: '픽플로우', // 콘솔에 등록한 한글 앱 이름
    primaryColor: '#13C2A3', // 픽플로우 브랜드 에메랄드 액센트
    // 콘솔 > 앱 정보에서 업로드한 로고 이미지 URL을 우클릭 복사해 채워주세요.
    icon: '',
  },
  web: {
    host: 'localhost',
    port: 5180, // picky web(5173) 등 형제 앱과 포트 충돌 회피
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
  // 클립보드 복사(투표 링크) 권한. 추가 권한 필요 시 확장.
  permissions: [
    { name: 'clipboard', access: 'read' },
    { name: 'clipboard', access: 'write' },
  ],
  outdir: 'dist',
  webViewProps: {
    type: 'partner', // 비게임 미니앱
  },
});
