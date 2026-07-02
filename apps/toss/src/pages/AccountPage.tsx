import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import { theme, pageShell, FONT } from '../theme';
import { AppBar } from '../components/ui';
import { UserAuthStatus } from '../components/UserAuthStatus';
import { useAuthStore } from '../store/useAuthStore';
import { useIdentity } from '../store/useIdentity';
import { hapticFeedback } from '../lib/toss';

const cardStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
  padding: '16px 18px',
  borderRadius: theme.radiusSm,
  border: `1px solid ${theme.border}`,
  background: theme.surface,
};

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        alignItems: 'center',
      }}
    >
      <span style={{ color: theme.textMuted, fontSize: FONT.small }}>{label}</span>
      <span style={{ color: theme.text, fontSize: FONT.bodyLg, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

/**
 * 내 계정 — 웹(/account)과 동일한 프로필 요약 + 계정 정리 화면의 토스 셸 버전.
 * - 토스 로그인 계정(toss-user-…): 로그아웃 + 회원 탈퇴(게시물은 작성자 익명화 후 보존).
 * - 익명 식별 세션(getAnonymousKey): 참여 기록 초기화 제공 — 서버의 익명 프로필을 삭제하고
 *   다음 실행 때 새 익명 세션이 만들어져요. 투표·한마디는 익명 상태로 보존.
 */
export function AccountPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const logout = useAuthStore((state) => state.logout);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const displayName = useIdentity((state) => state.displayName);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  // appLogin으로 확인된 토스 계정만 '로그인 상태'로 취급 — getAnonymousKey 식별 세션(toss-…)은
  // 콘텐츠 귀속용이라 웹의 비회원(게스트)과 같은 결로 안내해요(UserAuthStatus와 동일 기준).
  const isTossAccountUser = Boolean(user?.id.startsWith('toss-user-'));

  const handleLogout = () => {
    hapticFeedback('tap');
    logout();
    navigate('/', { replace: true });
  };

  const handleWithdraw = async () => {
    setError('');
    hapticFeedback('tap');
    const ok = await deleteAccount();
    if (ok) {
      hapticFeedback('success');
      navigate('/', { replace: true });
    } else {
      hapticFeedback('error');
      setError('탈퇴에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  const withdrawTitle = isTossAccountUser ? '회원 탈퇴' : '참여 기록 초기화';

  return (
    <div>
      <AppBar title="내 계정" onBack={() => navigate(-1)} />
      <div style={{ ...pageShell, display: 'grid', gap: 14, paddingBottom: 48 }}>
        <section style={cardStyle} aria-label="프로필">
          <Row label="닉네임" value={user?.nickname || displayName || '이름 없음'} />
          <Row label="유형" value={isTossAccountUser ? '토스 로그인 계정' : '비회원(익명 세션)'} />
          {!isTossAccountUser ? (
            <>
              <p
                style={{
                  margin: 0,
                  color: theme.textMuted,
                  fontSize: FONT.small,
                  lineHeight: 1.6,
                }}
              >
                토스로 로그인하면 어느 기기에서든 같은 계정으로 내 고민·투표를 이어갈 수 있어요.
              </p>
              <UserAuthStatus />
            </>
          ) : (
            <Button
              variant="weak"
              style={{ width: '100%', borderRadius: 14 }}
              onClick={handleLogout}
            >
              로그아웃
            </Button>
          )}
        </section>

        {user ? (
          <section
            style={{ ...cardStyle, border: '1px solid rgba(255, 107, 107, 0.28)' }}
            aria-label={withdrawTitle}
          >
            <h2 style={{ margin: 0, fontSize: FONT.subtitle, fontWeight: 800, color: theme.text }}>
              ⚠️ {withdrawTitle}
            </h2>
            <p style={{ margin: 0, color: theme.textMuted, fontSize: FONT.small, lineHeight: 1.6 }}>
              {isTossAccountUser
                ? '탈퇴하면 계정이 삭제돼요. 내가 만든 고민은 지워지지 않고 작성자 정보만 익명으로 바뀌어 다른 사람들의 투표·한마디는 그대로 보존돼요. 이 작업은 되돌릴 수 없어요.'
                : '초기화하면 이 익명 세션의 계정 정보가 삭제되고, 남긴 투표·한마디는 작성자를 알 수 없는 익명 상태로 보존돼요. 다음에 앱을 열면 새 익명 세션이 만들어져요. 이 작업은 되돌릴 수 없어요.'}
            </p>

            {error ? (
              <p role="alert" style={{ margin: 0, color: theme.danger, fontSize: FONT.small }}>
                {error}
              </p>
            ) : null}

            {confirming ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <p style={{ margin: 0, color: theme.text, fontSize: FONT.body, fontWeight: 700 }}>
                  {isTossAccountUser ? '정말 탈퇴할까요? 😢' : '정말 초기화할까요? 😢'}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="pressable"
                    disabled={isLoading}
                    onClick={() => void handleWithdraw()}
                    style={{
                      flex: 1,
                      minHeight: 48,
                      border: 'none',
                      borderRadius: 14,
                      background: theme.danger,
                      color: '#fff',
                      fontSize: FONT.body,
                      fontWeight: 800,
                      cursor: isLoading ? 'default' : 'pointer',
                      opacity: isLoading ? 0.6 : 1,
                    }}
                  >
                    {(() => {
                      if (isLoading) return '처리 중…';
                      return isTossAccountUser ? '네, 탈퇴할게요' : '네, 초기화할게요';
                    })()}
                  </button>
                  <button
                    type="button"
                    className="pressable"
                    disabled={isLoading}
                    onClick={() => setConfirming(false)}
                    style={{
                      flex: 1,
                      minHeight: 48,
                      borderRadius: 14,
                      border: `1px solid ${theme.borderStrong}`,
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: theme.textMuted,
                      fontSize: FONT.body,
                      fontWeight: 700,
                      cursor: isLoading ? 'default' : 'pointer',
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="pressable"
                onClick={() => setConfirming(true)}
                style={{
                  minHeight: 48,
                  borderRadius: 14,
                  border: '1px solid rgba(255, 107, 107, 0.5)',
                  background: theme.dangerSoft,
                  color: theme.danger,
                  fontSize: FONT.body,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isTossAccountUser ? '회원 탈퇴하기' : '참여 기록 초기화하기'}
              </button>
            )}
          </section>
        ) : null}

        <p
          style={{
            margin: '4px 0 0',
            display: 'flex',
            gap: 14,
            justifyContent: 'center',
            fontSize: FONT.small,
          }}
        >
          <Link to="/legal/terms" style={{ color: theme.textMuted, fontWeight: 700 }}>
            이용약관
          </Link>
          <Link to="/legal/privacy" style={{ color: theme.textMuted, fontWeight: 700 }}>
            개인정보처리방침
          </Link>
        </p>
      </div>
    </div>
  );
}
