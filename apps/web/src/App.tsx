import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
  Link,
} from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { PollList } from './pages/PollList';
import { CreatePoll } from './pages/CreatePoll';
import { PollDetail } from './pages/PollDetail';
import { DesignSystem } from './pages/DesignSystem';
import { AuthPage } from './pages/AuthPage';
import { useAuthStore } from './store/useAuthStore';

const FALLBACK_QUERY_KEY = '__fallback';

const FallbackRouteBridge: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const raw = searchParams.get(FALLBACK_QUERY_KEY);
    if (!raw) {
      return;
    }

    try {
      const nextPath = decodeURIComponent(raw);
      if (nextPath.startsWith('//') || !nextPath.startsWith('/') || nextPath.length > 2048) {
        setSearchParams({}, { replace: true });
        return;
      }

      setSearchParams({}, { replace: true });
      navigate(nextPath, { replace: true });
    } catch (err) {
      console.error('[picky] failed to restore fallback path', err);
      setSearchParams({}, { replace: true });
    }
  }, [location.pathname, location.search, location.hash, searchParams, navigate, setSearchParams]);

  return null;
};

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
          background:
            'linear-gradient(to bottom, color-mix(in oklab, var(--bg-main) 82%, transparent), var(--bg-main))',
          position: 'relative',
        }}
      >
        <Navbar />
        <FallbackRouteBridge />

        <main className="page-shell" style={{ flexGrow: 1 }}>
          <Routes>
            <Route path="/" element={<PollList />} />
            <Route path="/create" element={<CreatePoll />} />
            <Route path="/design" element={<DesignSystem />} />
            <Route path="/poll/:id" element={<PollDetail />} />
            <Route path="/embed/:id" element={<PollDetail />} />
            <Route path="/present/:id" element={<PollDetail />} />
            <Route path="/auth" element={<Navigate to="/auth/login" replace />} />
            <Route path="/auth/:mode" element={<AuthPage />} />
            <Route path="*" element={<PollList />} />
          </Routes>
        </main>

        <footer
          style={{
            marginTop: 'auto',
            padding: '2rem 1.5rem',
            borderTop: '1px solid var(--bg-card-border)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--bg-main)',
          }}
        >
          <div
            style={{
              maxWidth: '980px',
              margin: '0 auto',
              display: 'grid',
              gap: '10px',
            }}
          >
            <section
              style={{
                display: 'grid',
                justifyContent: 'center',
                gap: '0.7rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              }}
            >
              <div
                style={{
                  padding: '0.75rem 0.85rem',
                  border: '1px solid var(--bg-card-border)',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)',
                  display: 'grid',
                  gap: '0.28rem',
                  textAlign: 'left',
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: '0.72rem',
                    letterSpacing: '0.08em',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                  }}
                >
                  Site Map
                </h2>
                <Link
                  to="/"
                  style={{
                    color: 'var(--text-muted)',
                    textDecoration: 'none',
                    fontSize: '0.82rem',
                  }}
                >
                  고민 목록
                </Link>
                <Link
                  to="/create"
                  style={{
                    color: 'var(--text-muted)',
                    textDecoration: 'none',
                    fontSize: '0.82rem',
                  }}
                >
                  새 고민 작성
                </Link>
                <Link
                  to="/design"
                  style={{
                    color: 'var(--text-muted)',
                    textDecoration: 'none',
                    fontSize: '0.82rem',
                  }}
                >
                  디자인 시스템
                </Link>
              </div>
            </section>
            <p>© {new Date().getFullYear()} pickflow. All rights reserved.</p>
            <p
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                color: 'var(--text-muted)',
              }}
            >
              <span>Built with Premium UI for</span>
              <Heart size={10} style={{ color: 'var(--brand-accent-coral)' }} />
              <span>Decision-Flow Product Experiences</span>
            </p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
};
