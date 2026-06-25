import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { UserRound, TriangleAlert } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

/**
 * 내 계정 — 프로필 요약 + 계정 정리.
 * 회원 탈퇴 시 내가 만든 고민은 작성자 정보만 익명화되어 보존된다.
 * 비회원(게스트)은 폴 작성 권한이 없으므로 '비회원 세션 종료'로 표기하고, 남긴 투표·한마디는 보존된다.
 */
export default function Account() {
  const navigate = useNavigate();
  const { user, deleteAccount, isLoading } = useAuthStore();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  const handleWithdraw = async () => {
    setError('');
    const ok = await deleteAccount();
    if (ok) {
      navigate('/', { replace: true });
    } else {
      setError('탈퇴에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 900,
          color: 'var(--text-primary)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 9,
          marginBottom: '1.25rem',
        }}
      >
        <UserRound size={22} /> 내 계정
      </h1>

      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--bg-card-border)',
          borderRadius: 16,
          padding: '1.1rem 1.25rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'grid', gap: '0.7rem' }}>
          <Row label="닉네임" value={user.nickname || '이름 없음'} />
          {user.isGuest ? (
            <Row label="유형" value="비회원(게스트) 계정" />
          ) : (
            <Row label="이메일" value={user.email} />
          )}
          {user.isAdmin ? <Row label="권한" value="관리자" /> : null}
        </div>
      </section>

      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(255, 107, 107, 0.28)',
          borderRadius: 16,
          padding: '1.1rem 1.25rem',
        }}
      >
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            margin: '0 0 0.5rem',
          }}
        >
          <TriangleAlert size={17} style={{ color: 'var(--brand-accent-gold)' }} />{' '}
          {user.isGuest ? '비회원 세션 종료' : '회원 탈퇴'}
        </h2>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.86rem',
            lineHeight: 1.6,
            margin: '0 0 1rem',
          }}
        >
          {user.isGuest ? (
            <>
              비회원(게스트) 세션을 종료하면 이 기기의 닉네임 세션이 삭제돼요. 그동안 남긴 투표와
              한마디는 그대로 보존됩니다. 이 작업은 되돌릴 수 없어요.
            </>
          ) : (
            <>
              탈퇴하면 계정이 삭제돼요. 내가 만든 고민은 지워지지 않고{' '}
              <strong>작성자 정보만 익명</strong>으로 바뀌어 다른 사람들의 투표·한마디는 그대로
              보존돼요. 이 작업은 되돌릴 수 없어요.
            </>
          )}
        </p>

        {error ? (
          <p
            style={{
              color: 'var(--brand-danger, #ff6b6b)',
              fontSize: '0.82rem',
              marginBottom: '0.8rem',
            }}
          >
            {error}
          </p>
        ) : null}

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            style={{
              border: '1px solid rgba(255, 107, 107, 0.5)',
              background: 'rgba(255, 107, 107, 0.08)',
              color: '#ff6b6b',
              borderRadius: 10,
              padding: '10px 16px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {user.isGuest ? '비회원 세션 종료하기' : '회원 탈퇴하기'}
          </button>
        ) : (
          <div style={{ display: 'grid', gap: '0.7rem' }}>
            <p
              style={{
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                fontWeight: 700,
                margin: 0,
              }}
            >
              {user.isGuest ? '정말 세션을 종료할까요? 😢' : '정말 탈퇴할까요? 😢'}
            </p>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={isLoading}
                style={{
                  border: 'none',
                  background: '#ff6b6b',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '10px 18px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: isLoading ? 'default' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? '처리 중…' : user.isGuest ? '네, 종료할게요' : '네, 탈퇴할게요'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={isLoading}
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '0.85rem' }}
              >
                취소
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '1rem',
        alignItems: 'center',
      }}
    >
      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 700 }}>
        {value}
      </span>
    </div>
  );
}
