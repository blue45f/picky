import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { PollList } from './pages/PollList';
import { CreatePoll } from './pages/CreatePoll';
import { PollDetail } from './pages/PollDetail';
import { DesignSystem } from './pages/DesignSystem';
import { AuthPage } from './pages/AuthPage';
import { useAuthStore } from './store/useAuthStore';

export const App: React.FC = () => {
  const fetchMe = useAuthStore((state) => state.fetchMe);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <Navbar />

        {/* Main Layout Area */}
        <main
          style={{
            flexGrow: 1,
            width: '100%',
            maxWidth: '680px',
            margin: '0 auto',
            padding: '2.5rem 1.25rem 5rem 1.25rem',
          }}
        >
          <Routes>
            <Route path="/" element={<PollList />} />
            <Route path="/create" element={<CreatePoll />} />
            <Route path="/design" element={<DesignSystem />} />
            <Route path="/poll/:id" element={<PollDetail />} />
            <Route path="/auth" element={<Navigate to="/auth/login" replace />} />
            <Route path="/auth/:mode" element={<AuthPage />} />
            <Route path="*" element={<PollList />} />
          </Routes>
        </main>

        {/* Footer Area */}
        <footer
          style={{
            marginTop: 'auto',
            padding: '2rem 1.5rem',
            borderTop: '1px solid var(--bg-card-border)',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            backgroundColor: 'oklch(12% 0.015 260)',
          }}
        >
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}
          >
            <p>© {new Date().getFullYear()} pickflow. All rights reserved.</p>
            <p
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--text-muted)',
              }}
            >
              <span>Built with Premium UI & Monorepo Architecture for</span>
              <Heart size={10} style={{ color: 'var(--brand-accent-coral)' }} />
              <span>Standardized Developer Portfolio</span>
            </p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
};
