import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useIdentity } from '../store/useIdentity';
import { theme } from '../theme';
import { hapticFeedback } from '../lib/toss';

interface UserAuthStatusProps {
  compact?: boolean;
}

export function UserAuthStatus({ compact = false }: Readonly<UserAuthStatusProps>) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const login = useIdentity((state) => state.login);
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

  // If user is logged in and is a member (not guest)
  if (user && !user.isGuest) {
    if (compact) {
      return (
        <button
          type="button"
          onClick={handleLogout}
          className="pressable"
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
          {user.nickname} (로그아웃)
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
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>
          👤 {user.nickname}님
        </span>
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
    <button
      type="button"
      className="pressable"
      disabled={loading}
      onClick={() => void handleLogin()}
      style={buttonStyle}
    >
      {loading ? '로그인 중…' : '토스로 로그인 🚀'}
    </button>
  );
}
