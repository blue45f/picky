import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import type { Poll } from '@picky/shared';
import { usePollStore } from '../store/usePollStore';
import { useIdentity } from '../store/useIdentity';
import { rememberRecentPoll } from '../lib/pollHistory';
import { resolvePollShareUrl, sharePoll, copyText } from '../lib/pollShare';
import { theme } from '../theme';

const votedStorageKey = (id: string) => `pickflow_voted_${id}`;

const readVotedOption = (id: string): number | null => {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(votedStorageKey(id));
  const parsed = raw == null ? NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const isClosed = (poll: Poll | null): boolean =>
  Boolean(poll?.endsAt) && Date.now() >= new Date(poll!.endsAt as string).getTime();

export function PollDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { currentPoll, isLoading, error, fetchPoll, vote } = usePollStore();
  const { displayName, setDisplayName } = useIdentity();

  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [voterName, setVoterName] = useState(displayName);
  const [votedOptionId, setVotedOptionId] = useState<number | null>(() => readVotedOption(id));
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void fetchPoll(id);
  }, [id, fetchPoll]);

  useEffect(() => {
    if (currentPoll && currentPoll.id === id) {
      rememberRecentPoll(currentPoll, { hasVoted: votedOptionId != null });
    }
  }, [currentPoll, id, votedOptionId]);

  const poll = currentPoll && currentPoll.id === id ? currentPoll : null;
  const closed = isClosed(poll);
  const hasVoted = votedOptionId != null;
  const showResults = useMemo(
    () => hasVoted || closed || poll?.resultsVisibility === 'always',
    [hasVoted, closed, poll?.resultsVisibility],
  );

  const handleVote = async () => {
    if (poll == null || selectedOptionId == null) return;
    const trimmedName = voterName.trim();
    if (trimmedName) {
      setDisplayName(trimmedName);
    }
    const ok = await vote(poll.id, {
      optionId: selectedOptionId,
      voterName: trimmedName || null,
      comment: comment.trim() || null,
    });
    if (ok) {
      localStorage.setItem(votedStorageKey(poll.id), String(selectedOptionId));
      setVotedOptionId(selectedOptionId);
      setComment('');
      setToast('투표가 완료됐어요!');
    }
  };

  const handleShare = async () => {
    if (!poll) return;
    const result = await sharePoll(poll);
    if (result === 'clipboard') setToast('링크를 복사했어요.');
    else if (result == null) setToast('공유를 취소했어요.');
  };

  const handleCopy = async () => {
    if (!poll) return;
    const ok = await copyText(resolvePollShareUrl(poll));
    setToast(ok ? '링크를 복사했어요.' : '복사에 실패했어요.');
  };

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (isLoading && !poll) {
    return <CenterMessage>고민을 불러오는 중…</CenterMessage>;
  }
  if (!poll) {
    return (
      <CenterMessage>
        {error ?? '고민을 찾을 수 없어요.'}
        <Button style={{ marginTop: 16 }} variant="weak" onClick={() => navigate('/')}>
          목록으로
        </Button>
      </CenterMessage>
    );
  }

  return (
    <div style={{ background: theme.bg, minHeight: '100dvh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          paddingTop: 'calc(14px + env(safe-area-inset-top))',
        }}
      >
        <button
          type="button"
          aria-label="뒤로"
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: theme.text, fontSize: 22 }}
        >
          ←
        </button>
        <span
          style={{ fontSize: 13, color: closed ? theme.textMuted : theme.accent, fontWeight: 700 }}
        >
          {closed ? '마감된 투표' : '진행중'}
        </span>
      </header>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px 140px' }}>
        <h1 style={{ fontSize: 22, lineHeight: 1.4, margin: '4px 0 8px' }}>{poll.question}</h1>
        {poll.description ? (
          <p style={{ color: theme.textMuted, fontSize: 14, lineHeight: 1.6 }}>
            {poll.description}
          </p>
        ) : null}
        <p style={{ color: theme.textMuted, fontSize: 13, marginTop: 8 }}>총 {poll.totalVotes}표</p>

        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {poll.options.map((option) => {
            const percent =
              poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
            const selected = selectedOptionId === option.id;
            const isMine = votedOptionId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={hasVoted || closed}
                onClick={() => setSelectedOptionId(option.id)}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  textAlign: 'left',
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: `1.5px solid ${selected || isMine ? theme.accent : theme.border}`,
                  background: theme.surface,
                  color: theme.text,
                  cursor: hasVoted || closed ? 'default' : 'pointer',
                }}
              >
                {showResults ? (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: `${percent}%`,
                      background: isMine ? theme.accentSoft : 'rgba(255,255,255,0.05)',
                    }}
                  />
                ) : null}
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    {isMine ? '✓ ' : ''}
                    {option.text}
                  </span>
                  {showResults ? (
                    <span style={{ color: theme.accent, fontWeight: 700 }}>
                      {percent}% · {option.voteCount}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {!hasVoted && !closed ? (
          <div style={{ marginTop: 16 }}>
            <input
              style={{
                width: '100%',
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                color: theme.text,
                padding: '12px 14px',
                fontSize: 14,
                marginBottom: 8,
              }}
              value={voterName}
              maxLength={20}
              placeholder="닉네임 (선택)"
              onChange={(e) => setVoterName(e.target.value)}
            />
            <input
              style={{
                width: '100%',
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                color: theme.text,
                padding: '12px 14px',
                fontSize: 14,
              }}
              value={comment}
              maxLength={100}
              placeholder="한마디 의견 (선택)"
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        ) : null}

        {poll.comments.length > 0 ? (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 15, marginBottom: 12 }}>의견 {poll.comments.length}개</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {poll.comments.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: theme.surface,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 12,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, fontSize: 12, color: theme.textMuted }}>
                    <strong style={{ color: theme.text }}>{c.voterName}</strong>
                    {c.selectedOptionText ? <span>· {c.selectedOptionText}</span> : null}
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 14 }}>{c.comment}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          <Button style={{ flex: 1 }} variant="weak" onClick={handleShare}>
            공유하기
          </Button>
          <Button style={{ flex: 1 }} variant="weak" onClick={handleCopy}>
            링크 복사
          </Button>
        </div>
      </div>

      {!hasVoted && !closed ? (
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
            <Button
              style={{ width: '100%' }}
              loading={isLoading}
              disabled={selectedOptionId == null}
              onClick={handleVote}
            >
              투표하기
            </Button>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 'calc(96px + env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.82)',
            color: theme.text,
            padding: '10px 18px',
            borderRadius: 999,
            fontSize: 14,
          }}
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
        color: theme.textMuted,
        background: theme.bg,
      }}
    >
      {children}
    </div>
  );
}
