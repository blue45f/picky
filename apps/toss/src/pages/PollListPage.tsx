import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Top } from '@toss/tds-mobile';
import type { Poll } from '@picky/shared';
import { usePollStore } from '../store/usePollStore';
import { theme, pageShell } from '../theme';

const formatRelative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return '';
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  return `${Math.floor(hour / 24)}일 전`;
};

const isClosed = (poll: Poll): boolean =>
  Boolean(poll.endsAt) && Date.now() >= new Date(poll.endsAt as string).getTime();

function PollCard({ poll, onClick }: { poll: Poll; onClick: () => void }) {
  const leading = [...poll.options].sort((a, b) => b.voteCount - a.voteCount)[0];
  const closed = isClosed(poll);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        padding: 18,
        marginBottom: 12,
        color: theme.text,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: closed ? theme.textMuted : theme.accent,
            background: closed ? 'rgba(255,255,255,0.06)' : theme.accentSoft,
            padding: '3px 8px',
            borderRadius: 999,
          }}
        >
          {closed ? '마감' : '진행중'}
        </span>
        <span style={{ fontSize: 12, color: theme.textMuted, alignSelf: 'center' }}>
          {formatRelative(poll.createdAt)}
        </span>
      </div>
      <strong style={{ fontSize: 16, lineHeight: 1.4, display: 'block' }}>{poll.question}</strong>
      {poll.description ? (
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 13,
            color: theme.textMuted,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {poll.description}
        </p>
      ) : null}
      {leading ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: theme.text }}>{leading.text}</span>
            <span style={{ color: theme.accent, fontWeight: 700 }}>
              {poll.totalVotes > 0 ? Math.round((leading.voteCount / poll.totalVotes) * 100) : 0}%
            </span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.08)',
              marginTop: 6,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${poll.totalVotes > 0 ? (leading.voteCount / poll.totalVotes) * 100 : 0}%`,
                background: theme.accent,
              }}
            />
          </div>
        </div>
      ) : null}
      <div
        style={{ marginTop: 12, fontSize: 12, color: theme.textMuted, display: 'flex', gap: 12 }}
      >
        <span>🗳️ {poll.totalVotes}표</span>
        <span>💬 의견 {poll.comments.length}개</span>
        <span>· 선택지 {poll.options.length}개</span>
      </div>
    </button>
  );
}

export function PollListPage() {
  const navigate = useNavigate();
  const { polls, isLoading, error, fetchPolls } = usePollStore();

  useEffect(() => {
    void fetchPolls();
  }, [fetchPolls]);

  return (
    <div style={{ background: theme.bg, minHeight: '100dvh' }}>
      <Top
        title={<Top.TitleParagraph size={22}>픽플로우</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>고민을 투표로 빠르게 결정</Top.SubtitleParagraph>
        }
      />

      <div style={pageShell}>
        {isLoading && polls.length === 0 ? (
          <p style={{ color: theme.textMuted, textAlign: 'center', padding: '40px 0' }}>
            고민을 불러오는 중…
          </p>
        ) : null}

        {error && polls.length === 0 ? (
          <p style={{ color: theme.danger, textAlign: 'center', padding: '24px 0' }}>{error}</p>
        ) : null}

        {!isLoading && polls.length === 0 && !error ? (
          <div style={{ textAlign: 'center', padding: '56px 0', color: theme.textMuted }}>
            <p style={{ fontSize: 15 }}>아직 등록된 고민이 없어요.</p>
            <p style={{ fontSize: 13 }}>첫 번째 고민을 투표로 만들어 보세요!</p>
          </div>
        ) : null}

        {polls.map((poll) => (
          <PollCard key={poll.id} poll={poll} onClick={() => navigate(`/poll/${poll.id}`)} />
        ))}
      </div>

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '12px 20px calc(12px + env(safe-area-inset-bottom))',
          background: `linear-gradient(to top, ${theme.bg} 70%, transparent)`,
        }}
      >
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <Button style={{ width: '100%' }} onClick={() => navigate('/create')}>
            새 고민 만들기
          </Button>
        </div>
      </div>
    </div>
  );
}
