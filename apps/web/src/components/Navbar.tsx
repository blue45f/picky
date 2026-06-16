import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCheck, LogIn, LogOut, Menu, X, User, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { AuthModal, type AuthMode } from './AuthModal';

const navItems = [
  { path: '/', label: '고민 둘러보기' },
  { path: '/create', label: '새 고민 작성' },
];

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, logout, needsReauth, clearError, setNeedsReauth } = useAuthStore();
  const SESSION_REAUTH_SUBTITLE = '세션이 만료되었습니다. 다시 로그인해 주세요.';

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('login');
  const [authModalSubTitle, setAuthModalSubTitle] = useState<string | undefined>(undefined);
  const [mobileOpen, setMobileOpen] = useState(false);

  const showAuthErrorHint = !!needsReauth;

  const nicknameText = useMemo(() => {
    if (!user) {
      return '';
    }

    return user.nickname || (user.isGuest ? '비회원 사용자' : '회원 사용자');
  }, [user]);

  const handleAuthModalOpen = (nextMode: AuthMode = 'login', nextSubTitle?: string) => {
    clearError();
    setNeedsReauth(false);
    setAuthModalMode(nextMode);
    setAuthModalSubTitle(nextSubTitle);
    setIsAuthModalOpen(true);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
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
    <header className="topbar-shell">
      <nav
        style={{
          maxWidth: '980px',
          margin: '0 auto',
          minHeight: 'var(--nav-height)',
          padding: '0.65rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            color: 'var(--text-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginRight: 'auto',
          }}
        >
          <span
            style={{
              fontSize: '1.22rem',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(90deg, var(--brand-primary-light), var(--brand-primary))',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            🗳️ pickflow
          </span>
          <span
            style={{
              fontSize: '0.58rem',
              letterSpacing: '0.08em',
              color: 'var(--brand-accent-gold)',
              fontWeight: 700,
              padding: '2px 5px',
              borderRadius: '12px',
              border: '1px solid rgba(250, 204, 21, 0.3)',
            }}
          >
            BETA
          </span>
        </Link>

        <div
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '0.95rem',
            marginLeft: 'auto',
            [ '::before' as any ]: {},
          } as React.CSSProperties}
          className="desktop-nav"
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  textDecoration: 'none',
                  fontSize: '0.84rem',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: isActive ? '1px solid var(--bg-card-border-hover)' : '1px solid transparent',
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
          }}
        >
          {user ? (
            <>
              <span
                style={{
                  display: 'none',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '6px 10px',
                  borderRadius: '999px',
                  fontSize: '0.74rem',
                  color: 'var(--text-secondary)',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--bg-card-border)',
                }}
                className="desktop-user-chip"
              >
                <User size={13} />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{nicknameText}</span>
                {user.isGuest ? (
                  <span
                    style={{
                      fontSize: '0.61rem',
                      color: 'var(--brand-accent-gold)',
                      padding: '1px 7px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 191, 36, 0.35)',
                      fontWeight: 700,
                    }}
                  >
                    비회원
                  </span>
                ) : null}
                <CheckCheck size={12} style={{ color: 'var(--brand-accent-teal)' }} />
              </span>

              {showAuthErrorHint && (
                <button
                  type="button"
                  onClick={() => handleAuthModalOpen('login', SESSION_REAUTH_SUBTITLE)}
                  className="btn-secondary"
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <LogIn size={14} />
                  재로그인
                </button>
              )}

              <button
                onClick={handleLogout}
                style={{
                  background: 'none',
                  border: '1px solid var(--bg-card-border)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
              >
                <LogOut size={14} />
                로그아웃
              </button>
            </>
          ) : (
            <>
              {showAuthErrorHint && (
                <button
                  type="button"
                  onClick={() => handleAuthModalOpen('login', SESSION_REAUTH_SUBTITLE)}
                  className="btn-secondary"
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <LogIn size={14} />
                  세션 만료
                </button>
              )}

              <Link
                to="/auth/login"
                className="btn-secondary"
                style={{
                  padding: '8px 12px',
                  fontSize: '0.74rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <LogIn size={14} />
                로그인
              </Link>
              <Link
                to="/auth/register"
                className="btn-secondary"
                style={{
                  padding: '8px 12px',
                  fontSize: '0.74rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ShieldCheck size={14} />
                회원가입
              </Link>

              <button
                type="button"
                onClick={() => handleAuthModalOpen('guest', '비회원으로 바로 시작해요')}
                className="btn-secondary"
                style={{
                  padding: '8px 12px',
                  fontSize: '0.74rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                비회원 시작
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="모바일 메뉴 열기"
            style={{
              display: 'inline-flex',
              border: '1px solid var(--bg-card-border)',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              background: 'var(--bg-card-hover)',
            }}
            className="mobile-menu-trigger"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {mobileOpen ? (
          <div
            className="mobile-menu"
            style={{
              position: 'absolute',
              top: 'calc(var(--nav-height) - 2px)',
              left: 0,
              right: 0,
              background: 'linear-gradient(180deg, color-mix(in oklab, var(--bg-main) 90%, transparent), var(--bg-main))',
              borderBottom: '1px solid var(--bg-card-border)',
              borderTop: '1px solid var(--bg-card-border)',
              padding: '0.55rem 1rem 0.85rem',
              display: 'grid',
              gap: '0.45rem',
            }}
          >
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                style={{
                  textDecoration: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--bg-card-border)',
                  padding: '10px 12px',
                }}
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => handleAuthModalOpen('guest', '비회원으로 바로 시작해요')}
              style={{
                marginTop: '0.15rem',
                textAlign: 'left',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px dashed var(--bg-card-border)',
                borderRadius: '8px',
                padding: '10px 12px',
              }}
            >
              빠른 시작 모드
            </button>
          </div>
        ) : null}
      </nav>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        subTitle={authModalSubTitle}
      />

      <style>{`
        @media (max-width: 980px) {
          .desktop-nav,
          .desktop-user-chip { display: none !important; }
          .mobile-menu-trigger { display: inline-flex !important; }
          .topbar-shell { position: sticky; }
        }
        @media (min-width: 981px) {
          .mobile-menu-trigger,
          .mobile-menu { display: none !important; }
          .desktop-nav,
          .desktop-user-chip { display: inline-flex !important; }
        }
      `}</style>
    </header>
  );
};
