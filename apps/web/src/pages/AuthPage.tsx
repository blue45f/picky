import type { FormEvent } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CircleHelp } from 'lucide-react';
import { Mail, Lock, User, Play, Sparkles } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { useAuthStore } from '../store/useAuthStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

type AuthMode = 'login' | 'register' | 'guest';

const MODE_LABELS: Record<AuthMode, string> = {
  login: '로그인',
  register: '회원가입',
  guest: '비회원 시작',
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const resolveMode = (raw: string | undefined): AuthMode => {
  if (raw === 'register' || raw === 'guest') {
    return raw;
  }
  return 'login';
};

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { mode: modeParam } = useParams<{ mode: string }>();
  const mode = useMemo(() => resolveMode(modeParam), [modeParam]);
  useDocumentTitle(MODE_LABELS[mode]);
  const [searchParams, setSearchParams] = useSearchParams();
  const nextPath = searchParams.get('next') || '/';

  const {
    login,
    register,
    registerGuest,
    isLoading,
    error,
    clearError,
    clearValidationErrors,
    validationErrors,
    guestName,
  } = useAuthStore();

  const [activeMode, setActiveMode] = useState<AuthMode>(mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [formError, setFormError] = useState('');
  const [showIntroDialog, setShowIntroDialog] = useState(false);

  useEffect(() => {
    setActiveMode(mode);
    setFormError('');
    setEmail('');
    setPassword('');
    setNickname(mode === 'guest' ? guestName : '');
    clearError();
    clearValidationErrors();
  }, [mode, guestName, clearError, clearValidationErrors]);

  const resolveFormError = () => {
    if (activeMode === 'guest') {
      const trimmedNickname = nickname.trim();
      if (!trimmedNickname) {
        return '닉네임은 필수입니다.';
      }
      if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
        return '닉네임은 2자 이상 20자 이하로 입력해 주세요.';
      }
      return null;
    }

    if (activeMode === 'register') {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      const trimmedNickname = nickname.trim();

      if (!trimmedEmail) {
        return '이메일은 필수입니다.';
      }
      if (!isValidEmail(trimmedEmail)) {
        return '올바른 이메일 형식을 입력해 주세요.';
      }
      if (trimmedPassword.length < 6) {
        return '비밀번호는 6자 이상이어야 합니다.';
      }
      if (!trimmedNickname) {
        return '닉네임은 필수입니다.';
      }
      if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
        return '닉네임은 2자 이상 20자 이하로 입력해 주세요.';
      }
      return null;
    }

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      return '이메일은 필수입니다.';
    }
    if (!isValidEmail(trimmedEmail)) {
      return '올바른 이메일 형식을 입력해 주세요.';
    }
    if (trimmedPassword.length < 6) {
      return '비밀번호는 6자 이상이어야 합니다.';
    }
    return null;
  };

  const authError = error || formError;

  const handleModeChange = (nextMode: string) => {
    const normalized = resolveMode(nextMode);
    setFormError('');
    clearError();
    clearValidationErrors();

    if (nextPath !== '/') {
      const next = new URLSearchParams(searchParams);
      next.set('next', nextPath);
      setSearchParams(next);
      navigate(`/auth/${normalized}?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    setSearchParams({});
    navigate(`/auth/${normalized}`);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    clearError();
    clearValidationErrors();
    const nextError = resolveFormError();
    if (nextError) {
      setFormError(nextError);
      return;
    }
    setFormError('');

    if (activeMode === 'login') {
      const success = await login({ email: email.trim(), password: password.trim() });
      if (success) {
        navigate(nextPath);
      }
      return;
    }

    if (activeMode === 'register') {
      const success = await register({
        email: email.trim(),
        password: password.trim(),
        nickname: nickname.trim(),
      });
      if (success) {
        navigate(nextPath);
      }
      return;
    }

    const success = await registerGuest({ nickname: nickname.trim() });
    if (success) {
      navigate(nextPath);
    }
  };

  const handleEmailInput = (value: string) => {
    setEmail(value);
    clearError();
    clearValidationErrors();
    setFormError('');
  };

  const handlePasswordInput = (value: string) => {
    setPassword(value);
    clearError();
    clearValidationErrors();
    setFormError('');
  };

  const handleNicknameInput = (value: string) => {
    setNickname(value);
    clearError();
    clearValidationErrors();
    setFormError('');
  };

  const commonInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    backgroundColor: 'oklch(11% 0.015 260)',
    border: '1px solid var(--bg-card-border)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-sans)',
  };

  return (
    <section style={{ display: 'grid', justifyItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '440px', position: 'relative' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute',
            top: '0.5rem',
            left: '0',
            border: '1px solid var(--bg-card-border)',
            background: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            borderRadius: '999px',
            padding: '8px 12px',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={14} />
          뒤로가기
        </button>

        <div
          className="content-card"
          style={{ padding: '1.8rem', marginTop: '2.2rem', position: 'relative' }}
        >
          <div style={{ textAlign: 'center', display: 'grid', gap: '8px', marginBottom: '1rem' }}>
            <p style={{ color: 'var(--brand-accent-gold)', fontWeight: 700, fontSize: '0.74rem' }}>
              pickflow Auth Flow
            </p>
            <h1 style={{ fontSize: '1.55rem', margin: 0, letterSpacing: 0 }}>
              {MODE_LABELS[activeMode]}
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {activeMode === 'guest'
                ? '닉네임만으로 즉시 시작하고, 추후 회원가입으로 업그레이드할 수 있어요.'
                : '로그인/가입 후에도 익명 사용자 데이터와 동일하게 이어집니다.'}
            </p>
          </div>

          <Tabs.Root value={activeMode} onValueChange={handleModeChange}>
            <Tabs.List
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                borderBottom: '1px solid var(--bg-card-border)',
                paddingBottom: '4px',
                marginBottom: '1rem',
              }}
            >
              <Tabs.Trigger
                value="login"
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: '0.6rem',
                  color: activeMode === 'login' ? 'var(--brand-primary)' : 'var(--text-muted)',
                  borderBottom:
                    activeMode === 'login'
                      ? '2px solid var(--brand-primary)'
                      : '2px solid transparent',
                  fontWeight: activeMode === 'login' ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                로그인
              </Tabs.Trigger>
              <Tabs.Trigger
                value="register"
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: '0.6rem',
                  color: activeMode === 'register' ? 'var(--brand-primary)' : 'var(--text-muted)',
                  borderBottom:
                    activeMode === 'register'
                      ? '2px solid var(--brand-primary)'
                      : '2px solid transparent',
                  fontWeight: activeMode === 'register' ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                회원가입
              </Tabs.Trigger>
              <Tabs.Trigger
                value="guest"
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: '0.6rem',
                  color: activeMode === 'guest' ? 'var(--brand-primary)' : 'var(--text-muted)',
                  borderBottom:
                    activeMode === 'guest'
                      ? '2px solid var(--brand-primary)'
                      : '2px solid transparent',
                  fontWeight: activeMode === 'guest' ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                비회원
              </Tabs.Trigger>
            </Tabs.List>

            <form onSubmit={handleSubmit}>
              <Tabs.Content
                value="login"
                style={{ display: activeMode === 'login' ? 'grid' : 'none', gap: '0.9rem' }}
              >
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span
                      style={{
                        marginRight: '0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <Mail size={14} />
                    </span>
                    이메일
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailInput(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    style={commonInputStyle}
                  />
                  {validationErrors.email && (
                    <p style={{ color: 'var(--brand-accent-coral)', fontSize: '0.75rem' }}>
                      {validationErrors.email}
                    </p>
                  )}
                </div>
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span
                      style={{
                        marginRight: '0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <Lock size={14} />
                    </span>
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => handlePasswordInput(e.target.value)}
                    autoComplete="current-password"
                    placeholder="6자 이상"
                    style={commonInputStyle}
                  />
                  {validationErrors.password && (
                    <p style={{ color: 'var(--brand-accent-coral)', fontSize: '0.75rem' }}>
                      {validationErrors.password}
                    </p>
                  )}
                </div>
              </Tabs.Content>

              <Tabs.Content
                value="register"
                style={{ display: activeMode === 'register' ? 'grid' : 'none', gap: '0.9rem' }}
              >
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span
                      style={{
                        marginRight: '0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <Mail size={14} />
                    </span>
                    이메일
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailInput(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    style={commonInputStyle}
                  />
                  {validationErrors.email && (
                    <p style={{ color: 'var(--brand-accent-coral)', fontSize: '0.75rem' }}>
                      {validationErrors.email}
                    </p>
                  )}
                </div>
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span
                      style={{
                        marginRight: '0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <Lock size={14} />
                    </span>
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => handlePasswordInput(e.target.value)}
                    autoComplete="new-password"
                    placeholder="6자 이상"
                    style={commonInputStyle}
                  />
                  {validationErrors.password && (
                    <p style={{ color: 'var(--brand-accent-coral)', fontSize: '0.75rem' }}>
                      {validationErrors.password}
                    </p>
                  )}
                </div>
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span
                      style={{
                        marginRight: '0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <User size={14} />
                    </span>
                    닉네임
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => handleNicknameInput(e.target.value)}
                    placeholder="서비스에서 쓸 닉네임"
                    style={commonInputStyle}
                  />
                  {validationErrors.nickname && (
                    <p style={{ color: 'var(--brand-accent-coral)', fontSize: '0.75rem' }}>
                      {validationErrors.nickname}
                    </p>
                  )}
                </div>
              </Tabs.Content>

              <Tabs.Content
                value="guest"
                style={{ display: activeMode === 'guest' ? 'grid' : 'none', gap: '0.9rem' }}
              >
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span
                      style={{
                        marginRight: '0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <Sparkles size={14} />
                    </span>
                    닉네임
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => handleNicknameInput(e.target.value)}
                    placeholder="닉네임을 입력해 주세요"
                    style={commonInputStyle}
                  />
                  {validationErrors.nickname && (
                    <p style={{ color: 'var(--brand-accent-coral)', fontSize: '0.75rem' }}>
                      {validationErrors.nickname}
                    </p>
                  )}
                </div>
              </Tabs.Content>

              {authError && (
                <p
                  style={{
                    color: 'var(--brand-accent-coral)',
                    fontSize: '0.78rem',
                    marginTop: '0.15rem',
                    lineHeight: 1.45,
                  }}
                >
                  {authError}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading}
                style={{
                  marginTop: '1rem',
                  width: '100%',
                  padding: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <CircleHelp size={14} />
                {isLoading ? '처리 중…' : MODE_LABELS[activeMode]}
              </button>
            </form>

            <Dialog.Root open={showIntroDialog} onOpenChange={setShowIntroDialog}>
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{
                    marginTop: '0.85rem',
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    fontSize: '0.78rem',
                  }}
                >
                  <Play size={13} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                  이용 가이드 보기
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(4, 6, 10, 0.72)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 100,
                  }}
                />
                <Dialog.Content
                  style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'min(560px, calc(100vw - 2rem))',
                    maxHeight: '75vh',
                    overflow: 'auto',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--bg-card-border)',
                    borderRadius: '14px',
                    padding: '1rem',
                    zIndex: 101,
                    boxShadow: 'var(--shadow-glow)',
                  }}
                >
                  <div style={{ display: 'grid', gap: '0.8rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>회원/비회원 인증 정책 안내</h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      회원은 투표/삭제/작업 이력을 계정에 바인딩할 수 있고, 비회원은 닉네임 기반
                      임시 세션으로 빠르게 시작할 수 있습니다. 추후 회원가입 시 기존 닉네임 데이터는
                      유지됩니다.
                    </p>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      로그인 후에는 투표 이력/생성 이력이 닉네임 대신 계정 기반으로 관리됩니다.
                    </p>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                      >
                        닫기
                      </button>
                    </Dialog.Close>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </Tabs.Root>
        </div>
      </div>
    </section>
  );
};
