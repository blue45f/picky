import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import type { PollOption } from '../shared';
import { usePollStore } from '../store/usePollStore';
import { useIdentity } from '../store/useIdentity';
import { rememberRecentPoll } from '../lib/pollHistory';
import { resolvePollShareUrl, sharePoll, copyText } from '../lib/pollShare';
import { formatNumber } from '../lib/format';
import { isPollClosed, optionPercent, optionsByVotes } from '../lib/poll';
import { getVotedOptionId, rememberVote } from '../lib/votes';
import { hapticFeedback, requestAppReview } from '../lib/toss';
import { theme, stickyActionBar } from '../theme';
import { Chip, ProgressBar } from '../components/ui';
import { CountdownChip, useCountdown } from '../components/Countdown';
import { Toast, useToast } from '../components/Toast';

const REVIEW_ASKED_KEY = 'pickflow_review_asked';

const maybeRequestReview = () => {
  if (typeof localStorage === 'undefined' || localStorage.getItem(REVIEW_ASKED_KEY)) {
    return;
  }
  localStorage.setItem(REVIEW_ASKED_KEY, '1');
  window.setTimeout(() => {
    void requestAppReview();
  }, 1200);
};

export function PollDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { currentPoll, isLoading, error, fetchPoll, vote } = usePollStore();
  const { displayName, setDisplayName } = useIdentity();
  const { toast, showToast } = useToast();

  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [voterName, setVoterName] = useState(displayName);
  const [votedOptionId, setVotedOptionId] = useState<number | null>(() => getVotedOptionId(id));

  useEffect(() => {
    void fetchPoll(id);
  }, [id, fetchPoll]);

  // /poll/:id 라우트는 id만 바뀔 때 컴포넌트를 리마운트하지 않으므로,
  // id 변경 시 투표 상태/선택을 명시적으로 재동기화해요.
  useEffect(() => {
    setVotedOptionId(getVotedOptionId(id));
    setSelectedOptionId(null);
    setComment('');
  }, [id]);

  const poll = currentPoll && currentPoll.id === id ? currentPoll : null;
  // 부모에서 카운트다운을 틱하게 해, 마감 순간 상태 배지·투표바·옵션 비활성이 함께 전환되도록 해요.
  const remaining = useCountdown(poll?.endsAt);
  const closed = isPollClosed(poll) || (remaining != null && remaining <= 0);
  const hasVoted = votedOptionId != null;
  const showResults = useMemo(
    () => hasVoted || closed || poll?.resultsVisibility === 'always',
    [hasVoted, closed, poll?.resultsVisibility],
  );

  useEffect(() => {
    if (poll && poll.id === id) {
      rememberRecentPoll(poll, { hasVoted: votedOptionId != null });
    }
  }, [poll, id, votedOptionId]);

  const displayOptions = useMemo<PollOption[]>(
    () => (poll ? (showResults ? optionsByVotes(poll) : poll.options) : []),
    [poll, showResults],
  );
  const winnerId = useMemo(() => {
    if (!poll || !showResults || poll.totalVotes === 0) return null;
    const top = optionsByVotes(poll)[0];
    return top && top.voteCount > 0 ? top.id : null;
  }, [poll, showResults]);

  const handleSelect = (optionId: number) => {
    if (hasVoted || closed) return;
    hapticFeedback('tickWeak');
    setSelectedOptionId(optionId);
  };

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
      rememberVote(poll.id, selectedOptionId);
      setVotedOptionId(selectedOptionId);
      setComment('');
      hapticFeedback('success');
      window.setTimeout(() => hapticFeedback('confetti'), 90);
      showToast('투표가 완료됐어요! 🎉');
      maybeRequestReview();
    } else {
      hapticFeedback('error');
    }
  };

  const handleShare = async () => {
    if (!poll) return;
    hapticFeedback('tap');
    const result = await sharePoll(poll);
    if (result === 'clipboard') showToast('링크를 복사했어요.');
    else if (result == null) showToast('공유를 취소했어요.');
  };

  const handleCopy = async () => {
    if (!poll) return;
    const ok = await copyText(resolvePollShareUrl(poll));
    hapticFeedback(ok ? 'tap' : 'error');
    showToast(ok ? '링크를 복사했어요.' : '복사에 실패했어요.');
  };

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
          gap: 10,
          padding: '12px 14px',
          paddingTop: 'calc(12px + env(safe-area-inset-top))',
        }}
      >
        <button
          type="button"
          className="pressable"
          aria-label="뒤로"
          onClick={() => navigate('/')}
          style={{
            flexShrink: 0,
            width: 40,
            height: 40,
            display: 'grid',
            placeItems: 'center',
            background: 'none',
            border: 'none',
            color: theme.text,
            fontSize: 24,
            cursor: 'pointer',
          }}
        >
          ←
        </button>
        <Chip tone={closed ? 'muted' : 'accent'}>{closed ? '마감된 투표' : '진행중'}</Chip>
        {!closed ? <CountdownChip remaining={remaining} /> : null}
      </header>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px 140px' }}>
        <h1 style={{ fontSize: 22, lineHeight: 1.4, margin: '4px 0 8px' }}>{poll.question}</h1>
        {poll.description ? (
          <p style={{ color: theme.textMuted, fontSize: 14, lineHeight: 1.6 }}>
            {poll.description}
          </p>
        ) : null}
        <p style={{ color: theme.textMuted, fontSize: 13, marginTop: 8 }}>
          총 {formatNumber(poll.totalVotes)}표 · 선택지 {poll.options.length}개
        </p>

        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayOptions.map((option) => {
            const percent = optionPercent(option.voteCount, poll.totalVotes);
            const selected = selectedOptionId === option.id;
            const isMine = votedOptionId === option.id;
            const isWinner = winnerId === option.id;
            const highlight = selected || isMine || isWinner;
            return (
              <button
                key={option.id}
                type="button"
                disabled={hasVoted || closed}
                aria-pressed={selected}
                className="pressable"
                onClick={() => handleSelect(option.id)}
                style={{
                  textAlign: 'left',
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: `1.5px solid ${highlight ? theme.accent : theme.border}`,
                  background: isMine || isWinner ? theme.accentSoft : theme.surface,
                  color: theme.text,
                  cursor: hasVoted || closed ? 'default' : 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 600, minWidth: 0 }}>
                    {isMine ? '✓ ' : ''}
                    {isWinner ? '👑 ' : ''}
                    {option.text}
                  </span>
                  {showResults ? (
                    <span style={{ color: theme.accent, fontWeight: 700, flexShrink: 0 }}>
                      {percent}% · {formatNumber(option.voteCount)}
                    </span>
                  ) : null}
                </div>
                {showResults ? (
                  <div style={{ marginTop: 10 }}>
                    <ProgressBar percent={percent} tone={isWinner ? 'gold' : 'accent'} height={6} />
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>

        {!hasVoted && !closed ? (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              style={inputStyle}
              value={voterName}
              maxLength={20}
              placeholder="닉네임 (선택)"
              aria-label="닉네임"
              onChange={(e) => setVoterName(e.target.value)}
            />
            <input
              style={inputStyle}
              value={comment}
              maxLength={100}
              placeholder="한마디 의견 (선택)"
              aria-label="의견"
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        ) : null}

        {poll.comments.length > 0 ? (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 15, marginBottom: 12 }}>
              의견 {formatNumber(poll.comments.length)}개
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {poll.comments.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: theme.surface,
                    border: `1px solid ${theme.border}`,
                    borderRadius: theme.radiusSm,
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      fontSize: 12,
                      color: theme.textMuted,
                      alignItems: 'center',
                    }}
                  >
                    <strong style={{ color: theme.text }}>{c.voterName}</strong>
                    {c.selectedOptionText ? <Chip tone="muted">{c.selectedOptionText}</Chip> : null}
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.5 }}>{c.comment}</p>
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
        <div style={stickyActionBar}>
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <Button
              style={{ width: '100%' }}
              loading={isLoading}
              disabled={selectedOptionId == null}
              onClick={handleVote}
            >
              {selectedOptionId == null ? '선택지를 골라주세요' : '투표하기'}
            </Button>
          </div>
        </div>
      ) : null}

      <Toast message={toast} />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: theme.radiusSm,
  color: theme.text,
  padding: '12px 14px',
  fontSize: 14,
  outline: 'none',
};

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
