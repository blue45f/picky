import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'picky',
  brand: {
    primaryColor: '#13C2A3',
  },
  permissions: [
    { name: 'clipboard', access: 'read' },
    { name: 'clipboard', access: 'write' },
  ],
  webView: {},
  webBundleDir: 'dist',
  navigationBar: {
    withBackButton: true,
    withHomeButton: true,
    // 피키는 다크 브랜드 테마(오로라/불투명 다크 배경)라 토스 내비게이션 바도 다크로 맞춰
    // 앱 분위기와 이어지게 해요(뒤로가기 버튼·앱 이름이 흰색으로 표시됨). 콘솔 공지(2026-06-22)
    // 패키지 업데이트로 추가된 비게임 내비게이션 바 테마 설정이에요.
    theme: 'dark',
  },
});
