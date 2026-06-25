import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import type { PollOption } from '../shared';
import { MASCOT, VOICE, canRevealResults, COMMENT_PASSWORD_MIN } from '../shared';
import { usePollStore } from '../store/usePollStore';
import { useAuthStore } from '../store/useAuthStore';
import { useIdentity } from '../store/useIdentity';
import { rememberRecentPoll } from '../lib/pollHistory';
import {
  buildPollResultText,
  pollTossDeepLink,
  resolvePollShareUrl,
  sharePoll,
  copyText,
} from '../lib/pollShare';
import { isPollClosed, leadingOption, optionsByVotes } from '../lib/poll';
import { getVotedOptionId, rememberVote } from '../lib/votes';
import { isMyComment, resolveCommentManageAffordance } from '../lib/myComments';
import {
  buildTossShareLink,
  fetchConsentedProfile,
  hapticFeedback,
  isConsentedProfileEnabled,
  isInToss,
  requestAppReview,
} from '../lib/toss';
import { trackComment, trackShare, trackVote } from '../lib/analytics';
import { theme } from '../theme';
import { useCountdown } from '../components/Countdown';
import { useToast } from '../components/Toast';
import { triggerParticleBurst } from '../lib/particles';
import { PollDetailView } from './PollDetailView';
import { PageLoader } from '../components/ui';

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
  const {
    currentPoll,
    isLoading,
    error,
    fetchPoll,
    vote,
    deletePoll,
    deleteComment,
    addComment,
    editComment,
  } = usePollStore();
  const { displayName, setDisplayName, userKey } = useIdentity();
  const myId = useAuthStore((state) => state.user?.id ?? null);
  const { showToast } = useToast();

  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  // 한마디에 붙일 선택적 관리 비번(빈 값=프릭션 0, 기존 동작 그대로). 다른 기기서 수정/삭제용.
  const [commentPassword, setCommentPassword] = useState('');
  const [voterName, setVoterName] = useState(displayName);
  const [votedOptionId, setVotedOptionId] = useState<number | null>(() => getVotedOptionId(id));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  // 비공개 투표 쓰기 경로(투표/한마디)에 함께 보낼 활성 접근 코드. URL 코드로 시작, 잠금 해제 성공 시 갱신.
  const [activeCode, setActiveCode] = useState<string | undefined>(urlCode);
  // 옵트인 '토스 프로필 불러오기' 상태(키 없거나 토스 밖이면 버튼 자체가 안 떠요).
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  // 토스 안에선 토스앱으로 열리는 공유 링크(getTossShareLink). 토스 밖이면 null → 웹 URL 사용.
  const [tossShareLink, setTossShareLink] = useState<string | null>(null);

  useEffect(() => {
    fetchPoll(id, urlCode).catch(() => {});
  }, [id, urlCode, fetchPoll]);

  // URL ?code= 가 바뀌면 활성 접근 코드도 따라간다(잠금 해제 입력은 handleUnlock이 별도 갱신).
  useEffect(() => {
    setActiveCode(urlCode);
  }, [urlCode]);

  useEffect(() => {
    setVotedOptionId(getVotedOptionId(id));
    setSelectedOptionId(null);
    setComment('');
    setCommentPassword('');
    setConfirmDelete(false);
  }, [id]);

  const poll = currentPoll && currentPoll.id === id ? currentPoll : null;
  const remaining = useCountdown(poll?.endsAt);
  const closed = isPollClosed(poll) || (remaining != null && remaining <= 0);
  const hasVoted = votedOptionId != null;
  // 결과 공개 게이트는 web/toss 공통 canRevealResults(@picky/shared)로 단일화.
  // 토스는 마감 판정에 remaining<=0(클라 카운트다운)도 합쳐야 하므로 closed를 OR로 전달한다.
  const showResults = useMemo(
    () => canRevealResults(poll, hasVoted) || closed,
    [poll, hasVoted, closed],
  );

  useEffect(() => {
    if (poll && poll.id === id) {
      rememberRecentPoll(poll, { hasVoted: votedOptionId != null });
    }
  }, [poll, id, votedOptionId]);

  // 토스 공유 링크(딥링크→토스앱 오픈)를 비동기로 해석해 공유/QR/복사에 사용.
  useEffect(() => {
    let alive = true;
    if (id && isInToss()) {
      buildTossShareLink(pollTossDeepLink(id))
        .then((link) => {
          if (alive) setTossShareLink(link);
        })
        .catch(() => {});
    } else {
      setTossShareLink(null);
    }
    return () => {
      alive = false;
    };
  }, [id]);

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
  // 댓글별 관리(수정/삭제) 어포던스 — 본인(이 기기에서 내가 단 댓글)·폴 소유자/어드민이면 직접 관리,
  // 그 외라도 댓글에 관리 비번(hasPassword)이 걸려 있으면 비번 입력 흐름으로 관리할 수 있게 한다.
  // 서버가 최종 권한을 강제하므로 여기선 버튼 노출·비번 프롬프트 여부만 결정한다.
  const resolveCommentAffordance = (
    commentId: number,
  ): { canEdit: boolean; canDelete: boolean; needsPassword: boolean } => {
    const target = poll ? poll.comments.find((c) => c.id === commentId) : null;
    return resolveCommentManageAffordance({
      mine: poll ? isMyComment(poll.id, commentId) : false,
      isPollOwner: isOwner,
      isAdmin,
      hasPassword: Boolean(target?.hasPassword),
    });
  };
  // 한마디별 수정/삭제 어포던스를 분리해 넘긴다(세부 권한은 서버가 강제).
  // 서버 매트릭스: 수정=본인/어드민/비번, 삭제=본인/폴 소유자/어드민/비번(소유자는 삭제만 가능).
  const canEditCommentById = (commentId: number): boolean =>
    resolveCommentAffordance(commentId).canEdit;
  const canDeleteCommentById = (commentId: number): boolean =>
    resolveCommentAffordance(commentId).canDelete;
  const commentNeedsPassword = (commentId: number): boolean =>
    resolveCommentAffordance(commentId).needsPassword;

  // 토스 안: 토스 공유 링크 우선. 밖: 공개 웹 URL. (QR·공유·링크복사 모두 이 값을 사용)
  const shareUrl = tossShareLink ?? (poll ? resolvePollShareUrl(poll) : '');

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
    // 선택적 관리 비번: 입력했는데 최소 길이 미만이면 제출을 막고 안내만 — 빈 값은 그대로 통과(프릭션 0).
    const trimmedPassword = commentPassword.trim();
    if (trimmedPassword.length > 0 && trimmedPassword.length < COMMENT_PASSWORD_MIN) {
      hapticFeedback('error');
      showToast(`🔒 비번은 ${COMMENT_PASSWORD_MIN}자 이상으로 정해 주세요`);
      return;
    }
    const ok = await vote(
      poll.id,
      {
        optionId: selectedOptionId,
        voterName: trimmedName || null,
        comment: comment.trim() || null,
        // 서버측 1인1표(#12): 안정 식별키(getAnonymousKey 해시). null이면 미전송 → 레거시 허용.
        voterKey: userKey ?? null,
        // 선택적 관리 비번 — 최소 길이 이상일 때만 전송(빈 값/짧은 값은 위에서 처리됨).
        password: trimmedPassword.length >= COMMENT_PASSWORD_MIN ? trimmedPassword : null,
      },
      // 비공개 투표면 활성 접근 코드를 함께 보내 서버 게이트를 통과한다(공개 폴은 undefined).
      activeCode,
    );
    if (ok) {
      rememberVote(poll.id, selectedOptionId);
      setVotedOptionId(selectedOptionId);
      // 토스 Analytics: 투표(+ 함께 남긴 한마디가 있으면 comment도). 식별값 없이 카운트만.
      trackVote(poll.options.length);
      if (comment.trim()) {
        trackComment(false);
      }
      setComment('');
      setCommentPassword('');
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

  // 옵트인: 사용자가 버튼을 눌렀을 때만 토스 동의 프로필을 가져와 닉네임을 채워줘요.
  // 거부/취소/미지원은 모두 null → 인라인 안내만, 절대 흐름을 막지 않아요.
  const handleLoadProfile = async () => {
    if (profileLoading) return;
    setProfileNotice(null);
    setProfileLoading(true);
    hapticFeedback('tap');
    try {
      const profile = await fetchConsentedProfile();
      if (profile?.name) {
        setVoterName(profile.name);
        setDisplayName(profile.name);
        hapticFeedback('success');
        showToast('토스 프로필로 이름을 채웠어요 🥑');
      } else {
        hapticFeedback('tickWeak');
        setProfileNotice('프로필을 불러오지 못했어요. 이름은 직접 입력해도 괜찮아요 🙂');
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleShare = async () => {
    if (!poll) return;
    hapticFeedback('tap');
    const result = await sharePoll(poll, shareUrl);
    // 토스 Analytics: 공유. 식별값 없이 공유 방식만(취소=null은 미로깅).
    if (result) trackShare(result);
    if (result === 'clipboard') showToast('링크를 클립보드에 담았어요 📋');
    else if (result == null) showToast('공유를 취소했어요 🥺');
  };

  const handleCopy = async () => {
    if (!poll) return;
    const ok = await copyText(shareUrl);
    hapticFeedback(ok ? 'tap' : 'error');
    showToast(ok ? '링크를 복사했어요 📋' : '복사에 실패했어요 😢');
  };

  const handleCopyResult = async () => {
    if (!poll) return;
    const ok = await copyText(buildPollResultText(poll, shareUrl));
    hapticFeedback(ok ? 'tap' : 'error');
    showToast(ok ? '투표 결과를 복사했어요 📊' : '복사에 실패했어요 😢');
  };

  // 결정 도구(신뢰도/메모/토픽/공유 템플릿) 공통 텍스트 복사 — 토스트·햅틱을 한 곳에서 처리.
  const handleCopyText = async (text: string) => {
    const ok = await copyText(text);
    hapticFeedback(ok ? 'tap' : 'error');
    showToast(ok ? '클립보드에 복사했어요 📋' : '복사에 실패했어요 😢');
  };

  // 결과 이미지 저장 알림 — a[download] 앵커 트리거 성공/실패만 받아 안내.
  const handleResultImageSaved = (ok: boolean) => {
    hapticFeedback(ok ? 'success' : 'error');
    showToast(ok ? '결과 이미지를 저장했어요 🖼️' : '이미지 저장에 실패했어요 😢');
  };

  const handleEdit = () => {
    if (!poll) return;
    hapticFeedback('tap');
    // 비공개 폴은 편집 페이지에서도 코드 게이트를 통과해야 선택지를 불러올 수 있으므로,
    // 상세에서 잠금 해제한 활성 코드(activeCode)를 ?code= 로 함께 넘긴다(없으면 편집 페이지가 코드를 받음).
    const codeQuery =
      poll.visibility === 'private' && activeCode ? `?code=${encodeURIComponent(activeCode)}` : '';
    navigate(`/poll/${poll.id}/edit${codeQuery}`);
  };

  const handleDeleteComment = async (commentId: number, password?: string) => {
    if (!poll) return;
    // 비회원 본인 확인용 voterKey(getAnonymousKey 해시)를 바디로 보내 서버가 authorKey 와 대조한다.
    // 다른 기기서 관리하는 경우엔 작성 시 정한 관리 비번(password)도 함께 보내 서버가 대조한다.
    const ok = await deleteComment(poll.id, commentId, userKey ?? null, password ?? null);
    if (ok) {
      hapticFeedback('success');
      showToast('한마디를 지웠어요 🧹');
    } else {
      hapticFeedback('error');
      showToast('한마디를 지우지 못했어요 😢');
    }
  };

  const handleEditComment = async (commentId: number, text: string, password?: string) => {
    if (!poll) return false;
    const result = await editComment(
      poll.id,
      commentId,
      // voterKey 를 바디로 함께 보내 서버가 작성자 본인(authorId/authorKey)인지 강제 검증한다.
      // 다른 기기서 수정하는 경우엔 작성 시 정한 관리 비번(password)도 함께 보낸다.
      { comment: text, voterKey: userKey ?? null, password: password ?? null },
      activeCode,
    );
    if (result) {
      hapticFeedback('success');
      showToast('한마디를 고쳤어요 ✏️');
      return true;
    }
    hapticFeedback('error');
    showToast('한마디를 고치지 못했어요 😢');
    return false;
  };

  const handleAddReply = async (parentId: number, text: string, password?: string) => {
    if (!poll) return;
    // 선택적 관리 비번: 입력했는데 최소 길이 미만이면 막고 안내만 — 빈 값은 그대로 통과(프릭션 0).
    const trimmedPassword = (password ?? '').trim();
    if (trimmedPassword.length > 0 && trimmedPassword.length < COMMENT_PASSWORD_MIN) {
      hapticFeedback('error');
      showToast(`🔒 비번은 ${COMMENT_PASSWORD_MIN}자 이상으로 정해 주세요`);
      return;
    }
    const result = await addComment(
      poll.id,
      {
        comment: text,
        parentId,
        voterName: voterName.trim() || null,
        // 답글 작성자 식별키 — 비회원이라도 본인 답글을 나중에 관리할 수 있게 한다.
        voterKey: userKey ?? null,
        // 선택적 관리 비번 — 최소 길이 이상일 때만 전송(다른 기기서 관리용).
        password: trimmedPassword.length >= COMMENT_PASSWORD_MIN ? trimmedPassword : null,
      },
      // 비공개 투표면 활성 접근 코드를 함께 보내 서버 게이트를 통과한다(공개 폴은 undefined).
      activeCode,
    );
    if (result) {
      // 토스 Analytics: 한마디(답글). 식별값 없이 reply 여부만.
      trackComment(true);
      hapticFeedback('success');
      showToast('답글을 남겼어요 💬');
    } else {
      hapticFeedback('error');
      showToast('답글 등록에 실패했어요 😢');
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
      // 성공한 코드를 보관해 이후 투표/한마디 쓰기(?code=)에도 함께 보낸다.
      setActiveCode(trimmed);
      hapticFeedback('success');
    } else {
      setCodeError('코드가 맞지 않아요 🔒');
      hapticFeedback('error');
    }
  };

  if (isLoading && !poll) {
    return (
      <CenterMessage>
        <PageLoader message={VOICE.loading.replace(/[…\s🥑]+$/u, '')} />
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
      commentPassword={commentPassword}
      setCommentPassword={setCommentPassword}
      onLoadProfile={isConsentedProfileEnabled() ? handleLoadProfile : undefined}
      profileLoading={profileLoading}
      profileNotice={profileNotice}
      leader={leader}
      displayOptions={displayOptions}
      winnerId={winnerId}
      isOwner={isOwner}
      canManage={canManage}
      canEditCommentById={canEditCommentById}
      canDeleteCommentById={canDeleteCommentById}
      commentNeedsPassword={commentNeedsPassword}
      confirmDelete={confirmDelete}
      onDelete={handleDelete}
      onEdit={handleEdit}
      onDeleteComment={handleDeleteComment}
      onEditComment={handleEditComment}
      onAddReply={handleAddReply}
      remaining={remaining}
      shareUrl={shareUrl}
      onShare={handleShare}
      onCopy={handleCopy}
      onCopyResult={showResults ? handleCopyResult : undefined}
      onCopyText={handleCopyText}
      onResultImageSaved={handleResultImageSaved}
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
