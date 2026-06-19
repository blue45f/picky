import { useEffect, useRef } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { PollListPage } from './pages/PollListPage';
import { CreatePollPage } from './pages/CreatePollPage';
import { PollDetailPage } from './pages/PollDetailPage';
import { useIdentity } from './store/useIdentity';
import { parseEntryRoute } from './lib/toss';

/** 딥링크(intoss://pickflow/poll/:id)로 진입했을 때 해당 화면으로 한 번 라우팅. */
function SchemeEntryBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (appliedRef.current) {
      return;
    }
    appliedRef.current = true;
    const route = parseEntryRoute();
    if (route && route !== location.pathname) {
      navigate(route, { replace: true });
    }
  }, [navigate, location.pathname]);

  return null;
}

export function App() {
  const init = useIdentity((state) => state.init);

  useEffect(() => {
    void init();
  }, [init]);

  // WebView 정적 번들에서 서버 라우트 의존 없이 동작하도록 HashRouter 사용.
  return (
    <HashRouter>
      <SchemeEntryBridge />
      <Routes>
        <Route path="/" element={<PollListPage />} />
        <Route path="/create" element={<CreatePollPage />} />
        <Route path="/poll/:id" element={<PollDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
