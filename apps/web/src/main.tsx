import { PlatformContext, webPlatformBridge } from '@heejun/platform-bridge';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import './index.css';

// 네이티브 능력(공유·클립보드·외부링크)은 공통 패키지 @heejun/platform-bridge 로 단일화.
// 웹 앱은 표준 웹 구현(webPlatformBridge)을 그대로 주입한다.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PlatformContext.Provider value={webPlatformBridge}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </PlatformContext.Provider>
  </React.StrictMode>,
);

// PWA 서비스 워커 등록 (설치 가능 + 오프라인 폴백). 프로덕션 빌드에서만.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
