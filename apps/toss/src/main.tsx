import { PlatformContext } from '@heejun/platform-bridge';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import config from '../granite.config.ts';
import { App } from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { tossPlatformBridge } from './platform/tossBridge.ts';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TDSMobileAITProvider brandPrimaryColor={config.brand.primaryColor}>
      <PlatformContext.Provider value={tossPlatformBridge}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </PlatformContext.Provider>
    </TDSMobileAITProvider>
  </StrictMode>,
);
