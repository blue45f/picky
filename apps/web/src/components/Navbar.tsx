import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCheck, LogIn, LogOut, Menu, X, User, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { AuthModal, type AuthMode } from './AuthModal';
import { ThemeSwitcher } from './ThemeSwitcher';

const navItems = [
  { path: '/', label: '고민 둘러보기' },
  { path: '/create', label: '새 고민 작성' },
];

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, needsReauth, clearError, setNeedsReauth } = useAuthStore();
  const SESSION_REAUTH_SUBTITLE = '세션이 만료되었습니다. 다시 로그인해 주세요.';

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('login');
  const [authModalSubTitle, setAuthModalSubTitle] = useState<string | undefined>(undefined);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinCodeError, setJoinCodeError] = useState('');
  // 브랜드 마크 클릭 시 통통 바운스 재생용 카운터(클릭마다 증가 → 아보카도 재마운트).
  const [brandPop, setBrandPop] = useState(0);

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

  const handleJoinCodeSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = joinCodeInput.trim().replace(/^#/, '').replace(/\s+/g, '');

    if (!normalizedCode) {
      setJoinCodeError('코드 입력');
      return;
    }

    if (!/^[A-Za-z0-9_-]{4,80}$/.test(normalizedCode)) {
      setJoinCodeError('형식 확인');
      return;
    }

    setJoinCodeError('');
    setJoinCodeInput('');
    setMobileOpen(false);
    navigate(`/poll/${encodeURIComponent(normalizedCode)}`);
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

  // 모바일 메뉴가 열려 있을 때 ESC 로 닫는다.
  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

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
          onClick={() => setBrandPop((prev) => prev + 1)}
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
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span key={brandPop} className="brand-bounce" aria-hidden="true">
              🥑
            </span>
            <span
              style={{
                letterSpacing: '-0.01em',
                color: 'var(--brand-primary-light)',
              }}
            >
              picky
            </span>
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
          style={
            {
              display: 'none',
              alignItems: 'center',
              gap: '0.95rem',
              marginLeft: 'auto',
              ['::before' as any]: {},
            } as React.CSSProperties
          }
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
                  border: isActive
                    ? '1px solid var(--bg-card-border-hover)'
                    : '1px solid transparent',
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {item.label}
              </Link>
            );
          })}
          {user?.isAdmin ? (
            <Link
              to="/admin"
              style={{
                textDecoration: 'none',
                fontSize: '0.84rem',
                padding: '8px 10px',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color:
                  location.pathname === '/admin' ? 'var(--brand-accent-teal)' : 'var(--text-muted)',
                border:
                  location.pathname === '/admin'
                    ? '1px solid rgba(45, 212, 191, 0.38)'
                    : '1px solid transparent',
                fontWeight: location.pathname === '/admin' ? 700 : 500,
              }}
            >
              <ShieldCheck size={14} />
              관리자
            </Link>
          ) : null}
          <form
            onSubmit={handleJoinCodeSubmit}
            aria-label="참여 코드로 투표 입장"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(45, 212, 191, 0.18)',
              borderRadius: '999px',
              background: 'rgba(45, 212, 191, 0.055)',
              padding: '4px 5px 4px 10px',
            }}
          >
            <span
              style={{
                color: joinCodeError ? 'var(--brand-accent-gold)' : 'var(--brand-accent-teal)',
                fontSize: '0.62rem',
                fontWeight: 900,
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}
            >
              {joinCodeError || 'JOIN'}
            </span>
            <input
              value={joinCodeInput}
              onChange={(event) => {
                setJoinCodeInput(event.target.value);
                if (joinCodeError) {
                  setJoinCodeError('');
                }
              }}
              placeholder="참여 코드"
              aria-label="참여 코드"
              autoCapitalize="none"
              autoCorrect="off"
              style={{
                width: '92px',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.72rem',
                fontWeight: 800,
              }}
            />
            <button
              type="submit"
              aria-label="참여 코드로 입장"
              style={{
                width: '28px',
                height: '28px',
                border: '1px solid rgba(45, 212, 191, 0.28)',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(45, 212, 191, 0.12)',
                color: 'var(--brand-accent-teal)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <ArrowRight size={13} />
            </button>
          </form>
        </div>

        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
          }}
        >
          <ThemeSwitcher />
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
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {nicknameText}
                </span>
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
                  className="btn-secondary desktop-auth-action"
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
                className="desktop-auth-action"
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
                  className="btn-secondary desktop-auth-action"
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
                className="btn-secondary desktop-auth-action"
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
                className="btn-secondary desktop-auth-action"
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
                className="btn-secondary desktop-auth-action"
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
            aria-label={mobileOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기'}
            aria-expanded={mobileOpen}
            aria-haspopup="menu"
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
            role="menu"
            aria-label="모바일 메뉴"
            style={{
              position: 'absolute',
              top: 'calc(var(--nav-height) - 2px)',
              left: 0,
              right: 0,
              background:
                'linear-gradient(180deg, color-mix(in oklab, var(--bg-main) 90%, transparent), var(--bg-main))',
              borderBottom: '1px solid var(--bg-card-border)',
              borderTop: '1px solid var(--bg-card-border)',
              padding: '0.55rem 1rem 0.85rem',
              display: 'grid',
              gap: '0.45rem',
            }}
          >
            <form
              onSubmit={handleJoinCodeSubmit}
              aria-label="모바일 참여 코드로 투표 입장"
              style={{
                display: 'grid',
                gap: '0.5rem',
                border: '1px solid rgba(45, 212, 191, 0.22)',
                borderRadius: '10px',
                background: 'rgba(45, 212, 191, 0.065)',
                padding: '0.72rem',
                marginBottom: '0.2rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.6rem',
                }}
              >
                <span
                  style={{
                    color: joinCodeError ? 'var(--brand-accent-gold)' : 'var(--brand-accent-teal)',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    letterSpacing: '0.04em',
                  }}
                >
                  {joinCodeError || 'JOIN CODE로 바로 참여'}
                </span>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.66rem' }}>
                  QR을 못 쓸 때
                </small>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  value={joinCodeInput}
                  onChange={(event) => {
                    setJoinCodeInput(event.target.value);
                    if (joinCodeError) {
                      setJoinCodeError('');
                    }
                  }}
                  placeholder="공유받은 코드 입력"
                  aria-label="모바일 참여 코드"
                  autoCapitalize="none"
                  autoCorrect="off"
                  style={{
                    minWidth: 0,
                    flex: 1,
                    border: '1px solid var(--bg-card-border)',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.035)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    padding: '9px 10px',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    minWidth: '76px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '9px 10px',
                    fontSize: '0.76rem',
                  }}
                >
                  입장
                  <ArrowRight size={13} />
                </button>
              </div>
            </form>

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
            {user?.isAdmin ? (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                style={{
                  textDecoration: 'none',
                  color: 'var(--brand-accent-teal)',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(45, 212, 191, 0.32)',
                  padding: '10px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                }}
              >
                <ShieldCheck size={14} />
                관리자
              </Link>
            ) : null}
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
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
                로그아웃
              </button>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    textDecoration: 'none',
                    color: 'var(--text-secondary)',
                    border: '1px dashed var(--bg-card-border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '0.85rem',
                  }}
                >
                  로그인
                </Link>
                <Link
                  to="/auth/register"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    textDecoration: 'none',
                    color: 'var(--text-secondary)',
                    border: '1px dashed var(--bg-card-border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '0.85rem',
                  }}
                >
                  회원가입
                </Link>
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
              </>
            )}
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
          .desktop-user-chip,
          .desktop-auth-action { display: none !important; }
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
