import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, LogIn, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { AuthModal, type AuthMode } from './AuthModal';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, logout, needsReauth, clearError, setNeedsReauth } = useAuthStore();
  const SESSION_REAUTH_SUBTITLE = '세션이 만료되었습니다. 다시 로그인해 주세요.';
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('login');
  const [authModalSubTitle, setAuthModalSubTitle] = useState<string | undefined>(undefined);
  const showAuthErrorHint = !!needsReauth;

  const handleAuthModalOpen = (nextMode: AuthMode = 'login', nextSubTitle?: string) => {
    clearError();
    setNeedsReauth(false);
    setAuthModalMode(nextMode);
    setAuthModalSubTitle(nextSubTitle);
    setIsAuthModalOpen(true);
  };

  useEffect(() => {
    if (!user && showAuthErrorHint) {
      clearError();
      setNeedsReauth(false);
      setAuthModalMode('login');
      setAuthModalSubTitle(SESSION_REAUTH_SUBTITLE);
      setIsAuthModalOpen(true);
    }
  }, [user, showAuthErrorHint, clearError, setNeedsReauth]);

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(11, 15, 23, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--bg-card-border)',
        padding: '0.85rem 1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '980px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: 900,
              color: 'var(--brand-primary)',
              letterSpacing: '-0.03em',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            🗳️ pickflow
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--brand-primary-light)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            BETA
          </span>
        </Link>

        {/* Navigation Action Buttons */}
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: location.pathname === '/' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: location.pathname === '/' ? 700 : 500,
              fontSize: '0.85rem',
              transition: 'color 0.2s',
            }}
          >
            고민 둘러보기
          </Link>
          <Link
            to="/create"
            className="btn-primary"
            style={{
              textDecoration: 'none',
              padding: '8px 16px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={14} />
            <span>새 고민 작성</span>
          </Link>

          {/* User Auth Buttons */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '0.25rem' }}
          >
            {user ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: '1px solid var(--bg-card-border)',
                  }}
                >
                  <User size={13} style={{ color: 'var(--brand-primary)' }} />
                  <span style={{ fontWeight: 600 }}>{user.nickname}</span>
                  {user.isGuest && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        color: 'var(--brand-accent-gold)',
                        border: '1px solid rgba(255, 191, 36, 0.35)',
                        borderRadius: '12px',
                        padding: '1px 8px',
                        fontWeight: 700,
                      }}
                    >
                      비회원
                    </span>
                  )}
                </div>
                <button
                  onClick={logout}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 8px',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--brand-accent-coral)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <LogOut size={14} />
                  <span>로그아웃</span>
                </button>
              </>
            ) : (
              <>
                {showAuthErrorHint && (
                  <button
                    onClick={() => handleAuthModalOpen('login', SESSION_REAUTH_SUBTITLE)}
                    className="btn-secondary"
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <LogIn size={14} />
                    <span>세션 만료, 재로그인</span>
                  </button>
                )}
                <Link
                  to="/auth/login"
                  className="btn-secondary"
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.75rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <LogIn size={14} />
                  <span>로그인</span>
                </Link>
                <Link
                  to="/auth/register"
                  className="btn-secondary"
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.75rem',
                    textDecoration: 'none',
                  }}
                >
                  회원가입
                </Link>
                <button
                  type="button"
                  onClick={() => handleAuthModalOpen('guest', '비회원으로 바로 시작해요')}
                  className="btn-secondary"
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  비회원시작
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        subTitle={authModalSubTitle}
      />
    </nav>
  );
};
