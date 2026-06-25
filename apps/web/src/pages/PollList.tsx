import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import {
  Calendar,
  FileText,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  ArrowRight,
  BarChart3,
  MessageSquare,
  Vote,
  Plus,
  QrCode,
  X,
  Copy,
  Check,
  LayoutList,
  LayoutGrid,
  Link,
  Code2,
  Eye,
  Radio,
  TimerReset,
  History,
  Trash2,
  Pin,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Poll } from '@picky/shared';
import { MASCOT, VOICE, categoryMeta, BETA_NOTICE } from '@picky/shared';
// 시그널 분류(접전/신규/마감임박/피드백)·마감 판정 순수 로직은 @picky/shared 로 단일화했어요.
import {
  canRevealResults,
  formatPollEndAt as formatEndAtIso,
  getPollAgeDays,
  hottestActivePoll,
  isCloseRacePoll,
  isClosingSoonPoll,
  isFeedbackRichPoll,
  isPollClosed,
  optionPercent,
  resolveCreatorLabel,
  SIGNAL_CHIP_LABELS,
  SORT_OPTIONS,
} from '@picky/shared';
import { usePollStore } from '../store/usePollStore';
import { useAuthStore } from '../store/useAuthStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useCountUp } from '../hooks/useCountUp';
import { buildPollEmbedCode, copyText, resolvePollShareUrl } from '../lib/pollShare';
import {
  clearRecentPollHistory,
  getRecentPollHistory,
  removeRecentPollHistoryItem,
} from '../lib/pollHistory';
import { CountdownChip, useCountdown } from '../components/Countdown';

type SortMode = 'latest' | 'popular' | 'commented' | 'closing';
type ScopeMode = 'all' | 'mine' | 'guest';
type SignalMode =
  | 'all'
  | 'needsVote'
  | 'closeRace'
  | 'fresh'
  | 'feedbackRich'
  | 'withAttachment'
  | 'closingSoon'
  | 'closed';

const PINNED_POLLS_STORAGE_KEY = 'picky_pinned_poll_ids_v1'; // gitleaks:allow — localStorage 키(비밀 아님)
const MAX_PINNED_POLLS = 6;

const loadPinnedPollIds = (): string[] => {
  if (!('window' in globalThis)) {
    return [];
  }

  try {
    const raw = globalThis.localStorage.getItem(PINNED_POLLS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string').slice(0, MAX_PINNED_POLLS)
      : [];
  } catch {
    return [];
  }
};

const savePinnedPollIds = (pollIds: string[]) => {
  if (!('window' in globalThis)) {
    return;
  }

  globalThis.localStorage.setItem(
    PINNED_POLLS_STORAGE_KEY,
    JSON.stringify(pollIds.slice(0, MAX_PINNED_POLLS)),
  );
};

const isSortMode = (value: string | null): value is SortMode => {
  return value === 'latest' || value === 'popular' || value === 'commented' || value === 'closing';
};

const isScopeMode = (value: string | null): value is ScopeMode => {
  return value === 'all' || value === 'mine' || value === 'guest';
};

const isSignalMode = (value: string | null): value is SignalMode => {
  return (
    value === 'all' ||
    value === 'needsVote' ||
    value === 'closeRace' ||
    value === 'fresh' ||
    value === 'feedbackRich' ||
    value === 'withAttachment' ||
    value === 'closingSoon' ||
    value === 'closed'
  );
};

const isGuestCreator = (creatorId?: string | null, creatorIsGuest?: boolean) => {
  return creatorIsGuest || Boolean(creatorId?.startsWith('guest-'));
};

// 마감 표기는 @picky/shared formatPollEndAt 단일 소스에 위임한다("마감 없음"/"마감 확인 필요"/"6월 25일 14:30").
const formatPollEndAt = (poll: Poll) => formatEndAtIso(poll.endsAt);

const formatRecentPollViewedAt = (value: string) => {
  const viewedAt = new Date(value).getTime();
  if (!Number.isFinite(viewedAt)) {
    return '최근 조회';
  }

  const diffMs = Date.now() - viewedAt;
  const diffMinutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));
  if (diffMinutes < 1) {
    return '방금';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  return new Date(value).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
};

const getPollResultsVisibilityLabel = (poll: Poll) => {
  return poll.resultsVisibility === 'always' ? '실시간 결과 공개' : '투표 후 결과 공개';
};

/**
 * 목록/히어로에서 이 기기가 이 고민에 투표했는지(최근 본 고민 기록 기준).
 * afterVote 폴의 결과 누출을 막기 위한 보수적 신호 — 기록이 없으면 미투표로 본다.
 */
const votedPollIds = (): Set<string> =>
  new Set(
    getRecentPollHistory()
      .filter((item) => item.hasVoted)
      .map((item) => item.id),
  );

const hasAttachmentPoll = (poll: Poll) => {
  return Array.isArray(poll.attachments) && poll.attachments.length > 0;
};

const matchesSignalMode = (poll: Poll, signal: SignalMode) => {
  switch (signal) {
    case 'closed':
      return isPollClosed(poll);
    case 'closingSoon':
      return isClosingSoonPoll(poll);
    case 'needsVote':
      return poll.totalVotes === 0;
    case 'closeRace':
      return isCloseRacePoll(poll);
    case 'fresh':
      return getPollAgeDays(poll.createdAt) <= 3;
    case 'feedbackRich':
      return isFeedbackRichPoll(poll);
    case 'withAttachment':
      return hasAttachmentPoll(poll);
    default:
      return true;
  }
};

const getPollSignalLabel = (poll: Poll) => {
  if (isPollClosed(poll)) {
    return '마감';
  }

  if (isClosingSoonPoll(poll)) {
    return '마감 임박';
  }

  if (poll.totalVotes === 0) {
    return '참여 대기';
  }

  if (isCloseRacePoll(poll)) {
    return '접전';
  }

  if (isFeedbackRichPoll(poll)) {
    return SIGNAL_CHIP_LABELS.feedbackRich;
  }

  if (getPollAgeDays(poll.createdAt) <= 3) {
    return '신규';
  }

  return '진행 중';
};

const getPollSignalStyle = (label: string): React.CSSProperties => {
  switch (label) {
    case '참여 대기':
      return {
        color: 'var(--brand-accent-gold)',
        borderColor: 'rgba(250, 204, 21, 0.28)',
        background: 'rgba(250, 204, 21, 0.08)',
      };
    case '접전':
      return {
        color: 'var(--brand-accent-coral)',
        borderColor: 'rgba(251, 113, 133, 0.3)',
        background: 'rgba(251, 113, 133, 0.08)',
      };
    case SIGNAL_CHIP_LABELS.feedbackRich:
      return {
        color: 'var(--brand-accent-teal)',
        borderColor: 'rgba(45, 212, 191, 0.3)',
        background: 'rgba(45, 212, 191, 0.08)',
      };
    case '마감 임박':
      return {
        color: 'var(--brand-accent-gold)',
        borderColor: 'rgba(250, 204, 21, 0.32)',
        background: 'rgba(250, 204, 21, 0.09)',
      };
    case '마감':
      return {
        color: 'var(--text-secondary)',
        borderColor: 'rgba(148, 163, 184, 0.28)',
        background: 'rgba(148, 163, 184, 0.08)',
      };
    default:
      return {
        color: 'var(--text-muted)',
        borderColor: 'var(--bg-card-border)',
        background: 'rgba(255,255,255,0.03)',
      };
  }
};

const resolveEmptyStateHint = (hasActiveFilters: boolean, isGuestUser: boolean) => {
  if (hasActiveFilters) {
    return '검색어나 필터를 바꿔서 다시 찾아볼까요?';
  }

  if (isGuestUser) {
    return '비회원으로도 바로 시작할 수 있어요. 첫 고민을 올리고 친구들에게 링크로 물어보세요 🥑';
  }

  return '첫 고민을 올리고 친구·동료에게 링크로 빠르게 물어보세요 🥑';
};

// 정렬 옵션은 @picky/shared SORT_OPTIONS 단일 소스(latest/popular/commented/closing 4종)를 그대로 쓴다.
const sortOptions: ReadonlyArray<{ value: SortMode; label: string }> = SORT_OPTIONS;

const scopeOptions: { value: ScopeMode; label: string }[] = [
  { value: 'all', label: '전체 보기' },
  { value: 'mine', label: '내가 작성' },
  { value: 'guest', label: '비회원 작성' },
];

// 5종 캐노니컬 시그널(all/closeRace/fresh/closingSoon/feedbackRich)은 @picky/shared SIGNAL_CHIP_LABELS
// 단일 소스를 그대로 쓴다(feedbackRich 라벨이 '피드백 활발'/'한마디 많은'으로 갈리던 드리프트 해소).
// needsVote/withAttachment/closed 는 웹 전용 보조 모드라 자체 라벨을 유지한다.
const signalOptions: { value: SignalMode; label: string }[] = [
  { value: 'all', label: SIGNAL_CHIP_LABELS.all },
  { value: 'needsVote', label: '참여 대기' },
  { value: 'closeRace', label: SIGNAL_CHIP_LABELS.closeRace },
  { value: 'fresh', label: SIGNAL_CHIP_LABELS.fresh },
  { value: 'feedbackRich', label: SIGNAL_CHIP_LABELS.feedbackRich },
  { value: 'withAttachment', label: '자료 첨부' },
  { value: 'closingSoon', label: SIGNAL_CHIP_LABELS.closingSoon },
  { value: 'closed', label: '마감' },
];
type ViewMode = 'stack' | 'compact';

function PollCardActions(
  props: Readonly<{
    poll: Poll;
    isCompact: boolean;
    copiedPollId: string | null;
    handleGotoPoll: (event: React.MouseEvent<HTMLButtonElement>, pollId: string) => void;
    handleCopyPollLink: (
      event: React.MouseEvent<HTMLButtonElement>,
      pollId: string,
    ) => Promise<void>;
    handleCopyPollEmbed: (
      event: React.MouseEvent<HTMLButtonElement>,
      pollId: string,
    ) => Promise<void>;
  }>,
) {
  const { poll, isCompact, copiedPollId, handleGotoPoll, handleCopyPollLink, handleCopyPollEmbed } =
    props;
  const linkCopied = copiedPollId === poll.id;
  const embedCopied = copiedPollId === `embed-${poll.id}`;

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: '0.75rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '0.9rem',
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              gap: '5px',
              alignItems: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <Vote size={12} />
            <strong style={{ color: 'var(--text-primary)' }}>{poll.totalVotes}</strong> 투표
          </span>
          <span
            style={{
              display: 'inline-flex',
              gap: '5px',
              alignItems: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <MessageSquare size={12} />
            <strong style={{ color: 'var(--text-primary)' }}>{poll.comments.length}</strong> 의견
          </span>
        </div>

        <button
          type="button"
          onClick={(event) => handleGotoPoll(event, poll.id)}
          className="btn-primary"
          style={{
            fontSize: isCompact ? '0.66rem' : '0.7rem',
            padding: '7px 13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>투표하기</span>
          <ArrowRight size={13} />
        </button>
        <button
          type="button"
          onClick={(event) => handleCopyPollLink(event, poll.id)}
          className="ghost-btn"
          style={{
            fontSize: isCompact ? '0.64rem' : '0.68rem',
            padding: isCompact ? '5px 9px' : '6px 10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title={`${poll.id} 링크 복사`}
        >
          {linkCopied ? <Check size={12} /> : <Copy size={12} />}
          <span>{linkCopied ? '복사 완료' : '공유 복사'}</span>
          <Link size={11} />
        </button>
        <button
          type="button"
          onClick={(event) => handleCopyPollEmbed(event, poll.id)}
          className="ghost-btn"
          style={{
            fontSize: isCompact ? '0.64rem' : '0.68rem',
            padding: isCompact ? '5px 9px' : '6px 10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title={`${poll.id} 임베드 코드 복사`}
        >
          {embedCopied ? <Check size={12} /> : <Code2 size={12} />}
          <span>{embedCopied ? '복사 완료' : '임베드'}</span>
        </button>
      </div>
      {linkCopied || embedCopied ? (
        <p
          style={{
            margin: 0,
            marginTop: '6px',
            fontSize: '0.64rem',
            color: 'var(--brand-accent-teal)',
            fontWeight: 700,
          }}
        >
          {linkCopied ? '링크가 복사되었습니다.' : '임베드 코드가 복사되었습니다.'}
        </p>
      ) : null}
    </>
  );
}

function PollCardDescription(props: Readonly<{ poll: Poll; isCompact: boolean }>) {
  const { poll, isCompact } = props;
  if (!poll.description) {
    return null;
  }

  const compactDescription =
    poll.description.length > 84 ? `${poll.description.slice(0, 81)}...` : poll.description;

  return (
    <p
      style={{
        color: 'var(--text-secondary)',
        fontSize: isCompact ? '0.74rem' : '0.825rem',
        marginBottom: '0.6rem',
        display: isCompact ? 'block' : '-webkit-box',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        WebkitLineClamp: isCompact ? 1 : 2,
        WebkitBoxOrient: 'vertical',
        lineHeight: 1.56,
      }}
    >
      {isCompact ? compactDescription : poll.description}
    </p>
  );
}

function PollCard(
  props: Readonly<{
    poll: Poll;
    index: number;
    userId?: string;
    viewMode: ViewMode;
    copiedPollId: string | null;
    setCurrentPoll: (poll: Poll | null) => void;
    navigate: NavigateFunction;
    handleGotoPoll: (event: React.MouseEvent<HTMLButtonElement>, pollId: string) => void;
    handleCopyPollLink: (
      event: React.MouseEvent<HTMLButtonElement>,
      pollId: string,
    ) => Promise<void>;
    handleCopyPollEmbed: (
      event: React.MouseEvent<HTMLButtonElement>,
      pollId: string,
    ) => Promise<void>;
  }>,
) {
  const {
    poll,
    index,
    userId,
    viewMode,
    copiedPollId,
    setCurrentPoll,
    navigate,
    handleGotoPoll,
    handleCopyPollLink,
    handleCopyPollEmbed,
  } = props;
  // 회원/비회원 판단은 @picky/shared resolveCreatorLabel 단일 소스로(목록 카드는 닉네임 없이 회원/비회원만).
  const creatorLabel = `${resolveCreatorLabel(null, poll.creatorId, poll.creatorIsGuest)} 작성`;
  // 부모(PollCard)가 남은 ms를 1초마다 틱하고, CountdownChip은 표시만 한다(자체 타이머 없음 = 누수 방지).
  const remaining = useCountdown(poll.endsAt);
  // Poll 타입에 categoryId 가 아직 없지만 런타임 데이터엔 실릴 수 있어 방어적으로 읽는다.
  const pollCategory = categoryMeta((poll as { categoryId?: string | null }).categoryId);
  const isMine = userId && poll.creatorId === userId;
  const isCompact = viewMode === 'compact';
  const signalLabel = getPollSignalLabel(poll);
  const endAtLabel = formatPollEndAt(poll);
  const resultsVisibilityLabel = getPollResultsVisibilityLabel(poll);
  const attachmentCount = poll.attachments?.length || 0;
  // afterVote 폴은 이 기기가 투표(또는 마감/always)했을 때만 결과 파생 표시(득표순·퍼센트)를 드러낸다.
  const revealResults = useMemo(() => canRevealResults(poll, votedPollIds().has(poll.id)), [poll]);

  return (
    <article
      className="poll-card poll-card-rise"
      style={{
        textAlign: 'left',
        padding: isCompact ? '1.05rem' : '1.25rem',
        width: '100%',
        border: isMine ? '1px solid rgba(99, 102, 241, 0.45)' : undefined,
        // 젤리팝 진입을 인덱스별로 지연(최대 8개까지만 계단식). reduced-motion에선 CSS가 무력화.
        animationDelay: `${Math.min(index, 8) * 75}ms`,
      }}
    >
      {/* 카드 전체를 덮는 접근성 내비 버튼(키보드+마우스). 내부 액션 버튼은
          .poll-card 의 z-index 규칙으로 이 오버레이 위에 떠서 따로 동작한다. */}
      <button
        type="button"
        className="poll-card-open"
        aria-label={`${poll.question} 투표 페이지로 이동`}
        onClick={() => {
          setCurrentPoll(poll);
          navigate(`/poll/${poll.id}`);
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.8rem',
          flexWrap: 'wrap',
          marginBottom: '0.7rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '0.35rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span className="floating-tag">POLL #{poll.id}</span>
          {pollCategory ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.62rem',
                fontWeight: 800,
                color: pollCategory.color,
                backgroundColor: `${pollCategory.color}1f`,
                border: `1px solid ${pollCategory.color}55`,
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              <span aria-hidden="true">{pollCategory.emoji}</span>
              {pollCategory.label}
            </span>
          ) : null}
          <span
            style={{
              fontSize: '0.62rem',
              color: 'var(--text-muted)',
              border: '1px solid var(--bg-card-border)',
              padding: '2px 8px',
              borderRadius: '999px',
              fontWeight: 600,
            }}
          >
            {creatorLabel}
          </span>
          <span
            style={{
              fontSize: '0.62rem',
              border: '1px solid',
              padding: '2px 8px',
              borderRadius: '999px',
              fontWeight: 700,
              ...getPollSignalStyle(signalLabel),
            }}
          >
            {signalLabel}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.64rem',
            color: 'var(--text-muted)',
          }}
        >
          <Calendar size={12} />
          <span>
            {new Date(poll.createdAt).toLocaleDateString([], {
              year: '2-digit',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      <h3
        style={{
          color: 'var(--text-primary)',
          fontSize: isCompact ? '1rem' : '1.06rem',
          fontWeight: 800,
          letterSpacing: 0,
          lineHeight: 1.45,
          marginBottom: '0.4rem',
        }}
      >
        {poll.question}
      </h3>

      <PollCardDescription poll={poll} isCompact={isCompact} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap',
          marginTop: '0.5rem',
          marginBottom: '0.6rem',
        }}
      >
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          {revealResults ? '상위 선택지:' : '선택지:'}
        </span>
        {poll.options.length > 0 ? (
          // afterVote 미공개면 득표순 정렬을 숨기고(원래 순서) 결과 잠금 안내를 덧붙인다.
          (revealResults
            ? [...poll.options].sort((a, b) => b.voteCount - a.voteCount)
            : poll.options
          )
            .slice(0, 2)
            .map((opt) => (
              <span
                key={opt.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  fontWeight: 700,
                }}
              >
                {opt.text}
              </span>
            ))
        ) : (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>등록 없음</span>
        )}
        {poll.options.length > 0 && !revealResults ? (
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            🔒 투표하면 결과가 보여요
          </span>
        ) : null}
      </div>

      <div className="poll-card-meta-strip">
        <span>
          <TimerReset size={12} />
          {endAtLabel}
        </span>
        <CountdownChip remaining={remaining} closedFallback />
        <span>
          <Eye size={12} />
          {resultsVisibilityLabel}
        </span>
        {attachmentCount > 0 ? (
          <span style={{ color: 'var(--brand-accent-gold)' }}>
            <FileText size={12} />
            참고자료 {attachmentCount}개
          </span>
        ) : null}
      </div>

      <PollCardActions
        poll={poll}
        isCompact={isCompact}
        copiedPollId={copiedPollId}
        handleGotoPoll={handleGotoPoll}
        handleCopyPollLink={handleCopyPollLink}
        handleCopyPollEmbed={handleCopyPollEmbed}
      />
    </article>
  );
}

type OperatorFlowCard = Readonly<{
  key: string;
  step: string;
  label: string;
  title: string;
  metric: string;
  help: string;
  actionLabel: string;
  icon: LucideIcon;
  tone: string;
}>;

type OperatorChip = Readonly<{ label: string; icon: LucideIcon }>;

type OperatorInsightCard = Readonly<{
  key: string;
  label: string;
  value: string;
  help: string;
  signal: SignalMode;
  icon: LucideIcon;
  tone: string;
}>;

type OperatorRecommendationCard = Readonly<{
  key: string;
  eyebrow: string;
  title: string;
  help: string;
  poll: Poll | null;
  emptyTitle: string;
  emptyHelp: string;
  icon: LucideIcon;
  tone: string;
}>;

type OperatorQueueItem = Readonly<{
  key: string;
  label: string;
  count: number;
  help: string;
  signal: SignalMode;
  icon: LucideIcon;
  tone: string;
}>;

function OperatorToolsPanel(
  props: Readonly<{
    visible: boolean;
    flowSectionRef: React.RefObject<HTMLDivElement | null>;
    insightSectionRef: React.RefObject<HTMLDivElement | null>;
    navigate: NavigateFunction;
    setSignal: (signal: SignalMode) => void;
    setScope: (scope: ScopeMode) => void;
    setSortBy: (sort: SortMode) => void;
    setCurrentPoll: (poll: Poll | null) => void;
    openPollCount: number;
    signal: SignalMode;
    decisionFlowCards: ReadonlyArray<OperatorFlowCard>;
    launchSurfaceChips: ReadonlyArray<OperatorChip>;
    operatorInsightCards: ReadonlyArray<OperatorInsightCard>;
    recommendationCards: ReadonlyArray<OperatorRecommendationCard>;
    liveQueueItems: ReadonlyArray<OperatorQueueItem>;
  }>,
) {
  const {
    visible,
    flowSectionRef,
    insightSectionRef,
    navigate,
    setSignal,
    setScope,
    setSortBy,
    setCurrentPoll,
    openPollCount,
    signal,
    decisionFlowCards,
    launchSurfaceChips,
    operatorInsightCards,
    recommendationCards,
    liveQueueItems,
  } = props;
  if (!visible) {
    return null;
  }

  return (
    <>
      <section
        ref={flowSectionRef}
        className="desktop-only"
        aria-label="의사결정 운영 흐름"
        style={{
          display: 'grid',
          gap: '0.85rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '0.9rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'grid', gap: '0.25rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--brand-accent-teal)',
                fontSize: '0.68rem',
                fontWeight: 900,
                letterSpacing: '0.05em',
              }}
            >
              <Sparkles size={13} />
              결정 흐름
            </span>
            <h2
              style={{
                margin: 0,
                color: 'var(--text-primary)',
                fontSize: '1rem',
                fontWeight: 900,
              }}
            >
              생성부터 후속 결정까지 한 번에 이어지는 운영 흐름
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/create')}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={14} />새 투표 만들기
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '0.7rem',
          }}
        >
          {decisionFlowCards.map((card) => {
            const FlowIcon = card.icon;

            return (
              <article
                key={card.key}
                className="press-tile"
                style={{
                  minWidth: 0,
                  minHeight: '168px',
                  display: 'grid',
                  gap: '0.55rem',
                  alignContent: 'start',
                  border: '1px solid var(--bg-card-border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.028)',
                  padding: '0.88rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: card.tone,
                      fontSize: '0.68rem',
                      fontWeight: 900,
                    }}
                  >
                    <FlowIcon size={14} />
                    {card.label}
                  </span>
                  <span
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '999px',
                      color: 'var(--text-muted)',
                      padding: '2px 7px',
                      fontSize: '0.62rem',
                      fontWeight: 900,
                    }}
                  >
                    {card.step}
                  </span>
                </div>
                <strong
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: '0.98rem',
                    lineHeight: 1.32,
                  }}
                >
                  {card.title}
                </strong>
                <span
                  style={{
                    color: card.tone,
                    fontSize: '0.8rem',
                    fontWeight: 900,
                  }}
                >
                  {card.metric}
                </span>
                <p
                  style={{
                    margin: 0,
                    color: 'var(--text-secondary)',
                    fontSize: '0.7rem',
                    lineHeight: 1.48,
                  }}
                >
                  {card.help}
                </p>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    if (card.key === 'create') {
                      navigate('/create');
                      return;
                    }
                    if (card.key === 'launch') {
                      document.getElementById('join-code-input')?.focus();
                      return;
                    }
                    if (card.key === 'live') {
                      setSignal('all');
                      setScope('all');
                      return;
                    }
                    setSortBy('popular');
                  }}
                  style={{
                    justifySelf: 'start',
                    alignSelf: 'end',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 9px',
                    fontSize: '0.66rem',
                    marginTop: 'auto',
                  }}
                >
                  {card.actionLabel}
                  <ArrowRight size={12} />
                </button>
              </article>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.45rem',
            flexWrap: 'wrap',
          }}
          aria-label="배포 및 분석 채널"
        >
          {launchSurfaceChips.map((chip) => {
            const ChipIcon = chip.icon;

            return (
              <span
                key={chip.label}
                className="stat-pill"
                style={{
                  color: 'var(--text-secondary)',
                  borderColor: 'rgba(45, 212, 191, 0.18)',
                  background: 'rgba(45, 212, 191, 0.045)',
                }}
              >
                <ChipIcon size={12} />
                {chip.label}
              </span>
            );
          })}
        </div>
      </section>

      <section
        ref={insightSectionRef}
        className="content-card desktop-only"
        style={{
          padding: '1rem',
          display: 'grid',
          gap: '0.85rem',
          cursor: 'default',
          borderColor: 'rgba(45, 212, 191, 0.16)',
          background:
            'linear-gradient(135deg, rgba(45, 212, 191, 0.045), rgba(250, 204, 21, 0.025))',
        }}
        aria-label="투표 운영 인사이트"
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '0.85rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'grid', gap: '0.22rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--brand-accent-teal)',
                fontSize: '0.68rem',
                fontWeight: 900,
                letterSpacing: '0.05em',
              }}
            >
              <Sparkles size={13} />
              실시간 운영
            </span>
            <h2
              style={{
                margin: 0,
                color: 'var(--text-primary)',
                fontSize: '0.98rem',
                fontWeight: 900,
              }}
            >
              공유 후 응답 흐름 한눈에 보기
            </h2>
          </div>
          <span
            style={{
              border: '1px solid rgba(45, 212, 191, 0.26)',
              borderRadius: '999px',
              color: 'var(--brand-accent-teal)',
              background: 'rgba(45, 212, 191, 0.07)',
              padding: '5px 10px',
              fontSize: '0.68rem',
              fontWeight: 900,
              whiteSpace: 'nowrap',
            }}
          >
            열린 투표 {openPollCount}개
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '0.65rem',
          }}
        >
          {operatorInsightCards.map((card) => {
            const CardIcon = card.icon;

            return (
              <button
                key={card.key}
                type="button"
                className="press-tile"
                onClick={() => {
                  setSignal(card.signal);
                  setScope('all');
                }}
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.09)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  padding: '0.82rem',
                  display: 'grid',
                  gap: '0.42rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  minHeight: '132px',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: card.tone,
                    fontSize: '0.68rem',
                    fontWeight: 900,
                  }}
                >
                  <CardIcon size={14} />
                  {card.label}
                </span>
                <strong
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: '1.28rem',
                    lineHeight: 1.1,
                  }}
                >
                  {card.value}
                </strong>
                <span
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.68rem',
                    lineHeight: 1.45,
                  }}
                >
                  {card.help}
                </span>
                <span
                  style={{
                    color: card.tone,
                    fontSize: '0.64rem',
                    fontWeight: 900,
                    marginTop: 'auto',
                  }}
                >
                  관련 투표 보기
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section
        className="content-card desktop-only"
        style={{
          padding: '1rem',
          display: 'grid',
          gap: '0.85rem',
          cursor: 'default',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '0.85rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'grid', gap: '0.2rem' }}>
            <h2
              style={{
                margin: 0,
                color: 'var(--text-primary)',
                fontSize: '0.96rem',
                fontWeight: 900,
              }}
            >
              지금 참여하면 좋은 고민
            </h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.76rem' }}>
              참여 대기, 접전, 한마디 많은 상태를 기준으로 바로 들어갈 투표를 추천합니다.
            </p>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: 'var(--brand-accent-teal)',
              border: '1px solid rgba(45, 212, 191, 0.28)',
              borderRadius: '999px',
              background: 'rgba(45, 212, 191, 0.08)',
              padding: '5px 10px',
              fontSize: '0.68rem',
              fontWeight: 900,
            }}
          >
            <Sparkles size={13} />
            실시간 인기
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '0.7rem',
          }}
        >
          {recommendationCards.map((card) => {
            const CardIcon = card.icon;
            const poll = card.poll;
            return (
              <article
                key={card.key}
                style={{
                  minWidth: 0,
                  display: 'grid',
                  gap: '0.55rem',
                  alignContent: 'start',
                  border: '1px solid var(--bg-card-border)',
                  borderRadius: 'var(--radius-sm)',
                  background: poll ? 'rgba(255,255,255,0.025)' : 'rgba(250, 204, 21, 0.035)',
                  padding: '0.85rem',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: card.tone,
                    fontSize: '0.66rem',
                    fontWeight: 900,
                    letterSpacing: '0.05em',
                  }}
                >
                  <CardIcon size={13} />
                  {card.eyebrow}
                </span>
                <strong
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    lineHeight: 1.38,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {poll ? poll.question : card.emptyTitle}
                </strong>
                <p
                  style={{
                    margin: 0,
                    color: 'var(--text-muted)',
                    fontSize: '0.7rem',
                    lineHeight: 1.45,
                    display: '-webkit-box',
                    overflow: 'hidden',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {poll ? card.help : card.emptyHelp}
                </p>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.4rem',
                    flexWrap: 'wrap',
                    color: 'var(--text-muted)',
                    fontSize: '0.66rem',
                  }}
                >
                  {poll ? (
                    <>
                      <span className="stat-pill">{poll.totalVotes}표</span>
                      <span className="stat-pill">{poll.comments.length}의견</span>
                      <span className="stat-pill">{formatPollEndAt(poll)}</span>
                    </>
                  ) : (
                    <span className="stat-pill">새 투표 생성 추천</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (poll) {
                      setCurrentPoll(poll);
                      navigate(`/poll/${poll.id}`);
                      return;
                    }
                    navigate('/create');
                  }}
                  className="ghost-btn"
                  style={{
                    justifySelf: 'start',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 10px',
                    fontSize: '0.7rem',
                  }}
                >
                  {poll ? '바로 참여' : '새 고민 작성'}
                  <ArrowRight size={13} />
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className="content-card desktop-only"
        style={{
          padding: '1rem',
          display: 'grid',
          gap: '0.85rem',
          cursor: 'default',
          borderColor: 'rgba(45, 212, 191, 0.18)',
          background: 'rgba(45, 212, 191, 0.035)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '0.85rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'grid', gap: '0.2rem' }}>
            <h2
              style={{
                margin: 0,
                color: 'var(--text-primary)',
                fontSize: '0.96rem',
                fontWeight: 900,
              }}
            >
              라이브 응답 큐
            </h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.76rem' }}>
              지금 페이지(최대 20개) 기준 상태예요. 0개여도 눌러서 다음 페이지를 확인할 수 있어요.
            </p>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: 'var(--brand-accent-teal)',
              border: '1px solid rgba(45, 212, 191, 0.28)',
              borderRadius: '999px',
              background: 'rgba(45, 212, 191, 0.08)',
              padding: '5px 10px',
              fontSize: '0.68rem',
              fontWeight: 900,
            }}
          >
            <Eye size={13} />
            {openPollCount}개 진행 중
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '0.6rem',
          }}
        >
          {liveQueueItems.map((item) => {
            const QueueIcon = item.icon;
            const active = signal === item.signal;
            // 카운트가 0이어도 비활성화하지 않는다 — 0은 "현재 페이지엔 없음"일 뿐, 눌러서 다음 페이지를 확인할 수 있어야 한다(B2).
            const emptyOnPage = item.key !== 'all' && item.count === 0;
            let queueStatusLabel = '필터 적용';
            if (active) {
              queueStatusLabel = '적용 중';
            } else if (emptyOnPage) {
              queueStatusLabel = '이 페이지엔 없음';
            }

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setSignal(item.signal);
                }}
                aria-pressed={active}
                style={{
                  minWidth: 0,
                  textAlign: 'left',
                  display: 'grid',
                  gap: '0.42rem',
                  border: active
                    ? '1px solid rgba(45, 212, 191, 0.46)'
                    : '1px solid var(--bg-card-border)',
                  borderRadius: 'var(--radius-sm)',
                  background: active ? 'rgba(45, 212, 191, 0.1)' : 'rgba(255,255,255,0.025)',
                  padding: '0.75rem',
                  color: emptyOnPage ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  opacity: emptyOnPage ? 0.72 : 1,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: item.tone,
                    fontSize: '0.68rem',
                    fontWeight: 900,
                  }}
                >
                  <QueueIcon size={13} />
                  {item.label}
                </span>
                <strong style={{ fontSize: '1.28rem', lineHeight: 1, color: item.tone }}>
                  {item.count}
                </strong>
                <small
                  style={{ color: 'var(--text-muted)', fontSize: '0.66rem', lineHeight: 1.42 }}
                >
                  {item.help}
                </small>
                <span
                  style={{
                    justifySelf: 'start',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '999px',
                    padding: '3px 8px',
                    color: active ? 'var(--brand-accent-teal)' : 'var(--text-secondary)',
                    fontSize: '0.62rem',
                    fontWeight: 900,
                  }}
                >
                  {queueStatusLabel}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

function QuickSeedChips(
  props: Readonly<{
    normalizedQuery: string;
    scope: ScopeMode;
    quickSeeds: ReadonlyArray<string>;
    setSearchInput: (value: string) => void;
  }>,
) {
  const { normalizedQuery, scope, quickSeeds, setSearchInput } = props;
  if (normalizedQuery || scope !== 'all') {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
      <span
        style={{
          fontSize: '0.68rem',
          color: 'var(--text-muted)',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        빠른 검색:
      </span>
      {quickSeeds.map((seed) => (
        <button
          key={seed}
          type="button"
          onClick={() => setSearchInput(seed)}
          className="ghost-inline quick-seed-chip"
          style={{
            padding: '4px 8px',
            borderRadius: '999px',
            border: '1px solid var(--bg-card-border)',
            color: 'var(--text-muted)',
            fontSize: '0.68rem',
          }}
        >
          {seed}
        </button>
      ))}
    </div>
  );
}

function ActiveFiltersBar(
  props: Readonly<{
    hasActiveFilters: boolean;
    activeFilters: ReadonlyArray<string>;
    onResetFilters: () => void;
  }>,
) {
  const { hasActiveFilters, activeFilters, onResetFilters } = props;
  if (!hasActiveFilters) {
    return null;
  }

  return (
    <div className="content-card" style={{ padding: '0.65rem 0.9rem' }}>
      <p
        style={{
          margin: 0,
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap',
        }}
      >
        <SlidersHorizontal size={12} />
        <strong style={{ color: 'var(--text-primary)' }}>활성 필터:</strong>
        {activeFilters.join(' / ')}
        <button
          type="button"
          onClick={onResetFilters}
          style={{
            marginLeft: 'auto',
            border: '1px solid var(--bg-card-border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            borderRadius: '999px',
            fontSize: '0.66rem',
            padding: '4px 8px',
            cursor: 'pointer',
          }}
        >
          초기화
        </button>
      </p>
    </div>
  );
}

function PollResultsRegion(
  props: Readonly<{
    isLoading: boolean;
    visiblePolls: Poll[];
    hasActiveFilters: boolean;
    emptyStateHint: string;
    query: string;
    userId?: string;
    viewMode: ViewMode;
    copiedPollId: string | null;
    navigate: NavigateFunction;
    onResetFilters: () => void;
    setCurrentPoll: (poll: Poll | null) => void;
    handleGotoPoll: (event: React.MouseEvent<HTMLButtonElement>, pollId: string) => void;
    handleCopyPollLink: (
      event: React.MouseEvent<HTMLButtonElement>,
      pollId: string,
    ) => Promise<void>;
    handleCopyPollEmbed: (
      event: React.MouseEvent<HTMLButtonElement>,
      pollId: string,
    ) => Promise<void>;
  }>,
) {
  const {
    isLoading,
    visiblePolls,
    hasActiveFilters,
    emptyStateHint,
    query,
    userId,
    viewMode,
    copiedPollId,
    navigate,
    onResetFilters,
    setCurrentPoll,
    handleGotoPoll,
    handleCopyPollLink,
    handleCopyPollEmbed,
  } = props;

  if (isLoading && visiblePolls.length === 0) {
    return (
      <div
        className="content-card"
        role="status"
        aria-live="polite"
        style={{ padding: '1.75rem', display: 'grid', gap: '0.75rem' }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '0.82rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>
            {MASCOT.thinking.emoji}
          </span>
          {VOICE.loading}
        </p>
        {['skeleton-1', 'skeleton-2', 'skeleton-3'].map((skeletonKey) => (
          <div key={skeletonKey} style={{ display: 'grid', gap: '0.55rem' }}>
            <div className="skeleton" style={{ height: '0.8rem', width: '42%' }} />
            <div className="skeleton" style={{ height: '1.35rem', width: '72%' }} />
            <div className="skeleton" style={{ height: '0.75rem', width: '56%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (visiblePolls.length === 0) {
    return (
      <div
        className="content-card"
        style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          display: 'grid',
          gap: '1.1rem',
          justifyItems: 'center',
        }}
      >
        <span
          className="empty-state-icon"
          aria-hidden="true"
          style={{ fontSize: '3.6rem', lineHeight: 1 }}
        >
          {hasActiveFilters ? '🔍' : MASCOT.idle.emoji}
        </span>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
          {hasActiveFilters ? '조건에 맞는 고민이 없어요' : MASCOT.idle.line}
        </h3>
        <p
          style={{
            fontSize: '0.92rem',
            color: 'var(--text-secondary)',
            maxWidth: '460px',
            lineHeight: 1.65,
          }}
        >
          {emptyStateHint}
        </p>
        {hasActiveFilters ? (
          <p
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              maxWidth: '460px',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            결정 신호 필터는 지금 페이지(최대 20개) 기준이에요. 다음 페이지에는 있을 수 있으니
            아래에서 넘겨보거나 필터를 초기화해 보세요.
          </p>
        ) : (
          <p
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              maxWidth: '460px',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            예시처럼 시작해 보세요 — “점심 메뉴 골라줘”, “회의 안건 우선순위”, “주말 일정 투표”.
          </p>
        )}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onResetFilters}
              className="btn-secondary"
              style={{
                padding: '10px 18px',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <X size={15} />
              필터 초기화
            </button>
          ) : null}
          <button
            onClick={() => navigate('/create')}
            className="btn-primary"
            style={{
              padding: '10px 20px',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <Plus size={16} />첫 고민 작성하러 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <p
        aria-live="polite"
        style={{
          margin: 0,
          fontSize: '0.74rem',
          color: 'var(--text-muted)',
          fontWeight: 700,
        }}
      >
        {hasActiveFilters
          ? `조건에 맞는 고민 ${visiblePolls.length}개`
          : `고민 ${visiblePolls.length}개`}
      </p>
      <div className="poll-feed-grid" style={{ display: 'grid', gap: '0.9rem' }}>
        {visiblePolls.map((poll, index) => (
          <PollCard
            key={poll.id}
            poll={poll}
            index={index}
            userId={userId}
            viewMode={viewMode}
            copiedPollId={copiedPollId}
            setCurrentPoll={setCurrentPoll}
            navigate={navigate}
            handleGotoPoll={handleGotoPoll}
            handleCopyPollLink={handleCopyPollLink}
            handleCopyPollEmbed={handleCopyPollEmbed}
          />
        ))}
      </div>
      {query ? (
        <p
          style={{
            margin: '0',
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
            textAlign: 'right',
          }}
        >
          총 {visiblePolls.length}개 결과
        </p>
      ) : null}
    </>
  );
}

// 보여줄 페이지 번호 윈도우(현재 페이지 주변 ±2)를 만든다.
const buildPageWindow = (current: number, totalPages: number): number[] => {
  const windowSize = 5;
  let start = Math.max(1, current - 2);
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  const pages: number[] = [];
  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }
  return pages;
};

function PollPagination(
  props: Readonly<{
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    isLoading: boolean;
    onGoToPage: (page: number) => void;
  }>,
) {
  const { page, limit, total, hasMore, isLoading, onGoToPage } = props;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));

  // 페이지가 하나뿐이고 다음 페이지도 없으면 컨트롤을 감춘다(기존 단순 화면 보존).
  if (totalPages <= 1 && !hasMore) {
    return null;
  }

  const pageNumbers = buildPageWindow(page, totalPages);
  const canPrev = page > 1;
  const canNext = hasMore || page < totalPages;

  return (
    <nav
      aria-label="고민 목록 페이지"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        marginTop: '0.4rem',
      }}
    >
      <button
        type="button"
        className="ghost-btn"
        onClick={() => onGoToPage(page - 1)}
        disabled={!canPrev || isLoading}
        aria-label="이전 페이지"
        style={{
          padding: '7px 12px',
          fontSize: '0.74rem',
          opacity: !canPrev || isLoading ? 0.5 : 1,
          cursor: !canPrev || isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        이전
      </button>

      {pageNumbers.map((pageNumber) => {
        const isCurrent = pageNumber === page;
        return (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onGoToPage(pageNumber)}
            disabled={isLoading}
            aria-label={`${pageNumber}페이지`}
            aria-current={isCurrent ? 'page' : undefined}
            className={isCurrent ? 'btn-primary' : 'ghost-btn'}
            style={{
              minWidth: '38px',
              padding: '7px 11px',
              fontSize: '0.74rem',
              fontWeight: isCurrent ? 800 : 600,
              cursor: isLoading ? 'progress' : 'pointer',
            }}
          >
            {pageNumber}
          </button>
        );
      })}

      <button
        type="button"
        className="ghost-btn"
        onClick={() => onGoToPage(page + 1)}
        disabled={!canNext || isLoading}
        aria-label="다음 페이지"
        style={{
          padding: '7px 12px',
          fontSize: '0.74rem',
          opacity: !canNext || isLoading ? 0.5 : 1,
          cursor: !canNext || isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        다음
      </button>

      <span
        aria-live="polite"
        style={{
          marginLeft: '0.35rem',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          fontWeight: 700,
        }}
      >
        {page} / {totalPages} 페이지 · 총 {total}개
      </span>
    </nav>
  );
}

export const PollList: React.FC = () => {
  useDocumentTitle('고민 둘러보기');
  const {
    polls,
    isLoading,
    fetchPolls,
    error,
    setCurrentPoll,
    page,
    limit,
    total,
    hasMore,
    goToPage,
  } = usePollStore();
  const userId = useAuthStore((state) => state.user?.id);
  const isGuest = useAuthStore((state) => state.user?.isGuest);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('latest');
  const [scope, setScope] = useState<ScopeMode>('all');
  const [signal, setSignal] = useState<SignalMode>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('stack');
  const [copiedPollId, setCopiedPollId] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinCodeMessage, setJoinCodeMessage] = useState('');
  const [recentPollHistory, setRecentPollHistory] = useState(() => getRecentPollHistory());
  const [pinnedPollIds, setPinnedPollIds] = useState<string[]>(() => loadPinnedPollIds());
  // 데스크탑 전용 운영 도구/인사이트 묶음은 기본 접힘 — 첫 화면은 "투표가 주인공"이 되게 단순하게.
  const [operatorToolsExpanded, setOperatorToolsExpanded] = useState(false);

  // URL↔필터 상태 동기화 레이스 가드: state→URL 으로 우리가 직접 쓴 쿼리스트링을 기록해두고,
  // URL→state 효과가 "자기 자신이 쓴 변경"을 외부 변경으로 오인해 기본값으로 되돌리지 않게 한다.
  // (이게 없으면 비기본 필터 적용 시 signal/sort/scope 가 무한 핑퐁하며 리렌더 폭주)
  const lastSyncedSearchRef = useRef<string | null>(null);

  useEffect(() => {
    const currentSearch = searchParams.toString();
    // 우리가 방금 setSearchParams 로 쓴 값이면(=외부 내비게이션 아님) 되돌리기 금지.
    if (currentSearch === lastSyncedSearchRef.current) {
      return;
    }
    lastSyncedSearchRef.current = currentSearch;

    const nextQuery = (searchParams.get('q') || '').trim();
    const nextSort = searchParams.get('sort');
    const nextScope = searchParams.get('scope');
    const nextSignal = searchParams.get('signal');

    if (nextQuery !== query) {
      setQuery(nextQuery);
    }
    if (nextQuery !== searchInput) {
      setSearchInput(nextQuery);
    }

    if (isSortMode(nextSort)) {
      setSortBy((current) => (current === nextSort ? current : nextSort));
    } else if (sortBy !== 'latest') {
      setSortBy('latest');
    }

    if (isScopeMode(nextScope)) {
      if (nextScope === 'mine' && !userId) {
        setScope('all');
      } else {
        setScope((current) => (current === nextScope ? current : nextScope));
      }
    } else {
      setScope('all');
    }

    if (isSignalMode(nextSignal)) {
      setSignal((current) => (current === nextSignal ? current : nextSignal));
    } else if (signal !== 'all') {
      setSignal('all');
    }
  }, [searchParams, userId, query, searchInput, sortBy, signal]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      const nextQuery = searchInput.trim();
      if (nextQuery !== query) {
        setQuery(nextQuery);
      }
    }, 260);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [searchInput, query]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const normalizedQuery = query.trim();

    if (normalizedQuery) {
      next.set('q', normalizedQuery);
    } else {
      next.delete('q');
    }

    next.set('sort', sortBy);

    if (scope === 'all' || (scope === 'mine' && !userId)) {
      next.delete('scope');
    } else {
      next.set('scope', scope);
    }

    if (signal === 'all') {
      next.delete('signal');
    } else {
      next.set('signal', signal);
    }

    const nextSearch = next.toString();
    if (nextSearch !== searchParams.toString()) {
      // 우리가 쓰는 값임을 기록해, URL→state 효과가 이걸 외부 변경으로 오인하지 않게 한다.
      lastSyncedSearchRef.current = nextSearch;
      setSearchParams(next, { replace: true });
    }
  }, [query, sortBy, scope, signal, userId, searchParams, setSearchParams]);

  // 검색(q)·정렬(sort)·진행상태(status)를 서버측으로 보낸다(#W2). status는 signal 중 '마감'만 서버 필터로
  // 매핑하고, 나머지 파생 신호(접전·신규·피드백 등)·스코프(내 글/비회원)는 결과에 대한 클라 보조필터로 둔다.
  const serverStatus: 'all' | 'closed' = signal === 'closed' ? 'closed' : 'all';
  const serverFilters = useMemo(
    () => ({ q: query.trim(), sort: sortBy, status: serverStatus, category: null }),
    [query, sortBy, serverStatus],
  );

  // 검색/정렬/상태 변경 시 1페이지부터 서버 질의를 다시 보낸다(필터를 함께 전달).
  useEffect(() => {
    fetchPolls(1, serverFilters);
  }, [fetchPolls, serverFilters]);

  // Keyboard shortcuts — "/" focuses search, "c" opens the create flow, "g"
  // jumps to the JOIN CODE field. Ignored while typing in an input/textarea so
  // it never hijacks normal text entry.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
        return;
      }

      if (event.key === '/') {
        event.preventDefault();
        document.getElementById('poll-search-input')?.focus();
      } else if (event.key === 'c' || event.key === 'C') {
        event.preventDefault();
        navigate('/create');
      } else if (event.key === 'g' || event.key === 'G') {
        event.preventDefault();
        const joinField = document.getElementById('join-code-input');
        joinField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (joinField as HTMLInputElement | null)?.focus();
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    const syncRecentPollHistory = () => {
      setRecentPollHistory(getRecentPollHistory());
    };

    syncRecentPollHistory();
    globalThis.addEventListener('focus', syncRecentPollHistory);
    globalThis.addEventListener('storage', syncRecentPollHistory);

    return () => {
      globalThis.removeEventListener('focus', syncRecentPollHistory);
      globalThis.removeEventListener('storage', syncRecentPollHistory);
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const scopedCounts = useMemo(() => {
    const mine = userId ? polls.filter((poll) => poll.creatorId === userId).length : 0;
    const guest = polls.filter((poll) =>
      isGuestCreator(poll.creatorId, poll.creatorIsGuest),
    ).length;

    return {
      all: polls.length,
      mine,
      guest,
    };
  }, [polls, userId]);

  const displayScopeOptions = useMemo(
    () =>
      scopeOptions.map((option) => {
        let count = scopedCounts.guest;
        if (option.value === 'all') {
          count = scopedCounts.all;
        } else if (option.value === 'mine') {
          count = scopedCounts.mine;
        }

        return { ...option, count };
      }),
    [scopedCounts],
  );

  const signalCounts = useMemo(() => {
    // 결과 파생 시그널(접전·한마디많은)은 이 기기가 결과를 볼 수 있는 폴만 세서(미공개 결과 누출 방지)
    // 칩 카운트가 실제 노출되는 목록과 어긋나지 않게 한다.
    const voted = votedPollIds();
    const matchesForViewer = (poll: Poll, value: SignalMode) => {
      if (!matchesSignalMode(poll, value)) {
        return false;
      }
      if (value === 'closeRace' || value === 'feedbackRich') {
        return canRevealResults(poll, voted.has(poll.id));
      }
      return true;
    };

    return signalOptions.map((option) => ({
      ...option,
      count:
        option.value === 'all'
          ? polls.length
          : polls.filter((poll) => matchesForViewer(poll, option.value)).length,
    }));
  }, [polls]);

  const visiblePolls = useMemo(() => {
    // 검색(q)·정렬(sort)·마감상태는 서버가 이미 적용한 현재 페이지(polls)다(#W2).
    // 여기서는 서버에 없는 보조필터(스코프=내 글/비회원, 파생 신호=접전·신규 등)만 결과에 덧입힌다.
    let next = [...polls];

    if (scope === 'mine' && userId) {
      next = next.filter((poll) => poll.creatorId === userId);
    }

    if (scope === 'guest') {
      next = next.filter((poll) => isGuestCreator(poll.creatorId, poll.creatorIsGuest));
    }

    // 'closed'는 서버 status로 처리되므로 클라에서 중복 적용하지 않는다.
    if (signal !== 'all' && signal !== 'closed') {
      // 결과 파생 시그널(접전·한마디많은)은 이 기기가 결과를 볼 수 있는 폴만 매칭해(미공개 결과 누출 방지).
      const voted = votedPollIds();
      const gated = signal === 'closeRace' || signal === 'feedbackRich';
      next = next.filter(
        (poll) =>
          matchesSignalMode(poll, signal) && (!gated || canRevealResults(poll, voted.has(poll.id))),
      );
    }

    return next;
  }, [polls, scope, signal, userId]);

  const totalVotes = useMemo(() => polls.reduce((acc, poll) => acc + poll.totalVotes, 0), [polls]);
  const totalComments = useMemo(
    () => polls.reduce((acc, poll) => acc + poll.comments.length, 0),
    [polls],
  );
  const openPollCount = useMemo(() => polls.filter((poll) => !isPollClosed(poll)).length, [polls]);

  const hotPoll = useMemo(() => hottestActivePoll(polls), [polls]);
  // 히어로 핫고민도 afterVote면 이 기기가 투표(또는 마감/always)했을 때만 퍼센트 바를 드러낸다.
  const hotPollRevealResults = useMemo(
    () => (hotPoll ? canRevealResults(hotPoll, votedPollIds().has(hotPoll.id)) : false),
    [hotPoll],
  );

  // Animated hero counters — count up to the live totals once data arrives.
  const pollsCountDisplay = useCountUp(polls.length);
  const totalVotesDisplay = useCountUp(totalVotes);
  const totalCommentsDisplay = useCountUp(totalComments);

  // Scroll-reveal anchors for the page's primary sections.
  const flowSectionRef = useScrollReveal<HTMLDivElement>();
  const insightSectionRef = useScrollReveal<HTMLDivElement>();

  const activeFilters = useMemo(() => {
    const labels: string[] = [];

    if (scope !== 'all') {
      const matchedScope = scopeOptions.find((option) => option.value === scope);
      if (matchedScope) {
        labels.push(matchedScope.label);
      }
    }

    if (normalizedQuery) {
      labels.push(`검색: ${normalizedQuery}`);
    }

    if (signal !== 'all') {
      const matchedSignal = signalOptions.find((option) => option.value === signal);
      if (matchedSignal) {
        labels.push(matchedSignal.label);
      }
    }

    return labels;
  }, [scope, signal, normalizedQuery]);

  const hasActiveFilters = activeFilters.length > 0;
  const quickSeeds = ['점심 메뉴', '회의 안건', '주말 일정', '프로젝트 선택'];
  const decisionFlowCards = [
    {
      key: 'create',
      step: '01',
      label: '새 안건',
      title: '질문 설계',
      metric: `${polls.length}개 등록`,
      help: '보기, 마감, 참고자료를 한 화면에서 정리합니다.',
      actionLabel: '작성',
      icon: Plus,
      tone: 'var(--brand-primary)',
    },
    {
      key: 'launch',
      step: '02',
      label: '배포',
      title: '링크·코드·QR',
      metric: '멀티 채널',
      help: '채팅방, 회의 화면, 게시글에 맞춰 참여 경로를 나눕니다.',
      actionLabel: '코드 입력',
      icon: QrCode,
      tone: 'var(--brand-accent-gold)',
    },
    {
      key: 'live',
      step: '03',
      label: '라이브',
      title: '응답 큐',
      metric: `${openPollCount}개 진행`,
      help: '첫 응답 대기, 접전, 마감 임박 신호를 우선 처리합니다.',
      actionLabel: '큐 보기',
      icon: Radio,
      tone: 'var(--brand-accent-teal)',
    },
    {
      key: 'report',
      step: '04',
      label: '정리',
      title: '결정 근거',
      metric: `${totalVotes}표 · ${totalComments}의견`,
      help: '상위 선택지, 의견률, 후속 액션을 결과 화면에서 묶습니다.',
      actionLabel: '인기순',
      icon: BarChart3,
      tone: 'var(--brand-accent-coral)',
    },
  ];
  const launchSurfaceChips = [
    { label: '참여 링크', icon: Link },
    { label: '참여 코드', icon: Code2 },
    { label: 'QR', icon: QrCode },
    { label: '임베드', icon: LayoutGrid },
    { label: '라이브 필터', icon: Radio },
    { label: '결과 리포트', icon: FileText },
  ];
  const recommendationCards = useMemo(() => {
    const openPolls = polls.filter((poll) => !isPollClosed(poll));
    const newestOpenPoll = [...openPolls].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
    const needsVotePoll =
      [...openPolls]
        .filter((poll) => poll.totalVotes === 0)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ||
      newestOpenPoll ||
      null;
    const closingSoonPoll =
      [...openPolls]
        .filter(isClosingSoonPoll)
        .sort(
          (a, b) => new Date(a.endsAt || '').getTime() - new Date(b.endsAt || '').getTime(),
        )[0] || null;
    const closeRacePoll =
      [...openPolls].filter(isCloseRacePoll).sort((a, b) => b.totalVotes - a.totalVotes)[0] || null;
    const feedbackPoll =
      [...openPolls]
        .filter(isFeedbackRichPoll)
        .sort((a, b) => b.comments.length - a.comments.length)[0] || null;
    const attachmentPoll =
      [...openPolls]
        .filter(hasAttachmentPoll)
        .sort((a, b) => (b.attachments?.length || 0) - (a.attachments?.length || 0))[0] || null;

    const seenPollIds = new Set<string>();
    const cards = [
      {
        key: 'needsVote',
        eyebrow: '첫 표 필요',
        title: '첫 표가 필요한 고민',
        help: '아직 흐름이 만들어지지 않은 투표에 참여해 기준점을 만들어 주세요.',
        poll: needsVotePoll,
        emptyTitle: '새 고민을 올려 첫 응답 받기',
        emptyHelp: '현재 참여 가능한 고민이 없으면 직접 질문을 만들 수 있습니다.',
        icon: Vote,
        tone: 'var(--brand-accent-gold)',
      },
      {
        key: 'closingSoon',
        eyebrow: '마감 임박',
        title: '마감이 가까운 고민',
        help: '곧 닫히는 투표입니다. 지금 참여하면 마지막 흐름에 영향을 줄 수 있습니다.',
        poll: closingSoonPoll,
        emptyTitle: '마감 임박 투표 없음',
        emptyHelp: '24시간 안에 닫히는 투표가 생기면 이곳에 우선 노출됩니다.',
        icon: TimerReset,
        tone: 'var(--brand-accent-gold)',
      },
      {
        key: 'closeRace',
        eyebrow: '접전',
        title: '접전 중인 고민',
        help: '한 표가 결과 해석을 바꿀 수 있는 투표입니다.',
        poll: closeRacePoll,
        emptyTitle: '아직 접전 투표 없음',
        emptyHelp: '참여가 쌓이면 근소한 차이의 투표를 자동으로 보여줍니다.',
        icon: Sparkles,
        tone: 'var(--brand-accent-coral)',
      },
      {
        key: 'feedback',
        eyebrow: '의견 활발',
        title: '의견이 활발한 고민',
        help: '댓글 맥락까지 함께 보면 더 좋은 결정을 할 수 있습니다.',
        poll: feedbackPoll,
        emptyTitle: '의견을 기다리는 중',
        emptyHelp: '투표 후 한마디가 쌓이면 피드백이 활발한 고민을 강조합니다.',
        icon: MessageSquare,
        tone: 'var(--brand-accent-teal)',
      },
      {
        key: 'attachment',
        eyebrow: '참고자료',
        title: '참고자료가 있는 고민',
        help: '첨부파일을 보고 맥락을 확인한 뒤 더 정확하게 참여할 수 있습니다.',
        poll: attachmentPoll,
        emptyTitle: '첨부파일 있는 투표 없음',
        emptyHelp: 'PDF, TXT, CSV, JSON 파일이 첨부된 투표가 생기면 이곳에 노출됩니다.',
        icon: FileText,
        tone: 'var(--brand-accent-teal)',
      },
    ];

    return cards.filter((card) => {
      if (!card.poll) {
        return true;
      }

      if (seenPollIds.has(card.poll.id)) {
        return false;
      }

      seenPollIds.add(card.poll.id);
      return true;
    });
  }, [polls]);

  const operatorInsightCards = useMemo(() => {
    const openPolls = polls.filter((poll) => !isPollClosed(poll));
    const waitingPolls = openPolls.filter((poll) => poll.totalVotes === 0);
    const closingSoonPolls = openPolls.filter(isClosingSoonPoll);
    const closeRacePolls = openPolls.filter(isCloseRacePoll);
    const feedbackRichPolls = openPolls.filter(isFeedbackRichPoll);
    const feedbackRate = totalVotes > 0 ? Math.round((totalComments / totalVotes) * 100) : 0;

    return [
      {
        key: 'open',
        label: '진행 중',
        value: `${openPolls.length}개`,
        help: '지금 응답을 받을 수 있는 투표입니다.',
        signal: 'all' as SignalMode,
        icon: Eye,
        tone: 'var(--brand-accent-teal)',
      },
      {
        key: 'waiting',
        label: '첫 응답 대기',
        value: `${waitingPolls.length}개`,
        help: '링크를 다시 공유하면 결과 흐름이 시작됩니다.',
        signal: 'needsVote' as SignalMode,
        icon: Vote,
        tone: 'var(--brand-accent-gold)',
      },
      {
        key: 'urgent',
        label: '운영 주의',
        value: `${closingSoonPolls.length + closeRacePolls.length}개`,
        help: '마감 임박 또는 접전 상태라 추가 공유 효과가 큽니다.',
        signal:
          closingSoonPolls.length > 0 ? ('closingSoon' as SignalMode) : ('closeRace' as SignalMode),
        icon: TimerReset,
        tone: 'var(--brand-accent-coral)',
      },
      {
        key: 'feedback',
        label: '피드백률',
        value: `${feedbackRate}%`,
        help:
          feedbackRichPolls.length > 0
            ? '의견이 충분한 투표는 결과 요약과 결정 메모로 정리하기 좋습니다.'
            : '투표 후 한마디를 요청하면 결정 근거가 더 선명해집니다.',
        signal: 'feedbackRich' as SignalMode,
        icon: MessageSquare,
        tone: 'var(--brand-primary)',
      },
    ];
  }, [polls, totalComments, totalVotes]);

  const recentPollCards = useMemo(
    () =>
      recentPollHistory
        .map((item) => {
          const livePoll = polls.find((poll) => poll.id === item.id) || null;

          return {
            ...item,
            poll: livePoll,
            question: livePoll?.question || item.question,
            description: livePoll?.description ?? item.description,
            totalVotes: livePoll?.totalVotes ?? item.totalVotes,
            commentCount: livePoll?.comments.length ?? item.commentCount,
            signal: livePoll ? getPollSignalLabel(livePoll) : '최근 조회',
          };
        })
        .slice(0, 4),
    [polls, recentPollHistory],
  );

  const pinnedPollCards = useMemo(
    () =>
      pinnedPollIds
        .map((pollId) => polls.find((poll) => poll.id === pollId) || null)
        .filter((poll): poll is Poll => poll !== null),
    [pinnedPollIds, polls],
  );

  const liveQueueItems = useMemo(() => {
    const openPolls = polls.filter((poll) => !isPollClosed(poll));

    return [
      {
        key: 'all',
        label: '전체 보기',
        count: polls.length,
        help: '마감 포함 전체 목록으로 돌아갑니다.',
        signal: 'all' as SignalMode,
        icon: Eye,
        tone: 'var(--brand-accent-teal)',
      },
      {
        key: 'needsVote',
        label: '첫 응답 대기',
        count: openPolls.filter((poll) => poll.totalVotes === 0).length,
        help: '아직 기준점이 없어 첫 표가 중요한 투표입니다.',
        signal: 'needsVote' as SignalMode,
        icon: Vote,
        tone: 'var(--brand-accent-gold)',
      },
      {
        key: 'closingSoon',
        label: '마감 임박',
        count: openPolls.filter(isClosingSoonPoll).length,
        help: '24시간 안에 닫혀 마지막 참여가 필요한 투표입니다.',
        signal: 'closingSoon' as SignalMode,
        icon: TimerReset,
        tone: 'var(--brand-accent-gold)',
      },
      {
        key: 'closeRace',
        label: '접전',
        count: openPolls.filter(isCloseRacePoll).length,
        help: '한 표가 결과 해석을 바꿀 수 있는 투표입니다.',
        signal: 'closeRace' as SignalMode,
        icon: Sparkles,
        tone: 'var(--brand-accent-coral)',
      },
      {
        key: 'feedbackRich',
        label: '의견 활발',
        count: openPolls.filter(isFeedbackRichPoll).length,
        help: '댓글 맥락이 충분해 결과를 읽기 좋은 투표입니다.',
        signal: 'feedbackRich' as SignalMode,
        icon: MessageSquare,
        tone: 'var(--brand-accent-teal)',
      },
      {
        key: 'withAttachment',
        label: '자료 첨부',
        count: openPolls.filter(hasAttachmentPoll).length,
        help: '파일을 확인하고 더 정확하게 판단할 수 있는 투표입니다.',
        signal: 'withAttachment' as SignalMode,
        icon: FileText,
        tone: 'var(--brand-accent-teal)',
      },
    ];
  }, [polls]);

  const handleJoinCodeSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = joinCodeInput.trim().replace(/^#/, '').replace(/\s+/g, '');

    if (!normalizedCode) {
      setJoinCodeMessage('참여 코드를 입력해 주세요.');
      return;
    }

    if (!/^[A-Za-z0-9_-]{4,80}$/.test(normalizedCode)) {
      setJoinCodeMessage('코드는 영문, 숫자, 하이픈, 밑줄만 사용할 수 있습니다.');
      return;
    }

    const matchedPoll = polls.find((poll) => poll.id === normalizedCode);
    if (matchedPoll) {
      setCurrentPoll(matchedPoll);
    }

    setJoinCodeMessage('');
    navigate(`/poll/${encodeURIComponent(normalizedCode)}`);
  };

  const handleGotoPoll = (event: React.MouseEvent<HTMLButtonElement>, pollId: string) => {
    event.stopPropagation();
    const target = visiblePolls.find((poll) => poll.id === pollId);
    if (!target) {
      return;
    }

    setCurrentPoll(target);
    navigate(`/poll/${pollId}`);
  };

  const handleCopyPollLink = async (event: React.MouseEvent<HTMLButtonElement>, pollId: string) => {
    event.stopPropagation();
    const target = visiblePolls.find((poll) => poll.id === pollId);
    if (!target) {
      return;
    }

    try {
      await copyText(resolvePollShareUrl(target));
      setCopiedPollId(pollId);
      setTimeout(() => {
        setCopiedPollId((current) => (current === pollId ? null : current));
      }, 2000);
    } catch (err) {
      console.error('[picky] failed to copy poll link', err);
      globalThis.alert('링크 복사에 실패했습니다.');
    }
  };

  const handleCopyPollEmbed = async (
    event: React.MouseEvent<HTMLButtonElement>,
    pollId: string,
  ) => {
    event.stopPropagation();
    const target = visiblePolls.find((poll) => poll.id === pollId);
    if (!target) {
      return;
    }

    try {
      await copyText(buildPollEmbedCode(target));
      const copiedKey = `embed-${pollId}`;
      setCopiedPollId(copiedKey);
      setTimeout(() => {
        setCopiedPollId((current) => (current === copiedKey ? null : current));
      }, 2000);
    } catch (err) {
      console.error('[picky] failed to copy poll embed code', err);
      globalThis.alert('임베드 코드 복사에 실패했습니다.');
    }
  };

  const handleRecentPollOpen = (pollId: string) => {
    const target = polls.find((poll) => poll.id === pollId);
    if (target) {
      setCurrentPoll(target);
    }

    navigate(`/poll/${encodeURIComponent(pollId)}`);
  };

  const handleRemoveRecentPoll = (event: React.MouseEvent<HTMLButtonElement>, pollId: string) => {
    event.stopPropagation();
    setRecentPollHistory(removeRecentPollHistoryItem(pollId));
  };

  const handleClearRecentPolls = () => {
    clearRecentPollHistory();
    setRecentPollHistory([]);
  };

  const handleTogglePinnedPoll = (event: React.MouseEvent<HTMLButtonElement>, pollId: string) => {
    event.stopPropagation();
    setPinnedPollIds((current) => {
      const next = current.includes(pollId)
        ? current.filter((item) => item !== pollId)
        : [pollId, ...current.filter((item) => item !== pollId)].slice(0, MAX_PINNED_POLLS);
      savePinnedPollIds(next);
      return next;
    });
  };

  const handleClearPinnedPolls = () => {
    savePinnedPollIds([]);
    setPinnedPollIds([]);
  };

  const handleResetFilters = () => {
    setScope('all');
    setQuery('');
    setSearchInput('');
    setSortBy('latest');
    setSignal('all');
  };

  const emptyStateHint = resolveEmptyStateHint(hasActiveFilters, Boolean(userId && isGuest));

  return (
    <section
      className="animate-slide-up"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}
    >
      <div className="hero-shell">
        <div style={{ display: 'grid', gap: '0.95rem', position: 'relative' }}>
          <span className="hero-live-badge hero-enter" style={{ ['--enter-i' as string]: 0 }}>
            <span className="hero-live-dot" aria-hidden="true" />
            지금 {openPollCount}개 투표 진행 중
          </span>

          <p
            className="hero-lede hero-enter"
            style={{ ['--enter-i' as string]: 0.5, fontSize: '0.8rem', fontWeight: 600, margin: 0 }}
          >
            🧪 {BETA_NOTICE}
          </p>

          <h1 className="hero-title hero-enter" style={{ ['--enter-i' as string]: 1 }}>
            고민되는 선택, <span className="hero-accent">링크 하나</span>로 빠르게 물어보세요
          </h1>

          <p
            className="hero-lede hero-enter mobile-only"
            style={{ ['--enter-i' as string]: 2, marginBottom: '0.1rem' }}
          >
            친구·동료에게 투표 링크를 보내고 답을 빠르게 모아요.
          </p>

          <p className="hero-lede hero-enter desktop-only" style={{ ['--enter-i' as string]: 2 }}>
            점심 메뉴부터 팀 회의 안건까지 — 선택지를 카드로 만들고 지인·동료에게 링크를 보내면 바로
            의견이 모입니다. 결과는 실시간으로, 결정은 더 가볍게.
          </p>

          <div
            className="hero-enter"
            style={{
              ['--enter-i' as string]: 3,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.6rem',
              marginTop: '0.1rem',
            }}
          >
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="btn-primary hero-cta"
            >
              <Plus size={17} />새 고민 만들기
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                document.getElementById('poll-list-anchor')?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                });
              }}
              className="btn-secondary hero-secondary-cta"
            >
              <Vote size={16} />
              둘러보기
            </button>
            <span
              className="desktop-only"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-muted)',
                fontSize: '0.68rem',
              }}
            >
              <kbd
                style={{
                  border: '1px solid var(--bg-card-border-hover)',
                  borderRadius: '6px',
                  padding: '1px 6px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  color: 'var(--text-secondary)',
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                C
              </kbd>
              <span>키로 바로 작성</span>
            </span>
          </div>

          {hotPoll && (
            <button
              type="button"
              className="hot-poll-card hero-enter"
              style={{
                ['--enter-i' as string]: 3.5,
                cursor: 'pointer',
                padding: '1.25rem',
                borderRadius: '16px',
                background:
                  'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(45, 212, 191, 0.08) 100%)',
                border: '1.5px solid rgba(99, 102, 241, 0.3)',
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.12)',
                display: 'grid',
                gap: '0.65rem',
                position: 'relative',
                overflow: 'hidden',
                marginTop: '0.4rem',
                maxWidth: '620px',
                width: '100%',
                textAlign: 'left',
                color: 'inherit',
                font: 'inherit',
              }}
              onClick={() => {
                setCurrentPoll(hotPoll);
                navigate(`/poll/${hotPoll.id}`);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    background: 'var(--brand-accent-coral)',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <Sparkles size={11} />
                  실시간 핫 고민 🔥
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {hotPoll.totalVotes}명 참여 중
                </span>
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.2rem',
                  fontWeight: 900,
                  color: 'var(--text-primary)',
                  lineHeight: 1.4,
                }}
              >
                {hotPoll.question}
              </h2>
              {hotPoll.description && (
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.88rem',
                    color: 'var(--text-secondary)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.45,
                  }}
                >
                  {hotPoll.description}
                </p>
              )}

              <div style={{ display: 'grid', gap: '0.45rem', marginTop: '0.2rem' }}>
                {hotPoll.options.slice(0, 2).map((opt) => {
                  // afterVote 미공개면 퍼센트/바를 숨기고 선택지만 미리보기로 보여준다.
                  const pct = optionPercent(opt.voteCount, hotPoll.totalVotes);
                  return (
                    <div key={opt.id} style={{ display: 'grid', gap: '2px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '8px',
                          fontSize: '0.86rem',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>{opt.text}</span>
                        {hotPollRevealResults ? (
                          <span style={{ fontWeight: 800, color: 'var(--brand-accent-teal)' }}>
                            {pct}%
                          </span>
                        ) : null}
                      </div>
                      {hotPollRevealResults ? (
                        <div
                          style={{
                            height: '9px',
                            background: 'rgba(255,255,255,0.06)',
                            borderRadius: '999px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${pct}%`,
                              background: 'var(--brand-accent-teal)',
                              borderRadius: '999px',
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {!hotPollRevealResults ? (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    🔒 투표하면 결과가 보여요
                  </span>
                ) : null}
              </div>
            </button>
          )}

          <div
            className="kpi-grid hero-enter"
            style={{ ['--enter-i' as string]: 4, marginTop: '0.5rem' }}
          >
            <article
              className="kpi-item"
              style={{ ['--kpi-glow' as string]: 'oklch(67% 0.14 165 / 0.12)' }}
            >
              <span className="segment-title" style={{ fontSize: '0.83rem' }}>
                지금 운영 중인 고민
              </span>
              <strong
                className="kpi-value"
                style={{ fontSize: '1.6rem', color: 'var(--brand-primary-light)' }}
              >
                {pollsCountDisplay}
              </strong>
              <span className="form-note">누적 등록 수</span>
            </article>
            <article
              className="kpi-item"
              style={{ ['--kpi-glow' as string]: 'oklch(72% 0.15 170 / 0.12)' }}
            >
              <span className="segment-title" style={{ fontSize: '0.83rem' }}>
                총 투표 수
              </span>
              <strong
                className="kpi-value"
                style={{ fontSize: '1.6rem', color: 'var(--brand-accent-teal)' }}
              >
                {totalVotesDisplay}
              </strong>
              <span className="form-note">실제 참여 누적 건수</span>
            </article>
            <article
              className="kpi-item"
              style={{ ['--kpi-glow' as string]: 'oklch(78% 0.14 85 / 0.12)' }}
            >
              <span className="segment-title" style={{ fontSize: '0.83rem' }}>
                참여 피드백 수
              </span>
              <strong
                className="kpi-value"
                style={{ fontSize: '1.6rem', color: 'var(--brand-accent-gold)' }}
              >
                {totalCommentsDisplay}
              </strong>
              <span className="form-note">코멘트/한마디 건수</span>
            </article>
          </div>

          <form
            onSubmit={handleJoinCodeSubmit}
            style={{
              display: 'grid',
              gap: '0.55rem',
              maxWidth: '620px',
              border: '1px solid rgba(45, 212, 191, 0.18)',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(45, 212, 191, 0.055)',
              padding: '0.8rem',
              marginTop: '0.1rem',
            }}
          >
            <label
              htmlFor="join-code-input"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--brand-accent-teal)',
                fontSize: '0.7rem',
                fontWeight: 900,
                letterSpacing: '0.05em',
              }}
            >
              <Code2 size={13} />
              참여 코드로 바로 참여
            </label>
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              <input
                id="join-code-input"
                value={joinCodeInput}
                onChange={(event) => {
                  setJoinCodeInput(event.target.value);
                  if (joinCodeMessage) {
                    setJoinCodeMessage('');
                  }
                }}
                placeholder="공유받은 참여 코드 입력"
                className="form-input"
                style={{
                  flex: '1 1 190px',
                  minHeight: '40px',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                }}
                autoCapitalize="none"
                autoCorrect="off"
              />
              <button
                type="submit"
                className="btn-primary"
                style={{
                  minHeight: '40px',
                  padding: '8px 13px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  whiteSpace: 'nowrap',
                }}
              >
                입장
                <ArrowRight size={14} />
              </button>
            </div>
            <span
              style={{
                color: joinCodeMessage ? 'var(--brand-accent-gold)' : 'var(--text-muted)',
                fontSize: '0.69rem',
                lineHeight: 1.45,
              }}
            >
              {joinCodeMessage || 'QR을 못 찍는 곳이라면, 코드만 입력해도 바로 참여할 수 있어요.'}
            </span>
          </form>

          {pinnedPollCards.length > 0 ? (
            <section
              aria-label="고정한 투표"
              style={{
                border: '1px solid rgba(250, 204, 21, 0.18)',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(250, 204, 21, 0.045)',
                padding: '0.85rem',
                display: 'grid',
                gap: '0.7rem',
                maxWidth: '760px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.8rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'grid', gap: '0.18rem' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: 'var(--brand-accent-gold)',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      letterSpacing: '0.05em',
                    }}
                  >
                    <Pin size={13} />
                    고정한 고민
                  </span>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                    자주 확인할 투표를 고정했습니다
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={handleClearPinnedPolls}
                  className="ghost-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 9px',
                    fontSize: '0.66rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Trash2 size={12} />
                  고정 해제
                </button>
              </div>

              <div
                className="horizontal-scroll-mobile"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: '0.55rem',
                }}
              >
                {pinnedPollCards.map((poll) => {
                  const signalLabel = getPollSignalLabel(poll);
                  const signalStyle = getPollSignalStyle(signalLabel);

                  return (
                    <article
                      key={poll.id}
                      style={{
                        position: 'relative',
                        border: '1px solid rgba(250, 204, 21, 0.16)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-card)',
                        padding: '0.72rem',
                        display: 'grid',
                        gap: '0.48rem',
                        minWidth: 0,
                      }}
                    >
                      <button
                        type="button"
                        className="card-stretch-open"
                        onClick={() => handleRecentPollOpen(poll.id)}
                        aria-label={`${poll.question} 열기`}
                      />
                      <div
                        style={{
                          position: 'relative',
                          zIndex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                        }}
                      >
                        <span
                          style={{
                            ...signalStyle,
                            border: `1px solid ${signalStyle.borderColor}`,
                            borderRadius: '999px',
                            padding: '2px 7px',
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {signalLabel}
                        </span>
                        <button
                          type="button"
                          onClick={(event) => handleTogglePinnedPoll(event, poll.id)}
                          aria-label={`${poll.question} 고정 해제`}
                          className="icon-hit"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--brand-accent-gold)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                          }}
                        >
                          <Pin size={13} />
                        </button>
                      </div>
                      <strong
                        style={{
                          color: 'var(--text-primary)',
                          fontSize: '0.78rem',
                          lineHeight: 1.35,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {poll.question}
                      </strong>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.45rem',
                          color: 'var(--text-muted)',
                          fontSize: '0.64rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>{formatPollEndAt(poll)}</span>
                        <span>
                          {poll.totalVotes}표 · 의견 {poll.comments.length}개
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {recentPollCards.length > 0 ? (
            <section
              aria-label="최근 본 투표"
              style={{
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.035)',
                padding: '0.85rem',
                display: 'grid',
                gap: '0.7rem',
                maxWidth: '760px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.8rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'grid', gap: '0.18rem' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: 'var(--brand-accent-teal)',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      letterSpacing: '0.05em',
                    }}
                  >
                    <History size={13} />
                    최근 본 투표
                  </span>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                    최근 본 투표로 바로 이어가기
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={handleClearRecentPolls}
                  className="ghost-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 9px',
                    fontSize: '0.66rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Trash2 size={12} />
                  비우기
                </button>
              </div>

              <div
                className="horizontal-scroll-mobile"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: '0.55rem',
                }}
              >
                {recentPollCards.map((item) => {
                  const signalStyle = item.poll
                    ? getPollSignalStyle(item.signal)
                    : {
                        color: 'var(--text-muted)',
                        borderColor: 'var(--bg-card-border)',
                        background: 'rgba(255,255,255,0.03)',
                      };

                  return (
                    <article
                      key={item.id}
                      style={{
                        position: 'relative',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-card)',
                        padding: '0.72rem',
                        display: 'grid',
                        gap: '0.48rem',
                        minWidth: 0,
                      }}
                    >
                      <button
                        type="button"
                        className="card-stretch-open"
                        onClick={() => handleRecentPollOpen(item.id)}
                        aria-label={`${item.question} 열기`}
                      />
                      <div
                        style={{
                          position: 'relative',
                          zIndex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                        }}
                      >
                        <span
                          style={{
                            ...signalStyle,
                            border: `1px solid ${signalStyle.borderColor}`,
                            borderRadius: '999px',
                            padding: '2px 7px',
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.hasVoted ? '참여함' : item.signal}
                        </span>
                        <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={(event) => handleTogglePinnedPoll(event, item.id)}
                            aria-label={`${item.question} 고정 ${pinnedPollIds.includes(item.id) ? '해제' : '추가'}`}
                            className="icon-hit"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: pinnedPollIds.includes(item.id)
                                ? 'var(--brand-accent-gold)'
                                : 'var(--text-muted)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                            }}
                          >
                            <Pin size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => handleRemoveRecentPoll(event, item.id)}
                            aria-label={`${item.question} 최근 기록 삭제`}
                            className="icon-hit"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                            }}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      </div>
                      <strong
                        style={{
                          color: 'var(--text-primary)',
                          fontSize: '0.78rem',
                          lineHeight: 1.35,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {item.question}
                      </strong>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.45rem',
                          color: 'var(--text-muted)',
                          fontSize: '0.64rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>{formatRecentPollViewedAt(item.viewedAt)}</span>
                        <span>
                          {item.totalVotes}표 · 의견 {item.commentCount}개
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        className="desktop-only ghost-btn"
        onClick={() => setOperatorToolsExpanded((prev) => !prev)}
        aria-expanded={operatorToolsExpanded}
        style={{
          alignSelf: 'flex-start',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '9px 14px',
          fontSize: '0.78rem',
          fontWeight: 800,
          color: 'var(--text-secondary)',
          borderColor: 'rgba(45, 212, 191, 0.2)',
          background: 'rgba(45, 212, 191, 0.04)',
        }}
      >
        <SlidersHorizontal size={15} />
        운영 도구 · 인사이트 {operatorToolsExpanded ? '접기' : '더 보기'} 🛠️
        <ChevronDown
          size={15}
          style={{
            transition: 'transform 0.2s ease',
            transform: operatorToolsExpanded ? 'rotate(180deg)' : 'none',
          }}
        />
      </button>
      <OperatorToolsPanel
        visible={operatorToolsExpanded}
        flowSectionRef={flowSectionRef}
        insightSectionRef={insightSectionRef}
        navigate={navigate}
        setSignal={setSignal}
        setScope={setScope}
        setSortBy={setSortBy}
        setCurrentPoll={setCurrentPoll}
        openPollCount={openPollCount}
        signal={signal}
        decisionFlowCards={decisionFlowCards}
        launchSurfaceChips={launchSurfaceChips}
        operatorInsightCards={operatorInsightCards}
        recommendationCards={recommendationCards}
        liveQueueItems={liveQueueItems}
      />

      <div
        id="poll-list-anchor"
        className="content-card"
        style={{
          padding: '0.95rem',
          display: 'flex',
          gap: '0.85rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <label
          style={{
            flex: '1 1 220px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            position: 'relative',
            minWidth: 180,
          }}
        >
          <Search
            size={14}
            style={{ position: 'absolute', left: '11px', color: 'var(--text-muted)' }}
          />
          <input
            id="poll-search-input"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="고민 제목/설명/코드 검색 ( / 키 )"
            className="form-input"
            aria-label="고민 검색"
            style={{ paddingLeft: '32px', paddingRight: searchInput ? '34px' : '12px', flex: 1 }}
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              aria-label="검색어 지우기"
              style={{
                position: 'absolute',
                right: '9px',
                top: '50%',
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'rgba(255,255,255,0.07)',
                borderRadius: '999px',
                padding: '3px',
                color: 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={13} />
            </button>
          ) : null}
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minWidth: '180px',
          }}
        >
          <SlidersHorizontal size={14} />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortMode)}
            aria-label="정렬 방식 선택"
            style={{
              borderRadius: '10px',
              border: '1px solid var(--bg-card-border)',
              background: 'var(--bg-main)',
              color: 'var(--text-primary)',
              padding: '8px 10px',
              fontFamily: 'var(--font-sans)',
              minWidth: 170,
            }}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div
          style={{
            display: 'flex',
            gap: '6px',
            flex: '1 1 auto',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setViewMode((current) => (current === 'stack' ? 'compact' : 'stack'))}
            title="목록/컴팩트 뷰 전환"
            style={{
              padding: '6px 9px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {viewMode === 'stack' ? <LayoutList size={12} /> : <LayoutGrid size={12} />}
            <span style={{ fontSize: '0.7rem' }}>{viewMode === 'stack' ? '넓게' : '요약'}</span>
          </button>
          <fieldset
            aria-label="작성자 범위 필터"
            style={{
              display: 'inline-flex',
              gap: '6px',
              flexWrap: 'wrap',
              margin: 0,
              padding: 0,
              border: 'none',
              minWidth: 0,
            }}
          >
            {displayScopeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setScope(option.value)}
                className="ghost-btn"
                disabled={option.value === 'mine' && !userId}
                aria-pressed={scope === option.value}
                aria-label={`${option.label} (${option.count})개`}
                title={
                  option.value === 'mine' && !userId
                    ? '로그인/비회원 닉네임 시작 후 내 항목을 확인할 수 있어요'
                    : ''
                }
                style={{
                  borderColor:
                    scope === option.value ? 'rgba(99, 102, 241, 0.52)' : 'var(--bg-card-border)',
                  color:
                    scope === option.value ? 'var(--brand-primary-light)' : 'var(--text-muted)',
                  backgroundColor:
                    scope === option.value ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                  padding: '6px 10px',
                  opacity: option.value === 'mine' && !userId ? 0.5 : 1,
                }}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </fieldset>

          <fieldset
            aria-label="결정 신호 필터"
            style={{
              flex: '1 1 100%',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
              minWidth: 0,
              margin: 0,
              border: 'none',
              padding: 0,
              paddingTop: '0.68rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <span
              style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginRight: '2px' }}
              title="개수는 지금 페이지(최대 20개) 기준이에요"
            >
              결정 신호 (이 페이지 기준)
            </span>
            {signalCounts.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSignal(option.value)}
                className="ghost-btn"
                aria-pressed={signal === option.value}
                aria-label={`${option.label} (${option.count})개`}
                style={{
                  borderColor:
                    signal === option.value ? 'rgba(45, 212, 191, 0.48)' : 'var(--bg-card-border)',
                  color: signal === option.value ? 'var(--brand-accent-teal)' : 'var(--text-muted)',
                  backgroundColor:
                    signal === option.value ? 'rgba(45, 212, 191, 0.1)' : 'transparent',
                  padding: '5px 9px',
                }}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </fieldset>

          <button
            onClick={() => navigate('/create')}
            className="btn-primary"
            style={{
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
            }}
          >
            <Plus size={14} />새 투표 만들기
          </button>
        </div>
      </div>

      <QuickSeedChips
        normalizedQuery={normalizedQuery}
        scope={scope}
        quickSeeds={quickSeeds}
        setSearchInput={setSearchInput}
      />

      <ActiveFiltersBar
        hasActiveFilters={hasActiveFilters}
        activeFilters={activeFilters}
        onResetFilters={handleResetFilters}
      />

      <PollResultsRegion
        isLoading={isLoading}
        visiblePolls={visiblePolls}
        hasActiveFilters={hasActiveFilters}
        emptyStateHint={emptyStateHint}
        query={query}
        userId={userId}
        viewMode={viewMode}
        copiedPollId={copiedPollId}
        navigate={navigate}
        onResetFilters={handleResetFilters}
        setCurrentPoll={setCurrentPoll}
        handleGotoPoll={handleGotoPoll}
        handleCopyPollLink={handleCopyPollLink}
        handleCopyPollEmbed={handleCopyPollEmbed}
      />

      <PollPagination
        page={page}
        limit={limit}
        total={total}
        hasMore={hasMore}
        isLoading={isLoading}
        onGoToPage={(nextPage) => {
          void goToPage(nextPage);
          globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
        }}
      />

      {error ? (
        <div
          role="alert"
          className="content-card"
          style={{
            marginTop: '0.2rem',
            padding: '0.95rem 1rem',
            display: 'grid',
            gap: '0.55rem',
          }}
        >
          <strong
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
            }}
          >
            <span className="empty-state-icon" aria-hidden="true">
              🥑
            </span>{' '}
            고민을 불러오지 못했어요
          </strong>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: 0 }}>
            잠시 후 다시 시도해 주세요. 문제가 계속되면 네트워크 상태를 확인해 주세요.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem', margin: 0 }}>{error}</p>
          <button
            type="button"
            onClick={() => void fetchPolls(page)}
            className="btn-primary"
            style={{
              width: 'fit-content',
              padding: '7px 14px',
              fontSize: '0.76rem',
              marginTop: '0.1rem',
            }}
          >
            다시 시도
          </button>
        </div>
      ) : null}
    </section>
  );
};
