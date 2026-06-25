import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCheck, LogIn, LogOut, Menu, X, User, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { AuthModal, type AuthMode } from './AuthModal';
import { ThemeSwitcher } from './ThemeSwitcher';
import { SoundSettingsControl } from './SoundSettingsControl';
import { triggerParticleBurst } from '../lib/particles';
import { playClick } from '../../../../packages/client/src/lib/audio';

const navItems = [
  { path: '/', label: '고민 둘러보기' },
  { path: '/create', label: '새 고민 작성' },
  { path: '/support', label: '고객센터' },
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
  // 모바일 다이얼로그 패널 — 포커스 트랩/오토포커스 대상.
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  // 메뉴를 연 트리거를 기억해 닫을 때 포커스를 되돌린다(a11y).
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
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

  // 모바일 메뉴가 풀스크린 오버레이(dialog)로 열려 있을 때:
  // ESC 닫기 · 포커스 트랩(Tab 순환) · body 스크롤 락 · 닫을 때 트리거로 포커스 복원.
  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    // 메뉴를 연 시점의 포커스 요소(트리거)를 기억해 닫을 때 복원한다.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = (): HTMLElement[] => {
      const panel = mobilePanelRef.current;
      if (!panel) {
        return [];
      }
      return Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusable = getFocusable();
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        return;
      }
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !mobilePanelRef.current?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !mobilePanelRef.current?.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);

    // body 스크롤 락 — 오버레이 뒤 콘텐츠가 스크롤되지 않게 한다.
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    // 스크롤바가 사라지며 생기는 레이아웃 점프 보정.
    const scrollbarWidth = globalThis.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // 패널이 그려진 뒤 첫 포커스 가능한 요소(닫기 버튼)로 포커스를 옮긴다.
    const focusFrame = globalThis.requestAnimationFrame(() => {
      const target =
        mobilePanelRef.current?.querySelector<HTMLElement>('[data-autofocus]') ?? getFocusable()[0];
      target?.focus();
    });

    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown);
      globalThis.cancelAnimationFrame(focusFrame);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      // 트리거(없으면 기억한 요소)로 포커스 복원.
      (mobileMenuTriggerRef.current ?? previouslyFocused)?.focus();
    };
  }, [mobileOpen]);

  return (
    <header className="topbar-shell">
      <nav
        className="topbar-nav"
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          minHeight: 'var(--nav-height)',
          padding: '0.5rem 1.1rem',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'nowrap',
          gap: '0.85rem',
        }}
      >
        <Link
          to="/"
          aria-label="피키 홈"
          // 전역 캡처 클릭이 'tap' 을 먼저 울리면 30ms 스로틀에 'title' 이 묻혀요.
          // 브랜드는 data-no-sound 로 전역 사운드를 끄고, 아래 onClick 의 sparkle 만 울립니다.
          data-no-sound
          // 토스 인앱과 동일하게 클릭 시 "팡" 파티클을 터뜨리고 sparkle 화음을 울려요.
          onClick={(e) => {
            setBrandPop((prev) => prev + 1);
            triggerParticleBurst(e.clientX, e.clientY, { count: 20 });
            playClick('title');
          }}
          // 마우스 클릭 시 포커스 링이 생기지 않게(키보드 포커스는 유지 — a11y).
          onMouseDown={(e) => e.preventDefault()}
          style={{
            textDecoration: 'none',
            color: 'var(--text-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginRight: 'auto',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <span
            // 상시 스파클이 절대배치될 컨테이너 — 토스 인앱 헤더("피키 🥑")와 동일한 반짝임을 웹에도.
            style={{
              fontSize: '1.22rem',
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              position: 'relative',
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
              피키
            </span>
            {/* 토스 타이틀과 동일한 3개 스파클(✦ ✨ ✦) — 장식이라 a11y 이름에서 제외.
                reduced-motion 에선 index.css 가드로 멈추고 숨긴다. */}
            <span
              className="sparkle-icon"
              aria-hidden="true"
              style={{ top: -4, left: -10, fontSize: 12, animationDelay: '0.1s' }}
            >
              ✦
            </span>
            <span
              className="sparkle-icon"
              aria-hidden="true"
              style={{
                top: -8,
                right: 8,
                fontSize: 10,
                animationDelay: '0.6s',
                color: 'var(--brand-accent-gold)',
              }}
            >
              ✨
            </span>
            <span
              className="sparkle-icon"
              aria-hidden="true"
              style={{ bottom: -1, right: -8, fontSize: 10, animationDelay: '1.2s' }}
            >
              ✦
            </span>
          </span>
          <span
            // BETA 배지는 장식 — 접근성 이름에서 제외해 가시 텍스트(피키)와 라벨('피키 홈')을 정합시킨다(WCAG 2.5.3).
            aria-hidden="true"
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
            gap: '0.4rem',
          }}
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
            className="desktop-join-form"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: '0.3rem',
              flexShrink: 0,
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
                width: '74px',
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
          className="topbar-right"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            flexShrink: 0,
          }}
        >
          <SoundSettingsControl />
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

              <Link
                to="/account"
                className="desktop-auth-action"
                style={{
                  background: 'none',
                  border: '1px solid var(--bg-card-border)',
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
              >
                <User size={14} />내 계정
              </Link>

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

              <button
                type="button"
                onClick={() =>
                  handleAuthModalOpen('guest', '닉네임만으로 투표·한마디에 바로 참여해요')
                }
                className="btn-primary desktop-auth-action"
                style={{
                  padding: '8px 13px',
                  fontSize: '0.74rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <ArrowRight size={14} />
                시작하기
              </button>
            </>
          )}

          <button
            ref={mobileMenuTriggerRef}
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기'}
            aria-expanded={mobileOpen}
            aria-haspopup="dialog"
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
            className="mobile-menu-trigger nav-icon-btn"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {mobileOpen ? (
          <div className="mobile-menu-overlay" aria-hidden={false}>
            {/* 반투명 backdrop — 클릭 시 메뉴를 닫는다(딤+블러). 장식이라 보조 라벨만. */}
            <button
              type="button"
              className="mobile-menu-backdrop"
              aria-label="모바일 메뉴 닫기"
              onClick={() => setMobileOpen(false)}
            />
            <div
              ref={mobilePanelRef}
              className="mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="모바일 메뉴"
            >
              <div className="mobile-menu-head">
                <span className="mobile-menu-head-title">메뉴</span>
                <button
                  type="button"
                  data-autofocus
                  onClick={() => setMobileOpen(false)}
                  aria-label="모바일 메뉴 닫기"
                  className="nav-icon-btn"
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
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mobile-menu-body">
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
                        color: joinCodeError
                          ? 'var(--brand-accent-gold)'
                          : 'var(--brand-accent-teal)',
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
                  <>
                    <Link
                      to="/account"
                      onClick={() => setMobileOpen(false)}
                      style={{
                        textDecoration: 'none',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--bg-card-border)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '0.85rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <User size={14} /> 내 계정
                    </Link>
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
                  </>
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
                      onClick={() =>
                        handleAuthModalOpen('guest', '닉네임만으로 투표·한마디에 바로 참여해요')
                      }
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
            </div>
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
        /* 데스크탑 헤더의 모든 링크·버튼·브랜드는 한 줄로 — 한글 라벨이
           글자 단위로 줄바꿈(피→키, 로그→인)되며 헤더가 부풀던 문제 방지. */
        .topbar-nav a,
        .topbar-nav button,
        .topbar-nav .desktop-nav,
        .topbar-nav .desktop-auth-action,
        .topbar-nav .desktop-user-chip {
          white-space: nowrap;
        }
        .topbar-nav .desktop-nav a {
          line-height: 1.1;
        }

        @media (max-width: 980px) {
          .desktop-nav,
          .desktop-user-chip,
          .desktop-auth-action { display: none !important; }
          .mobile-menu-trigger { display: inline-flex !important; }
          .topbar-shell { position: sticky; }
        }
        @media (min-width: 981px) {
          .mobile-menu-trigger,
          .mobile-menu-overlay { display: none !important; }
          .desktop-nav,
          .desktop-user-chip { display: inline-flex !important; }
        }
        /* 좁은 데스크탑(981–1140)에선 JOIN 코드 폼을 숨겨 우측 클러스터 과밀을 막는다.
           참여 코드 입력 동선은 모바일 메뉴·홈 화면에서 유지되므로 핵심 동선 손실 없음. */
        @media (min-width: 981px) and (max-width: 1140px) {
          .desktop-join-form { display: none !important; }
        }

        /* 풀스크린 오버레이 — backdrop(클릭 닫기)과 dialog 패널을 콘텐츠 위로 띄운다. */
        .mobile-menu-overlay {
          position: fixed;
          inset: 0;
          z-index: var(--z-overlay);
        }
        .mobile-menu-backdrop {
          position: absolute;
          inset: 0;
          border: none;
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
          background: color-mix(in oklab, var(--bg-main) 32%, rgba(3, 7, 10, 0.62));
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: mobileMenuFade 0.18s var(--ease-out-quart);
        }
        /* 헤더 바로 아래에서 펼쳐지는 다이얼로그 패널. 긴 목록은 자체 스크롤. */
        .mobile-menu {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          flex-direction: column;
          max-height: 100dvh;
          background: linear-gradient(
            180deg,
            color-mix(in oklab, var(--bg-main) 96%, transparent),
            var(--bg-main)
          );
          border-bottom: 1px solid var(--bg-card-border);
          box-shadow: 0 22px 56px rgba(0, 0, 0, 0.42);
          padding-top: env(safe-area-inset-top, 0px);
          transform-origin: top center;
          animation: mobileMenuSlide 0.22s var(--ease-out-quint);
        }
        .mobile-menu-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: var(--nav-height);
          padding: 0.55rem 1rem;
          border-bottom: 1px solid var(--bg-card-border);
        }
        .mobile-menu-head-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }
        /* 항목이 화면보다 길어지면 패널 내부에서 스크롤(safe-area 하단 패딩 포함). */
        .mobile-menu-body {
          display: grid;
          gap: 0.45rem;
          padding: 0.7rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px));
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        @keyframes mobileMenuFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes mobileMenuSlide {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mobile-menu-backdrop,
          .mobile-menu {
            animation: none;
          }
        }
      `}</style>
    </header>
  );
};
