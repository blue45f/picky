import { defineConfig } from '@apps-in-toss/web-framework/config';

// 앱인토스 콘솔에 등록한 picky 미니앱 설정.
// appName/displayName 은 콘솔 등록값과 반드시 동일해야 해요.
export default defineConfig({
  appName: 'picky', // 콘솔에 등록한 앱 ID (딥링크 intoss://picky)
  brand: {
    displayName: '피키', // 콘솔에 등록한 한글 앱 이름
    primaryColor: '#13C2A3', // 피키 브랜드 에메랄드 액센트
    // 브랜드 로고. 콘솔에 등록한 앱 아이콘과 동일한 공개 이미지 URL을 사용해요.
    icon: 'https://picky-olive.vercel.app/og-default.png',
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
  navigationBar: {
    withBackButton: true,
    withHomeButton: true,
    // 피키는 다크 브랜드 테마(오로라/불투명 다크 배경)라 토스 내비게이션 바도 다크로 맞춰
    // 앱 분위기와 이어지게 해요(뒤로가기 버튼·앱 이름이 흰색으로 표시됨). 콘솔 공지(2026-06-22)
    // 패키지 업데이트로 추가된 비게임 내비게이션 바 테마 설정이에요.
    theme: 'dark',
  },
});
