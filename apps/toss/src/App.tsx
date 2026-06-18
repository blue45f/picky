import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PollListPage } from './pages/PollListPage';
import { CreatePollPage } from './pages/CreatePollPage';
import { PollDetailPage } from './pages/PollDetailPage';
import { useIdentity } from './store/useIdentity';

export function App() {
  const init = useIdentity((state) => state.init);

  useEffect(() => {
    void init();
  }, [init]);

  // WebView 정적 번들에서 서버 라우트 의존 없이 동작하도록 HashRouter 사용.
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PollListPage />} />
        <Route path="/create" element={<CreatePollPage />} />
        <Route path="/poll/:id" element={<PollDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
