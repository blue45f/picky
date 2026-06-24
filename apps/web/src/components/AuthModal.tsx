import React, { useEffect, useRef, useState } from 'react';
import { X, Mail, Lock, User, LogIn, UserPlus, UserCog, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  subTitle?: string;
}

export type AuthMode = 'login' | 'register' | 'guest';

const isValidEmail = (value: string): boolean => {
  for (const char of value) {
    if (char.trim() === '') {
      return false;
    }
  }

  const atIndex = value.indexOf('@');
  const dotIndex = value.lastIndexOf('.');
  return atIndex > 0 && dotIndex > atIndex + 1 && dotIndex < value.length - 1;
};

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  subTitle,
}) => {
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
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [formError, setFormError] = useState('');

  // 접근성: 모달 포커스 트랩·복원에 쓰는 ref. closeRef 는 최신 handleClose 를 가리켜
  // (handleClose 가 조기 return 아래 정의되므로) 훅에서 안전하게 호출한다.
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<() => void>(() => {});

  const isLoginMode = mode === 'login';
  const isRegisterMode = mode === 'register';
  const isGuestMode = mode === 'guest';

  const getFieldError = (field: 'email' | 'password' | 'nickname') => {
    return validationErrors[field];
  };

  const resolveFormError = () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedNickname = nickname.trim();

    if (isGuestMode) {
      if (!trimmedNickname) {
        return '닉네임은 필수입니다.';
      }
      if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
        return '닉네임은 2자 이상 20자 이하로 입력해 주세요.';
      }
      return null;
    }

    if (isRegisterMode) {
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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setMode(initialMode);
    setEmail('');
    setPassword('');
    setNickname(initialMode === 'guest' ? guestName : '');
    setFormError('');
    clearError();
    clearValidationErrors();
  }, [isOpen, initialMode, guestName, clearError, clearValidationErrors]);

  // 모달 포커스 트랩 + Esc 닫기 + 포커스 복원 (직접 만든 모달이라 직접 구현)
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const node = modalRef.current;
    const getFocusable = () =>
      node
        ? Array.from(
            node.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];
    // 여는 클릭의 기본 포커스 처리와 경쟁하지 않도록 다음 프레임에 첫 입력으로 포커스 이동
    const focusRaf = requestAnimationFrame(() => {
      const focusables = getFocusable();
      (focusables.find((el) => el.tagName === 'INPUT') ?? focusables[0])?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const list = getFocusable();
      const first = list[0];
      const last = list[list.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(focusRaf);
      document.removeEventListener('keydown', onKeyDown, true);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) {
      return;
    }

    clearError();
    clearValidationErrors();
    const nextError = resolveFormError();
    if (nextError) {
      setFormError(nextError);
      return;
    }
    setFormError('');

    if (mode === 'login') {
      const success = await login({
        email: email.trim(),
        password: password.trim(),
      });
      if (success) {
        handleClose();
      }
      return;
    }

    if (mode === 'register') {
      const success = await register({
        email: email.trim(),
        password: password.trim(),
        nickname: nickname.trim(),
      });
      if (success) {
        handleClose();
      }
      return;
    }

    const success = await registerGuest({ nickname: nickname.trim() });
    if (success) {
      handleClose();
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setNickname('');
    setFormError('');
    clearError();
    clearValidationErrors();
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    if (nextMode === 'guest' && !nickname && guestName) {
      setNickname(guestName);
    }
    setFormError('');
    clearError();
    clearValidationErrors();
  };

  const authError = error || formError;

  const handleClose = () => {
    setMode('login');
    resetForm();
    onClose();
  };
  closeRef.current = handleClose;

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="content-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '2rem',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          animation: 'scale-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          cursor: 'default',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="닫기"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <X size={18} />
        </button>

        {/* Header Title */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h2
            id="auth-modal-title"
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: 0,
            }}
          >
            {isLoginMode
              ? '피키가 기다렸어요! 🥑'
              : isRegisterMode
                ? '픽플로우 회원가입'
                : '비회원 빠른 시작'}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {subTitle ??
              (isLoginMode
                ? '고민을 올리고 SNS 투표 링크를 발급받으세요'
                : isRegisterMode
                  ? '가입하면 만든 고민과 투표 결과를 한곳에 모아둘 수 있어요'
                  : '닉네임만으로 바로 이용을 시작하세요')}
          </p>
        </div>

        {/* Tab Headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            borderBottom: '1px solid var(--bg-card-border)',
            paddingBottom: '2px',
          }}
        >
          <button
            type="button"
            onClick={() => switchMode('login')}
            style={{
              padding: '8px',
              background: 'none',
              border: 'none',
              color: isLoginMode ? 'var(--brand-primary)' : 'var(--text-muted)',
              borderBottom: isLoginMode
                ? '2px solid var(--brand-primary)'
                : '2px solid transparent',
              fontWeight: isLoginMode ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            style={{
              padding: '8px',
              background: 'none',
              border: 'none',
              color: isRegisterMode ? 'var(--brand-primary)' : 'var(--text-muted)',
              borderBottom: isRegisterMode
                ? '2px solid var(--brand-primary)'
                : '2px solid transparent',
              fontWeight: isRegisterMode ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            회원가입
          </button>
          <button
            type="button"
            onClick={() => switchMode('guest')}
            style={{
              padding: '8px',
              background: 'none',
              border: 'none',
              color: isGuestMode ? 'var(--brand-primary)' : 'var(--text-muted)',
              borderBottom: isGuestMode
                ? '2px solid var(--brand-primary)'
                : '2px solid transparent',
              fontWeight: isGuestMode ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            비회원
          </button>
        </div>

        {/* Error Alert */}
        {authError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '10px 12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--brand-accent-coral)',
              fontSize: '0.75rem',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{authError}</span>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          {!isLoginMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="auth-modal-nickname"
                style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}
              >
                닉네임
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  id="auth-modal-nickname"
                  type="text"
                  placeholder="2자 이상 20자 이하"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    clearError();
                    setFormError('');
                    if (Object.keys(validationErrors).length > 0) {
                      clearValidationErrors();
                    }
                  }}
                  maxLength={20}
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                />
                {getFieldError('nickname') ? (
                  <p
                    style={{
                      color: 'var(--brand-accent-coral)',
                      margin: '0.25rem 0 0',
                      fontSize: '0.72rem',
                    }}
                  >
                    {getFieldError('nickname')}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {!isGuestMode && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  htmlFor="auth-modal-email"
                  style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}
                >
                  이메일 주소
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    id="auth-modal-email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError();
                      setFormError('');
                      if (Object.keys(validationErrors).length > 0) {
                        clearValidationErrors();
                      }
                    }}
                    className="form-input"
                    style={{ paddingLeft: '36px' }}
                  />
                  {getFieldError('email') ? (
                    <p
                      style={{
                        color: 'var(--brand-accent-coral)',
                        margin: '0.25rem 0 0',
                        fontSize: '0.72rem',
                      }}
                    >
                      {getFieldError('email')}
                    </p>
                  ) : null}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  htmlFor="auth-modal-password"
                  style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}
                >
                  비밀번호
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    id="auth-modal-password"
                    type="password"
                    placeholder="6자 이상 입력"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError();
                      setFormError('');
                      if (Object.keys(validationErrors).length > 0) {
                        clearValidationErrors();
                      }
                    }}
                    className="form-input"
                    style={{ paddingLeft: '36px' }}
                  />
                  {getFieldError('password') ? (
                    <p
                      style={{
                        color: 'var(--brand-accent-coral)',
                        margin: '0.25rem 0 0',
                        fontSize: '0.72rem',
                      }}
                    >
                      {getFieldError('password')}
                    </p>
                  ) : null}
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{
              padding: '12px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '0.5rem',
            }}
          >
            {isLoading ? (
              '처리 중...'
            ) : isLoginMode ? (
              <>
                <LogIn size={16} />
                <span>로그인하기</span>
              </>
            ) : isRegisterMode ? (
              <>
                <UserPlus size={16} />
                <span>회원가입 완료</span>
              </>
            ) : (
              <>
                <UserCog size={16} />
                <span>비회원으로 시작</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
