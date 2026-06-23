import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import type { PollOption } from '../shared';
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
  const { showToast } = useToast();

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
      confirmDelete={confirmDelete}
      onDelete={handleDelete}
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
