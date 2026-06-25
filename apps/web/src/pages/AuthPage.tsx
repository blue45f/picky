import type { FormEvent } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, LogIn, UserPlus, Mail, Lock, User, Play, Sparkles } from 'lucide-react';
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

const isValidEmail = (value: string) => {
  for (const char of value) {
    if (char.trim() === '') {
      return false;
    }
  }

  const atIndex = value.indexOf('@');
  const dotIndex = value.lastIndexOf('.');
  return atIndex > 0 && dotIndex > atIndex + 1 && dotIndex < value.length - 1;
};

const resolveMode = (raw: string | undefined): AuthMode => {
  if (raw === 'register' || raw === 'guest') {
    return raw;
  }
  return 'login';
};

const validateNickname = (nickname: string): string | null => {
  const trimmedNickname = nickname.trim();
  if (!trimmedNickname) {
    return '닉네임은 필수입니다.';
  }
  if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
    return '닉네임은 2자 이상 20자 이하로 입력해 주세요.';
  }
  return null;
};

const validateEmailAndPassword = (email: string, password: string): string | null => {
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

const resolveAuthFormError = (
  activeMode: AuthMode,
  email: string,
  password: string,
  nickname: string,
): string | null => {
  if (activeMode === 'guest') {
    return validateNickname(nickname);
  }

  if (activeMode === 'register') {
    return validateEmailAndPassword(email, password) ?? validateNickname(nickname);
  }

  return validateEmailAndPassword(email, password);
};

const AuthModeTrigger = (
  props: Readonly<{ value: AuthMode; label: string; activeMode: AuthMode }>,
) => {
  const isActive = props.activeMode === props.value;
  return (
    <Tabs.Trigger
      value={props.value}
      style={{
        border: 'none',
        background: 'transparent',
        padding: '0.6rem',
        color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)',
        borderBottom: isActive ? '2px solid var(--brand-primary)' : '2px solid transparent',
        fontWeight: isActive ? 700 : 500,
        cursor: 'pointer',
      }}
    >
      {props.label}
    </Tabs.Trigger>
  );
};

const AuthSubmitIcon = (props: Readonly<{ activeMode: AuthMode }>) => {
  if (props.activeMode === 'login') {
    return <LogIn size={15} />;
  }
  if (props.activeMode === 'register') {
    return <UserPlus size={15} />;
  }
  return <Sparkles size={15} />;
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

  const resolveFormError = () => resolveAuthFormError(activeMode, email, password, nickname);

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
    // 입력칸 배경은 항상 다크라, 텍스트도 테마와 무관하게 밝은색으로 고정해야
    // 라이트 모드에서 입력값이 안 보이지 않는다(대비 AA).
    backgroundColor: 'oklch(11% 0.015 260)',
    border: '1px solid var(--bg-card-border)',
    color: '#f1faf7',
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
              피키와 함께 🥑
            </p>
            <h1 style={{ fontSize: '1.55rem', margin: 0, letterSpacing: 0 }}>
              {MODE_LABELS[activeMode]}
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {activeMode === 'guest'
                ? '닉네임만으로 투표·한마디에 바로 참여하세요. 고민을 직접 올리려면 회원가입이 필요해요.'
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
              <AuthModeTrigger value="login" label="로그인" activeMode={activeMode} />
              <AuthModeTrigger value="register" label="회원가입" activeMode={activeMode} />
              <AuthModeTrigger value="guest" label="비회원" activeMode={activeMode} />
            </Tabs.List>

            <form onSubmit={handleSubmit}>
              <Tabs.Content
                value="login"
                style={{ display: activeMode === 'login' ? 'grid' : 'none', gap: '0.9rem' }}
              >
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <label
                    htmlFor="auth-login-email"
                    style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}
                  >
                    <span
                      style={{
                        marginRight: '0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <Mail size={14} />
                    </span>
                    <span>이메일</span>
                  </label>
                  <input
                    id="auth-login-email"
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
                  <label
                    htmlFor="auth-login-password"
                    style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}
                  >
                    <span
                      style={{
                        marginRight: '0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <Lock size={14} />
                    </span>
                    <span>비밀번호</span>
                  </label>
                  <input
                    id="auth-login-password"
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
                  <label
                    htmlFor="auth-register-email"
                    style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}
                  >
                    <span
                      style={{
                        marginRight: '0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <Mail size={14} />
                    </span>
                    <span>이메일</span>
                  </label>
                  <input
                    id="auth-register-email"
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
                  <label
                    htmlFor="auth-register-password"
                    style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}
                  >
                    <span
                      style={{
                        marginRight: '0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <Lock size={14} />
                    </span>
                    <span>비밀번호</span>
                  </label>
                  <input
                    id="auth-register-password"
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
                  <label
                    htmlFor="auth-register-nickname"
                    style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}
                  >
                    <span
                      style={{
                        marginRight: '0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <User size={14} />
                    </span>
                    <span>닉네임</span>
                  </label>
                  <input
                    id="auth-register-nickname"
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
                  <label
                    htmlFor="auth-guest-nickname"
                    style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}
                  >
                    <span
                      style={{
                        marginRight: '0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <Sparkles size={14} />
                    </span>
                    <span>닉네임</span>
                  </label>
                  <input
                    id="auth-guest-nickname"
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
                <AuthSubmitIcon activeMode={activeMode} />
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
                      투표와 한마디(댓글)는 회원·비회원 모두 닉네임만으로 바로 참여할 수 있어요.
                      고민(폴) 작성·수정·삭제는 내 계정에 안전하게 귀속되도록 로그인한 회원만 할 수
                      있습니다.
                    </p>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      회원가입하면 내가 올린 고민과 투표 결과를 한곳에서 관리할 수 있어요. 추후
                      회원가입 시 기존 닉네임으로 남긴 참여 데이터도 그대로 이어집니다.
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
