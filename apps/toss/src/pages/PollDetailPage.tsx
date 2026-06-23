import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import type { PollComment, PollOption } from '../shared';
import { usePollStore } from '../store/usePollStore';
import { useAuthStore } from '../store/useAuthStore';
import { useIdentity } from '../store/useIdentity';
import { rememberRecentPoll } from '../lib/pollHistory';
import { buildPollResultText, resolvePollShareUrl, sharePoll, copyText } from '../lib/pollShare';
import { formatNumber } from '../lib/format';
import { isPollClosed, leadingOption, optionPercent, optionsByVotes } from '../lib/poll';
import { getVotedOptionId, rememberVote } from '../lib/votes';
import { hapticFeedback, requestAppReview } from '../lib/toss';
import { theme, stickyActionBar } from '../theme';
import { AppBar, Chip, ProgressBar } from '../components/ui';
import { CountdownChip, useCountdown } from '../components/Countdown';
import { Toast, useToast } from '../components/Toast';
import { triggerParticleBurst } from '../lib/particles';

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
  const { currentPoll, isLoading, error, fetchPoll, vote, deletePoll } = usePollStore();
  const { displayName, setDisplayName } = useIdentity();
  const myId = useAuthStore((state) => state.user?.id ?? null);
  const { toast, showToast } = useToast();

  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [voterName, setVoterName] = useState(displayName);
  const [votedOptionId, setVotedOptionId] = useState<number | null>(() => getVotedOptionId(id));
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    void fetchPoll(id);
  }, [id, fetchPoll]);

  useEffect(() => {
    setVotedOptionId(getVotedOptionId(id));
    setSelectedOptionId(null);
    setComment('');
    setConfirmDelete(false);
  }, [id]);

  const poll = currentPoll && currentPoll.id === id ? currentPoll : null;
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
  const leader = poll && showResults && poll.totalVotes > 0 ? leadingOption(poll) : null;
  const isOwner = Boolean(poll && myId && poll.creatorId === myId);

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

      // 하단 투표 버튼 위치 근처에서 꽃가루 뿜어져 나오는 극적인 연출
      triggerParticleBurst(window.innerWidth / 2, window.innerHeight - 80, {
        count: 45,
        charSet: ['🥑', '✨', '✦', '🌟', '💖', '🎉', '💚', '💛', '🌸'],
        speedMultiplier: 1.4,
      });

      showToast('투표 성공! 소중한 생각 고마워요 💖');
      maybeRequestReview();
    } else {
      hapticFeedback('error');
    }
  };

  const handleShare = async () => {
    if (!poll) return;
    hapticFeedback('tap');
    const result = await sharePoll(poll);
    if (result === 'clipboard') showToast('링크를 클립보드에 담았어요 📋');
    else if (result == null) showToast('공유를 취소했어요 🥺');
  };

  const handleCopy = async () => {
    if (!poll) return;
    const ok = await copyText(resolvePollShareUrl(poll));
    hapticFeedback(ok ? 'tap' : 'error');
    showToast(ok ? '링크를 복사했어요 📋' : '복사에 실패했어요 😢');
  };

  const handleCopyResult = async () => {
    if (!poll) return;
    const ok = await copyText(buildPollResultText(poll));
    hapticFeedback(ok ? 'tap' : 'error');
    showToast(ok ? '투표 결과를 복사했어요 📊' : '복사에 실패했어요 😢');
  };

  const handleDelete = async () => {
    if (!poll) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      hapticFeedback('tickWeak');
      window.setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    const ok = await deletePoll(poll.id);
    if (ok) {
      hapticFeedback('success');
      navigate('/', { replace: true });
    } else {
      hapticFeedback('error');
      setConfirmDelete(false);
      showToast('삭제하지 못했어요 😢');
    }
  };

  if (isLoading && !poll) {
    return <CenterMessage>고민을 열심히 가져오고 있어요... 🥑</CenterMessage>;
  }
  if (!poll) {
    return (
      <CenterMessage>
        {error ?? '앗, 고민을 찾을 수 없어요 🥺'}
        <Button style={{ marginTop: 16 }} variant="weak" onClick={() => navigate('/')}>
          목록으로 돌아가기 🔙
        </Button>
      </CenterMessage>
    );
  }

  const rightAction = isOwner ? (
    <button
      type="button"
      className="pressable"
      onClick={handleDelete}
      style={{
        background: 'none',
        border: 'none',
        color: confirmDelete ? theme.danger : (theme.textFaint ?? theme.textMuted),
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        padding: '8px 12px',
        borderRadius: theme.radiusSm,
        backgroundColor: confirmDelete ? theme.dangerSoft : 'transparent',
        transition: 'all 0.2s ease',
      }}
    >
      {confirmDelete ? '진짜 지울까요? 🥺' : '지우기 🗑'}
    </button>
  ) : null;

  return (
    <div style={{ minHeight: '100dvh' }}>
      <AppBar
        onBack={() => navigate('/')}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Chip tone={closed ? 'muted' : 'accent'}>{closed ? '마감됨 ⏰' : '투표중 🔥'}</Chip>
            {!closed ? <CountdownChip remaining={remaining} /> : null}
          </div>
        }
        right={rightAction}
      />

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px 140px' }}>
        <h1 style={{ fontSize: 22, lineHeight: 1.4, margin: '12px 0 8px', fontWeight: 800 }}>
          {poll.question}
        </h1>
        {poll.description ? (
          <p
            style={{
              color: theme.textMuted,
              fontSize: 14,
              lineHeight: 1.6,
              margin: '8px 0',
              opacity: 0.9,
            }}
          >
            {poll.description}
          </p>
        ) : null}
        <p style={{ color: theme.textFaint, fontSize: 13, marginTop: 8 }}>
          벌써 {formatNumber(poll.totalVotes)}명이 함께 고민하고 있어요! 🌟
        </p>
        {leader ? (
          <p style={{ color: theme.accent, fontSize: 13, fontWeight: 700, marginTop: 6 }}>
            👑 가장 많은 선택 · {leader.text} ({optionPercent(leader.voteCount, poll.totalVotes)}%)
          </p>
        ) : null}

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayOptions.map((option) => {
            const percent = optionPercent(option.voteCount, poll.totalVotes);
            const selected = selectedOptionId === option.id;
            const isMine = votedOptionId === option.id;
            const isWinner = winnerId === option.id;
            const highlight = selected || isMine || isWinner;

            // 임팩트: 1등 우승자 카드에는 골드 빛 테두리 + 그림자, 활성 선택지는 에메랄드 테두리 + 그림자 적용
            const cardBorderColor = isWinner
              ? 'rgba(244, 197, 96, 0.4)'
              : highlight
                ? 'rgba(19, 194, 163, 0.4)'
                : 'rgba(255, 255, 255, 0.05)';
            const cardBoxShadow = isWinner
              ? '0 8px 24px rgba(244, 197, 96, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
              : highlight
                ? '0 8px 20px rgba(19, 194, 163, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                : '0 4px 16px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.02)';

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
                  padding: '18px 20px',
                  borderRadius: theme.radius,
                  border: `1.5px solid ${cardBorderColor}`,
                  boxShadow: cardBoxShadow,
                  background: isMine || isWinner ? theme.accentSoft : theme.surface,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  color: theme.text,
                  cursor: hasVoted || closed ? 'default' : 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.25s ease',
                }}
              >
                {option.imageUrl ? (
                  <img
                    src={option.imageUrl}
                    alt=""
                    loading="lazy"
                    style={{
                      width: '100%',
                      maxHeight: 180,
                      objectFit: 'cover',
                      borderRadius: theme.radiusSm,
                      marginBottom: 12,
                      border: `1px solid rgba(255,255,255,0.06)`,
                    }}
                  />
                ) : null}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 700, minWidth: 0, fontSize: 16 }}>
                    {isMine ? '✓ ' : ''}
                    {isWinner ? '👑 ' : ''}
                    {option.text}
                  </span>
                  {showResults ? (
                    <span
                      style={{
                        color: isWinner ? theme.gold : theme.accent,
                        fontWeight: 800,
                        flexShrink: 0,
                        fontSize: 15,
                      }}
                    >
                      {percent}% · {formatNumber(option.voteCount)}표
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

        {!hasVoted && !closed && (
          <div
            className="disclosure-enter"
            style={{
              maxHeight: selectedOptionId !== null ? 220 : 0,
              opacity: selectedOptionId !== null ? 1 : 0,
              overflow: 'hidden',
              marginTop: selectedOptionId !== null ? 24 : 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: theme.accent, marginBottom: 4 }}>
              💬 내 생각을 한마디 덧붙여 볼까요?
            </div>
            <input
              style={inputStyle}
              value={voterName}
              maxLength={20}
              placeholder="내 이름이나 별명 (선택)"
              aria-label="닉네임"
              onChange={(e) => setVoterName(e.target.value)}
            />
            <input
              style={inputStyle}
              value={comment}
              maxLength={100}
              placeholder="재미있는 한마디도 같이 남겨요 (선택)"
              aria-label="의견"
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        )}

        {poll.comments.length > 0 ? (
          <section style={{ marginTop: 36 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: theme.textMuted, marginBottom: 12 }}>
              의견 {formatNumber(poll.comments.length)}개 💬
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {poll.comments.map((c: PollComment) => (
                <div
                  key={c.id}
                  style={{
                    background: theme.surface,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: theme.radiusSm,
                    padding: '12px 16px',
                    border: `1px solid ${theme.border}`,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 11,
                      color: theme.textFaint,
                    }}
                  >
                    <strong style={{ color: theme.textMuted }}>{c.voterName}</strong>
                    {c.selectedOptionText ? (
                      <span style={{ color: theme.accent, fontWeight: 600 }}>
                        {c.selectedOptionText} 콕! 찝음
                      </span>
                    ) : null}
                  </div>
                  <p
                    style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.5, color: theme.text }}
                  >
                    {c.comment}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div
          style={{
            marginTop: 32,
            padding: 18,
            background: theme.surface,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: theme.radius,
            border: `1px solid ${theme.border}`,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted }}>
            친구들의 생각도 물어볼까요? 🌈
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="pressable"
              onClick={handleShare}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 12,
                background: theme.accent,
                color: theme.accentInk,
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              🔗 친구에게 물어보기
            </button>
            <button
              type="button"
              className="pressable"
              onClick={handleCopy}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.06)',
                color: theme.text,
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              링크 복사 📋
            </button>
          </div>
          {showResults && (
            <button
              type="button"
              className="pressable"
              onClick={handleCopyResult}
              style={{
                width: '100%',
                height: 40,
                borderRadius: 12,
                background: 'transparent',
                color: theme.accent,
                fontWeight: 600,
                fontSize: 13,
                border: `1.5px solid ${theme.accentSoft}`,
                cursor: 'pointer',
              }}
            >
              📊 결과 글자로 복사하기
            </button>
          )}
        </div>
      </div>

      {!hasVoted && !closed && (
        <div style={stickyActionBar}>
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <Button
              style={{
                width: '100%',
                borderRadius: 16,
                boxShadow: '0 8px 24px rgba(19, 194, 163, 0.25)',
              }}
              loading={isLoading}
              disabled={selectedOptionId == null}
              onClick={handleVote}
            >
              {selectedOptionId == null
                ? '마음에 드는 선택지를 골라주세요 👇'
                : '투표 완료하기! 🗳️'}
            </Button>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.02)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: `1px solid ${theme.border}`,
  borderRadius: 12,
  color: theme.text,
  padding: '12px 14px',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s ease',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
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
