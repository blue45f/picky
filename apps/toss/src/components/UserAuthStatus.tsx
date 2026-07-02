import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useIdentity } from '../store/useIdentity';
import { theme } from '../theme';
import { hapticFeedback } from '../lib/toss';

interface UserAuthStatusProps {
  compact?: boolean;
}

export function UserAuthStatus({ compact = false }: Readonly<UserAuthStatusProps>) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const login = useIdentity((state) => state.login);
  const loginError = useIdentity((state) => state.loginError);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    hapticFeedback('tap');
    try {
      const ok = await login();
      if (ok) {
        hapticFeedback('success');
      } else {
        hapticFeedback('error');
      }
    } catch {
      hapticFeedback('error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    hapticFeedback('tap');
    logout();
  };

  // getAnonymousKey 식별 계정(toss-...)은 콘텐츠 귀속용 세션일 뿐 토스 로그인 계정이 아니다.
  // appLogin → login-me로 확인된 계정만 toss-user-... 형식이므로 로그인 UI도 그때만 표시한다.
  const isTossAccountUser = Boolean(user?.id.startsWith('toss-user-'));

  const goToAccount = () => {
    hapticFeedback('tickWeak');
    navigate('/account');
  };

  if (user && isTossAccountUser) {
    if (compact) {
      return (
        <button
          type="button"
          onClick={goToAccount}
          className="pressable"
          aria-label={`${user.nickname}님 — 내 계정 관리`}
          style={{
            padding: '6px 10px',
            borderRadius: 12,
            border: `1px solid ${theme.borderStrong}`,
            background: 'rgba(255, 255, 255, 0.04)',
            color: theme.textMuted,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          👤 {user.nickname}님
        </button>
      );
    }

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(255, 255, 255, 0.02)',
          border: `1px solid ${theme.border}`,
          padding: '6px 12px',
          borderRadius: 14,
        }}
      >
        <button
          type="button"
          onClick={goToAccount}
          className="pressable"
          aria-label={`${user.nickname}님 — 내 계정 관리`}
          style={{
            border: 'none',
            background: 'none',
            padding: 0,
            fontSize: 13,
            fontWeight: 700,
            color: theme.text,
            cursor: 'pointer',
          }}
        >
          👤 {user.nickname}님
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="pressable"
          style={{
            padding: '4px 8px',
            borderRadius: 8,
            border: `1px solid ${theme.borderStrong}`,
            background: 'none',
            color: theme.textMuted,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          로그아웃
        </button>
      </div>
    );
  }

  // If not logged in or is guest
  const buttonStyle: React.CSSProperties = compact
    ? {
        padding: '6px 12px',
        borderRadius: 12,
        border: `1px solid ${theme.accent}`,
        background: theme.accentSoft,
        color: theme.accent,
        fontSize: 12,
        fontWeight: 700,
        cursor: loading ? 'default' : 'pointer',
        opacity: loading ? 0.7 : 1,
      }
    : {
        padding: '7px 14px',
        borderRadius: 14,
        border: `1px solid ${theme.accent}`,
        background: theme.accentSoft,
        color: theme.accent,
        fontSize: 13,
        fontWeight: 700,
        cursor: loading ? 'default' : 'pointer',
        opacity: loading ? 0.7 : 1,
        boxShadow: '0 4px 12px rgba(19, 194, 163, 0.1)',
      };

  return (
    <div>
      <button
        type="button"
        className="pressable"
        disabled={loading}
        onClick={() => void handleLogin()}
        style={buttonStyle}
      >
        {loading ? '로그인 중…' : '토스로 로그인 🚀'}
      </button>
      {loginError ? (
        <p role="alert" style={{ margin: '6px 0 0', color: theme.danger, fontSize: 11 }}>
          {loginError}
        </p>
      ) : null}
    </div>
  );
}
