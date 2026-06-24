import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import type { PollOption } from '../shared';
import { MASCOT, VOICE } from '../shared';
import { usePollStore } from '../store/usePollStore';
import { useAuthStore } from '../store/useAuthStore';
import { useIdentity } from '../store/useIdentity';
import { rememberRecentPoll } from '../lib/pollHistory';
import { buildPollResultText, resolvePollShareUrl, sharePoll, copyText } from '../lib/pollShare';
import { isPollClosed, leadingOption, optionsByVotes } from '../lib/poll';
import { getVotedOptionId, rememberVote } from '../lib/votes';
import { hapticFeedback, requestAppReview } from '../lib/toss';
import { theme } from '../theme';
import { useCountdown } from '../components/Countdown';
import { useToast } from '../components/Toast';
import { triggerParticleBurst } from '../lib/particles';
import { PollDetailView } from './PollDetailView';

const REVIEW_ASKED_KEY = 'picky_review_asked';

const maybeRequestReview = () => {
  if (typeof localStorage === 'undefined' || localStorage.getItem(REVIEW_ASKED_KEY)) {
    return;
  }
  localStorage.setItem(REVIEW_ASKED_KEY, '1');
  globalThis.setTimeout(() => {
    requestAppReview().catch(() => {});
  }, 1200);
};

export function PollDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlCode = searchParams.get('code') ?? undefined;
  const { currentPoll, isLoading, error, fetchPoll, vote, deletePoll, deleteComment } =
    usePollStore();
  const { displayName, setDisplayName } = useIdentity();
  const myId = useAuthStore((state) => state.user?.id ?? null);
  const { showToast } = useToast();

  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [voterName, setVoterName] = useState(displayName);
  const [votedOptionId, setVotedOptionId] = useState<number | null>(() => getVotedOptionId(id));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    fetchPoll(id, urlCode).catch(() => {});
  }, [id, urlCode, fetchPoll]);

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

  const displayOptions = useMemo<PollOption[]>(() => {
    if (!poll) return [];
    return showResults ? optionsByVotes(poll) : poll.options;
  }, [poll, showResults]);
  const winnerId = useMemo(() => {
    if (!poll || !showResults || poll.totalVotes === 0) return null;
    const top = optionsByVotes(poll)[0];
    return top && top.voteCount > 0 ? top.id : null;
  }, [poll, showResults]);
  const leader = poll && showResults && poll.totalVotes > 0 ? leadingOption(poll) : null;
  const isOwner = Boolean(poll && myId && poll.creatorId === myId);
  const isAdmin = Boolean(useAuthStore.getState().user?.isAdmin);
  const canManage = isOwner || isAdmin;

  const shareUrl = poll ? resolvePollShareUrl(poll) : '';

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
      globalThis.setTimeout(() => hapticFeedback('confetti'), 90);

      // 하단 투표 버튼 위치 근처에서 꽃가루 뿜어져 나오는 극적인 연출
      triggerParticleBurst(globalThis.innerWidth / 2, globalThis.innerHeight - 80, {
        count: 45,
        charSet: ['🥑', '✨', '✦', '🌟', '💖', '🎉', '💚', '💛', '🌸'],
        speedMultiplier: 1.4,
      });

      showToast(`${MASCOT.celebrate.emoji} ${MASCOT.celebrate.line}`);
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

  const handleEdit = () => {
    if (!poll) return;
    hapticFeedback('tap');
    navigate(`/poll/${poll.id}/edit`);
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!poll) return;
    const ok = await deleteComment(poll.id, commentId);
    if (ok) {
      hapticFeedback('success');
      showToast('한마디를 지웠어요 🧹');
    } else {
      hapticFeedback('error');
      showToast('한마디를 지우지 못했어요 😢');
    }
  };

  const handleDelete = async () => {
    if (!poll) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      hapticFeedback('tickWeak');
      globalThis.setTimeout(() => setConfirmDelete(false), 3000);
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

  const handleUnlock = async () => {
    const trimmed = codeInput.trim();
    if (trimmed.length < 4) {
      setCodeError('코드는 4자 이상이에요');
      hapticFeedback('error');
      return;
    }
    setCodeError(null);
    const result = await fetchPoll(id, trimmed);
    if (result && !result.requiresCode) {
      hapticFeedback('success');
    } else {
      setCodeError('코드가 맞지 않아요 🔒');
      hapticFeedback('error');
    }
  };

  if (isLoading && !poll) {
    return (
      <CenterMessage>
        <span style={{ fontSize: 48 }}>{MASCOT.thinking.emoji}</span>
        <span style={{ fontSize: 15, marginTop: 10 }}>{VOICE.loading}</span>
      </CenterMessage>
    );
  }
  if (!poll) {
    return (
      <CenterMessage>
        <span style={{ fontSize: 48 }}>{MASCOT.empty.emoji}</span>
        <span style={{ fontSize: 15, marginTop: 10 }}>
          {error ?? '앗, 고민을 찾을 수 없어요 🥺'}
        </span>
        <Button style={{ marginTop: 16 }} variant="weak" onClick={() => navigate('/')}>
          목록으로 돌아가기 🔙
        </Button>
      </CenterMessage>
    );
  }

  // 비공개(private) 투표 — 올바른 코드 전까지 질문만 보여주고 선택지/결과를 가린다.
  if (poll.requiresCode) {
    return (
      <PollCodeGate
        question={poll.question}
        code={codeInput}
        error={codeError}
        isLoading={isLoading}
        onCodeChange={setCodeInput}
        onUnlock={handleUnlock}
        onBack={() => navigate('/')}
      />
    );
  }

  // The presentational tree (including the share area with real PollShareQrSection + QR) is in PollDetailView.
  // PollDetailPage is the thin container (state, handlers, API wiring).
  return (
    <PollDetailView
      poll={poll}
      isLoading={isLoading}
      closed={closed}
      showResults={showResults}
      hasVoted={hasVoted}
      votedOptionId={votedOptionId}
      selectedOptionId={selectedOptionId}
      onSelect={handleSelect}
      onVote={handleVote}
      voterName={voterName}
      setVoterName={setVoterName}
      comment={comment}
      setComment={setComment}
      leader={leader}
      displayOptions={displayOptions}
      winnerId={winnerId}
      isOwner={isOwner}
      canManage={canManage}
      confirmDelete={confirmDelete}
      onDelete={handleDelete}
      onEdit={handleEdit}
      onDeleteComment={handleDeleteComment}
      remaining={remaining}
      shareUrl={shareUrl}
      onShare={handleShare}
      onCopy={handleCopy}
      onCopyResult={showResults ? handleCopyResult : undefined}
      onBack={() => navigate('/')}
      totalVotes={poll ? poll.totalVotes : 0}
      comments={poll ? poll.comments : []}
    />
  );
}

function PollCodeGate(
  props: Readonly<{
    question: string;
    code: string;
    error: string | null;
    isLoading: boolean;
    onCodeChange: (value: string) => void;
    onUnlock: () => void;
    onBack: () => void;
  }>,
) {
  const { question, code, error, isLoading, onCodeChange, onUnlock, onBack } = props;
  return (
    <CenterMessage>
      <span style={{ fontSize: 48 }}>🔒</span>
      <span style={{ fontSize: 17, fontWeight: 800, color: theme.text, marginTop: 12 }}>
        비공개 고민이에요
      </span>
      <span style={{ fontSize: 14, marginTop: 6, maxWidth: 280, color: theme.textMuted }}>
        {question}
      </span>
      <span style={{ fontSize: 13, color: theme.textFaint, marginTop: 4 }}>
        참여하려면 접근 코드를 입력해 주세요
      </span>
      <input
        type="text"
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onUnlock();
        }}
        placeholder="접근 코드"
        maxLength={20}
        aria-label="비공개 투표 접근 코드"
        style={{
          marginTop: 18,
          width: '100%',
          maxWidth: 280,
          padding: '14px 16px',
          borderRadius: theme.radiusSm,
          border: `1px solid ${theme.borderStrong}`,
          background: theme.surface,
          color: theme.text,
          fontSize: 16,
          textAlign: 'center',
        }}
      />
      {error ? (
        <span style={{ fontSize: 13, color: theme.danger, marginTop: 8 }}>{error}</span>
      ) : null}
      <Button style={{ marginTop: 16 }} disabled={isLoading} onClick={onUnlock}>
        들어가기 🔓
      </Button>
      <Button style={{ marginTop: 8 }} variant="weak" onClick={onBack}>
        목록으로 🔙
      </Button>
    </CenterMessage>
  );
}

function CenterMessage({ children }: Readonly<{ children: React.ReactNode }>) {
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
