import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  Share2,
  BarChart3,
  User,
  MessageSquare,
  Copy,
  Check,
  FileText,
  Sparkles,
  Info,
  AlertCircle,
  Gauge,
  Trophy,
  Users,
  CheckCircle2,
  ClipboardList,
  Send,
  Eye,
  Code2,
  ExternalLink,
  Download,
  RefreshCw,
  Pause,
  Play,
  QrCode,
  CalendarPlus,
  Plus,
  Settings,
  Pencil,
  Trash2,
  Lock,
} from 'lucide-react';
import { usePollStore } from '../store/usePollStore';
import { useAuthStore } from '../store/useAuthStore';
import { getVoterKey } from '../lib/voterKey';
import { VoteDonutChart, OPTION_COLORS } from '../components/VoteDonutChart';
import { SnsPreviewCard } from '../components/SnsPreviewCard';
import { AudienceLaunchKit } from '../components/AudienceLaunchKit';
import { DecisionFollowUpPanel } from '../components/DecisionFollowUpPanel';
import { LiveFacilitationConsole } from '../components/LiveFacilitationConsole';
import { OpinionTopicCloud } from '../components/OpinionTopicCloud';
import { ActionItemPlanner } from '../components/ActionItemPlanner';
import { StakeholderReportBuilder } from '../components/StakeholderReportBuilder';
import type { Poll, PollResultsVisibility } from '@picky/shared';
import {
  MASCOT,
  VOICE,
  categoryMeta,
  canRevealResults,
  optionPercent,
  buildConsensusNarrative as buildConsensusNarrative_shared,
  buildDecisionMemo,
  RESULTS_VISIBILITY_LABELS as SHARED_RESULTS_VISIBILITY_LABELS,
} from '@picky/shared';
// 결과 카드 이미지(순수 Canvas) 드로잉은 packages/client 로 단일화했어요.
import {
  buildPollResultImageDataUrl,
  DEFAULT_RESULT_IMAGE_CONTENT,
  type ResultImageContentKey,
  type ResultImageContentOptions,
  type ResultImageTheme,
} from '../lib/resultImage';
import {
  resolvePollShareUrl,
  buildPollEmbedCode,
  buildPollShareMessage,
  resolveShareText,
  copyText,
  sharePollToKakao,
  getKakaoShareDiagnostics,
  updatePollMetaTags,
} from '../lib/pollShare';
import type { KakaoShareDiagnostics, KakaoShareReadinessItem } from '../lib/pollShare';
import { buildQrSvgDataUri } from '../lib/qrCode';
import { rememberRecentPoll } from '../lib/pollHistory';
import { CountdownChip, useCountdown } from '../components/Countdown';

type EmbedCodeMode = 'standard' | 'compact' | 'popup';
const POLL_AUTHOR_LABELS: {
  mine: string;
  otherMember: string;
  guest: string;
} = {
  mine: '내가 작성',
  otherMember: '회원 작성',
  guest: '비회원 작성',
};

// R6: 라벨 문구는 @picky/shared 한 곳에서 통일한다(웹↔토스 동일 소스). 풀 라벨을 쓴다.
const RESULTS_VISIBILITY_LABELS: Record<PollResultsVisibility, string> = {
  afterVote: SHARED_RESULTS_VISIBILITY_LABELS.afterVote.full,
  always: SHARED_RESULTS_VISIBILITY_LABELS.always.full,
};

type ResultSummaryMode = 'brief' | 'detailed';
type CommentViewMode = 'latest' | 'byOption' | 'highlights';
// ResultImageTheme/ResultImageContentKey/ResultImageContentOptions/DEFAULT_RESULT_IMAGE_CONTENT
// 는 packages/client(resultImageCanvas)에서 가져와요(웹↔토스 동일 소스).
type OperationChecklistAction = 'share' | 'copyLink' | 'resultImage' | 'present';
type InviteMessageTone = 'default' | 'deadline' | 'reason';

const RESULT_SUMMARY_OPTIONS: Array<{ value: ResultSummaryMode; label: string }> = [
  { value: 'brief', label: '짧게' },
  { value: 'detailed', label: '자세히' },
];

const COMMENT_VIEW_OPTIONS: Array<{ value: CommentViewMode; label: string }> = [
  { value: 'latest', label: '최신순' },
  { value: 'byOption', label: '선택지별' },
  { value: 'highlights', label: '핵심 의견' },
];

const RESULT_IMAGE_THEME_OPTIONS: Array<{
  value: ResultImageTheme;
  label: string;
  description: string;
}> = [
  { value: 'classic', label: '클래식', description: 'picky 기본 다크 카드' },
  { value: 'light', label: '라이트', description: '문서와 회의록에 적합' },
  { value: 'presentation', label: '프레젠트', description: '발표 화면용 고대비' },
];

const RESULT_IMAGE_CONTENT_OPTIONS: Array<{
  value: ResultImageContentKey;
  label: string;
  description: string;
}> = [
  { value: 'comment', label: '대표 의견', description: '최신 의견을 카드에 포함' },
  { value: 'joinCode', label: '참여 코드', description: '회의실 화면용 큰 코드' },
  { value: 'shareUrl', label: '참여 링크', description: '하단에 공유 URL 포함' },
];

const INVITE_MESSAGE_TONE_OPTIONS: Array<{
  value: InviteMessageTone;
  label: string;
  description: string;
}> = [
  { value: 'default', label: '기본 초대', description: '처음 공유할 때' },
  { value: 'deadline', label: '마감 리마인드', description: '응답을 한 번 더 모을 때' },
  { value: 'reason', label: '이유 요청', description: '결정 근거가 필요할 때' },
];

const PRESENT_REFRESH_INTERVAL_SECONDS = 15;
const CREATE_POLL_DRAFT_STORAGE_KEY = 'picky_create_poll_draft_v1';
const VOTE_DRAFT_STORAGE_PREFIX = 'picky_vote_draft_v1';

const getVoteDraftStorageKey = (pollId: string) => `${VOTE_DRAFT_STORAGE_PREFIX}:${pollId}`;

const buildPollInviteMessage = (
  poll: Poll,
  shareUrl: string,
  tone: InviteMessageTone = 'default',
) => {
  const visibleOptions = poll.options.slice(0, 4);
  const optionLines = visibleOptions
    .map((option, index) => `${index + 1}. ${option.text}`)
    .join('\n');
  const hiddenOptionCount = Math.max(poll.options.length - visibleOptions.length, 0);
  const endsAtDate = poll.endsAt ? new Date(poll.endsAt) : null;
  const endsAtLabel =
    endsAtDate && Number.isFinite(endsAtDate.getTime())
      ? endsAtDate.toLocaleString('ko-KR', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : '';
  const attachmentCount = poll.attachments?.length || 0;
  let openingLine = '고민 투표에 참여해 주세요.';
  if (tone === 'deadline') {
    openingLine = '마감 전에 고민 투표 한 번만 더 참여해 주세요.';
  } else if (tone === 'reason') {
    openingLine = '선택 이유까지 짧게 남겨주면 결정에 큰 도움이 됩니다.';
  }
  let closingLine = '선택 이유도 짧게 남겨주면 결정에 도움이 됩니다.';
  if (tone === 'deadline') {
    closingLine = '아직 못 봤다면 30초만 투자해서 골라주세요.';
  } else if (tone === 'reason') {
    closingLine = '한 줄 이유를 남겨주면 결과를 해석하기 훨씬 좋아요.';
  }
  const hiddenOptionSuffix = hiddenOptionCount > 0 ? `\n+ ${hiddenOptionCount}개 더` : '';

  return [
    openingLine,
    '',
    poll.question,
    poll.description ? `설명: ${poll.description}` : '',
    optionLines ? `선택지:\n${optionLines}${hiddenOptionSuffix}` : '',
    `참여 코드: ${poll.id}`,
    endsAtLabel ? `마감: ${endsAtLabel}` : '',
    attachmentCount > 0 ? `참고 파일: ${attachmentCount}개 첨부됨` : '',
    poll.resultsVisibility === 'always'
      ? '결과는 참여 전에도 실시간으로 확인할 수 있어요.'
      : '결과는 투표한 뒤 확인할 수 있어요.',
    closingLine,
    '',
    shareUrl,
  ]
    .filter(Boolean)
    .join('\n');
};

const escapeIcsText = (value: string) =>
  value
    .replace(/\\/g, String.raw`\\`)
    .replace(/;/g, String.raw`\;`)
    .replace(/,/g, String.raw`\,`)
    .replace(/\r?\n/g, String.raw`\n`);

const formatIcsDate = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');

const buildPollDeadlineReminder = (poll: Poll, shareUrl: string) => {
  if (!poll.endsAt) {
    return null;
  }

  const deadline = new Date(poll.endsAt);
  const now = Date.now();
  const timeUntilDeadline = deadline.getTime() - now;
  if (!Number.isFinite(deadline.getTime()) || timeUntilDeadline < 2 * 60 * 1000) {
    return null;
  }

  let triggerMinutes = 1;
  if (timeUntilDeadline >= 35 * 60 * 1000) {
    triggerMinutes = 30;
  } else if (timeUntilDeadline >= 10 * 60 * 1000) {
    triggerMinutes = 5;
  }
  const reminderEnd = new Date(deadline.getTime() + 15 * 60 * 1000);
  const description = [
    poll.description ? `맥락: ${poll.description}` : '',
    `참여 코드: ${poll.id}`,
    `참여 링크: ${shareUrl}`,
    poll.totalVotes > 0
      ? `현재 ${poll.totalVotes}명이 응답했습니다.`
      : '아직 첫 응답을 기다리고 있습니다.',
    `캘린더 알림은 마감 ${triggerMinutes}분 전에 울리도록 설정했습니다.`,
  ]
    .filter(Boolean)
    .join('\n');
  const summaryText = `투표 마감 리마인드: ${poll.question}`;
  const alarmDescriptionText = `투표 마감 ${triggerMinutes}분 전입니다: ${poll.question}`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Picky//Poll Deadline Reminder//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:picky-poll-${escapeIcsText(poll.id)}-${formatIcsDate(deadline)}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(deadline)}`,
    `DTEND:${formatIcsDate(reminderEnd)}`,
    `SUMMARY:${escapeIcsText(summaryText)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `URL:${escapeIcsText(shareUrl)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(alarmDescriptionText)}`,
    `TRIGGER:-PT${triggerMinutes}M`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return {
    dataUri: `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`,
    alertLabel: `마감 ${triggerMinutes}분 전`,
  };
};

const escapeCsvCell = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const buildPollCsvExport = (poll: Poll, shareUrl: string) => {
  const createdAt = new Date(poll.createdAt).toISOString();
  const endsAt = poll.endsAt ? new Date(poll.endsAt).toISOString() : '';
  const resultRows = poll.options.map((option, index) => {
    const percentage = optionPercent(option.voteCount, poll.totalVotes);

    return [
      'option_result',
      index + 1,
      option.id,
      option.text,
      option.voteCount,
      `${percentage}%`,
      '',
      '',
      '',
      '',
    ];
  });
  const commentRows = poll.comments.map((commentItem, index) => [
    'comment',
    index + 1,
    commentItem.selectedOptionId ?? '',
    commentItem.selectedOptionText || '',
    '',
    '',
    commentItem.voterName || '익명',
    commentItem.comment,
    commentItem.createdAt,
    '',
  ]);
  const metaRows = [
    [
      'meta',
      'question',
      '',
      poll.question,
      '',
      '',
      '',
      poll.description || '',
      createdAt,
      shareUrl,
    ],
    ['meta', 'total_votes', '', poll.totalVotes, '', '', '', '', createdAt, shareUrl],
    [
      'meta',
      'results_visibility',
      '',
      poll.resultsVisibility || 'afterVote',
      '',
      '',
      '',
      '',
      createdAt,
      shareUrl,
    ],
    ['meta', 'ends_at', '', endsAt || 'none', '', '', '', '', createdAt, shareUrl],
  ];
  const rows = [
    [
      'row_type',
      'index',
      'option_id',
      'option_or_selected_text',
      'vote_count',
      'percentage',
      'voter_name',
      'comment',
      'created_at',
      'share_url',
    ],
    ...metaRows,
    ...resultRows,
    ...commentRows,
  ];

  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
};

const buildPollMarkdownReport = (poll: Poll, shareUrl: string) => {
  const sortedOptions = [...poll.options].sort((a, b) => b.voteCount - a.voteCount);
  const optionLines = sortedOptions.map((option, index) => {
    const percentage = optionPercent(option.voteCount, poll.totalVotes);

    return `${index + 1}. ${option.text} - ${option.voteCount}표 (${percentage}%)`;
  });
  const commentLines = [...poll.comments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(
      (commentItem, index) =>
        `${index + 1}. ${commentItem.comment} - ${commentItem.voterName || '익명'}${
          commentItem.selectedOptionText ? ` (${commentItem.selectedOptionText})` : ''
        }`,
    );
  const endsAt = poll.endsAt
    ? new Date(poll.endsAt).toLocaleString('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '마감 없음';

  return [
    `# ${poll.question}`,
    '',
    poll.description ? `> ${poll.description}` : '',
    '',
    `- 총 투표: ${poll.totalVotes}표`,
    `- 의견: ${poll.comments.length}개`,
    `- 결과 공개: ${poll.resultsVisibility === 'always' ? '실시간 결과 공개' : '투표 후 결과 공개'}`,
    `- 마감: ${endsAt}`,
    `- 공유 링크: ${shareUrl}`,
    '',
    '## 선택지별 결과',
    optionLines.length > 0 ? optionLines.join('\n') : '아직 선택지가 없습니다.',
    '',
    '## 대표 의견',
    commentLines.length > 0 ? commentLines.join('\n') : '아직 남겨진 의견이 없습니다.',
    '',
    '---',
    'picky 결과 리포트',
  ].join('\n');
};

const isPollClosed = (poll: Poll | null | undefined) => {
  if (!poll?.endsAt) {
    return false;
  }

  const endsAtTime = new Date(poll.endsAt).getTime();
  return Number.isFinite(endsAtTime) && Date.now() >= endsAtTime;
};

const formatEndAt = (value: string | null | undefined) => {
  if (!value) {
    return '마감 없음';
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '마감 시간 확인 필요';
  }

  return date.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildPollResultSummary = (poll: Poll, shareUrl: string, mode: ResultSummaryMode) => {
  const sortedOptions = [...poll.options].sort((a, b) => b.voteCount - a.voteCount);
  const leader = sortedOptions[0] || null;
  const leaderPercentage =
    leader && poll.totalVotes > 0 ? optionPercent(leader.voteCount, poll.totalVotes) : 0;
  const optionLines = sortedOptions.map((option, index) => {
    const percentage = optionPercent(option.voteCount, poll.totalVotes);
    return `${index + 1}. ${option.text}: ${option.voteCount}표 (${percentage}%)`;
  });
  const latestComments = [...poll.comments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
    .map(
      (comment, index) =>
        `${index + 1}. ${comment.voterName}: ${comment.comment}${
          comment.selectedOptionText ? ` (${comment.selectedOptionText})` : ''
        }`,
    );

  if (mode === 'brief') {
    return [
      `[picky 요약] ${poll.question}`,
      leader
        ? `현재 1위: ${leader.text} · ${leader.voteCount}표 (${leaderPercentage}%)`
        : '현재 1위: 아직 없음',
      `총 ${poll.totalVotes}표 · 의견 ${poll.comments.length}개`,
      latestComments[0] ? `대표 의견: ${latestComments[0]}` : '대표 의견: 아직 의견이 없습니다.',
      `참여 링크: ${shareUrl}`,
    ].join('\n');
  }

  return [
    `[picky 결과 요약] ${poll.question}`,
    poll.description ? `맥락: ${poll.description}` : null,
    `총 ${poll.totalVotes}표 · 의견 ${poll.comments.length}개`,
    '',
    '선택지별 결과',
    optionLines.length > 0 ? optionLines.join('\n') : '아직 선택지가 없습니다.',
    '',
    '최근 의견',
    latestComments.length > 0 ? latestComments.join('\n') : '아직 의견이 없습니다.',
    '',
    `참여 링크: ${shareUrl}`,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
};

function ResultToolActivePanel(
  props: Readonly<{
    activeTool: string | undefined;
    currentPoll: Poll;
    shareUrl: string;
    endAtLabel: string;
    resultsVisibility: PollResultsVisibility;
    canViewResults: boolean;
    pollClosed: boolean;
  }>,
) {
  const {
    activeTool,
    currentPoll,
    shareUrl,
    endAtLabel,
    resultsVisibility,
    canViewResults,
    pollClosed,
  } = props;

  if (activeTool === 'audience') {
    return (
      <AudienceLaunchKit
        poll={currentPoll}
        shareUrl={shareUrl}
        endAtLabel={endAtLabel}
        resultsVisibilityLabel={RESULTS_VISIBILITY_LABELS[resultsVisibility]}
        canViewResults={canViewResults}
      />
    );
  }
  if (activeTool === 'followup') {
    return <DecisionFollowUpPanel poll={currentPoll} shareUrl={shareUrl} pollClosed={pollClosed} />;
  }
  if (activeTool === 'actions') {
    return <ActionItemPlanner poll={currentPoll} shareUrl={shareUrl} />;
  }
  if (activeTool === 'report') {
    return (
      <StakeholderReportBuilder poll={currentPoll} shareUrl={shareUrl} pollClosed={pollClosed} />
    );
  }
  if (activeTool === 'facilitation') {
    return (
      <LiveFacilitationConsole poll={currentPoll} shareUrl={shareUrl} pollClosed={pollClosed} />
    );
  }
  if (activeTool === 'topics') {
    return <OpinionTopicCloud poll={currentPoll} />;
  }
  return null;
}

function ResultToolTab(
  props: Readonly<{
    tool: { key: string; label: string };
    selected: boolean;
    onSelect: (key: string) => void;
  }>,
) {
  const { tool, selected, onSelect } = props;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={() => onSelect(tool.key)}
      className="ghost-btn"
      style={{
        fontSize: '0.72rem',
        fontWeight: 700,
        borderColor: selected ? 'var(--brand-primary)' : 'var(--bg-card-border)',
        color: selected ? 'var(--brand-primary)' : 'var(--text-muted)',
        background: selected ? 'rgba(20, 184, 166, 0.08)' : 'transparent',
      }}
    >
      {tool.label}
    </button>
  );
}

function ResultToolsSection(
  props: Readonly<{
    currentPoll: Poll;
    shareUrl: string;
    endAtLabel: string;
    resultsVisibility: PollResultsVisibility;
    canViewResults: boolean;
    pollClosed: boolean;
    toolsExpanded: boolean;
    setToolsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    activeToolTab: string;
    setActiveToolTab: (key: string) => void;
  }>,
) {
  const {
    currentPoll,
    shareUrl,
    endAtLabel,
    resultsVisibility,
    canViewResults,
    pollClosed,
    toolsExpanded,
    setToolsExpanded,
    activeToolTab,
    setActiveToolTab,
  } = props;
  const tools = [
    { key: 'audience', label: '🚀 공유 준비', available: true },
    { key: 'followup', label: '🧭 후속 결정', available: canViewResults },
    { key: 'actions', label: '✅ 액션 아이템', available: canViewResults },
    { key: 'report', label: '📝 리포트', available: canViewResults },
    { key: 'facilitation', label: '🎙️ 라이브 진행', available: canViewResults },
    { key: 'topics', label: '💬 의견 토픽', available: canViewResults },
  ].filter((tool) => tool.available);
  const activeTool = tools.some((tool) => tool.key === activeToolTab)
    ? activeToolTab
    : tools[0]?.key;

  return (
    <section
      className="content-card"
      style={{
        padding: '1.1rem',
        display: 'grid',
        gap: toolsExpanded ? '1rem' : '0.5rem',
      }}
    >
      <button
        type="button"
        onClick={() => setToolsExpanded((value) => !value)}
        aria-expanded={toolsExpanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          color: 'var(--text-primary)',
        }}
      >
        <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>🧰 결과 활용 도구</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>
          {toolsExpanded ? '접기 ▲' : '펼치기 ▼'}
        </span>
      </button>

      {toolsExpanded ? (
        <>
          <div
            role="tablist"
            aria-label="결과 활용 도구"
            style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}
          >
            {tools.map((tool) => (
              <ResultToolTab
                key={tool.key}
                tool={tool}
                selected={tool.key === activeTool}
                onSelect={setActiveToolTab}
              />
            ))}
          </div>

          <ResultToolActivePanel
            activeTool={activeTool}
            currentPoll={currentPoll}
            shareUrl={shareUrl}
            endAtLabel={endAtLabel}
            resultsVisibility={resultsVisibility}
            canViewResults={canViewResults}
            pollClosed={pollClosed}
          />
        </>
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: '0.76rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          공유 준비
          {canViewResults ? ' · 후속 결정 · 액션 아이템 · 리포트 · 라이브 진행 · 의견 토픽' : ''}을
          한 곳에서 펼쳐 볼 수 있어요.
        </p>
      )}
    </section>
  );
}

function PollPresentationView(
  props: Readonly<{
    currentPoll: Poll;
    id: string | undefined;
    fetchPoll: (id: string) => void;
    isPresentAutoRefreshPaused: boolean;
    setIsPresentAutoRefreshPaused: React.Dispatch<React.SetStateAction<boolean>>;
    presentRefreshCountdown: number;
    setPresentRefreshCountdown: React.Dispatch<React.SetStateAction<number>>;
    originalPollPath: string;
    pollClosed: boolean;
    consensusLabel: string;
    decisionHint: string;
    sortedOptionsByVotes: Poll['options'];
    featuredComment: Poll['comments'][number] | null;
    participationQrUrl: string | null;
    shareUrl: string;
    copiedId: string | null;
    copyMessage: string;
    handleCopyLinkClick: (pollId: string) => void;
  }>,
) {
  const {
    currentPoll,
    id,
    fetchPoll,
    isPresentAutoRefreshPaused,
    setIsPresentAutoRefreshPaused,
    presentRefreshCountdown,
    setPresentRefreshCountdown,
    originalPollPath,
    pollClosed,
    consensusLabel,
    decisionHint,
    sortedOptionsByVotes,
    featuredComment,
    participationQrUrl,
    shareUrl,
    copiedId,
    copyMessage,
    handleCopyLinkClick,
  } = props;

  return (
    <section className="present-shell animate-slide-up">
      <header className="present-header">
        <div>
          <div className="present-live-row">
            <span>PICKY LIVE RESULT</span>
            <span className="present-live-badge">
              <RefreshCw size={13} />
              {isPresentAutoRefreshPaused
                ? '자동 갱신 일시정지'
                : `${presentRefreshCountdown}초 후 자동 갱신`}
            </span>
            <div className="present-live-controls">
              <button
                type="button"
                onClick={() => {
                  if (id) {
                    fetchPoll(id);
                    setPresentRefreshCountdown(PRESENT_REFRESH_INTERVAL_SECONDS);
                  }
                }}
              >
                <RefreshCw size={13} />
                지금 갱신
              </button>
              <button
                type="button"
                onClick={() => setIsPresentAutoRefreshPaused((current) => !current)}
              >
                {isPresentAutoRefreshPaused ? <Play size={13} /> : <Pause size={13} />}
                {isPresentAutoRefreshPaused ? '자동 재개' : '일시정지'}
              </button>
            </div>
          </div>
          <h1>{currentPoll.question}</h1>
          {currentPoll.description ? <p>{currentPoll.description}</p> : null}
        </div>
        <a href={originalPollPath} className="present-origin-link">
          원본 열기
          <ExternalLink size={14} />
        </a>
      </header>

      <div className="present-stat-grid">
        <div>
          <span>총 투표</span>
          <strong>{currentPoll.totalVotes}</strong>
        </div>
        <div>
          <span>의견</span>
          <strong>{currentPoll.comments.length}</strong>
        </div>
        <div>
          <span>상태</span>
          <strong>{pollClosed ? '마감' : consensusLabel}</strong>
        </div>
        <div>
          <span>참여 코드</span>
          <strong>{currentPoll.id}</strong>
        </div>
      </div>

      <div className="present-grid">
        <section className="present-results-panel">
          {sortedOptionsByVotes.map((option, index) => {
            const percentage = optionPercent(option.voteCount, currentPoll.totalVotes);
            return (
              <article key={option.id} className={index === 0 ? 'leader' : undefined}>
                <div>
                  <span>{index + 1}</span>
                  <strong>{option.text}</strong>
                  <small>
                    {option.voteCount}표 · {percentage}%
                  </small>
                </div>
                <div className="present-result-bar">
                  <span style={{ width: `${percentage}%` }} />
                </div>
              </article>
            );
          })}
        </section>

        <aside className="present-side-panel">
          <div>
            <span>결정 신호</span>
            <strong>{consensusLabel}</strong>
            <p>{decisionHint}</p>
          </div>
          <div>
            <span>대표 의견</span>
            <strong>{featuredComment?.voterName || '의견 대기'}</strong>
            <p>
              {featuredComment?.comment ||
                '아직 의견이 없습니다. 참여 링크를 공유해 선택 이유를 받아보세요.'}
            </p>
          </div>
          <div>
            <span>참여 링크</span>
            <div className="present-join-card">
              {participationQrUrl ? (
                <img
                  src={participationQrUrl}
                  alt={`${currentPoll.question} 참여 QR 코드`}
                  style={{
                    width: 'min(100%, 280px)',
                    aspectRatio: '1 / 1',
                    borderRadius: '18px',
                    background: '#fff',
                    padding: '0.55rem',
                    boxShadow: '0 16px 42px rgba(0, 0, 0, 0.32)',
                    imageRendering: 'pixelated',
                  }}
                />
              ) : (
                <div
                  style={{
                    border: '1px solid rgba(232, 200, 77, 0.32)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--brand-accent-gold)',
                    padding: '0.8rem',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                  }}
                >
                  QR 생성에는 링크가 너무 깁니다. 참여 코드를 안내해 주세요.
                </div>
              )}
              <strong>{currentPoll.id}</strong>
              <p className="present-share-url">{shareUrl}</p>
              <div
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  marginTop: '-4px',
                  wordBreak: 'break-all',
                }}
              >
                모바일 카메라로 위 QR을 스캔하세요
              </div>
              <button
                type="button"
                onClick={() => handleCopyLinkClick(currentPoll.id)}
                className="present-copy-button"
              >
                {copiedId === currentPoll.id ? <Check size={14} /> : <Copy size={14} />}
                {copiedId === currentPoll.id ? '링크 복사됨' : '참여 링크 복사'}
              </button>
              {copiedId === currentPoll.id && copyMessage ? <small>{copyMessage}</small> : null}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

type DecisionConfidenceItem = {
  label: string;
  value: string;
  passed: boolean;
  help: string;
};

/** 투표 후 '나는 다수파/소수파' 사회적 비교 배지 — 기존 % 데이터만 재활용한다. */
function SocialComparisonBadge(
  props: Readonly<{ currentPoll: Poll; votedOptionId: number | null }>,
) {
  const { currentPoll, votedOptionId } = props;
  const totalVotes = currentPoll.totalVotes;
  if (votedOptionId == null || totalVotes < 1) {
    return null;
  }
  const voted = currentPoll.options.find((option) => option.id === votedOptionId);
  if (!voted) {
    return null;
  }
  // totalVotes >= 1 is guaranteed by the early return above, so optionPercent
  // takes its total>0 branch — behavior-identical to the prior inline Math.round.
  const percent = optionPercent(voted.voteCount, totalVotes);
  const topVote = currentPoll.options.reduce((max, option) => Math.max(max, option.voteCount), 0);
  const isMajority = voted.voteCount === topVote && voted.voteCount > 0;
  const avg = 100 / Math.max(1, currentPoll.options.length);
  const isMinority = !isMajority && percent < avg;

  let emoji = '🙌';
  let title = `전체의 ${percent}%가 나와 같은 선택을 했어요`;
  let gold = false;
  if (isMajority) {
    emoji = '👑';
    title = '다수파예요! 가장 많은 사람들과 같은 선택';
    gold = true;
  } else if (isMinority) {
    emoji = '🦄';
    title = `희귀 취향! 단 ${percent}%만 고른 소수파의 멋`;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.85rem 1rem',
        borderRadius: 'var(--radius-sm)',
        background: gold ? 'rgba(250, 204, 21, 0.08)' : 'rgba(45, 212, 191, 0.08)',
        border: `1px solid ${gold ? 'rgba(250, 204, 21, 0.3)' : 'rgba(45, 212, 191, 0.3)'}`,
      }}
    >
      <span aria-hidden style={{ fontSize: '1.6rem', flexShrink: 0 }}>
        {emoji}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {title}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          내 선택: {voted.text}
        </div>
      </div>
    </div>
  );
}

function PollResultsScreen(
  props: Readonly<{
    currentPoll: Poll;
    isEmbedMode: boolean;
    consensusLabel: string;
    leadingOption: Poll['options'][number] | null;
    leadingShare: number;
    voteGap: number;
    voteGapShare: number;
    feedbackRate: number;
    decisionHint: string;
    decisionConfidenceLabel: string;
    decisionConfidenceTone: string;
    decisionConfidenceScore: number;
    decisionConfidenceBarGradient: string;
    decisionConfidenceItems: DecisionConfidenceItem[];
    participationQrUrl: string | null;
    nextActionHeadline: string;
    decisionMemo: string;
    votedHistory: Record<string, number>;
    copiedId: string | null;
    setCopiedId: React.Dispatch<React.SetStateAction<string | null>>;
    setCopyMessage: React.Dispatch<React.SetStateAction<string>>;
    handleKakaoShareClick: () => void;
    handleCopyLinkClick: (pollId: string) => void;
    handlePreviewResultImageClick: () => void;
    handleUseAsTemplateClick: () => void;
  }>,
) {
  const {
    currentPoll,
    isEmbedMode,
    consensusLabel,
    leadingOption,
    leadingShare,
    voteGap,
    voteGapShare,
    feedbackRate,
    decisionHint,
    decisionConfidenceLabel,
    decisionConfidenceTone,
    decisionConfidenceScore,
    decisionConfidenceBarGradient,
    decisionConfidenceItems,
    participationQrUrl,
    nextActionHeadline,
    decisionMemo,
    votedHistory,
    copiedId,
    setCopiedId,
    setCopyMessage,
    handleKakaoShareClick,
    handleCopyLinkClick,
    handlePreviewResultImageClick,
    handleUseAsTemplateClick,
  } = props;

  // R1: 표가 0개거나 선택지가 1개뿐이면 신뢰도/선두 격차/합의 같은 파생 지표는 오해를 부른다.
  // (0데이터에 신뢰도 6%·녹색 통과 같은 가짜 신호) → 분석 패널 대신 단일 "참여 대기" 상태로 보여준다.
  const participationPending = currentPoll.totalVotes === 0 || currentPoll.options.length < 2;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        paddingTop: '1.5rem',
      }}
    >
      {isEmbedMode ? null : (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            alignSelf: 'flex-start',
            color: 'var(--brand-accent-teal)',
            fontSize: '0.82rem',
            fontWeight: 800,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: '1.05rem' }}>
            {MASCOT.curious.emoji}
          </span>
          {MASCOT.curious.line}
        </div>
      )}
      {participationPending ? (
        <section
          aria-label="참여 대기"
          style={{
            border: '1px solid var(--bg-card-border)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,0.025)',
            padding: '1.1rem',
            display: 'grid',
            gap: '0.5rem',
            justifyItems: 'start',
          }}
        >
          <h3
            style={{
              margin: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.94rem',
            }}
          >
            <Gauge size={16} style={{ color: 'var(--brand-accent-teal)' }} />
            참여 대기 중
          </h3>
          <p
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              lineHeight: 1.55,
            }}
          >
            {currentPoll.options.length < 2
              ? '선택지가 1개뿐이라 아직 비교할 결과가 없어요.'
              : '아직 표가 없어요. 첫 참여가 모이면 선두·격차·신뢰도를 보여드릴게요.'}
          </p>
        </section>
      ) : (
        <section
          style={{
            border: '1px solid var(--bg-card-border)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,0.025)',
            padding: '1rem',
            display: 'grid',
            gap: '0.85rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '0.75rem',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <h3
              style={{
                margin: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.94rem',
              }}
            >
              <Gauge size={16} style={{ color: 'var(--brand-accent-teal)' }} />
              결정 브리핑
            </h3>
            <span
              style={{
                border: '1px solid rgba(45, 212, 191, 0.28)',
                color:
                  consensusLabel === '접전'
                    ? 'var(--brand-accent-coral)'
                    : 'var(--brand-accent-teal)',
                background:
                  consensusLabel === '접전'
                    ? 'rgba(251, 113, 133, 0.08)'
                    : 'rgba(45, 212, 191, 0.08)',
                borderRadius: '999px',
                padding: '3px 9px',
                fontSize: '0.68rem',
                fontWeight: 800,
              }}
            >
              {consensusLabel}
            </span>
          </div>

          <div className="insight-grid">
            <div className="insight-tile">
              <span>
                <Trophy size={13} />
                선두 선택지
              </span>
              <strong>{leadingOption?.text || '아직 없음'}</strong>
              <small>
                {leadingShare}% · {leadingOption?.voteCount || 0}표
              </small>
            </div>
            <div className="insight-tile">
              <span>
                <BarChart3 size={13} />
                선두 격차
              </span>
              <strong>{voteGap}표</strong>
              <small>전체 대비 {voteGapShare}% 차이</small>
            </div>
            <div className="insight-tile">
              <span>
                <Users size={13} />
                참여 규모
              </span>
              <strong>{currentPoll.totalVotes}명</strong>
              <small>피드백률 {feedbackRate}%</small>
            </div>
          </div>

          <p
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: '0.78rem',
              lineHeight: 1.55,
            }}
          >
            {decisionHint}
          </p>

          <SocialComparisonBadge
            currentPoll={currentPoll}
            votedOptionId={votedHistory[currentPoll.id] ?? null}
          />

          <section
            aria-label="의사결정 신뢰도"
            style={{
              border: '1px solid rgba(45, 212, 191, 0.18)',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(45, 212, 191, 0.04)',
              padding: '0.85rem',
              display: 'grid',
              gap: '0.7rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'grid', gap: '0.2rem' }}>
                <span
                  style={{
                    color: 'var(--brand-accent-teal)',
                    fontSize: '0.66rem',
                    fontWeight: 900,
                    letterSpacing: '0.05em',
                  }}
                >
                  DECISION CONFIDENCE
                </span>
                <strong
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    lineHeight: 1.35,
                  }}
                >
                  {decisionConfidenceLabel}
                </strong>
              </div>
              <strong style={{ color: decisionConfidenceTone, fontSize: '1.05rem' }}>
                {decisionConfidenceScore}%
              </strong>
            </div>

            <div
              aria-hidden="true"
              style={{
                height: '8px',
                borderRadius: '999px',
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.08)',
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: `${decisionConfidenceScore}%`,
                  height: '100%',
                  borderRadius: 'inherit',
                  background: decisionConfidenceBarGradient,
                }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.5rem',
              }}
            >
              {decisionConfidenceItems.map((item) => (
                <div
                  key={item.label}
                  style={{
                    border: '1px solid var(--bg-card-border)',
                    borderRadius: 'var(--radius-sm)',
                    background: item.passed
                      ? 'rgba(45, 212, 191, 0.055)'
                      : 'rgba(255,255,255,0.025)',
                    padding: '0.62rem',
                    display: 'grid',
                    gap: '0.28rem',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: item.passed ? 'var(--brand-accent-teal)' : 'var(--brand-accent-gold)',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                    }}
                  >
                    {item.passed ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                    {item.label}
                  </span>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>
                    {item.value}
                  </strong>
                  <small
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.63rem',
                      lineHeight: 1.42,
                    }}
                  >
                    {item.help}
                  </small>
                </div>
              ))}
            </div>
          </section>
        </section>
      )}

      <section
        style={{
          border: '1px solid rgba(45, 212, 191, 0.2)',
          borderRadius: 'var(--radius-sm)',
          background:
            'linear-gradient(135deg, rgba(45, 212, 191, 0.08), rgba(232, 200, 77, 0.045))',
          padding: '1rem',
          display: 'grid',
          gap: '0.9rem',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: participationQrUrl ? '72px minmax(0, 1fr)' : '1fr',
            gap: '0.85rem',
            alignItems: 'center',
          }}
        >
          {participationQrUrl ? (
            <img
              src={participationQrUrl}
              alt={`${currentPoll.question} 참여 QR 코드`}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '14px',
                padding: '6px',
                background: '#fff',
                boxShadow: '0 12px 28px rgba(0,0,0,0.24)',
              }}
            />
          ) : null}
          <div style={{ display: 'grid', gap: '0.35rem', minWidth: 0 }}>
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
              <Sparkles size={13} />
              참여 후 다음 행동
            </span>
            <h3
              style={{
                margin: 0,
                color: 'var(--text-primary)',
                fontSize: '0.98rem',
                fontWeight: 900,
                lineHeight: 1.35,
              }}
            >
              {nextActionHeadline}
            </h3>
            <p
              style={{
                margin: 0,
                color: 'var(--text-secondary)',
                fontSize: '0.76rem',
                lineHeight: 1.55,
              }}
            >
              현재 {currentPoll.totalVotes}명이 참여했고 의견은 {currentPoll.comments.length}
              개입니다. 카카오 공유, 링크 복사, 결과 이미지 저장으로 단톡방과 발표 화면에 바로
              이어갈 수 있습니다.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={handleKakaoShareClick}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '0.76rem',
            }}
          >
            <Share2 size={14} />
            카카오로 더 공유
          </button>
          <button
            type="button"
            onClick={() => handleCopyLinkClick(currentPoll.id)}
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '0.76rem',
            }}
          >
            {copiedId === currentPoll.id ? <Check size={14} /> : <Copy size={14} />}
            {copiedId === currentPoll.id ? '링크 복사됨' : '링크 복사'}
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await copyText(decisionMemo);
                setCopiedId(`decision-${currentPoll.id}`);
                setCopyMessage('결정 메모가 클립보드에 복사되었습니다.');
                setTimeout(() => setCopiedId(null), 2200);
                setTimeout(() => setCopyMessage(''), 2600);
              } catch (err) {
                console.error('decision memo copy failed', err);
                setCopyMessage('결정 메모 복사에 실패했습니다.');
                setTimeout(() => setCopyMessage(''), 2600);
              }
            }}
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '0.76rem',
            }}
          >
            {copiedId === `decision-${currentPoll.id}` ? (
              <Check size={14} />
            ) : (
              <ClipboardList size={14} />
            )}
            {copiedId === `decision-${currentPoll.id}` ? '메모 복사됨' : '결정 메모'}
          </button>
          <button
            type="button"
            onClick={handlePreviewResultImageClick}
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '0.76rem',
            }}
          >
            <Download size={14} />
            결과 이미지
          </button>
          <button
            type="button"
            onClick={handleUseAsTemplateClick}
            className="ghost-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '0.76rem',
            }}
          >
            <Plus size={14} />이 투표로 새로 만들기
          </button>
        </div>
      </section>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '2rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Donut Chart SVG */}
        <div style={{ flex: '1 1 150px', display: 'flex', justifyContent: 'center' }}>
          <VoteDonutChart options={currentPoll.options} />
        </div>

        {/* Breakdown Bars */}
        <div
          style={{
            flex: '2 2 300px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2px',
            }}
          >
            <span
              style={{
                fontSize: '0.825rem',
                fontWeight: 700,
                color: 'var(--brand-accent-gold)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <BarChart3 size={14} />
              {/* N1: 마감된 폴은 "실시간"이 아니라 확정된 최종 결과다. */}
              <span>{isPollClosed(currentPoll) ? '최종 결과' : '실시간 투표 통계'}</span>
            </span>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              총 {currentPoll.totalVotes}명 참여
            </span>
          </div>

          {currentPoll.options.map((opt, idx) => {
            const percentage = optionPercent(opt.voteCount, currentPoll.totalVotes);
            const isMyChoice = votedHistory[currentPoll.id] === opt.id;
            const barColor = OPTION_COLORS[idx % OPTION_COLORS.length];

            return (
              <div key={opt.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontWeight: isMyChoice ? 700 : 500,
                      color: isMyChoice ? 'var(--text-primary)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: barColor,
                        marginRight: '2px',
                      }}
                    />
                    {opt.imageUrl && (
                      <img
                        src={opt.imageUrl}
                        alt={opt.text}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          objectFit: 'cover',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          marginRight: '4px',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span>{opt.text}</span>
                    {isMyChoice && (
                      <span
                        style={{
                          fontSize: '0.625rem',
                          backgroundColor: 'rgba(99, 102, 241, 0.15)',
                          color: 'var(--brand-primary-light)',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          marginLeft: '6px',
                          fontWeight: 700,
                        }}
                      >
                        내 선택
                      </span>
                    )}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {opt.voteCount}표 ({percentage}%)
                  </span>
                </div>

                {/* Bar Fill */}
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <div
                    style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: barColor,
                      borderRadius: '4px',
                      transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type VoteStepItem = {
  label: string;
  active: boolean;
  icon: React.ComponentType<{ size?: number }>;
};

type QuickReasonChip = {
  id: string;
  label: string;
  text: string;
};

function VoteSelectionReview(
  props: Readonly<{
    selectedOption: Poll['options'][number];
    selectedOptionIndex: number;
    resultsVisibility: PollResultsVisibility;
  }>,
) {
  const { selectedOption, selectedOptionIndex, resultsVisibility } = props;
  return (
    <section
      aria-label="선택 제출 전 확인"
      style={{
        border: '1px solid rgba(45, 212, 191, 0.22)',
        borderRadius: 'var(--radius-sm)',
        background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.075), rgba(255,255,255,0.025))',
        padding: '0.85rem',
        display: 'grid',
        gap: '0.65rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: '0.24rem', minWidth: 0 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: 'var(--brand-accent-teal)',
              fontSize: '0.68rem',
              fontWeight: 900,
              letterSpacing: '0.04em',
            }}
          >
            <CheckCircle2 size={13} />
            SELECTION REVIEW
          </span>
          <strong
            style={{
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              lineHeight: 1.38,
              overflowWrap: 'anywhere',
            }}
          >
            {selectedOption.text}
          </strong>
        </div>
        <span
          style={{
            border: '1px solid rgba(45, 212, 191, 0.28)',
            borderRadius: '999px',
            color: 'var(--brand-accent-teal)',
            background: 'rgba(45, 212, 191, 0.08)',
            padding: '4px 9px',
            fontSize: '0.66rem',
            fontWeight: 900,
            whiteSpace: 'nowrap',
          }}
        >
          선택지 {selectedOptionIndex + 1}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.45rem',
        }}
      >
        {[
          {
            label: '변경 가능',
            help: '제출 전에는 다른 선택지를 다시 누를 수 있습니다.',
          },
          {
            label: '한마디 선택',
            help: '이유를 남기면 결과 해석과 공유 요약에 반영됩니다.',
          },
          {
            label: '결과 확인',
            help:
              resultsVisibility === 'always'
                ? '제출 전후 모두 실시간 흐름을 볼 수 있습니다.'
                : '제출 후 결과와 의견이 열립니다.',
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,255,255,0.025)',
              padding: '0.62rem',
              display: 'grid',
              gap: '0.22rem',
            }}
          >
            <span
              style={{
                color: 'var(--text-primary)',
                fontSize: '0.7rem',
                fontWeight: 900,
              }}
            >
              {item.label}
            </span>
            <small
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.64rem',
                lineHeight: 1.4,
              }}
            >
              {item.help}
            </small>
          </div>
        ))}
      </div>
    </section>
  );
}

function VoteReadinessStatus(
  props: Readonly<{
    voteSubmitReady: boolean;
    voteSubmitHint: string;
    selectedOption: Poll['options'][number] | undefined;
    voterDisplayName: string;
    trimmedCommentLength: number;
    resultsVisibility: 'always' | 'afterVote';
  }>,
) {
  const {
    voteSubmitReady,
    voteSubmitHint,
    selectedOption,
    voterDisplayName,
    trimmedCommentLength,
    resultsVisibility,
  } = props;
  return (
    <section
      aria-live="polite"
      style={{
        border: `1px solid ${
          voteSubmitReady ? 'rgba(45, 212, 191, 0.28)' : 'rgba(232, 200, 77, 0.22)'
        }`,
        borderRadius: 'var(--radius-sm)',
        background: voteSubmitReady ? 'rgba(45, 212, 191, 0.055)' : 'rgba(250, 204, 21, 0.045)',
        padding: '0.85rem',
        display: 'grid',
        gap: '0.65rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: '0.22rem' }}>
          <strong
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: voteSubmitReady ? 'var(--brand-accent-teal)' : 'var(--brand-accent-gold)',
              fontSize: '0.82rem',
            }}
          >
            {voteSubmitReady ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {voteSubmitReady ? '제출 준비 완료' : '선택 후 제출할 수 있습니다'}
          </strong>
          <span
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.72rem',
              lineHeight: 1.45,
            }}
          >
            {voteSubmitHint}
          </span>
        </div>
        <span
          style={{
            border: '1px solid var(--bg-card-border)',
            borderRadius: '999px',
            padding: '4px 9px',
            color: 'var(--text-muted)',
            fontSize: '0.66rem',
            fontWeight: 800,
            whiteSpace: 'nowrap',
          }}
        >
          {selectedOption ? selectedOption.text : '선택 대기'}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '0.45rem',
          flexWrap: 'wrap',
        }}
      >
        <span className="stat-pill">{voterDisplayName} 이름</span>
        <span className="stat-pill">
          {trimmedCommentLength > 0 ? `한마디 ${trimmedCommentLength}자` : '한마디 선택 입력'}
        </span>
        <span className="stat-pill">
          {resultsVisibility === 'always' ? '결과 즉시 확인' : '제출 후 결과 확인'}
        </span>
      </div>
    </section>
  );
}

function PollVotingScreen(
  props: Readonly<{
    currentPoll: Poll;
    selectedOption: Poll['options'][number] | undefined;
    selectedOptionIndex: number;
    voteStepItems: VoteStepItem[];
    votedOptionId: number | null;
    setVotedOptionId: React.Dispatch<React.SetStateAction<number | null>>;
    voteSubmitBusy: boolean;
    voteSubmitReady: boolean;
    voteSubmitHint: string;
    voterDisplayName: string;
    trimmedCommentLength: number;
    resultsVisibility: PollResultsVisibility;
    voterName: string;
    setVoterName: React.Dispatch<React.SetStateAction<string>>;
    comment: string;
    setComment: React.Dispatch<React.SetStateAction<string>>;
    quickReasonChips: QuickReasonChip[];
    voteDraftSavedAt: string | null;
    pollClosed: boolean;
    handleVoteSubmit: () => void;
  }>,
) {
  const {
    currentPoll,
    selectedOption,
    selectedOptionIndex,
    voteStepItems,
    votedOptionId,
    setVotedOptionId,
    voteSubmitBusy,
    voteSubmitReady,
    voteSubmitHint,
    voterDisplayName,
    trimmedCommentLength,
    resultsVisibility,
    voterName,
    setVoterName,
    comment,
    setComment,
    quickReasonChips,
    voteDraftSavedAt,
    pollClosed,
    handleVoteSubmit,
  } = props;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        paddingTop: '1.5rem',
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: '0.75rem',
          border: '1px solid var(--bg-card-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.85rem',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.75rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '0.86rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ClipboardList size={15} style={{ color: 'var(--brand-accent-teal)' }} />
            투표 참여
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              color: selectedOption ? 'var(--brand-accent-teal)' : 'var(--text-muted)',
              border: '1px solid var(--bg-card-border)',
              borderRadius: '999px',
              padding: '3px 8px',
            }}
          >
            {selectedOption ? `${selectedOption.text} 선택됨` : '선택 대기'}
          </span>
        </div>

        <div className="vote-step-grid">
          {voteStepItems.map((step) => {
            const StepIcon = step.icon;
            return (
              <div key={step.label} className={step.active ? 'vote-step active' : 'vote-step'}>
                {step.active ? <CheckCircle2 size={14} /> : <StepIcon size={14} />}
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>
        <p
          style={{
            margin: 0,
            color: 'var(--text-muted)',
            fontSize: '0.66rem',
            lineHeight: 1.42,
          }}
        >
          키보드 단축키: 숫자 1~9로 선택, 0으로 10번째 선택지, Enter로 제출할 수 있습니다.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {currentPoll.options.map((opt, idx) => {
          const isSelected = votedOptionId === opt.id;
          const bulletColor = OPTION_COLORS[idx % OPTION_COLORS.length];

          return (
            <button
              key={opt.id}
              onClick={() => setVotedOptionId(opt.id)}
              type="button"
              disabled={voteSubmitBusy}
              aria-pressed={isSelected}
              className={`choice-card ${isSelected ? 'selected' : ''}`}
              style={{
                justifyContent: 'space-between',
                width: '100%',
                textAlign: 'left',
                border: 'none',
                cursor: voteSubmitBusy ? 'progress' : 'pointer',
                minHeight: opt.imageUrl ? '68px' : '54px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? 'var(--brand-primary)' : 'var(--bg-card-border-hover)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  {isSelected && (
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--brand-primary)',
                      }}
                    />
                  )}
                </div>

                <span
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: isSelected ? 800 : 600,
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: bulletColor,
                    }}
                  />
                  <span style={{ overflowWrap: 'anywhere' }}>{opt.text}</span>
                  {isSelected ? (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--brand-accent-teal)',
                        border: '1px solid rgba(45, 212, 191, 0.28)',
                        borderRadius: '999px',
                        padding: '2px 8px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      선택됨
                    </span>
                  ) : null}
                </span>
              </div>

              {opt.imageUrl && (
                <img
                  src={opt.imageUrl}
                  alt={opt.text}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '6px',
                    objectFit: 'cover',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <VoteReadinessStatus
        voteSubmitReady={voteSubmitReady}
        voteSubmitHint={voteSubmitHint}
        selectedOption={selectedOption}
        voterDisplayName={voterDisplayName}
        trimmedCommentLength={trimmedCommentLength}
        resultsVisibility={resultsVisibility}
      />

      {/* Voting Inputs */}
      {votedOptionId !== null && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginTop: '0.5rem',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          {selectedOption ? (
            <VoteSelectionReview
              selectedOption={selectedOption}
              selectedOptionIndex={selectedOptionIndex}
              resultsVisibility={resultsVisibility}
            />
          ) : null}

          <div
            className="vote-input-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)',
              gap: '8px',
            }}
          >
            <input
              type="text"
              placeholder="닉네임 (기본 익명)"
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              maxLength={15}
              disabled={voteSubmitBusy}
              aria-label="투표자 닉네임 (선택)"
              className="form-input"
            />
            <input
              type="text"
              placeholder="선택 사유 혹은 피드백 한마디를 적어주세요."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={100}
              disabled={voteSubmitBusy}
              aria-label="선택 사유 한마디 (선택)"
              className="form-input"
            />
          </div>
          <section
            aria-label="빠른 선택 이유"
            style={{
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.025)',
              padding: '0.7rem',
              display: 'grid',
              gap: '0.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '0.65rem',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                }}
              >
                <Sparkles size={13} style={{ color: 'var(--brand-accent-gold)' }} />
                빠른 이유 선택
              </span>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.66rem' }}>
                누르면 한마디가 바로 채워집니다
              </small>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '0.42rem',
                flexWrap: 'wrap',
              }}
            >
              {quickReasonChips.map((chip) => {
                const active = comment.trim() === chip.text;

                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setComment(chip.text)}
                    aria-pressed={active}
                    style={{
                      border: active
                        ? '1px solid rgba(45, 212, 191, 0.56)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '999px',
                      background: active ? 'rgba(45, 212, 191, 0.11)' : 'rgba(5, 14, 12, 0.42)',
                      color: active ? 'var(--brand-accent-teal)' : 'var(--text-secondary)',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-sans)',
                    }}
                    title={chip.text}
                  >
                    {chip.label}
                  </button>
                );
              })}
              {comment.trim() ? (
                <button
                  type="button"
                  onClick={() => setComment('')}
                  style={{
                    border: '1px solid rgba(239, 68, 68, 0.18)',
                    borderRadius: '999px',
                    background: 'rgba(239, 68, 68, 0.06)',
                    color: 'var(--brand-accent-coral)',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  지우기
                </button>
              ) : null}
            </div>
          </section>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
              color: 'var(--text-muted)',
              fontSize: '0.68rem',
            }}
          >
            <span>{voterDisplayName} 이름으로 제출됩니다.</span>
            {voteDraftSavedAt ? (
              <span>
                임시저장{' '}
                {new Date(voteDraftSavedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            ) : null}
            <span>한마디 {comment.trim().length} / 100</span>
          </div>
          <button
            onClick={handleVoteSubmit}
            disabled={votedOptionId === null || voteSubmitBusy || pollClosed}
            aria-busy={voteSubmitBusy}
            className="btn-primary"
            style={{ padding: '12px', fontSize: '0.85rem' }}
          >
            {voteSubmitBusy ? '피키가 표를 담는 중… 🥑' : '투표 제출 및 한마디 등록'}
          </button>
        </div>
      )}
    </div>
  );
}

function ShareDeadlineReminder(props: Readonly<{ currentPoll: Poll }>) {
  const { currentPoll } = props;
  const deadlineReminder = buildPollDeadlineReminder(currentPoll, resolvePollShareUrl(currentPoll));
  const canDownloadReminder = Boolean(deadlineReminder);

  return (
    <section
      style={{
        border: canDownloadReminder
          ? '1px solid rgba(250, 204, 21, 0.22)'
          : '1px solid rgba(255,255,255,0.09)',
        borderRadius: 'var(--radius-sm)',
        background: canDownloadReminder ? 'rgba(250, 204, 21, 0.045)' : 'rgba(255,255,255,0.028)',
        padding: '0.85rem',
        display: 'grid',
        gap: '0.7rem',
        marginBottom: '1rem',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: '0.2rem', minWidth: 0 }}>
          <h4
            style={{
              margin: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontWeight: 900,
            }}
          >
            <CalendarPlus size={14} style={{ color: 'var(--brand-accent-gold)' }} />
            마감 리마인더
          </h4>
          <p
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: '0.7rem',
              lineHeight: 1.45,
            }}
          >
            공유한 뒤 잊히지 않도록 마감 전 캘린더 알림 파일을 저장합니다.
          </p>
        </div>
        {canDownloadReminder ? (
          <a
            href={deadlineReminder?.dataUri}
            download={`picky-${currentPoll.id}-deadline-reminder.ics`}
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 11px',
              color: 'var(--brand-accent-gold)',
              borderColor: 'rgba(250, 204, 21, 0.28)',
              textDecoration: 'none',
              fontSize: '0.7rem',
              fontWeight: 900,
              whiteSpace: 'nowrap',
            }}
          >
            <Download size={14} />
            .ics 저장
          </a>
        ) : (
          <span
            style={{
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '999px',
              color: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.035)',
              padding: '5px 9px',
              fontSize: '0.66rem',
              fontWeight: 900,
              whiteSpace: 'nowrap',
            }}
          >
            마감 설정 필요
          </span>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '0.45rem',
        }}
      >
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,0.025)',
            padding: '0.62rem',
          }}
        >
          <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem', fontWeight: 900 }}>
            WHEN
          </span>
          <strong
            style={{
              display: 'block',
              color: 'var(--text-primary)',
              fontSize: '0.74rem',
              lineHeight: 1.35,
            }}
          >
            {currentPoll.endsAt ? formatEndAt(currentPoll.endsAt) : '마감 없음'}
          </strong>
        </div>
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,0.025)',
            padding: '0.62rem',
          }}
        >
          <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem', fontWeight: 900 }}>
            ALERT
          </span>
          <strong
            style={{
              display: 'block',
              color: 'var(--text-primary)',
              fontSize: '0.74rem',
              lineHeight: 1.35,
            }}
          >
            {deadlineReminder?.alertLabel || '마감 설정 후 가능'}
          </strong>
        </div>
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,0.025)',
            padding: '0.62rem',
          }}
        >
          <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem', fontWeight: 900 }}>
            STATUS
          </span>
          <strong
            style={{
              display: 'block',
              color: canDownloadReminder ? 'var(--brand-accent-gold)' : 'var(--text-muted)',
              fontSize: '0.74rem',
              lineHeight: 1.35,
            }}
          >
            {canDownloadReminder ? '저장 가능' : '비활성'}
          </strong>
        </div>
      </div>
    </section>
  );
}

function ShareCopyPresets(
  props: Readonly<{
    currentPoll: Poll;
    copiedId: string | null;
    setCopiedId: React.Dispatch<React.SetStateAction<string | null>>;
    setCopyMessage: React.Dispatch<React.SetStateAction<string>>;
    shareCopyPresets: Array<{
      id: string;
      label: string;
      title: string;
      description: string;
      accent: string;
      text: string;
    }>;
  }>,
) {
  const { currentPoll, copiedId, setCopiedId, setCopyMessage, shareCopyPresets } = props;
  return (
    <section
      style={{
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(255, 255, 255, 0.035)',
        padding: '0.85rem',
        display: 'grid',
        gap: '0.7rem',
        marginBottom: '1rem',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '0.7rem',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: '0.18rem' }}>
          <h4
            style={{
              margin: 0,
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontWeight: 900,
            }}
          >
            공유 문구 프리셋
          </h4>
          <p
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: '0.7rem',
              lineHeight: 1.45,
            }}
          >
            링크만 복사하지 않고 상황에 맞는 초대 문구까지 한 번에 붙여넣습니다.
          </p>
        </div>
        <span
          style={{
            border: '1px solid rgba(45, 212, 191, 0.22)',
            borderRadius: '999px',
            color: 'var(--brand-accent-teal)',
            background: 'rgba(45, 212, 191, 0.07)',
            padding: '4px 9px',
            fontSize: '0.66rem',
            fontWeight: 900,
            whiteSpace: 'nowrap',
          }}
        >
          3개 채널
        </span>
      </div>

      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {shareCopyPresets.map((preset) => {
          const presetCopied = copiedId === `share-preset-${preset.id}-${currentPoll.id}`;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={async () => {
                try {
                  await copyText(preset.text);
                  setCopiedId(`share-preset-${preset.id}-${currentPoll.id}`);
                  setCopyMessage(`${preset.label} 공유 문구를 복사했습니다.`);
                  setTimeout(() => setCopyMessage(''), 2600);
                  setTimeout(() => setCopiedId(null), 2200);
                } catch {
                  setCopyMessage('공유 문구 복사에 실패했습니다. 링크를 직접 복사해 주세요.');
                  setTimeout(() => setCopyMessage(''), 2800);
                }
              }}
              style={{
                width: '100%',
                border: `1px solid ${presetCopied ? preset.accent : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: 'var(--radius-sm)',
                background: presetCopied ? 'rgba(45, 212, 191, 0.08)' : 'rgba(5, 14, 12, 0.46)',
                color: 'var(--text-primary)',
                padding: '0.7rem',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'grid',
                gap: '0.32rem',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.6rem',
                }}
              >
                <span
                  style={{
                    color: preset.accent,
                    fontSize: '0.68rem',
                    fontWeight: 900,
                  }}
                >
                  {preset.label}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: presetCopied ? 'var(--brand-accent-teal)' : 'var(--text-muted)',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                  }}
                >
                  {presetCopied ? <Check size={12} /> : <Copy size={12} />}
                  {presetCopied ? '복사됨' : '문구 복사'}
                </span>
              </span>
              <strong style={{ fontSize: '0.78rem', lineHeight: 1.35 }}>{preset.title}</strong>
              <span
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.68rem',
                  lineHeight: 1.45,
                }}
              >
                {preset.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function KakaoShareDiagnosticsPanel(
  props: Readonly<{
    kakaoShareDiagnostics: KakaoShareDiagnostics;
    kakaoShareReadinessItems: KakaoShareReadinessItem[];
    kakaoReadyCount: number;
  }>,
) {
  const { kakaoShareDiagnostics, kakaoShareReadinessItems, kakaoReadyCount } = props;
  return (
    <section
      style={{
        border: '1px solid rgba(250, 204, 21, 0.2)',
        borderRadius: 'var(--radius-sm)',
        background: kakaoShareDiagnostics.isReadyForKakao
          ? 'rgba(45, 212, 191, 0.045)'
          : 'rgba(250, 204, 21, 0.055)',
        padding: '0.85rem',
        display: 'grid',
        gap: '0.7rem',
        marginBottom: '1rem',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: '0.2rem' }}>
          <h4
            style={{
              margin: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontWeight: 900,
            }}
          >
            <Info size={14} style={{ color: 'var(--brand-accent-gold)' }} />
            카카오 공유 진단
          </h4>
          <p
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: '0.7rem',
              lineHeight: 1.45,
            }}
          >
            조건이 부족하면 버튼은 링크 복사 또는 OS 공유 시트로 안전하게 대체됩니다.
          </p>
        </div>
        <span
          style={{
            border: '1px solid rgba(250, 204, 21, 0.28)',
            borderRadius: '999px',
            color: kakaoShareDiagnostics.isReadyForKakao
              ? 'var(--brand-accent-teal)'
              : 'var(--brand-accent-gold)',
            background: kakaoShareDiagnostics.isReadyForKakao
              ? 'rgba(45, 212, 191, 0.08)'
              : 'rgba(250, 204, 21, 0.08)',
            padding: '4px 9px',
            fontSize: '0.66rem',
            fontWeight: 900,
            whiteSpace: 'nowrap',
          }}
        >
          {kakaoReadyCount}/{kakaoShareDiagnostics.totalBlockingCount} 핵심 조건
        </span>
      </div>

      <div style={{ display: 'grid', gap: '0.45rem' }}>
        {kakaoShareReadinessItems.map((item) => {
          const isManual = item.status === 'manual';
          let stateColor = 'var(--brand-accent-gold)';
          if (item.passed) {
            stateColor = 'var(--brand-accent-teal)';
          } else if (isManual) {
            stateColor = 'var(--text-muted)';
          }
          let stateIcon = <AlertCircle size={13} />;
          if (item.passed) {
            stateIcon = <CheckCircle2 size={13} />;
          } else if (isManual) {
            stateIcon = <Info size={13} />;
          }

          return (
            <div
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(112px, auto) minmax(0, 1fr)',
                gap: '0.55rem',
                alignItems: 'start',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: stateColor,
                  fontSize: '0.68rem',
                  fontWeight: 900,
                }}
              >
                {stateIcon}
                {item.label}
              </span>
              <span
                style={{
                  display: 'grid',
                  gap: '0.22rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.68rem',
                  lineHeight: 1.45,
                }}
              >
                {item.help}
                {item.action ? (
                  <small
                    style={{
                      color: item.passed ? 'var(--text-muted)' : 'var(--text-secondary)',
                      fontSize: '0.64rem',
                      fontWeight: 800,
                    }}
                  >
                    조치: {item.action}
                  </small>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ShareEmbedCodeSection(
  props: Readonly<{
    currentPoll: Poll;
    embedCodeMode: EmbedCodeMode;
    setEmbedCodeMode: React.Dispatch<React.SetStateAction<EmbedCodeMode>>;
    embedCodeModes: ReadonlyArray<{
      id: EmbedCodeMode;
      label: string;
      title: string;
      description: string;
    }>;
    copiedId: string | null;
    setCopiedId: React.Dispatch<React.SetStateAction<string | null>>;
    setCopyMessage: React.Dispatch<React.SetStateAction<string>>;
  }>,
) {
  const {
    currentPoll,
    embedCodeMode,
    setEmbedCodeMode,
    embedCodeModes,
    copiedId,
    setCopiedId,
    setCopyMessage,
  } = props;
  return (
    <section
      style={{
        border: '1px solid rgba(45, 212, 191, 0.18)',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(45, 212, 191, 0.04)',
        padding: '0.85rem',
        display: 'grid',
        gap: '0.72rem',
        marginBottom: '1rem',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'grid', gap: '0.18rem' }}>
        <h4
          style={{
            margin: 0,
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            fontWeight: 900,
          }}
        >
          웹사이트 임베드 코드
        </h4>
        <p
          style={{
            margin: 0,
            color: 'var(--text-secondary)',
            fontSize: '0.7rem',
            lineHeight: 1.45,
          }}
        >
          게시 위치에 맞는 형태를 선택하면 코드가 바로 바뀝니다.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(116px, 1fr))',
          gap: '0.45rem',
        }}
      >
        {embedCodeModes.map((mode) => {
          const selected = embedCodeMode === mode.id;

          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setEmbedCodeMode(mode.id)}
              style={{
                border: selected
                  ? '1px solid rgba(45, 212, 191, 0.62)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 'var(--radius-sm)',
                background: selected ? 'rgba(45, 212, 191, 0.1)' : 'rgba(5, 14, 12, 0.42)',
                color: 'var(--text-primary)',
                padding: '0.62rem',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'grid',
                gap: '0.28rem',
              }}
            >
              <span
                style={{
                  color: selected ? 'var(--brand-accent-teal)' : 'var(--text-muted)',
                  fontSize: '0.66rem',
                  fontWeight: 900,
                }}
              >
                {mode.label}
              </span>
              <strong style={{ fontSize: '0.74rem', lineHeight: 1.3 }}>{mode.title}</strong>
              <span
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.64rem',
                  lineHeight: 1.35,
                }}
              >
                {mode.description}
              </span>
            </button>
          );
        })}
      </div>

      <textarea
        readOnly
        value={buildPollEmbedCode(currentPoll, embedCodeMode)}
        aria-label="선택한 임베드 코드"
        style={{
          width: '100%',
          minHeight: '96px',
          resize: 'vertical',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(2, 8, 7, 0.64)',
          color: 'var(--text-secondary)',
          padding: '0.72rem',
          fontSize: '0.68rem',
          lineHeight: 1.45,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        }}
      />

      <button
        type="button"
        onClick={async () => {
          try {
            await copyText(buildPollEmbedCode(currentPoll, embedCodeMode));
            setCopiedId(`embed-${embedCodeMode}-${currentPoll.id}`);
            setCopyMessage(
              `${embedCodeModes.find((mode) => mode.id === embedCodeMode)?.label || '선택한'} 임베드 코드를 복사했습니다.`,
            );
            setTimeout(() => setCopyMessage(''), 2600);
            setTimeout(() => setCopiedId(null), 2200);
          } catch {
            setCopyMessage('임베드 코드 복사에 실패했습니다.');
            setTimeout(() => setCopyMessage(''), 2800);
          }
        }}
        className="btn-secondary"
        style={{
          width: '100%',
          padding: '10px',
          fontSize: '0.75rem',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          color:
            copiedId === `embed-${embedCodeMode}-${currentPoll.id}`
              ? 'var(--brand-accent-teal)'
              : 'var(--text-primary)',
        }}
      >
        {copiedId === `embed-${embedCodeMode}-${currentPoll.id}` ? (
          <Check size={14} />
        ) : (
          <Copy size={14} />
        )}
        선택한 임베드 코드 복사
      </button>
    </section>
  );
}

function ShareQrCard(props: Readonly<{ currentPoll: Poll; participationQrUrl: string | null }>) {
  const { currentPoll, participationQrUrl } = props;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: participationQrUrl ? '96px minmax(0, 1fr)' : '1fr',
        gap: '0.85rem',
        alignItems: 'center',
        border: '1px solid rgba(45, 212, 191, 0.18)',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(45, 212, 191, 0.045)',
        padding: '0.85rem',
        marginBottom: '1rem',
      }}
    >
      {participationQrUrl ? (
        <img
          src={participationQrUrl}
          alt={`${currentPoll.question} 참여 QR 코드`}
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '16px',
            padding: '7px',
            background: '#fff',
          }}
        />
      ) : null}
      <div style={{ minWidth: 0, display: 'grid', gap: '0.28rem', textAlign: 'left' }}>
        <span
          style={{
            color: 'var(--brand-accent-teal)',
            fontSize: '0.68rem',
            fontWeight: 900,
            letterSpacing: '0.04em',
          }}
        >
          QR 참여 카드
        </span>
        <strong
          style={{
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            lineHeight: 1.35,
          }}
        >
          {participationQrUrl
            ? '스캔하면 바로 이 투표로 이동합니다'
            : '링크가 길어 QR을 만들 수 없습니다'}
        </strong>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', lineHeight: 1.45 }}>
          발표 화면, 회의실 모니터, 오프라인 모임에서 링크를 읽어주지 않아도 참여할 수 있습니다.
        </span>
      </div>
    </div>
  );
}

function PollShareModal(
  props: Readonly<{
    currentPoll: Poll;
    copiedId: string | null;
    copyMessage: string;
    setCopiedId: React.Dispatch<React.SetStateAction<string | null>>;
    setCopyMessage: React.Dispatch<React.SetStateAction<string>>;
    snsPreviewPlatform: 'x' | 'kakao';
    setSnsPreviewPlatform: React.Dispatch<React.SetStateAction<'x' | 'kakao'>>;
    embedCodeMode: EmbedCodeMode;
    setEmbedCodeMode: React.Dispatch<React.SetStateAction<EmbedCodeMode>>;
    embedCodeModes: ReadonlyArray<{
      id: EmbedCodeMode;
      label: string;
      title: string;
      description: string;
    }>;
    inviteMessage: string;
    inviteMessageTone: InviteMessageTone;
    setInviteMessageTone: React.Dispatch<React.SetStateAction<InviteMessageTone>>;
    shareCopyPresets: Array<{
      id: string;
      label: string;
      title: string;
      description: string;
      accent: string;
      text: string;
    }>;
    kakaoShareDiagnostics: KakaoShareDiagnostics;
    kakaoShareReadinessItems: KakaoShareReadinessItem[];
    kakaoReadyCount: number;
    participationQrUrl: string | null;
    handleCloseShareModal: () => void;
    handleCopyInviteMessageClick: () => void;
    handleCopyLinkClick: (pollId: string) => void;
    handleKakaoShareClick: () => void;
    handleNativeShareClick: () => void;
  }>,
) {
  const {
    currentPoll,
    copiedId,
    copyMessage,
    setCopiedId,
    setCopyMessage,
    snsPreviewPlatform,
    setSnsPreviewPlatform,
    embedCodeMode,
    setEmbedCodeMode,
    embedCodeModes,
    inviteMessage,
    inviteMessageTone,
    setInviteMessageTone,
    shareCopyPresets,
    kakaoShareDiagnostics,
    kakaoShareReadinessItems,
    kakaoReadyCount,
    participationQrUrl,
    handleCloseShareModal,
    handleCopyInviteMessageClick,
    handleCopyLinkClick,
    handleKakaoShareClick,
    handleNativeShareClick,
  } = props;

  return (
    <div className="modal-overlay">
      <button
        type="button"
        aria-label="공유 창 닫기"
        onClick={handleCloseShareModal}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: 'transparent',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: 'default',
        }}
      />
      <div
        className="modal-content animate-slide-up"
        style={{ maxWidth: '520px', position: 'relative', zIndex: 1 }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <Sparkles size={32} style={{ color: 'var(--brand-accent-gold)', marginBottom: '8px' }} />
          <h3
            style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: '4px',
            }}
          >
            고민 공유 링크 발급 완료!
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            지인이나 SNS 단톡방에 물어보고 피드백을 수집하세요.
          </p>
        </div>

        {/* Platform Previews */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                fontSize: '0.725rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Info size={12} />
              <span>SNS 피드 노출 미리보기 시뮬레이션</span>
            </span>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setSnsPreviewPlatform('x')}
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor:
                    snsPreviewPlatform === 'x' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  color: snsPreviewPlatform === 'x' ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                X (Twitter)
              </button>
              <button
                onClick={() => setSnsPreviewPlatform('kakao')}
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor:
                    snsPreviewPlatform === 'kakao' ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                  color:
                    snsPreviewPlatform === 'kakao'
                      ? 'var(--brand-accent-gold)'
                      : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                카카오톡
              </button>
            </div>
          </div>

          <SnsPreviewCard
            platform={snsPreviewPlatform}
            question={currentPoll.question}
            description={currentPoll.description}
            options={currentPoll.options.map((o) => o.text)}
            imageUrl={currentPoll.options.find((option) => option.imageUrl)?.imageUrl}
          />
        </div>

        <ShareCopyPresets
          currentPoll={currentPoll}
          copiedId={copiedId}
          setCopiedId={setCopiedId}
          setCopyMessage={setCopyMessage}
          shareCopyPresets={shareCopyPresets}
        />

        <KakaoShareDiagnosticsPanel
          kakaoShareDiagnostics={kakaoShareDiagnostics}
          kakaoShareReadinessItems={kakaoShareReadinessItems}
          kakaoReadyCount={kakaoReadyCount}
        />

        {/* Copy link input */}
        <ShareQrCard currentPoll={currentPoll} participationQrUrl={participationQrUrl} />

        <ShareDeadlineReminder currentPoll={currentPoll} />

        <section
          style={{
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,0.035)',
            padding: '0.85rem',
            display: 'grid',
            gap: '0.7rem',
            marginBottom: '1rem',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'grid', gap: '0.2rem' }}>
              <h4
                style={{
                  margin: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                }}
              >
                <Send size={14} style={{ color: 'var(--brand-accent-teal)' }} />
                초대 메시지
              </h4>
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-secondary)',
                  fontSize: '0.7rem',
                  lineHeight: 1.45,
                }}
              >
                카카오톡, 문자, 슬랙에 그대로 붙여넣을 수 있도록 질문, 코드, 마감, 첨부 안내를
                묶었습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyInviteMessageClick}
              className="ghost-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                fontSize: '0.68rem',
                whiteSpace: 'nowrap',
              }}
            >
              {copiedId === `invite-${currentPoll.id}` ? <Check size={13} /> : <Copy size={13} />}
              {copiedId === `invite-${currentPoll.id}` ? '복사됨' : '문구 복사'}
            </button>
          </div>

          <fieldset
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '0.4rem',
              border: 0,
              padding: 0,
              margin: 0,
              minInlineSize: 0,
            }}
          >
            <legend style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
              초대 메시지 목적 선택
            </legend>
            {INVITE_MESSAGE_TONE_OPTIONS.map((option) => {
              const active = inviteMessageTone === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setInviteMessageTone(option.value)}
                  aria-pressed={active}
                  style={{
                    border: active
                      ? '1px solid rgba(45, 212, 191, 0.45)'
                      : '1px solid var(--bg-card-border)',
                    borderRadius: 'var(--radius-sm)',
                    background: active ? 'rgba(45, 212, 191, 0.09)' : 'rgba(255,255,255,0.025)',
                    color: active ? 'var(--brand-accent-teal)' : 'var(--text-secondary)',
                    padding: '0.55rem 0.45rem',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: '0.18rem',
                    textAlign: 'left',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <strong style={{ fontSize: '0.68rem', fontWeight: 900 }}>{option.label}</strong>
                  <span
                    style={{
                      color: active ? 'var(--text-secondary)' : 'var(--text-muted)',
                      fontSize: '0.62rem',
                      lineHeight: 1.35,
                    }}
                  >
                    {option.description}
                  </span>
                </button>
              );
            })}
          </fieldset>

          <textarea
            readOnly
            aria-label="공유 초대 메시지"
            value={inviteMessage}
            onFocus={(event) => event.currentTarget.select()}
            style={{
              width: '100%',
              minHeight: '136px',
              resize: 'vertical',
              border: '1px solid var(--bg-card-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'oklch(11% 0.015 260)',
              color: 'var(--text-secondary)',
              padding: '0.75rem',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.72rem',
              lineHeight: 1.55,
              outline: 'none',
            }}
          />
        </section>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'oklch(11% 0.015 260)',
            border: '1px solid var(--bg-card-border)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              textAlign: 'left',
            }}
          >
            {resolvePollShareUrl(currentPoll)}
          </span>
          {copyMessage ? (
            <p
              style={{
                margin: 0,
                fontSize: '0.7rem',
                color:
                  copiedId === currentPoll.id
                    ? 'var(--brand-accent-teal)'
                    : 'var(--brand-accent-coral)',
              }}
            >
              {copyMessage}
            </p>
          ) : null}
          <button
            onClick={() => handleCopyLinkClick(currentPoll.id)}
            style={{
              background: 'none',
              border: 'none',
              color:
                copiedId === currentPoll.id ? 'var(--brand-accent-teal)' : 'var(--brand-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {copiedId === currentPoll.id ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>

        <button
          type="button"
          onClick={handleNativeShareClick}
          className="btn-primary"
          style={{
            width: '100%',
            padding: '11px',
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginBottom: '1rem',
          }}
        >
          <Share2 size={15} />
          <span>공유하기</span>
        </button>

        <ShareEmbedCodeSection
          currentPoll={currentPoll}
          embedCodeMode={embedCodeMode}
          setEmbedCodeMode={setEmbedCodeMode}
          embedCodeModes={embedCodeModes}
          copiedId={copiedId}
          setCopiedId={setCopiedId}
          setCopyMessage={setCopyMessage}
        />

        {/* Sharing Intents */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '1.25rem',
          }}
        >
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(resolveShareText(currentPoll))}&url=${encodeURIComponent(resolvePollShareUrl(currentPoll))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{
              padding: '10px',
              fontSize: '0.75rem',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: 600,
            }}
          >
            <span>🐦 X (Twitter)</span>
          </a>
          <button
            type="button"
            onClick={handleKakaoShareClick}
            className="btn-secondary"
            style={{
              padding: '10px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: 600,
              color: 'var(--brand-accent-gold)',
              borderColor: 'rgba(251, 191, 36, 0.2)',
            }}
          >
            <span>💬 카카오톡 공유</span>
          </button>
        </div>

        <button
          onClick={handleCloseShareModal}
          className="btn-primary"
          style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}

function ResultImagePreviewModal(
  props: Readonly<{
    currentPoll: Poll;
    resultImagePreviewUrl: string;
    resultImageTheme: ResultImageTheme;
    resultImageContentOptions: ResultImageContentOptions;
    copiedId: string | null;
    closeResultImagePreview: () => void;
    handleResultImageThemeChange: (nextTheme: ResultImageTheme) => void;
    handleResultImageContentToggle: (targetOption: ResultImageContentKey) => void;
    handleDownloadPreviewImageClick: () => void;
    handleCopyJoinCodeClick: () => void;
  }>,
) {
  const {
    currentPoll,
    resultImagePreviewUrl,
    resultImageTheme,
    resultImageContentOptions,
    copiedId,
    closeResultImagePreview,
    handleResultImageThemeChange,
    handleResultImageContentToggle,
    handleDownloadPreviewImageClick,
    handleCopyJoinCodeClick,
  } = props;
  return (
    <div className="modal-overlay">
      <button
        type="button"
        aria-label="미리보기 닫기"
        onClick={closeResultImagePreview}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: 'transparent',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: 'default',
        }}
      />
      <div
        className="modal-content animate-slide-up"
        style={{ maxWidth: '760px', position: 'relative', zIndex: 1 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem',
            alignItems: 'flex-start',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'grid', gap: '0.25rem' }}>
            <h3
              style={{
                margin: 0,
                color: 'var(--text-primary)',
                fontSize: '1rem',
                fontWeight: 900,
              }}
            >
              결과 이미지 미리보기
            </h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              저장 전에 공유 카드가 어떻게 보이는지 확인하세요.
            </p>
          </div>
          <button
            type="button"
            onClick={closeResultImagePreview}
            className="ghost-btn"
            style={{ padding: '6px 10px', fontSize: '0.72rem' }}
          >
            닫기
          </button>
        </div>

        <figure className="result-image-preview-frame">
          <img src={resultImagePreviewUrl} alt={`${currentPoll.question} 결과 이미지 미리보기`} />
        </figure>

        <div className="result-image-theme-grid" aria-label="결과 이미지 테마 선택">
          {RESULT_IMAGE_THEME_OPTIONS.map((option) => {
            const active = resultImageTheme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleResultImageThemeChange(option.value)}
                aria-pressed={active}
                style={{
                  borderColor: active ? 'rgba(45, 212, 191, 0.42)' : 'var(--bg-card-border)',
                  background: active ? 'rgba(45, 212, 191, 0.08)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <strong
                  style={{
                    color: active ? 'var(--brand-accent-teal)' : 'var(--text-primary)',
                  }}
                >
                  {option.label}
                </strong>
                <span>{option.description}</span>
              </button>
            );
          })}
        </div>

        <div className="result-image-content-grid" aria-label="결과 이미지 포함 항목 선택">
          {RESULT_IMAGE_CONTENT_OPTIONS.map((option) => {
            const active = resultImageContentOptions[option.value];
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleResultImageContentToggle(option.value)}
                aria-pressed={active}
                style={{
                  borderColor: active ? 'rgba(250, 204, 21, 0.38)' : 'var(--bg-card-border)',
                  background: active ? 'rgba(250, 204, 21, 0.08)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <strong
                  style={{
                    color: active ? 'var(--brand-accent-gold)' : 'var(--text-primary)',
                  }}
                >
                  {active ? '포함' : '제외'} · {option.label}
                </strong>
                <span>{option.description}</span>
              </button>
            );
          })}
        </div>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: '0.75rem',
            alignItems: 'center',
            border: '1px solid rgba(45, 212, 191, 0.2)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(45, 212, 191, 0.045)',
            padding: '0.8rem',
            marginBottom: '1rem',
            textAlign: 'left',
          }}
        >
          <div style={{ minWidth: 0, display: 'grid', gap: '0.24rem' }}>
            <span
              style={{
                color: 'var(--brand-accent-teal)',
                fontSize: '0.66rem',
                fontWeight: 900,
                letterSpacing: '0.05em',
              }}
            >
              JOIN CODE
            </span>
            <strong
              style={{
                color: 'var(--text-primary)',
                fontSize: '1.15rem',
                lineHeight: 1,
                letterSpacing: '0.04em',
              }}
            >
              {currentPoll.id}
            </strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
              링크 대신 코드만 전달해도 상단 JOIN 입력에서 바로 참여할 수 있습니다.
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyJoinCodeClick}
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '0.72rem',
              whiteSpace: 'nowrap',
            }}
          >
            {copiedId === `code-${currentPoll.id}` ? <Check size={14} /> : <Code2 size={14} />}
            {copiedId === `code-${currentPoll.id}` ? '코드 복사됨' : '코드 복사'}
          </button>
        </section>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            flexWrap: 'wrap',
            marginTop: '1rem',
          }}
        >
          <button
            type="button"
            onClick={closeResultImagePreview}
            className="btn-secondary"
            style={{ padding: '8px 12px', fontSize: '0.76rem' }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleDownloadPreviewImageClick}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '0.76rem',
            }}
          >
            <Download size={14} />
            PNG 저장
          </button>
        </div>
      </div>
    </div>
  );
}

// 댓글/대댓글 단일 카드 — isReply 면 들여쓰기·연한 배경으로 답글임을 시각화한다.
function CommentCard(
  props: Readonly<{
    comm: Poll['comments'][number];
    canManage: boolean;
    onDeleteComment: (commentId: number) => void;
    onReplyToggle?: () => void;
    isReply?: boolean;
  }>,
) {
  const { comm, canManage, onDeleteComment, onReplyToggle, isReply = false } = props;
  return (
    <div
      className="content-card"
      style={{
        padding: isReply ? '0.75rem 1rem' : '1rem',
        marginLeft: isReply ? '1.5rem' : 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        cursor: 'default',
        background: isReply ? 'rgba(255,255,255,0.02)' : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '0.825rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isReply ? (
              <span aria-hidden style={{ color: 'var(--text-muted)' }}>
                ↳
              </span>
            ) : (
              <User size={12} style={{ color: 'var(--text-muted)' }} />
            )}
            <span>{comm.voterName}</span>
          </span>
          {comm.selectedOptionText && (
            <span
              style={{
                fontSize: '0.65rem',
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--brand-primary-light)',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 700,
                border: '1px solid rgba(99, 102, 241, 0.15)',
              }}
            >
              {comm.selectedOptionText} 선택
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
          {new Date(comm.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <p
        style={{
          fontSize: '0.825rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        {comm.comment}
      </p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        {onReplyToggle && !isReply ? (
          <button
            type="button"
            onClick={onReplyToggle}
            className="ghost-inline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--brand-accent-teal)',
            }}
          >
            <MessageSquare size={12} />
            답글 달기
          </button>
        ) : (
          <span />
        )}
        {canManage ? (
          <button
            type="button"
            onClick={() => onDeleteComment(comm.id)}
            className="ghost-btn"
            aria-label={`${comm.voterName} 님의 댓글 삭제`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 9px',
              fontSize: '0.7rem',
              color: 'var(--brand-accent-coral)',
              borderColor: 'rgba(239, 68, 68, 0.28)',
            }}
          >
            <Trash2 size={12} />
            삭제
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PollFeedbackList(
  props: Readonly<{
    currentPoll: Poll;
    commentViewMode: CommentViewMode;
    setCommentViewMode: React.Dispatch<React.SetStateAction<CommentViewMode>>;
    commentFilter: 'all' | number;
    setCommentFilter: React.Dispatch<React.SetStateAction<'all' | number>>;
    commentFilterOptions: Array<{ id: number; label: string; count: number }>;
    visibleComments: Poll['comments'];
    emptyCommentMessage: string;
    canManage: boolean;
    pollClosed: boolean;
    onDeleteComment: (commentId: number) => void;
    onAddReply: (parentId: number, text: string) => Promise<void> | void;
  }>,
) {
  const {
    currentPoll,
    commentViewMode,
    setCommentViewMode,
    commentFilter,
    setCommentFilter,
    commentFilterOptions,
    visibleComments,
    emptyCommentMessage,
    canManage,
    pollClosed,
    onDeleteComment,
    onAddReply,
  } = props;
  const [replyingTo, setReplyingTo] = React.useState<number | null>(null);
  const [replyText, setReplyText] = React.useState('');

  // 대댓글 트리 — 최상위 댓글(parentId 없음)만 목록에 두고, 각 댓글의 답글을 아래로 들여쓴다.
  const repliesByParent = new Map<number, Poll['comments']>();
  for (const item of currentPoll.comments) {
    if (item.parentId != null) {
      const bucket = repliesByParent.get(item.parentId) ?? [];
      bucket.push(item);
      repliesByParent.set(item.parentId, bucket);
    }
  }
  const visibleTopLevel = visibleComments.filter((item) => item.parentId == null);

  const submitReply = async (parentId: number) => {
    const text = replyText.trim();
    if (!text) {
      return;
    }
    await onAddReply(parentId, text);
    setReplyText('');
    setReplyingTo(null);
  };
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.85rem',
          flexWrap: 'wrap',
          marginBottom: '0.85rem',
        }}
      >
        <h3
          style={{
            fontSize: '0.95rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-primary)',
          }}
        >
          <MessageSquare size={15} style={{ color: 'var(--brand-accent-gold)' }} />
          <span>참여자 피드백 한마디 ({currentPoll.comments.length})</span>
        </h3>
        {currentPoll.comments.length > 0 ? (
          <div
            style={{
              display: 'flex',
              gap: '0.4rem',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            {COMMENT_VIEW_OPTIONS.map((option) => {
              const active = commentViewMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCommentViewMode(option.value)}
                  className="ghost-btn"
                  style={{
                    padding: '5px 9px',
                    color: active ? 'var(--brand-accent-gold)' : 'var(--text-muted)',
                    borderColor: active ? 'rgba(250, 204, 21, 0.34)' : 'var(--bg-card-border)',
                    background: active ? 'rgba(250, 204, 21, 0.08)' : 'transparent',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCommentFilter('all')}
              className="ghost-btn"
              style={{
                padding: '5px 9px',
                color: commentFilter === 'all' ? 'var(--brand-accent-teal)' : 'var(--text-muted)',
                borderColor:
                  commentFilter === 'all' ? 'rgba(45, 212, 191, 0.38)' : 'var(--bg-card-border)',
                background: commentFilter === 'all' ? 'rgba(45, 212, 191, 0.08)' : 'transparent',
              }}
            >
              전체 {currentPoll.comments.length}
            </button>
            {commentFilterOptions
              .filter((option) => option.count > 0)
              .map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCommentFilter(option.id)}
                  className="ghost-btn"
                  style={{
                    padding: '5px 9px',
                    color:
                      commentFilter === option.id
                        ? 'var(--brand-accent-teal)'
                        : 'var(--text-muted)',
                    borderColor:
                      commentFilter === option.id
                        ? 'rgba(45, 212, 191, 0.38)'
                        : 'var(--bg-card-border)',
                    background:
                      commentFilter === option.id ? 'rgba(45, 212, 191, 0.08)' : 'transparent',
                    maxWidth: '220px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {option.label} {option.count}
                </button>
              ))}
          </div>
        ) : null}
      </div>

      {pollClosed ? (
        <p
          role="note"
          style={{
            margin: '0 0 0.85rem',
            fontSize: '0.76rem',
            color: 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <Lock size={12} />
          마감된 고민이에요. 한마디·답글은 더 남길 수 없어요.
        </p>
      ) : null}

      {currentPoll.comments.length === 0 ? (
        <div
          className="content-card"
          style={{
            textAlign: 'center',
            padding: '2.5rem',
            color: 'var(--text-muted)',
            fontSize: '0.825rem',
          }}
        >
          아직 작성된 피드백이 없습니다. 고민 해결을 돕는 소중한 한마디를 남겨보세요!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {visibleComments.length === 0 ? (
            <div
              className="content-card"
              style={{
                textAlign: 'center',
                padding: '1.6rem',
                color: 'var(--text-muted)',
                fontSize: '0.78rem',
              }}
            >
              {emptyCommentMessage}
            </div>
          ) : null}
          {visibleTopLevel.map((comm) => {
            const replies = repliesByParent.get(comm.id) ?? [];
            return (
              <div
                key={comm.id}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
              >
                <CommentCard
                  comm={comm}
                  canManage={canManage}
                  onDeleteComment={onDeleteComment}
                  // B4: 마감된 고민은 답글도 받지 않는다 — '답글 달기' 트리거 자체를 숨긴다.
                  onReplyToggle={
                    pollClosed
                      ? undefined
                      : () => {
                          setReplyingTo((prev) => (prev === comm.id ? null : comm.id));
                          setReplyText('');
                        }
                  }
                />
                {replies.map((reply) => (
                  <CommentCard
                    key={reply.id}
                    comm={reply}
                    canManage={canManage}
                    onDeleteComment={onDeleteComment}
                    isReply
                  />
                ))}
                {!pollClosed && replyingTo === comm.id ? (
                  <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1.5rem' }}>
                    <input
                      type="text"
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          void submitReply(comm.id);
                        }
                      }}
                      placeholder="따뜻한 답글을 남겨요 💬"
                      maxLength={100}
                      aria-label="답글 입력"
                      className="form-input"
                      style={{ flex: 1, minWidth: 0, fontSize: '0.8rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => void submitReply(comm.id)}
                      className="btn-primary"
                      style={{ flexShrink: 0, padding: '8px 14px', fontSize: '0.8rem' }}
                    >
                      등록
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type OperationChecklistItem = {
  key: string;
  label: string;
  value: string;
  help: string;
  passed: boolean;
  action: OperationChecklistAction;
  actionLabel: string;
};

function OperationChecklistSection(
  props: Readonly<{
    currentPoll: Poll;
    operationPhase: string;
    completedOperationCount: number;
    operationChecklist: OperationChecklistItem[];
    handleCopyLinkClick: (pollId: string) => void;
    handlePreviewResultImageClick: () => void;
    setShowShareModal: React.Dispatch<React.SetStateAction<boolean>>;
  }>,
) {
  const {
    currentPoll,
    operationPhase,
    completedOperationCount,
    operationChecklist,
    handleCopyLinkClick,
    handlePreviewResultImageClick,
    setShowShareModal,
  } = props;
  return (
    <section
      style={{
        display: 'grid',
        gap: '0.85rem',
        border: '1px solid rgba(45, 212, 191, 0.18)',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(45, 212, 191, 0.045)',
        padding: '1rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '0.85rem',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: '0.25rem' }}>
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
            <Gauge size={13} />
            운영 체크리스트
          </span>
          <h3
            style={{
              margin: 0,
              color: 'var(--text-primary)',
              fontSize: '0.98rem',
              fontWeight: 900,
            }}
          >
            지금 단계: {operationPhase}
          </h3>
          <p
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: '0.76rem',
              lineHeight: 1.55,
            }}
          >
            공유, 의견 수집, 결과 정리, 현장 참여 준비 상태를 한 번에 확인합니다.
          </p>
        </div>
        <span
          style={{
            border: '1px solid rgba(45, 212, 191, 0.28)',
            borderRadius: '999px',
            color:
              completedOperationCount === operationChecklist.length
                ? 'var(--brand-accent-teal)'
                : 'var(--brand-accent-gold)',
            background:
              completedOperationCount === operationChecklist.length
                ? 'rgba(45, 212, 191, 0.08)'
                : 'rgba(250, 204, 21, 0.08)',
            padding: '5px 10px',
            fontSize: '0.68rem',
            fontWeight: 900,
            whiteSpace: 'nowrap',
          }}
        >
          {completedOperationCount}/{operationChecklist.length} 준비됨
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.65rem',
        }}
      >
        {operationChecklist.map((item) => (
          <article
            key={item.key}
            style={{
              display: 'grid',
              gap: '0.55rem',
              alignContent: 'start',
              border: '1px solid var(--bg-card-border)',
              borderRadius: 'var(--radius-sm)',
              background: item.passed ? 'rgba(45, 212, 191, 0.06)' : 'rgba(255,255,255,0.025)',
              padding: '0.75rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: item.passed ? 'var(--brand-accent-teal)' : 'var(--brand-accent-gold)',
                  fontSize: '0.74rem',
                  fontWeight: 900,
                }}
              >
                {item.passed ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {item.label}
              </span>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.66rem' }}>
                {item.value}
              </small>
            </div>
            <p
              style={{
                margin: 0,
                minHeight: '2.5em',
                color: 'var(--text-secondary)',
                fontSize: '0.7rem',
                lineHeight: 1.45,
              }}
            >
              {item.help}
            </p>
            <button
              type="button"
              onClick={() => {
                if (item.action === 'share') {
                  setShowShareModal(true);
                } else if (item.action === 'copyLink') {
                  handleCopyLinkClick(currentPoll.id);
                } else if (item.action === 'resultImage') {
                  handlePreviewResultImageClick();
                } else {
                  globalThis.open(`/present/${encodeURIComponent(currentPoll.id)}`, '_blank');
                }
              }}
              className="ghost-btn"
              style={{
                justifySelf: 'start',
                padding: '5px 9px',
                fontSize: '0.68rem',
              }}
            >
              {item.actionLabel}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function ShareStripSection(
  props: Readonly<{
    currentPoll: Poll;
    participationQrUrl: string | null;
    shareUrl: string;
    copiedId: string | null;
    handleCopyLinkClick: (pollId: string) => void;
    handleCopyJoinCodeClick: () => void;
    handleCopyEmbedClick: () => void;
  }>,
) {
  const {
    currentPoll,
    participationQrUrl,
    shareUrl,
    copiedId,
    handleCopyLinkClick,
    handleCopyJoinCodeClick,
    handleCopyEmbedClick,
  } = props;
  return (
    <section
      className="share-strip desktop-only"
      style={{
        order: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: '0.85rem',
        alignItems: 'center',
        border: '1px solid rgba(45, 212, 191, 0.18)',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(45, 212, 191, 0.05)',
        padding: '0.85rem',
      }}
    >
      <div
        style={{
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
        }}
      >
        {participationQrUrl ? (
          <img
            src={participationQrUrl}
            alt={`${currentPoll.question} 참여 QR 코드`}
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '12px',
              padding: '5px',
              background: '#fff',
              flexShrink: 0,
              imageRendering: 'pixelated',
            }}
          />
        ) : (
          <span
            aria-hidden="true"
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '12px',
              border: '1px solid rgba(232, 200, 77, 0.24)',
              color: 'var(--brand-accent-gold)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <QrCode size={24} />
          </span>
        )}
        <div style={{ minWidth: 0, display: 'grid', gap: '0.25rem' }}>
          <span
            style={{
              color: 'var(--brand-accent-teal)',
              fontSize: '0.68rem',
              fontWeight: 900,
              letterSpacing: '0.04em',
            }}
          >
            JOIN CODE · {currentPoll.id}
          </span>
          <p
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: '0.76rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={shareUrl}
          >
            {shareUrl}
          </p>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.66rem', fontWeight: 700 }}>
            {participationQrUrl
              ? '모바일 카메라로 스캔해 바로 참여'
              : '링크가 길어 QR 대신 복사를 사용'}
          </span>
        </div>
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '0.45rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={handleCopyJoinCodeClick}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            minHeight: '38px',
            padding: '8px 12px',
            fontSize: '0.74rem',
            whiteSpace: 'nowrap',
          }}
        >
          {copiedId === `code-${currentPoll.id}` ? <Check size={14} /> : <Code2 size={14} />}
          코드 복사
        </button>
        <button
          type="button"
          onClick={() => handleCopyLinkClick(currentPoll.id)}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            minHeight: '38px',
            padding: '8px 12px',
            fontSize: '0.74rem',
            whiteSpace: 'nowrap',
          }}
        >
          {copiedId === currentPoll.id ? <Check size={14} /> : <Copy size={14} />}
          링크 복사
        </button>
        <button
          type="button"
          onClick={handleCopyEmbedClick}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            minHeight: '38px',
            padding: '8px 12px',
            fontSize: '0.74rem',
            whiteSpace: 'nowrap',
          }}
        >
          {copiedId === `embed-${currentPoll.id}` ? <Check size={14} /> : <Code2 size={14} />}
          임베드
        </button>
        <button
          type="button"
          onClick={() =>
            globalThis.open(`/present/${encodeURIComponent(currentPoll.id)}`, '_blank')
          }
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            minHeight: '38px',
            padding: '8px 12px',
            fontSize: '0.74rem',
            whiteSpace: 'nowrap',
          }}
        >
          <BarChart3 size={14} />
          발표 모드
        </button>
      </div>
    </section>
  );
}

function LiveResultPreview(props: Readonly<{ currentPoll: Poll }>) {
  const { currentPoll } = props;
  return (
    <section
      style={{
        border: '1px solid rgba(45, 212, 191, 0.22)',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(45, 212, 191, 0.055)',
        padding: '1rem',
        display: 'grid',
        gap: '0.85rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <h3
          style={{
            margin: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-primary)',
            fontSize: '0.92rem',
          }}
        >
          <BarChart3 size={15} style={{ color: 'var(--brand-accent-teal)' }} />
          실시간 결과 미리보기
        </h3>
        <span className="stat-pill">현재 {currentPoll.totalVotes}표</span>
      </div>
      <div style={{ display: 'grid', gap: '0.55rem' }}>
        {currentPoll.options.map((option) => {
          const percentage = optionPercent(option.voteCount, currentPoll.totalVotes);
          return (
            <div key={option.id} style={{ display: 'grid', gap: '0.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  color: 'var(--text-secondary)',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                }}
              >
                <span style={{ overflowWrap: 'anywhere' }}>{option.text}</span>
                <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {percentage}% · {option.voteCount}표
                </span>
              </div>
              <div
                style={{
                  height: '7px',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.06)',
                }}
              >
                <div
                  style={{
                    width: `${percentage}%`,
                    height: '100%',
                    borderRadius: 'inherit',
                    background:
                      'linear-gradient(90deg, var(--brand-accent-teal), var(--brand-accent-gold))',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.7rem' }}>
        이 투표는 생성자가 결과를 항상 공개하도록 설정했습니다. 흐름을 확인한 뒤에도 바로 참여할 수
        있습니다.
      </p>
    </section>
  );
}

function VoteCelebrationOverlay() {
  return (
    <div className="vote-celebrate" aria-hidden="true">
      <style>{`
        .vote-celebrate {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          overflow: hidden;
        }
        .vote-celebrate__mascot {
          font-size: 3.4rem;
          line-height: 1;
          filter: drop-shadow(0 10px 24px rgba(45, 212, 191, 0.32));
          animation: voteCelebratePop 1.6s cubic-bezier(0.2, 0.9, 0.25, 1) forwards;
        }
        .vote-celebrate__piece {
          position: absolute;
          top: 48%;
          left: 50%;
          width: 9px;
          height: 14px;
          border-radius: 2px;
          opacity: 0;
          animation: voteConfettiFall 1.5s ease-out forwards;
        }
        @keyframes voteCelebratePop {
          0% { transform: scale(0.3) translateY(8px); opacity: 0; }
          28% { transform: scale(1.18) translateY(-6px); opacity: 1; }
          55% { transform: scale(1) translateY(0); opacity: 1; }
          100% { transform: scale(1.02) translateY(-4px); opacity: 0; }
        }
        @keyframes voteConfettiFall {
          0% { transform: translate(-50%, -50%) rotate(0deg) scale(0.6); opacity: 0; }
          12% { opacity: 1; }
          100% { transform: translate(var(--cx), var(--cy)) rotate(var(--cr)) scale(1); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .vote-celebrate__mascot {
            animation: none;
            opacity: 1;
          }
          .vote-celebrate__piece { display: none; }
        }
      `}</style>
      {[
        { x: '-160px', y: '120px', r: '220deg', c: 'var(--brand-accent-teal)' },
        { x: '150px', y: '130px', r: '-200deg', c: 'var(--brand-accent-gold)' },
        { x: '-90px', y: '180px', r: '160deg', c: 'var(--brand-accent-coral)' },
        { x: '110px', y: '175px', r: '-150deg', c: 'var(--brand-primary)' },
        { x: '-200px', y: '60px', r: '300deg', c: 'var(--brand-accent-gold)' },
        { x: '200px', y: '70px', r: '-260deg', c: 'var(--brand-accent-teal)' },
        { x: '0px', y: '210px', r: '120deg', c: 'var(--brand-accent-coral)' },
        { x: '-40px', y: '-150px', r: '90deg', c: 'var(--brand-primary)' },
        { x: '60px', y: '-140px', r: '-110deg', c: 'var(--brand-accent-gold)' },
      ].map((piece, index) => (
        <span
          key={`${piece.x}-${piece.y}-${piece.r}-${piece.c}`}
          className="vote-celebrate__piece"
          style={{
            ['--cx' as string]: piece.x,
            ['--cy' as string]: piece.y,
            ['--cr' as string]: piece.r,
            background: piece.c,
            animationDelay: `${index * 0.035}s`,
          }}
        />
      ))}
      <span className="vote-celebrate__mascot">{MASCOT.celebrate.emoji}</span>
    </div>
  );
}

function PollAttachmentsSection(
  props: Readonly<{ attachments: NonNullable<Poll['attachments']> }>,
) {
  const { attachments } = props;
  return (
    <section
      style={{
        border: '1px solid var(--bg-card-border)',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(255,255,255,0.022)',
        padding: '0.9rem',
        display: 'grid',
        gap: '0.65rem',
      }}
    >
      <div style={{ display: 'grid', gap: '0.2rem' }}>
        <h3
          style={{
            margin: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            fontWeight: 900,
          }}
        >
          <FileText size={15} style={{ color: 'var(--brand-accent-gold)' }} />
          참고 파일
        </h3>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.7rem' }}>
          투표 판단에 필요한 자료입니다. 파일을 내려받아 확인한 뒤 참여해 주세요.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.55rem',
        }}
      >
        {attachments.map((attachment, index) => (
          <article
            key={`${attachment.name}-${index}`}
            style={{
              display: 'grid',
              gap: '0.48rem',
              border: '1px solid rgba(232, 200, 77, 0.18)',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(250, 204, 21, 0.045)',
              color: 'var(--text-primary)',
              padding: '0.72rem',
              minWidth: 0,
            }}
          >
            <div style={{ minWidth: 0, display: 'grid', gap: '0.18rem' }}>
              <strong
                style={{
                  fontSize: '0.78rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={attachment.name}
              >
                {attachment.name}
              </strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.66rem' }}>
                {(attachment.size / 1024).toFixed(1)}KB · {attachment.type || 'file'}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '0.4rem',
                flexWrap: 'wrap',
              }}
            >
              <a
                href={attachment.dataUrl}
                target="_blank"
                rel="noreferrer"
                className="ghost-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 9px',
                  fontSize: '0.66rem',
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={12} />
                미리보기
              </a>
              <a
                href={attachment.dataUrl}
                download={attachment.name}
                className="ghost-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 9px',
                  fontSize: '0.66rem',
                  textDecoration: 'none',
                }}
              >
                <Download size={12} />
                다운로드
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PollTopNav(
  props: Readonly<{
    isEmbedMode: boolean;
    originalPollPath: string;
    navigate: (path: string) => void;
    setShowShareModal: React.Dispatch<React.SetStateAction<boolean>>;
  }>,
) {
  const { isEmbedMode, originalPollPath, navigate, setShowShareModal } = props;
  return isEmbedMode ? (
    <div className="embed-origin-cta">
      <span>picky embedded poll</span>
      <a href={originalPollPath} target="_blank" rel="noreferrer">
        원본에서 크게 보기
        <ExternalLink size={12} />
      </a>
    </div>
  ) : (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.85rem',
          cursor: 'pointer',
        }}
      >
        <ChevronLeft size={16} />
        <span>목록으로</span>
      </button>

      <button
        onClick={() => setShowShareModal(true)}
        className="btn-secondary"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      >
        <Share2 size={13} />
        <span>SNS 공유하기</span>
      </button>
    </div>
  );
}

function buildDecisionConfidenceBands(decisionConfidenceScore: number) {
  let decisionConfidenceLabel = '아직 표본 보강 필요';
  if (decisionConfidenceScore >= 80) {
    decisionConfidenceLabel = '결정해도 좋은 상태';
  } else if (decisionConfidenceScore >= 55) {
    decisionConfidenceLabel = '조금 더 모으면 안정적';
  }
  let decisionConfidenceTone = 'var(--brand-accent-coral)';
  if (decisionConfidenceScore >= 80) {
    decisionConfidenceTone = 'var(--brand-accent-teal)';
  } else if (decisionConfidenceScore >= 55) {
    decisionConfidenceTone = 'var(--brand-accent-gold)';
  }
  let decisionConfidenceBarGradient =
    'linear-gradient(90deg, var(--brand-accent-coral), var(--brand-accent-gold))';
  if (decisionConfidenceScore >= 80) {
    decisionConfidenceBarGradient =
      'linear-gradient(90deg, var(--brand-accent-teal), var(--brand-primary))';
  } else if (decisionConfidenceScore >= 55) {
    decisionConfidenceBarGradient =
      'linear-gradient(90deg, var(--brand-accent-gold), var(--brand-accent-teal))';
  }

  return { decisionConfidenceLabel, decisionConfidenceTone, decisionConfidenceBarGradient };
}

function buildDecisionConfidenceItems(
  args: Readonly<{
    currentPoll: Poll;
    voteGap: number;
    pollClosed: boolean;
    hasEnoughSample: boolean;
    hasEnoughFeedback: boolean;
    hasDecisionSignal: boolean;
    decisionConfidenceScore: number;
  }>,
) {
  const {
    currentPoll,
    voteGap,
    pollClosed,
    hasEnoughSample,
    hasEnoughFeedback,
    hasDecisionSignal,
    decisionConfidenceScore,
  } = args;
  return [
    {
      label: '표본',
      value: `${currentPoll.totalVotes}표`,
      passed: hasEnoughSample || pollClosed,
      help: hasEnoughSample
        ? '선택지 수 대비 기본 표본이 확보됐습니다.'
        : '공유 링크를 한 번 더 보내 표본을 늘리세요.',
    },
    {
      label: '의견',
      value: `${currentPoll.comments.length}개`,
      passed: hasEnoughFeedback || pollClosed,
      help: hasEnoughFeedback
        ? '선택 이유가 결과 해석을 보강하고 있습니다.'
        : '결과를 결정하기 전 한마디를 더 받아보는 편이 좋습니다.',
    },
    {
      label: '격차',
      value: `${voteGap}표 차이`,
      passed: hasDecisionSignal,
      help: hasDecisionSignal
        ? '선두 선택지가 비교적 뚜렷합니다.'
        : '접전이라 추가 참여가 결과를 바꿀 수 있습니다.',
    },
    {
      label: '상태',
      value: pollClosed ? '마감' : '진행 중',
      passed: pollClosed || decisionConfidenceScore >= 80,
      help: pollClosed
        ? '더 이상 표가 바뀌지 않아 결과 정리에 적합합니다.'
        : '진행 중인 투표는 공유로 신뢰도를 더 높일 수 있습니다.',
    },
  ];
}

function buildDecisionConfidence(
  args: Readonly<{
    currentPoll: Poll;
    pollClosed: boolean;
    leadingShare: number;
    voteGap: number;
    resultsVisibility: 'always' | 'afterVote';
    hasVoted: boolean;
    selectedOption: Poll['options'][number] | undefined;
  }>,
) {
  const {
    currentPoll,
    pollClosed,
    leadingShare,
    voteGap,
    resultsVisibility,
    hasVoted,
    selectedOption,
  } = args;
  const hasEnoughSample = currentPoll.totalVotes >= Math.max(5, currentPoll.options.length * 2);
  const hasEnoughFeedback =
    currentPoll.comments.length >= Math.max(2, Math.ceil(currentPoll.totalVotes * 0.35));
  const hasDecisionSignal =
    pollClosed || (currentPoll.totalVotes > 0 && (leadingShare >= 60 || voteGap >= 2));
  const openVisibilityScore = resultsVisibility === 'always' ? 10 : 6;
  const decisionConfidenceScore = Math.min(
    100,
    (hasEnoughSample ? 35 : Math.min(30, currentPoll.totalVotes * 6)) +
      (hasEnoughFeedback ? 25 : Math.min(20, currentPoll.comments.length * 8)) +
      (hasDecisionSignal ? 25 : Math.min(14, voteGap * 7)) +
      (pollClosed ? 15 : openVisibilityScore),
  );
  const { decisionConfidenceLabel, decisionConfidenceTone, decisionConfidenceBarGradient } =
    buildDecisionConfidenceBands(decisionConfidenceScore);
  let nextActionHeadline = '결과 흐름을 공유해 참여를 더 모아보세요.';
  if (hasVoted && selectedOption) {
    nextActionHeadline = `${selectedOption.text}에 투표했습니다. 더 많은 의견을 모아보세요.`;
  } else if (pollClosed) {
    nextActionHeadline = '투표는 마감됐지만 결과를 공유할 수 있습니다.';
  }
  const decisionConfidenceItems = buildDecisionConfidenceItems({
    currentPoll,
    voteGap,
    pollClosed,
    hasEnoughSample,
    hasEnoughFeedback,
    hasDecisionSignal,
    decisionConfidenceScore,
  });

  return {
    hasEnoughSample,
    hasEnoughFeedback,
    hasDecisionSignal,
    decisionConfidenceScore,
    decisionConfidenceLabel,
    decisionConfidenceTone,
    decisionConfidenceBarGradient,
    nextActionHeadline,
    decisionConfidenceItems,
  };
}

function buildOperationChecklist(
  args: Readonly<{
    currentPoll: Poll;
    pollClosed: boolean;
    hasEnoughSample: boolean;
    hasEnoughFeedback: boolean;
    hasDecisionSignal: boolean;
    consensusLabel: string;
    participationQrUrl: string | null;
  }>,
) {
  const {
    currentPoll,
    pollClosed,
    hasEnoughSample,
    hasEnoughFeedback,
    hasDecisionSignal,
    consensusLabel,
    participationQrUrl,
  } = args;
  let operationPhase = '추가 확인';
  if (pollClosed) {
    operationPhase = '마감 정리';
  } else if (!hasEnoughSample) {
    operationPhase = '표본 확보';
  } else if (!hasEnoughFeedback) {
    operationPhase = '의견 보강';
  } else if (hasDecisionSignal) {
    operationPhase = '결정 가능';
  }
  const operationChecklist: Array<{
    key: string;
    label: string;
    value: string;
    help: string;
    passed: boolean;
    action: OperationChecklistAction;
    actionLabel: string;
  }> = [
    {
      key: 'sample',
      label: '표본 확보',
      value: `${currentPoll.totalVotes}명 참여`,
      help: hasEnoughSample
        ? '선택지 수 대비 기본 표본이 모였습니다.'
        : '친구나 팀 채널에 공유해 선택 편향을 줄여보세요.',
      passed: hasEnoughSample || pollClosed,
      action: 'share',
      actionLabel: '공유 열기',
    },
    {
      key: 'feedback',
      label: '이유 수집',
      value: `${currentPoll.comments.length}개 의견`,
      help: hasEnoughFeedback
        ? '선택 이유가 결과 해석에 충분히 보강되고 있습니다.'
        : '링크를 다시 보내 선택 이유를 남겨달라고 요청하세요.',
      passed: hasEnoughFeedback || pollClosed,
      action: 'copyLink',
      actionLabel: '링크 복사',
    },
    {
      key: 'decision',
      label: '결정 신호',
      value: consensusLabel,
      help: hasDecisionSignal
        ? '공유용 결과 카드나 요약문으로 결정을 정리하기 좋습니다.'
        : '아직 격차가 작습니다. 표본을 더 모은 뒤 결정하세요.',
      passed: hasDecisionSignal,
      action: 'resultImage',
      actionLabel: '결과 카드',
    },
    {
      key: 'live',
      label: '현장 참여',
      value: participationQrUrl ? 'QR 준비됨' : '코드 안내 필요',
      help: participationQrUrl
        ? '발표 모드에서 QR을 띄우면 모바일 참여가 빨라집니다.'
        : '링크가 길어 QR 생성이 어려우므로 JOIN CODE를 안내하세요.',
      passed: Boolean(participationQrUrl),
      action: 'present',
      actionLabel: '발표 모드',
    },
  ];
  const completedOperationCount = operationChecklist.filter((item) => item.passed).length;

  return {
    operationPhase,
    operationChecklist,
    completedOperationCount,
  };
}

function buildCommentViews(
  args: Readonly<{
    currentPoll: Poll;
    commentFilter: 'all' | number;
    commentViewMode: CommentViewMode;
  }>,
) {
  const { currentPoll, commentFilter, commentViewMode } = args;
  const commentFilterOptions = currentPoll.options.map((option) => ({
    id: option.id,
    label: option.text,
    count: currentPoll.comments.filter(
      (commentItem) =>
        commentItem.selectedOptionId === option.id ||
        commentItem.selectedOptionText === option.text,
    ).length,
  }));
  const targetCommentOption =
    commentFilter === 'all'
      ? null
      : currentPoll.options.find((option) => option.id === commentFilter);
  const filteredComments =
    commentFilter === 'all'
      ? currentPoll.comments
      : currentPoll.comments.filter(
          (commentItem) =>
            commentItem.selectedOptionId === commentFilter ||
            commentItem.selectedOptionText === targetCommentOption?.text,
        );
  const displayedComments = [...filteredComments].sort((a, b) => {
    if (commentViewMode === 'byOption') {
      const optionCompare = (a.selectedOptionText || '').localeCompare(
        b.selectedOptionText || '',
        'ko-KR',
      );
      if (optionCompare !== 0) {
        return optionCompare;
      }
    }

    if (commentViewMode === 'highlights') {
      const lengthCompare = b.comment.trim().length - a.comment.trim().length;
      if (lengthCompare !== 0) {
        return lengthCompare;
      }
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const visibleComments =
    commentViewMode === 'highlights' ? displayedComments.slice(0, 5) : displayedComments;
  let emptyCommentMessage = '선택한 항목에 연결된 피드백이 없습니다.';
  if (commentViewMode === 'highlights') {
    emptyCommentMessage = '핵심 의견으로 보여줄 피드백이 없습니다.';
  } else if (commentFilter === 'all') {
    emptyCommentMessage = '아직 표시할 피드백이 없습니다.';
  }
  const commentSummaryRows = currentPoll.options
    .map((option) => {
      const comments = currentPoll.comments
        .filter(
          (commentItem) =>
            commentItem.selectedOptionId === option.id ||
            commentItem.selectedOptionText === option.text,
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        option,
        comments,
        latestComment: comments[0] || null,
      };
    })
    .sort((a, b) => b.comments.length - a.comments.length);

  return {
    commentFilterOptions,
    visibleComments,
    emptyCommentMessage,
    commentSummaryRows,
  };
}

// 합의 라벨·해석 문구 생성은 @picky/shared(pollNarrative)로 단일화했어요(웹↔토스 동일 소스).
function buildConsensusNarrative(
  args: Readonly<{ currentPoll: Poll; voteGap: number; leadingShare: number }>,
) {
  const { currentPoll, voteGap, leadingShare } = args;
  return buildConsensusNarrative_shared({ poll: currentPoll, voteGap, leadingShare });
}

function buildQuickReasonChips(
  selectedOption: Poll['options'][number] | undefined,
  attachments: NonNullable<Poll['attachments']>,
) {
  return selectedOption
    ? [
        {
          id: 'practical',
          label: '현실적',
          text: '현실적으로 가장 맞는 선택 같아요.',
        },
        {
          id: 'simple',
          label: '부담 적음',
          text: '시간과 비용 부담이 적어 보여요.',
        },
        {
          id: 'confidence',
          label: '확신',
          text: '지금 상황에서는 이 선택이 가장 납득돼요.',
        },
        {
          id: 'long-term',
          label: '후회 적음',
          text: '장기적으로 후회가 적을 것 같아요.',
        },
        ...(attachments.length > 0
          ? [
              {
                id: 'based-on-file',
                label: '자료 참고',
                text: '첨부자료를 보고 이 선택이 더 설득력 있다고 느꼈어요.',
              },
            ]
          : []),
      ]
    : [];
}

function buildVoteHints(
  args: Readonly<{ pollClosed: boolean; votedOptionId: number | null; endAtLabel: string }>,
) {
  const { pollClosed, votedOptionId, endAtLabel } = args;
  let voteSubmitHint = '먼저 마음에 드는 선택지를 골라볼까요?';
  if (pollClosed) {
    voteSubmitHint = '아쉽지만 마감된 투표예요.';
  } else if (votedOptionId) {
    voteSubmitHint = '제출하면 선택과 한마디가 함께 전해져요.';
  }
  let deadlineHelp = '생성자가 별도 마감 시간을 설정하지 않았습니다.';
  if (pollClosed) {
    deadlineHelp = '이 투표는 마감되어 새 응답을 받지 않습니다.';
  } else if (endAtLabel) {
    deadlineHelp = '마감 전까지 선택과 의견을 남길 수 있습니다.';
  }

  return { voteSubmitHint, deadlineHelp };
}

function buildParticipantContextItems(
  args: Readonly<{
    currentPoll: Poll;
    hasVoted: boolean;
    pollClosed: boolean;
    endAtLabel: string;
    deadlineHelp: string;
    attachments: NonNullable<Poll['attachments']>;
    resultsVisibility: 'always' | 'afterVote';
  }>,
) {
  const {
    currentPoll,
    hasVoted,
    pollClosed,
    endAtLabel,
    deadlineHelp,
    attachments,
    resultsVisibility,
  } = args;
  return [
    {
      key: 'access',
      icon: User,
      label: '참여 방식',
      value: hasVoted ? '이미 참여함' : '계정 없이 참여 가능',
      help: hasVoted
        ? '이 기기에서는 이미 선택을 제출했습니다.'
        : '로그인이나 앱 설치 없이 바로 선택할 수 있습니다.',
    },
    {
      key: 'deadline',
      icon: AlertCircle,
      label: '마감',
      value: pollClosed ? '마감됨' : endAtLabel || '상시 열림',
      help: deadlineHelp,
    },
    {
      key: 'context',
      icon: FileText,
      label: '참고자료',
      value: attachments.length > 0 ? `${attachments.length}개 첨부` : '첨부 없음',
      help:
        attachments.length > 0
          ? '선택 전에 첨부된 자료를 확인하면 판단이 쉬워집니다.'
          : '질문과 선택지만 보고 빠르게 참여할 수 있습니다.',
    },
    {
      key: 'results',
      icon: Eye,
      label: '결과 공개',
      value: RESULTS_VISIBILITY_LABELS[resultsVisibility],
      help:
        resultsVisibility === 'always'
          ? '선택 전에도 전체 흐름을 확인할 수 있습니다.'
          : '다른 의견에 영향을 덜 받도록 투표 후 결과가 열립니다.',
    },
    {
      key: 'effort',
      icon: Gauge,
      label: '예상 소요',
      value: currentPoll.options.length <= 3 ? '20초 내 참여' : '30초 정도',
      help:
        currentPoll.options.length <= 3
          ? '선택지가 적어 빠르게 고르고 이유를 남길 수 있습니다.'
          : '선택지를 훑고 가장 가까운 의견을 고르는 데 약간의 시간이 필요합니다.',
    },
    {
      key: 'sample',
      icon: Users,
      label: '참여 규모',
      value: currentPoll.totalVotes > 0 ? `${currentPoll.totalVotes}명 참여` : '첫 참여 대기',
      help:
        currentPoll.totalVotes > 0
          ? '이미 들어온 응답이 있어 제출 후 흐름을 비교할 수 있습니다.'
          : '첫 선택이 들어오면 결과 흐름이 시작됩니다.',
    },
  ];
}

function buildPollViewModel(
  args: Readonly<{
    currentPoll: Poll;
    hasVoted: boolean;
    votedOptionId: number | null;
    voterName: string;
    comment: string;
    isLoading: boolean;
    isSubmittingVote: boolean;
    commentFilter: 'all' | number;
    commentViewMode: CommentViewMode;
    resultSummaryMode: ResultSummaryMode;
    inviteMessageTone: InviteMessageTone;
    copiedId: string | null;
    copyMessage: string;
  }>,
) {
  const {
    currentPoll,
    hasVoted,
    votedOptionId,
    voterName,
    comment,
    isLoading,
    isSubmittingVote,
    commentFilter,
    commentViewMode,
    resultSummaryMode,
    inviteMessageTone,
    copiedId,
    copyMessage,
  } = args;
  const pollClosed = isPollClosed(currentPoll);
  const endAtLabel = formatEndAt(currentPoll.endsAt);
  const resultsVisibility: 'always' | 'afterVote' =
    currentPoll.resultsVisibility === 'always' ? 'always' : 'afterVote';
  // 결과 공개 게이트는 @picky/shared canRevealResults 단일 소스로(투표/마감/always 판단을 web/toss/OG 동일하게).
  const canViewResults = canRevealResults(currentPoll, hasVoted);
  const sortedOptionsByVotes = [...currentPoll.options].sort((a, b) => b.voteCount - a.voteCount);
  const leadingOption = sortedOptionsByVotes[0] || null;
  const runnerUpOption = sortedOptionsByVotes[1] || null;
  const leadingShare =
    currentPoll.totalVotes > 0 && leadingOption
      ? optionPercent(leadingOption.voteCount, currentPoll.totalVotes)
      : 0;
  const voteGap = leadingOption ? leadingOption.voteCount - (runnerUpOption?.voteCount || 0) : 0;
  const voteGapShare =
    currentPoll.totalVotes > 0 ? Math.round((voteGap / currentPoll.totalVotes) * 100) : 0;
  const feedbackRate =
    currentPoll.totalVotes > 0
      ? Math.round((currentPoll.comments.length / currentPoll.totalVotes) * 100)
      : 0;
  const attachments = currentPoll.attachments || [];
  const selectedOption = currentPoll.options.find((option) => option.id === votedOptionId);
  const selectedOptionIndex = currentPoll.options.findIndex(
    (option) => option.id === votedOptionId,
  );
  const quickReasonChips = buildQuickReasonChips(selectedOption, attachments);
  const voterDisplayName = voterName.trim() || '익명';
  const trimmedCommentLength = comment.trim().length;
  const voteSubmitReady = votedOptionId !== null && !isLoading && !isSubmittingVote && !pollClosed;
  const voteSubmitBusy = isLoading || isSubmittingVote;
  const { voteSubmitHint, deadlineHelp } = buildVoteHints({
    pollClosed,
    votedOptionId,
    endAtLabel,
  });
  const { commentFilterOptions, visibleComments, emptyCommentMessage, commentSummaryRows } =
    buildCommentViews({ currentPoll, commentFilter, commentViewMode });
  const featuredComment =
    [...currentPoll.comments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0] || null;
  const originalPollPath = currentPoll.id.startsWith('local-')
    ? resolvePollShareUrl(currentPoll)
    : `/poll/${encodeURIComponent(currentPoll.id)}`;
  const voteStepItems = [
    {
      label: '선택',
      active: votedOptionId !== null,
      icon: ClipboardList,
    },
    {
      label: '한마디',
      active: comment.trim().length > 0,
      icon: MessageSquare,
    },
    {
      label: '제출',
      active: votedOptionId !== null && !voteSubmitBusy,
      icon: Send,
    },
  ];
  const { consensusLabel, decisionHint } = buildConsensusNarrative({
    currentPoll,
    voteGap,
    leadingShare,
  });
  const shareUrl = resolvePollShareUrl(currentPoll);
  // "[picky 결정 메모]" 텍스트 생성은 @picky/shared(decisionMemo)로 단일화했어요.
  const decisionMemo = buildDecisionMemo({
    poll: currentPoll,
    shareUrl,
    pollClosed,
    consensusLabel,
    decisionHint,
    leadingOption,
    leadingShare,
    voteGap,
  });
  const participationQrUrl = buildQrSvgDataUri(shareUrl);
  const inviteMessage = buildPollInviteMessage(currentPoll, shareUrl, inviteMessageTone);
  const participantContextItems = buildParticipantContextItems({
    currentPoll,
    hasVoted,
    pollClosed,
    endAtLabel,
    deadlineHelp,
    attachments,
    resultsVisibility,
  });
  const kakaoShareDiagnostics = getKakaoShareDiagnostics(currentPoll);
  const kakaoShareReadinessItems = kakaoShareDiagnostics.items;
  const kakaoReadyCount = kakaoShareDiagnostics.readyCount;
  const shareCopyPresets = [
    {
      id: 'kakao-room',
      label: '카톡 단톡방',
      title: '가볍게 투표 요청',
      description: '친구나 팀 단톡방에 바로 붙여넣기 좋은 짧은 문구',
      accent: 'var(--brand-accent-gold)',
      text: `${resolveShareText(currentPoll)}\n\n30초만 골라주세요. 이유도 한 줄 남겨주면 결정에 바로 반영할게요.\n${shareUrl}`,
    },
    {
      id: 'meeting',
      label: '회의/수업',
      title: '참여 코드 강조',
      description: '발표 화면, 오프라인 모임, 수업에서 링크와 참여 안내를 같이 전달',
      accent: 'var(--brand-accent-teal)',
      text: `실시간 의견을 모으는 투표입니다.\n\n질문: ${currentPoll.question}\n참여 링크: ${shareUrl}\n결과는 투표 후 바로 확인해 주세요.`,
    },
    {
      id: 'social',
      label: 'SNS 게시',
      title: '맥락 포함 공유',
      description: '스토리, 커뮤니티, X 같은 공개 채널에 맞춘 설명형 문구',
      accent: 'var(--brand-primary)',
      text: `${currentPoll.question}\n\n선택지가 고민돼서 투표로 의견을 모으고 있어요. 가장 납득되는 선택에 투표하고 이유를 남겨주세요.\n${shareUrl}`,
    },
  ];
  const embedCodeModes = [
    {
      id: 'standard',
      label: '표준',
      title: '본문 안에 자연스럽게 삽입',
      description: '블로그, 노션형 페이지, 커뮤니티 공지에 맞는 기본 720px iframe',
    },
    {
      id: 'compact',
      label: '컴팩트',
      title: '좁은 사이드바/랜딩 섹션',
      description: '모바일 카드나 짧은 랜딩 섹션에 맞는 낮은 높이 iframe',
    },
    {
      id: 'popup',
      label: '팝업 버튼',
      title: '페이지 흐름을 유지하며 열기',
      description: 'CTA 버튼을 눌렀을 때 전체 화면 오버레이로 투표를 띄웁니다',
    },
  ] as const;
  const summaryCopied = copiedId === `summary-${resultSummaryMode}-${currentPoll.id}`;
  const markdownReportCopied = copiedId === `markdown-${currentPoll.id}`;
  const resultImageSaved = copiedId === `image-${currentPoll.id}`;
  const resultCsvSaved = copiedId === `csv-${currentPoll.id}`;
  const resultActionHasError =
    copyMessage === '결과 요약 복사에 실패했습니다.' ||
    copyMessage === '회의록용 리포트 복사에 실패했습니다.' ||
    copyMessage === 'CSV 결과 파일 저장에 실패했습니다.' ||
    copyMessage === '결과 이미지 저장에 실패했습니다.' ||
    copyMessage === '결과 이미지 미리보기를 만들지 못했습니다.';
  const showResultActionMessage =
    summaryCopied ||
    markdownReportCopied ||
    resultImageSaved ||
    resultCsvSaved ||
    resultActionHasError;
  const {
    hasEnoughSample,
    hasEnoughFeedback,
    hasDecisionSignal,
    decisionConfidenceScore,
    decisionConfidenceLabel,
    decisionConfidenceTone,
    decisionConfidenceBarGradient,
    nextActionHeadline,
    decisionConfidenceItems,
  } = buildDecisionConfidence({
    currentPoll,
    pollClosed,
    leadingShare,
    voteGap,
    resultsVisibility,
    hasVoted,
    selectedOption,
  });
  const { operationPhase, operationChecklist, completedOperationCount } = buildOperationChecklist({
    currentPoll,
    pollClosed,
    hasEnoughSample,
    hasEnoughFeedback,
    hasDecisionSignal,
    consensusLabel,
    participationQrUrl,
  });

  return {
    pollClosed,
    endAtLabel,
    resultsVisibility,
    canViewResults,
    sortedOptionsByVotes,
    leadingOption,
    leadingShare,
    voteGap,
    voteGapShare,
    feedbackRate,
    attachments,
    selectedOption,
    selectedOptionIndex,
    quickReasonChips,
    voterDisplayName,
    trimmedCommentLength,
    voteSubmitReady,
    voteSubmitBusy,
    voteSubmitHint,
    commentFilterOptions,
    visibleComments,
    emptyCommentMessage,
    commentSummaryRows,
    featuredComment,
    originalPollPath,
    voteStepItems,
    consensusLabel,
    decisionHint,
    shareUrl,
    decisionMemo,
    participationQrUrl,
    inviteMessage,
    participantContextItems,
    kakaoShareDiagnostics,
    kakaoShareReadinessItems,
    kakaoReadyCount,
    shareCopyPresets,
    embedCodeModes,
    summaryCopied,
    markdownReportCopied,
    resultImageSaved,
    resultCsvSaved,
    resultActionHasError,
    showResultActionMessage,
    decisionConfidenceScore,
    decisionConfidenceLabel,
    decisionConfidenceTone,
    decisionConfidenceBarGradient,
    nextActionHeadline,
    decisionConfidenceItems,
    operationPhase,
    operationChecklist,
    completedOperationCount,
  };
}

function PollQuestionHeader(props: Readonly<{ currentPoll: Poll; creatorLabel: string }>) {
  const { currentPoll, creatorLabel } = props;
  // 헤더가 남은 ms를 1초마다 틱하고, CountdownChip은 표시만 한다(자체 타이머 없음).
  const remaining = useCountdown(currentPoll.endsAt);
  return (
    <div>
      {(() => {
        // Poll 타입(@picky/shared)에는 categoryId 가 아직 없지만 런타임 데이터는
        // CreatePollSchema 를 통해 categoryId 를 실어 보낼 수 있어 방어적으로 읽는다.
        const categoryId = (currentPoll as { categoryId?: string | null }).categoryId;
        const category = categoryMeta(categoryId);
        if (!category) {
          return null;
        }
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.66rem',
              fontWeight: 800,
              color: category.color,
              backgroundColor: `${category.color}1f`,
              border: `1px solid ${category.color}55`,
              padding: '2px 9px',
              borderRadius: '999px',
              marginBottom: '8px',
              marginRight: '6px',
            }}
          >
            <span aria-hidden="true">{category.emoji}</span>
            {category.label}
          </span>
        );
      })()}
      <span
        style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          color: 'var(--brand-primary)',
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
          padding: '2px 8px',
          borderRadius: '4px',
          display: 'inline-block',
          marginBottom: '8px',
        }}
      >
        POLL #{currentPoll.id}
      </span>
      <span
        style={{
          fontSize: '0.62rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          border: '1px solid rgba(148, 163, 184, 0.35)',
          backgroundColor: 'rgba(255,255,255,0.03)',
          padding: '2px 8px',
          borderRadius: '4px',
          letterSpacing: '0.02em',
        }}
      >
        {creatorLabel}
      </span>

      <span style={{ marginLeft: '6px', verticalAlign: 'middle', display: 'inline-flex' }}>
        <CountdownChip remaining={remaining} closedFallback />
      </span>

      {/*
        R5: 작성자 신호 중복·모순 제거 — 위 배지(내가/회원/비회원 작성)가 이미 작성자 유형을 말한다.
        닉네임이 있으면 '작성자 {닉네임}'만 덧붙이고, 닉네임이 없으면 배지로 충분하므로
        모순되는 '작성자 익명' 줄을 따로 보여주지 않는다(회원 배지 + '익명' 어긋남 제거).
      */}
      {currentPoll.creatorNickname?.trim() ? (
        <p
          style={{
            margin: '8px 0 0',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            fontWeight: 600,
          }}
        >
          작성자{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {currentPoll.creatorNickname.trim()}
          </strong>
        </p>
      ) : null}

      <h2
        style={{
          fontSize: '1.35rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          letterSpacing: 0,
          lineHeight: 1.4,
        }}
      >
        {currentPoll.question}
      </h2>

      {currentPoll.description && (
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            marginTop: '8px',
            lineHeight: 1.6,
            whiteSpace: 'pre-line',
          }}
        >
          {currentPoll.description}
        </p>
      )}
    </div>
  );
}

type ParticipantContextItem = {
  key: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
  value: string;
  help: string;
};

function PreVoteContextSection(
  props: Readonly<{
    participantContextItems: ParticipantContextItem[];
    setShowShareModal: React.Dispatch<React.SetStateAction<boolean>>;
  }>,
) {
  const { participantContextItems, setShowShareModal } = props;
  return (
    <section
      className="desktop-only"
      style={{
        order: 1,
        border: '1px solid rgba(45, 212, 191, 0.18)',
        borderRadius: 'var(--radius-sm)',
        background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.075), rgba(232, 200, 77, 0.045))',
        padding: '1rem',
        display: 'grid',
        gap: '0.85rem',
      }}
      aria-label="투표 참여 전 안내"
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: '0.22rem' }}>
          <span
            style={{
              color: 'var(--brand-accent-teal)',
              fontSize: '0.68rem',
              fontWeight: 900,
            }}
          >
            BEFORE YOU VOTE
          </span>
          <h2
            style={{
              margin: 0,
              color: 'var(--text-primary)',
              fontSize: '1rem',
              lineHeight: 1.35,
            }}
          >
            참여 전에 확인할 정보
          </h2>
          <p
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: '0.74rem',
              lineHeight: 1.5,
            }}
          >
            앱 설치 없이 바로 참여할 수 있고, 필요한 맥락만 먼저 확인한 뒤 선택할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowShareModal(true)}
          className="ghost-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 10px',
            fontSize: '0.68rem',
            whiteSpace: 'nowrap',
          }}
        >
          <Share2 size={13} />
          공유 정보 보기
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.6rem',
        }}
      >
        {participantContextItems.map((item) => {
          const ContextIcon = item.icon;
          return (
            <article
              key={item.key}
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255,255,255,0.035)',
                padding: '0.72rem',
                display: 'grid',
                gap: '0.35rem',
                alignContent: 'start',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: 'var(--text-muted)',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                }}
              >
                <ContextIcon size={13} style={{ color: 'var(--brand-accent-teal)' }} />
                {item.label}
              </span>
              <strong
                style={{
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  lineHeight: 1.3,
                }}
              >
                {item.value}
              </strong>
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-secondary)',
                  fontSize: '0.68rem',
                  lineHeight: 1.45,
                }}
              >
                {item.help}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

type PollViewModel = ReturnType<typeof buildPollViewModel>;

function PollStatusMessages(
  props: Readonly<{ error: string | null; voteMessage: string; voteSuccessNote: string }>,
) {
  const { error, voteMessage, voteSuccessNote } = props;
  return (
    <>
      {error ? (
        <p
          style={{
            margin: 0,
            color: 'var(--brand-accent-coral)',
            fontSize: '0.78rem',
            lineHeight: 1.45,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 10px',
          }}
        >
          {error}
        </p>
      ) : null}
      {voteMessage ? (
        <p
          style={{
            margin: 0,
            color: 'var(--brand-accent-coral)',
            fontSize: '0.78rem',
            lineHeight: 1.45,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 10px',
          }}
        >
          {voteMessage}
        </p>
      ) : null}
      <div role="status" aria-live="polite">
        {voteSuccessNote ? (
          <p
            className="animate-slide-up"
            style={{
              margin: 0,
              color: 'var(--brand-accent-teal)',
              fontSize: '0.85rem',
              fontWeight: 800,
              lineHeight: 1.45,
              background: 'rgba(45, 212, 191, 0.12)',
              border: '1px solid rgba(45, 212, 191, 0.28)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
            }}
          >
            {voteSuccessNote}
          </p>
        ) : null}
      </div>
    </>
  );
}

function PollStatusTiles(
  props: Readonly<{
    pollClosed: boolean;
    endAtLabel: string;
    resultsVisibility: 'always' | 'afterVote';
  }>,
) {
  const { pollClosed, endAtLabel, resultsVisibility } = props;
  return (
    <section
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '0.55rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        paddingTop: '0.95rem',
      }}
    >
      <div className="insight-tile">
        <span>
          <Info size={13} />
          진행 상태
        </span>
        <strong style={{ color: pollClosed ? 'var(--text-muted)' : 'var(--brand-accent-teal)' }}>
          {pollClosed ? '마감됨' : '참여 가능'}
        </strong>
        <small>{endAtLabel}</small>
      </div>
      <div className="insight-tile">
        <span>
          <Eye size={13} />
          결과 공개
        </span>
        <strong>{RESULTS_VISIBILITY_LABELS[resultsVisibility]}</strong>
        <small>
          {resultsVisibility === 'always'
            ? '공유 직후부터 흐름을 볼 수 있습니다.'
            : '투표 완료 후 결과를 볼 수 있습니다.'}
        </small>
      </div>
    </section>
  );
}

function ResultSummaryActions(
  props: Readonly<{
    currentPoll: Poll;
    commentSummaryRows: ReturnType<typeof buildCommentViews>['commentSummaryRows'];
    featuredComment: Poll['comments'][number] | null;
    resultSummaryMode: ResultSummaryMode;
    setResultSummaryMode: React.Dispatch<React.SetStateAction<ResultSummaryMode>>;
    summaryCopied: boolean;
    markdownReportCopied: boolean;
    resultImageSaved: boolean;
    resultCsvSaved: boolean;
    resultActionHasError: boolean;
    showResultActionMessage: boolean;
    copyMessage: string;
    handleCopyResultSummaryClick: () => void;
    handleCopyMarkdownReportClick: () => void;
    handleDownloadResultCsvClick: () => void;
    handlePreviewResultImageClick: () => void;
  }>,
) {
  const {
    currentPoll,
    commentSummaryRows,
    featuredComment,
    resultSummaryMode,
    setResultSummaryMode,
    summaryCopied,
    markdownReportCopied,
    resultImageSaved,
    resultCsvSaved,
    resultActionHasError,
    showResultActionMessage,
    copyMessage,
    handleCopyResultSummaryClick,
    handleCopyMarkdownReportClick,
    handleDownloadResultCsvClick,
    handlePreviewResultImageClick,
  } = props;
  return (
    <section className="comment-briefing-card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <h3
          style={{
            margin: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-primary)',
            fontSize: '0.92rem',
          }}
        >
          <MessageSquare size={15} style={{ color: 'var(--brand-accent-gold)' }} />
          의견 요약
        </h3>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.45rem',
            flexWrap: 'wrap',
          }}
        >
          <span className="stat-pill">총 {currentPoll.comments.length}개 의견</span>
          <fieldset
            style={{
              display: 'inline-flex',
              border: '1px solid var(--bg-card-border)',
              borderRadius: '999px',
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.025)',
              padding: 0,
              margin: 0,
              minInlineSize: 0,
            }}
          >
            <legend style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
              결과 요약 복사 형식
            </legend>
            {RESULT_SUMMARY_OPTIONS.map((option) => {
              const active = resultSummaryMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setResultSummaryMode(option.value)}
                  style={{
                    border: 'none',
                    borderRight:
                      option.value === 'brief' ? '1px solid var(--bg-card-border)' : 'none',
                    background: active ? 'rgba(45, 212, 191, 0.12)' : 'transparent',
                    color: active ? 'var(--brand-accent-teal)' : 'var(--text-muted)',
                    padding: '5px 9px',
                    cursor: 'pointer',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-sans)',
                  }}
                  aria-pressed={active}
                >
                  {option.label}
                </button>
              );
            })}
          </fieldset>
          <button
            type="button"
            onClick={handleCopyResultSummaryClick}
            className="ghost-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 9px',
              fontSize: '0.68rem',
            }}
          >
            {summaryCopied ? <Check size={12} /> : <Copy size={12} />}
            {summaryCopied ? '요약 복사됨' : '요약 복사'}
          </button>
          <button
            type="button"
            onClick={handleCopyMarkdownReportClick}
            className="ghost-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 9px',
              fontSize: '0.68rem',
            }}
          >
            {markdownReportCopied ? <Check size={12} /> : <ClipboardList size={12} />}
            {markdownReportCopied ? '회의록 복사됨' : '회의록 복사'}
          </button>
          <button
            type="button"
            onClick={handleDownloadResultCsvClick}
            className="ghost-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 9px',
              fontSize: '0.68rem',
            }}
          >
            {resultCsvSaved ? <Check size={12} /> : <FileText size={12} />}
            {resultCsvSaved ? 'CSV 저장됨' : 'CSV 저장'}
          </button>
          <button
            type="button"
            onClick={handlePreviewResultImageClick}
            className="ghost-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 9px',
              fontSize: '0.68rem',
            }}
          >
            {resultImageSaved ? <Check size={12} /> : <Download size={12} />}
            {resultImageSaved ? '이미지 저장됨' : '이미지 미리보기'}
          </button>
        </div>
      </div>

      {showResultActionMessage ? (
        <p
          style={{
            margin: 0,
            color: resultActionHasError ? 'var(--brand-accent-coral)' : 'var(--brand-accent-teal)',
            fontSize: '0.7rem',
            fontWeight: 700,
          }}
        >
          {copyMessage}
        </p>
      ) : null}

      {featuredComment ? (
        <blockquote className="featured-comment">
          <p>{featuredComment.comment}</p>
          <footer>
            {featuredComment.voterName} · {featuredComment.selectedOptionText || '선택지 정보 없음'}
          </footer>
        </blockquote>
      ) : (
        <div className="featured-comment empty">
          <p>아직 남겨진 의견이 없습니다. 첫 번째 참여자가 선택 이유를 남기면 요약에 반영됩니다.</p>
        </div>
      )}

      <div className="comment-summary-grid">
        {commentSummaryRows.map(({ option, comments, latestComment }) => (
          <div key={option.id} className="comment-summary-item">
            <span>{option.text}</span>
            <strong>{comments.length}개 의견</strong>
            <small>{latestComment?.comment || '아직 선택 이유가 없습니다.'}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function PollMainCard(
  props: Readonly<{
    vm: PollViewModel;
    activeToolTab: string;
    comment: string;
    copiedId: string | null;
    copyMessage: string;
    currentPoll: Poll;
    creatorLabel: string;
    error: string | null;
    handleCopyEmbedClick: () => void;
    handleCopyJoinCodeClick: () => void;
    handleCopyLinkClick: (pollId: string) => void;
    handleCopyMarkdownReportClick: () => void;
    handleCopyResultSummaryClick: () => void;
    handleDownloadResultCsvClick: () => void;
    handleKakaoShareClick: () => void;
    handlePreviewResultImageClick: () => void;
    handleUseAsTemplateClick: () => void;
    handleVoteSubmit: () => void;
    hasVoted: boolean;
    isEmbedMode: boolean;
    showVoteCelebrationOverlay: boolean;
    showResultTools: boolean;
    showLivePreview: boolean;
    resultSummaryMode: ResultSummaryMode;
    setActiveToolTab: (key: string) => void;
    setComment: React.Dispatch<React.SetStateAction<string>>;
    setCopiedId: React.Dispatch<React.SetStateAction<string | null>>;
    setCopyMessage: React.Dispatch<React.SetStateAction<string>>;
    setResultSummaryMode: React.Dispatch<React.SetStateAction<ResultSummaryMode>>;
    setShowShareModal: React.Dispatch<React.SetStateAction<boolean>>;
    setToolsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    setVotedOptionId: React.Dispatch<React.SetStateAction<number | null>>;
    setVoterName: React.Dispatch<React.SetStateAction<string>>;
    toolsExpanded: boolean;
    voteDraftSavedAt: string | null;
    voteMessage: string;
    voteSuccessNote: string;
    votedHistory: Record<string, number>;
    votedOptionId: number | null;
    voterName: string;
  }>,
) {
  const {
    vm,
    activeToolTab,
    comment,
    copiedId,
    copyMessage,
    currentPoll,
    creatorLabel,
    error,
    handleCopyEmbedClick,
    handleCopyJoinCodeClick,
    handleCopyLinkClick,
    handleCopyMarkdownReportClick,
    handleCopyResultSummaryClick,
    handleDownloadResultCsvClick,
    handleKakaoShareClick,
    handlePreviewResultImageClick,
    handleUseAsTemplateClick,
    handleVoteSubmit,
    hasVoted,
    isEmbedMode,
    showVoteCelebrationOverlay,
    showResultTools,
    showLivePreview,
    resultSummaryMode,
    setActiveToolTab,
    setComment,
    setCopiedId,
    setCopyMessage,
    setResultSummaryMode,
    setShowShareModal,
    setToolsExpanded,
    setVotedOptionId,
    setVoterName,
    toolsExpanded,
    voteDraftSavedAt,
    voteMessage,
    voteSuccessNote,
    votedHistory,
    votedOptionId,
    voterName,
  } = props;
  const {
    attachments,
    canViewResults,
    commentSummaryRows,
    completedOperationCount,
    consensusLabel,
    decisionConfidenceBarGradient,
    decisionConfidenceItems,
    decisionConfidenceLabel,
    decisionConfidenceScore,
    decisionConfidenceTone,
    decisionHint,
    decisionMemo,
    endAtLabel,
    featuredComment,
    feedbackRate,
    leadingOption,
    leadingShare,
    markdownReportCopied,
    nextActionHeadline,
    operationChecklist,
    operationPhase,
    participationQrUrl,
    pollClosed,
    quickReasonChips,
    resultActionHasError,
    resultCsvSaved,
    resultImageSaved,
    resultsVisibility,
    selectedOption,
    selectedOptionIndex,
    shareUrl,
    showResultActionMessage,
    summaryCopied,
    trimmedCommentLength,
    voteGap,
    voteGapShare,
    voteStepItems,
    voteSubmitBusy,
    voteSubmitHint,
    voteSubmitReady,
    voterDisplayName,
  } = vm;
  return (
    <div
      className="content-card"
      style={{
        order: -1,
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        cursor: 'default',
      }}
    >
      {isEmbedMode ? null : (
        <ShareStripSection
          currentPoll={currentPoll}
          participationQrUrl={participationQrUrl}
          shareUrl={shareUrl}
          copiedId={copiedId}
          handleCopyLinkClick={handleCopyLinkClick}
          handleCopyJoinCodeClick={handleCopyJoinCodeClick}
          handleCopyEmbedClick={handleCopyEmbedClick}
        />
      )}
      {!isEmbedMode && copyMessage ? (
        <p
          style={{
            margin: '-0.8rem 0 0',
            color: copiedId === currentPoll.id ? 'var(--brand-accent-teal)' : 'var(--text-muted)',
            fontSize: '0.72rem',
          }}
        >
          {copyMessage}
        </p>
      ) : null}

      <PollQuestionHeader currentPoll={currentPoll} creatorLabel={creatorLabel} />
      {attachments.length > 0 ? <PollAttachmentsSection attachments={attachments} /> : null}
      <PollStatusMessages
        error={error}
        voteMessage={voteMessage}
        voteSuccessNote={voteSuccessNote}
      />

      {showVoteCelebrationOverlay ? <VoteCelebrationOverlay /> : null}

      {/* Results Screen vs Voting Screen */}
      {hasVoted || pollClosed ? (
        <PollResultsScreen
          currentPoll={currentPoll}
          isEmbedMode={isEmbedMode}
          consensusLabel={consensusLabel}
          leadingOption={leadingOption}
          leadingShare={leadingShare}
          voteGap={voteGap}
          voteGapShare={voteGapShare}
          feedbackRate={feedbackRate}
          decisionHint={decisionHint}
          decisionConfidenceLabel={decisionConfidenceLabel}
          decisionConfidenceTone={decisionConfidenceTone}
          decisionConfidenceScore={decisionConfidenceScore}
          decisionConfidenceBarGradient={decisionConfidenceBarGradient}
          decisionConfidenceItems={decisionConfidenceItems}
          participationQrUrl={participationQrUrl}
          nextActionHeadline={nextActionHeadline}
          decisionMemo={decisionMemo}
          votedHistory={votedHistory}
          copiedId={copiedId}
          setCopiedId={setCopiedId}
          setCopyMessage={setCopyMessage}
          handleKakaoShareClick={handleKakaoShareClick}
          handleCopyLinkClick={handleCopyLinkClick}
          handlePreviewResultImageClick={handlePreviewResultImageClick}
          handleUseAsTemplateClick={handleUseAsTemplateClick}
        />
      ) : (
        <PollVotingScreen
          currentPoll={currentPoll}
          selectedOption={selectedOption}
          selectedOptionIndex={selectedOptionIndex}
          voteStepItems={voteStepItems}
          votedOptionId={votedOptionId}
          setVotedOptionId={setVotedOptionId}
          voteSubmitBusy={voteSubmitBusy}
          voteSubmitReady={voteSubmitReady}
          voteSubmitHint={voteSubmitHint}
          voterDisplayName={voterDisplayName}
          trimmedCommentLength={trimmedCommentLength}
          resultsVisibility={resultsVisibility}
          voterName={voterName}
          setVoterName={setVoterName}
          comment={comment}
          setComment={setComment}
          quickReasonChips={quickReasonChips}
          voteDraftSavedAt={voteDraftSavedAt}
          pollClosed={pollClosed}
          handleVoteSubmit={handleVoteSubmit}
        />
      )}

      <PollStatusTiles
        pollClosed={pollClosed}
        endAtLabel={endAtLabel}
        resultsVisibility={resultsVisibility}
      />

      {canViewResults ? (
        <OperationChecklistSection
          currentPoll={currentPoll}
          operationPhase={operationPhase}
          completedOperationCount={completedOperationCount}
          operationChecklist={operationChecklist}
          handleCopyLinkClick={handleCopyLinkClick}
          handlePreviewResultImageClick={handlePreviewResultImageClick}
          setShowShareModal={setShowShareModal}
        />
      ) : null}

      {showResultTools ? (
        <ResultToolsSection
          currentPoll={currentPoll}
          shareUrl={shareUrl}
          endAtLabel={endAtLabel}
          resultsVisibility={resultsVisibility}
          canViewResults={canViewResults}
          pollClosed={pollClosed}
          toolsExpanded={toolsExpanded}
          setToolsExpanded={setToolsExpanded}
          activeToolTab={activeToolTab}
          setActiveToolTab={setActiveToolTab}
        />
      ) : null}

      {showLivePreview ? <LiveResultPreview currentPoll={currentPoll} /> : null}

      {canViewResults ? (
        <ResultSummaryActions
          currentPoll={currentPoll}
          commentSummaryRows={commentSummaryRows}
          featuredComment={featuredComment}
          resultSummaryMode={resultSummaryMode}
          setResultSummaryMode={setResultSummaryMode}
          summaryCopied={summaryCopied}
          markdownReportCopied={markdownReportCopied}
          resultImageSaved={resultImageSaved}
          resultCsvSaved={resultCsvSaved}
          resultActionHasError={resultActionHasError}
          showResultActionMessage={showResultActionMessage}
          copyMessage={copyMessage}
          handleCopyResultSummaryClick={handleCopyResultSummaryClick}
          handleCopyMarkdownReportClick={handleCopyMarkdownReportClick}
          handleDownloadResultCsvClick={handleDownloadResultCsvClick}
          handlePreviewResultImageClick={handlePreviewResultImageClick}
        />
      ) : (
        <section
          className="comment-briefing-card"
          aria-label="결과 공개 대기 안내"
          style={{
            borderColor: 'rgba(232, 200, 77, 0.24)',
            background:
              'linear-gradient(135deg, rgba(232, 200, 77, 0.1), rgba(45, 212, 191, 0.04))',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.8rem',
            }}
          >
            <span
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-accent-gold)',
                background: 'rgba(232, 200, 77, 0.12)',
                border: '1px solid rgba(232, 200, 77, 0.24)',
                flexShrink: 0,
              }}
            >
              <Eye size={17} />
            </span>
            <div style={{ display: 'grid', gap: '0.35rem' }}>
              <h3
                style={{
                  margin: 0,
                  color: 'var(--text-primary)',
                  fontSize: '0.94rem',
                  fontWeight: 800,
                }}
              >
                투표 후 결과와 의견이 공개됩니다
              </h3>
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-secondary)',
                  fontSize: '0.78rem',
                  lineHeight: 1.55,
                }}
              >
                생성자가 참여 후 공개로 설정했습니다. 선택지를 고르고 한마디를 남기면 결과 요약,
                선택지별 의견, 공유용 결과 이미지를 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function MobileVoteBar(
  props: Readonly<{
    votedOptionId: number | null;
    isSubmittingVote: boolean;
    handleVoteSubmit: () => void;
  }>,
) {
  const { votedOptionId, isSubmittingVote, handleVoteSubmit } = props;
  let voteButtonLabel = '이 선택지로 투표하기';
  if (isSubmittingVote) {
    voteButtonLabel = '투표 등록 중...';
  } else if (votedOptionId === null) {
    voteButtonLabel = '선택지를 골라 투표해 주세요';
  }
  return (
    <>
      <div className="mobile-only" aria-hidden="true" style={{ height: '78px' }} />
      <div className="sticky-action-bar mobile-only">
        <button
          type="button"
          onClick={() => {
            handleVoteSubmit();
          }}
          disabled={votedOptionId === null || isSubmittingVote}
          className="btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '0.95rem' }}
        >
          {voteButtonLabel}
        </button>
      </div>
    </>
  );
}

function DesktopQrCard(props: Readonly<{ participationQrUrl: string }>) {
  const { participationQrUrl } = props;
  return (
    <div
      className="desktop-only"
      style={{
        order: 1,
        padding: '1rem',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '0.8rem',
          fontWeight: 700,
          marginBottom: 8,
          color: 'var(--text-muted)',
        }}
      >
        QR 태그 📱 — 모바일에서 스캔해서 참여하세요
      </div>
      <img
        src={participationQrUrl}
        alt="참여 QR 코드"
        style={{
          width: 200,
          height: 200,
          background: '#fff',
          borderRadius: 12,
          padding: 8,
          border: '1px solid var(--border)',
          display: 'block',
          margin: '0 auto',
        }}
      />
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8 }}>
        스캔하면 이 페이지로 이동합니다
      </div>
    </div>
  );
}

export const PollDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEmbedMode = location.pathname.startsWith('/embed/');
  const isPresentationMode = location.pathname.startsWith('/present/');

  const currentPoll = usePollStore((state) => state.currentPoll);
  const isLoading = usePollStore((state) => state.isLoading);
  const error = usePollStore((state) => state.error);
  const fetchPoll = usePollStore((state) => state.fetchPoll);
  const vote = usePollStore((state) => state.vote);
  const clearError = usePollStore((state) => state.clearError);
  const setCurrentPoll = usePollStore((state) => state.setCurrentPoll);
  const deletePoll = usePollStore((state) => state.deletePoll);
  const deleteComment = usePollStore((state) => state.deleteComment);
  const addComment = usePollStore((state) => state.addComment);
  const user = useAuthStore((state) => state.user);
  const guestName = useAuthStore((state) => state.guestName);

  const restorePollFromSnapshot = (snapshot: string | null) => {
    if (!id || !snapshot) {
      return;
    }

    try {
      const raw = decodeURIComponent(atob(snapshot));
      const parsed = JSON.parse(raw);
      const candidate = parsed?.poll ?? parsed;

      if (
        candidate &&
        typeof candidate.id === 'string' &&
        candidate.id === id &&
        typeof candidate.question === 'string'
      ) {
        setCurrentPoll(candidate as Poll);

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('snapshot');
        if (nextParams.toString()) {
          setSearchParams(nextParams);
        } else {
          setSearchParams(new URLSearchParams());
        }
      }
    } catch {
      return;
    }
  };

  const getCreatorLabel = () => {
    if (!currentPoll) return POLL_AUTHOR_LABELS.guest;
    if (currentPoll.creatorId === user?.id) return POLL_AUTHOR_LABELS.mine;
    if (currentPoll.creatorIsGuest || currentPoll.creatorId?.startsWith('guest-')) {
      return POLL_AUTHOR_LABELS.guest;
    }
    return currentPoll.creatorId ? POLL_AUTHOR_LABELS.otherMember : POLL_AUTHOR_LABELS.guest;
  };

  // 작성자/운영자 관리 권한 — 수정/삭제 액션을 노출할지 결정한다.
  const isPollOwner = !!(user?.id && currentPoll?.creatorId === user.id);
  const isPollAdmin = !!user?.isAdmin;
  const canManagePoll = isPollOwner || isPollAdmin;

  const handleManageEdit = () => {
    if (id) {
      navigate(`/poll/${encodeURIComponent(id)}/edit`);
    }
  };

  const handleManageDelete = async () => {
    if (!id) {
      return;
    }
    if (!globalThis.confirm('이 고민을 삭제할까요? 되돌릴 수 없어요.')) {
      return;
    }
    const ok = await deletePoll(id);
    if (ok) {
      navigate('/');
    }
  };

  const handleDeleteComment = (commentId: number) => {
    if (!id) {
      return;
    }
    if (!globalThis.confirm('이 댓글을 삭제할까요?')) {
      return;
    }
    deleteComment(id, commentId);
  };

  // 대댓글(답글) 작성 — 부모 댓글 id 를 함께 보내 공유 스토어가 트리를 갱신한다.
  const handleAddReply = async (parentId: number, text: string) => {
    if (!id) {
      return;
    }
    // B4: 마감된 고민은 답글을 받지 않는다(서버도 400으로 막지만 UI에서 선제 차단).
    if (currentPoll && isPollClosed(currentPoll)) {
      return;
    }
    await addComment(
      id,
      {
        comment: text,
        parentId,
        voterName: (user?.nickname || guestName || '').trim() || null,
      },
      // 비공개 투표면 활성 접근 코드를 함께 보내 서버 게이트를 통과한다(공개 폴은 undefined).
      activeCode,
    );
  };

  // 비공개 투표 잠금 해제 — 코드로 재조회하면 성공 시 서버가 requiresCode=false 로 응답해 게이트가 풀린다.
  // 성공한 코드는 activeCode 로 보관해 이후 투표/한마디 쓰기 요청(?code=)에도 함께 실어 보낸다.
  const handleUnlockCode = async () => {
    if (!id) {
      return;
    }
    const trimmed = codeInput.trim();
    if (trimmed.length < 4) {
      setCodeError('코드는 4자 이상이에요.');
      return;
    }
    setCodeError(null);
    const result = await fetchPoll(id, trimmed);
    if (!result || result.requiresCode) {
      setCodeError('코드가 맞지 않아요. 🔒');
      return;
    }
    setActiveCode(trimmed);
  };

  // Modal share check
  const showShareParam =
    !isEmbedMode && !isPresentationMode && searchParams.get('showShare') === 'true';
  const snapshotParam = searchParams.get('snapshot');

  // 비공개(private) 투표 코드 게이트 — URL ?code= 를 초기 조회에 전달하고, 입력으로 잠금 해제한다.
  const urlCode = searchParams.get('code') ?? undefined;
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  // 비공개 투표 쓰기 경로(투표/한마디)에 함께 보낼 활성 접근 코드. URL 코드로 시작하고, 잠금 해제 성공 시 갱신한다.
  const [activeCode, setActiveCode] = useState<string | undefined>(urlCode);

  // Forms
  const [votedOptionId, setVotedOptionId] = useState<number | null>(null);
  const [voterName, setVoterName] = useState('');
  const [comment, setComment] = useState('');
  const [voteDraftSavedAt, setVoteDraftSavedAt] = useState<string | null>(null);
  const [voteDraftLoadedPollId, setVoteDraftLoadedPollId] = useState<string | null>(null);

  // User Local History
  const [votedHistory, setVotedHistory] = useState<Record<string, number>>({});

  // UI States
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(showShareParam);
  const [snsPreviewPlatform, setSnsPreviewPlatform] = useState<'x' | 'kakao'>('x');
  const [embedCodeMode, setEmbedCodeMode] = useState<EmbedCodeMode>('standard');
  const [inviteMessageTone, setInviteMessageTone] = useState<InviteMessageTone>('default');
  const [copyMessage, setCopyMessage] = useState('');
  const [voteMessage, setVoteMessage] = useState('');
  // 투표 완료 직후 마스코트 축하 한 줄(토스트). 중복 제출 가드와 함께 동작한다.
  const [voteSuccessNote, setVoteSuccessNote] = useState('');
  // 투표 완료 시 잠깐 떠오르는 시각적 축하(마스코트 팝 + 컨페티). prefers-reduced-motion을 존중한다.
  const [showVoteCelebration, setShowVoteCelebration] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [commentFilter, setCommentFilter] = useState<'all' | number>('all');
  const [resultSummaryMode, setResultSummaryMode] = useState<ResultSummaryMode>('brief');
  const [commentViewMode, setCommentViewMode] = useState<CommentViewMode>('latest');
  const [resultImagePreviewUrl, setResultImagePreviewUrl] = useState('');
  const [resultImageTheme, setResultImageTheme] = useState<ResultImageTheme>('classic');
  const [resultImageContentOptions, setResultImageContentOptions] =
    useState<ResultImageContentOptions>(DEFAULT_RESULT_IMAGE_CONTENT);
  const [presentRefreshCountdown, setPresentRefreshCountdown] = useState(
    PRESENT_REFRESH_INTERVAL_SECONDS,
  );
  const [isPresentAutoRefreshPaused, setIsPresentAutoRefreshPaused] = useState(false);
  // 결과 활용 도구는 기본 접힘 + 탭 1개씩만 노출해 첫 화면 정보량을 줄여요.
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [activeToolTab, setActiveToolTab] = useState<string>('audience');
  const hasVoted = currentPoll ? votedHistory[currentPoll.id] !== undefined : false;

  // Load local vote history
  useEffect(() => {
    const saved = localStorage.getItem('picky_voted_history');
    if (saved) {
      try {
        setVotedHistory(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Fetch current poll data
  // 코드는 메모리(activeCode)에서 읽어 조회한다 — URL ?code= 는 R3에서 잠금 해제 후 제거되므로,
  // URL 의존이면 스크럽 직후 재조회 시 코드 없이 다시 잠겨버린다. activeCode 는 urlCode 로 시작한다.
  useEffect(() => {
    restorePollFromSnapshot(snapshotParam);

    if (id) {
      fetchPoll(id, activeCode);
    }
  }, [id, fetchPoll, snapshotParam, activeCode]);

  // URL 에 ?code= 가 새로 들어오면(예: 공유 링크로 진입) 메모리 활성 코드도 그 값으로 맞춘다.
  // 단, URL 에서 코드가 사라지는 경우(R3 스크럽)는 메모리를 비우지 않는다 — 쓰기 요청에 계속 필요하다.
  useEffect(() => {
    if (urlCode) {
      setActiveCode(urlCode);
    }
  }, [urlCode]);

  // R3: 접근 코드가 URL(?code=)에 남으면 주소창·브라우저 히스토리·리퍼러로 유출된다.
  // 코드를 메모리(activeCode)에 보관한 뒤, 게이트가 풀린(또는 공개) 폴이면 쿼리에서 code 만 제거한다.
  // replace:true 라 히스토리 항목을 더 만들지 않고, 다른 쿼리(showShare/snapshot 등)는 보존한다.
  useEffect(() => {
    if (!currentPoll || currentPoll.requiresCode) {
      return;
    }
    if (!searchParams.has('code')) {
      return;
    }
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('code');
    setSearchParams(nextParams, { replace: true });
  }, [currentPoll, searchParams, setSearchParams]);

  useEffect(() => {
    if (showShareParam) {
      setShowShareModal(true);
    }
  }, [showShareParam]);

  // Pre-fill voter name from auth/guest profile
  useEffect(() => {
    const nextName = (user?.nickname || guestName || '').trim();
    setVoterName(nextName);
  }, [user?.id, guestName, id]);

  useEffect(() => {
    if (!currentPoll || !id || !('window' in globalThis)) {
      return;
    }

    if (isPollClosed(currentPoll) || votedHistory[id] !== undefined) {
      localStorage.removeItem(getVoteDraftStorageKey(id));
      setVoteDraftSavedAt(null);
      setVoteDraftLoadedPollId(id);
      return;
    }

    try {
      const raw = localStorage.getItem(getVoteDraftStorageKey(id));
      if (!raw) {
        setVoteDraftLoadedPollId(id);
        return;
      }

      const parsed = JSON.parse(raw) as {
        votedOptionId?: unknown;
        voterName?: unknown;
        comment?: unknown;
        savedAt?: unknown;
      };
      const draftOptionId = typeof parsed.votedOptionId === 'number' ? parsed.votedOptionId : null;

      if (
        draftOptionId !== null &&
        currentPoll.options.some((option) => option.id === draftOptionId)
      ) {
        setVotedOptionId(draftOptionId);
      }

      if (typeof parsed.voterName === 'string') {
        setVoterName(parsed.voterName);
      }

      if (typeof parsed.comment === 'string') {
        setComment(parsed.comment);
      }

      setVoteDraftSavedAt(typeof parsed.savedAt === 'string' ? parsed.savedAt : null);
      setVoteDraftLoadedPollId(id);
    } catch {
      localStorage.removeItem(getVoteDraftStorageKey(id));
      setVoteDraftSavedAt(null);
      setVoteDraftLoadedPollId(id);
    }
  }, [currentPoll?.id, id, votedHistory]);

  useEffect(() => {
    if (!currentPoll || !id || !('window' in globalThis)) {
      return;
    }

    if (voteDraftLoadedPollId !== id) {
      return;
    }

    if (isPollClosed(currentPoll) || votedHistory[id] !== undefined) {
      localStorage.removeItem(getVoteDraftStorageKey(id));
      setVoteDraftSavedAt(null);
      return;
    }

    const defaultVoterName = (user?.nickname || guestName || '').trim();
    const hasDraftContent =
      votedOptionId !== null ||
      comment.trim().length > 0 ||
      (voterName.trim().length > 0 && voterName.trim() !== defaultVoterName);

    if (!hasDraftContent) {
      localStorage.removeItem(getVoteDraftStorageKey(id));
      setVoteDraftSavedAt(null);
      return;
    }

    try {
      const savedAt = new Date().toISOString();
      localStorage.setItem(
        getVoteDraftStorageKey(id),
        JSON.stringify({
          votedOptionId,
          voterName,
          comment,
          savedAt,
        }),
      );
      setVoteDraftSavedAt(savedAt);
    } catch {
      setVoteDraftSavedAt(null);
    }
  }, [
    currentPoll?.id,
    id,
    votedOptionId,
    voterName,
    comment,
    user?.nickname,
    guestName,
    votedHistory,
    voteDraftLoadedPollId,
  ]);

  useEffect(() => {
    if (currentPoll) {
      updatePollMetaTags(currentPoll);
    }
  }, [currentPoll]);

  useEffect(() => {
    if (!currentPoll || isEmbedMode || isPresentationMode) {
      return;
    }

    rememberRecentPoll(currentPoll, {
      hasVoted: hasVoted || Boolean(votedHistory[currentPoll.id]),
    });
  }, [currentPoll, hasVoted, isEmbedMode, isPresentationMode, votedHistory]);

  useEffect(() => {
    if (!isEmbedMode && !isPresentationMode) {
      return;
    }

    document.body.classList.add(isPresentationMode ? 'present-mode' : 'embed-mode');
    const resolveEmbedTargetOrigin = () => {
      const configuredOrigin = import.meta.env.VITE_EMBED_PARENT_ORIGIN?.trim();
      const candidates = [configuredOrigin, document.referrer, globalThis.location.origin];

      for (const candidate of candidates) {
        if (!candidate) {
          continue;
        }
        try {
          return new URL(candidate).origin;
        } catch {
          continue;
        }
      }

      return globalThis.location.origin;
    };
    const embedTargetOrigin = resolveEmbedTargetOrigin();
    const emitEmbedHeight = () => {
      if (!isEmbedMode) {
        return;
      }

      globalThis.parent?.postMessage(
        {
          type: 'picky:embed-resize',
          height: document.documentElement.scrollHeight,
        },
        embedTargetOrigin,
      );
    };

    emitEmbedHeight();
    globalThis.setTimeout(emitEmbedHeight, 120);
    globalThis.setTimeout(emitEmbedHeight, 420);
    globalThis.addEventListener('resize', emitEmbedHeight);

    return () => {
      document.body.classList.remove('embed-mode', 'present-mode');
      globalThis.removeEventListener('resize', emitEmbedHeight);
    };
  }, [
    isEmbedMode,
    isPresentationMode,
    currentPoll?.id,
    currentPoll?.totalVotes,
    currentPoll?.comments.length,
  ]);

  useEffect(() => {
    if (!isPresentationMode || !id) {
      return;
    }

    if (isPresentAutoRefreshPaused) {
      setPresentRefreshCountdown(PRESENT_REFRESH_INTERVAL_SECONDS);
      return;
    }

    setPresentRefreshCountdown(PRESENT_REFRESH_INTERVAL_SECONDS);
    const countdownTimer = globalThis.setInterval(() => {
      setPresentRefreshCountdown((current) =>
        current <= 1 ? PRESENT_REFRESH_INTERVAL_SECONDS : current - 1,
      );
    }, 1000);
    const refreshTimer = globalThis.setInterval(() => {
      fetchPoll(id);
      setPresentRefreshCountdown(PRESENT_REFRESH_INTERVAL_SECONDS);
    }, PRESENT_REFRESH_INTERVAL_SECONDS * 1000);

    return () => {
      globalThis.clearInterval(countdownTimer);
      globalThis.clearInterval(refreshTimer);
    };
  }, [fetchPoll, id, isPresentationMode, isPresentAutoRefreshPaused]);

  // Submit Vote — 진입 즉시 더블 가드(isSubmittingVote + isLoading)로 연타/중복 제출을 막는다.
  const handleVoteSubmit = async () => {
    if (!id || votedOptionId === null || isLoading || isSubmittingVote) return;

    if (isPollClosed(currentPoll)) {
      setVoteMessage('마감된 투표에는 더 이상 참여할 수 없습니다.');
      return;
    }

    setIsSubmittingVote(true);
    clearError();
    setVoteMessage('');

    try {
      const success = await vote(
        id,
        {
          optionId: votedOptionId,
          voterName: voterName.trim() || null,
          comment: comment.trim() || null,
          voterKey: getVoterKey(),
        },
        // 비공개 투표면 활성 접근 코드를 함께 보내 서버 게이트를 통과한다(공개 폴은 undefined).
        activeCode,
      );

      if (success) {
        const nextHistory = { ...votedHistory, [id]: votedOptionId };
        setVotedHistory(nextHistory);
        localStorage.setItem('picky_voted_history', JSON.stringify(nextHistory));
        localStorage.removeItem(getVoteDraftStorageKey(id));
        if (currentPoll) {
          rememberRecentPoll(currentPoll, { hasVoted: true });
        }

        // Reset inputs
        setVoterName('');
        setComment('');
        setVotedOptionId(null);
        setVoteDraftSavedAt(null);
        setVoteMessage('');
        // 피키 축하 한 줄 — 잠깐 노출 후 사라진다.
        setVoteSuccessNote(`${MASCOT.celebrate.emoji} ${MASCOT.celebrate.line}`);
        globalThis.setTimeout(() => setVoteSuccessNote(''), 3200);
        // 시각적 축하 연출(마스코트 팝 + 컨페티). 모션을 줄인 환경에선 CSS가 정적으로 처리한다.
        setShowVoteCelebration(true);
        globalThis.setTimeout(() => setShowVoteCelebration(false), 1800);
      }
    } finally {
      setIsSubmittingVote(false);
    }
  };

  useEffect(() => {
    if (!currentPoll || !id || isPresentationMode || isPollClosed(currentPoll)) {
      return;
    }

    const handleVoteShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTyping =
        target?.isContentEditable ||
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select';

      if (isTyping || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (/^[1-9]$/.test(event.key)) {
        const optionIndex = Number(event.key) - 1;
        const option = currentPoll.options[optionIndex];

        if (option) {
          event.preventDefault();
          setVotedOptionId(option.id);
        }
        return;
      }

      if (event.key === '0') {
        const option = currentPoll.options[9];

        if (option) {
          event.preventDefault();
          setVotedOptionId(option.id);
        }
        return;
      }

      if (event.key === 'Enter' && votedOptionId !== null && !isLoading && !isSubmittingVote) {
        event.preventDefault();
        void handleVoteSubmit();
      }
    };

    globalThis.addEventListener('keydown', handleVoteShortcut);

    return () => {
      globalThis.removeEventListener('keydown', handleVoteShortcut);
    };
  }, [
    comment,
    currentPoll,
    id,
    isLoading,
    isSubmittingVote,
    isPresentationMode,
    votedHistory,
    votedOptionId,
    voterName,
  ]);

  // Click-to-copy
  const handleCopyLinkClick = async (pollId: string) => {
    setCopyMessage('');
    const shareUrl = resolvePollShareUrl(currentPoll);
    try {
      await copyText(shareUrl);
      setCopiedId(pollId);
      setCopyMessage('공유 링크가 클립보드에 복사되었습니다.');
      setTimeout(() => setCopiedId(null), 2000);
      setTimeout(() => setCopyMessage(''), 2200);
    } catch (err) {
      console.error('copy failed', err);
      setCopyMessage('클립보드 복사에 실패했습니다. 링크를 직접 복사해 주세요.');
      setTimeout(() => setCopyMessage(''), 2400);
    }
  };

  const handleCopyJoinCodeClick = async () => {
    if (!currentPoll) {
      return;
    }

    setCopyMessage('');
    try {
      await copyText(currentPoll.id);
      setCopiedId(`code-${currentPoll.id}`);
      setCopyMessage('참여 코드가 클립보드에 복사되었습니다.');
      setTimeout(() => setCopiedId(null), 2000);
      setTimeout(() => setCopyMessage(''), 2200);
    } catch (err) {
      console.error('join code copy failed', err);
      setCopyMessage('참여 코드 복사에 실패했습니다.');
      setTimeout(() => setCopyMessage(''), 2400);
    }
  };

  const handleCopyInviteMessageClick = async () => {
    if (!currentPoll) {
      return;
    }

    setCopyMessage('');
    try {
      await copyText(
        buildPollInviteMessage(currentPoll, resolvePollShareUrl(currentPoll), inviteMessageTone),
      );
      setCopiedId(`invite-${currentPoll.id}`);
      setCopyMessage('초대 메시지가 클립보드에 복사되었습니다.');
      setTimeout(() => setCopiedId(null), 2000);
      setTimeout(() => setCopyMessage(''), 2400);
    } catch (err) {
      console.error('invite message copy failed', err);
      setCopyMessage('초대 메시지 복사에 실패했습니다.');
      setTimeout(() => setCopyMessage(''), 2600);
    }
  };

  const handleCopyEmbedClick = async () => {
    if (!currentPoll) {
      return;
    }

    setCopyMessage('');
    try {
      await copyText(buildPollEmbedCode(currentPoll, embedCodeMode));
      setCopiedId(`embed-${currentPoll.id}`);
      setCopyMessage('웹사이트용 임베드 코드가 클립보드에 복사되었습니다.');
      setTimeout(() => setCopiedId(null), 2000);
      setTimeout(() => setCopyMessage(''), 2400);
    } catch (err) {
      console.error('embed copy failed', err);
      setCopyMessage('임베드 코드 복사에 실패했습니다. 공유 링크를 대신 복사해 주세요.');
      setTimeout(() => setCopyMessage(''), 2600);
    }
  };

  const handleCopyResultSummaryClick = async () => {
    if (!currentPoll) {
      return;
    }

    setCopyMessage('');
    try {
      await copyText(
        buildPollResultSummary(currentPoll, resolvePollShareUrl(currentPoll), resultSummaryMode),
      );
      setCopiedId(`summary-${resultSummaryMode}-${currentPoll.id}`);
      setCopyMessage('결과 요약이 클립보드에 복사되었습니다.');
      setTimeout(() => setCopiedId(null), 2200);
      setTimeout(() => setCopyMessage(''), 2600);
    } catch (err) {
      console.error('result summary copy failed', err);
      setCopyMessage('결과 요약 복사에 실패했습니다.');
      setTimeout(() => setCopyMessage(''), 2600);
    }
  };

  const handleCopyMarkdownReportClick = async () => {
    if (!currentPoll) {
      return;
    }

    setCopyMessage('');
    try {
      await copyText(buildPollMarkdownReport(currentPoll, resolvePollShareUrl(currentPoll)));
      setCopiedId(`markdown-${currentPoll.id}`);
      setCopyMessage('회의록용 리포트가 클립보드에 복사되었습니다.');
      setTimeout(() => setCopiedId(null), 2200);
      setTimeout(() => setCopyMessage(''), 2600);
    } catch (err) {
      console.error('markdown report copy failed', err);
      setCopyMessage('회의록용 리포트 복사에 실패했습니다.');
      setTimeout(() => setCopyMessage(''), 2600);
    }
  };

  const handleDownloadResultCsvClick = () => {
    if (!currentPoll) {
      return;
    }

    try {
      setCopyMessage('');
      const csv = buildPollCsvExport(currentPoll, resolvePollShareUrl(currentPoll));
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `picky-poll-${currentPoll.id}-results.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setCopiedId(`csv-${currentPoll.id}`);
      setCopyMessage('CSV 결과 파일이 저장되었습니다.');
      setTimeout(() => setCopiedId(null), 2200);
      setTimeout(() => setCopyMessage(''), 2600);
    } catch (err) {
      console.error('result csv download failed', err);
      setCopyMessage('CSV 결과 파일 저장에 실패했습니다.');
      setTimeout(() => setCopyMessage(''), 2600);
    }
  };

  const downloadResultImage = (dataUrl: string) => {
    if (!currentPoll) {
      return;
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `picky-${currentPoll.id}-result.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handlePreviewResultImageClick = () => {
    if (!currentPoll) {
      return;
    }

    setCopyMessage('');
    try {
      const dataUrl = buildPollResultImageDataUrl(
        currentPoll,
        resolvePollShareUrl(currentPoll),
        resultImageTheme,
        resultImageContentOptions,
      );
      setResultImagePreviewUrl(dataUrl);
      setCopyMessage('');
    } catch (err) {
      console.error('result image preview failed', err);
      setCopyMessage('결과 이미지 미리보기를 만들지 못했습니다.');
      setTimeout(() => setCopyMessage(''), 2600);
    }
  };

  const handleDownloadPreviewImageClick = () => {
    if (!currentPoll || !resultImagePreviewUrl) {
      return;
    }

    try {
      downloadResultImage(resultImagePreviewUrl);
      setCopiedId(`image-${currentPoll.id}`);
      setCopyMessage('결과 이미지가 저장되었습니다.');
      setTimeout(() => setCopiedId(null), 2200);
      setTimeout(() => setCopyMessage(''), 2600);
    } catch (err) {
      console.error('result image download failed', err);
      setCopyMessage('결과 이미지 저장에 실패했습니다.');
      setTimeout(() => setCopyMessage(''), 2600);
    }
  };

  const closeResultImagePreview = () => {
    setResultImagePreviewUrl('');
  };

  const handleResultImageThemeChange = (nextTheme: ResultImageTheme) => {
    setResultImageTheme(nextTheme);

    if (!currentPoll || !resultImagePreviewUrl) {
      return;
    }

    try {
      const dataUrl = buildPollResultImageDataUrl(
        currentPoll,
        resolvePollShareUrl(currentPoll),
        nextTheme,
        resultImageContentOptions,
      );
      setResultImagePreviewUrl(dataUrl);
    } catch (err) {
      console.error('result image theme update failed', err);
      setCopyMessage('결과 이미지 미리보기를 만들지 못했습니다.');
      setTimeout(() => setCopyMessage(''), 2600);
    }
  };

  const handleResultImageContentToggle = (targetOption: ResultImageContentKey) => {
    const nextOptions = {
      ...resultImageContentOptions,
      [targetOption]: !resultImageContentOptions[targetOption],
    };
    setResultImageContentOptions(nextOptions);

    if (!currentPoll || !resultImagePreviewUrl) {
      return;
    }

    try {
      const dataUrl = buildPollResultImageDataUrl(
        currentPoll,
        resolvePollShareUrl(currentPoll),
        resultImageTheme,
        nextOptions,
      );
      setResultImagePreviewUrl(dataUrl);
    } catch (err) {
      console.error('result image content update failed', err);
      setCopyMessage('결과 이미지 미리보기를 만들지 못했습니다.');
      setTimeout(() => setCopyMessage(''), 2600);
    }
  };

  const handleKakaoShareClick = async () => {
    if (!currentPoll) {
      return;
    }

    setCopyMessage('');
    try {
      const mode = await sharePollToKakao(currentPoll);
      if (mode === 'clipboard') {
        setCopiedId(currentPoll.id);
        setCopyMessage('카카오 SDK 키가 없어 공유 문구와 링크를 복사했습니다.');
      } else if (mode === 'web-share') {
        setCopyMessage('공유 시트를 열었습니다. 카카오톡을 선택해 전송해 주세요.');
      } else {
        setCopyMessage('카카오톡 공유 창을 열었습니다.');
      }
      setTimeout(() => setCopyMessage(''), 2600);
      setTimeout(() => setCopiedId(null), 2200);
    } catch (err) {
      console.error('kakao share failed', err);
      try {
        await copyText(buildPollShareMessage(currentPoll));
        setCopiedId(currentPoll.id);
        setCopyMessage('카카오 공유를 열지 못해 링크를 복사했습니다.');
      } catch {
        setCopyMessage('카카오 공유에 실패했습니다. 링크를 직접 복사해 주세요.');
      }
      setTimeout(() => setCopyMessage(''), 2800);
      setTimeout(() => setCopiedId(null), 2200);
    }
  };

  const handleNativeShareClick = async () => {
    if (!currentPoll) {
      return;
    }
    setCopyMessage('');
    const shareMessage = buildPollShareMessage(currentPoll);
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ text: shareMessage });
        return;
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
    }
    try {
      await copyText(shareMessage);
      setCopiedId(currentPoll.id);
      setCopyMessage('공유 링크를 복사했어요.');
      setTimeout(() => setCopyMessage(''), 2600);
      setTimeout(() => setCopiedId(null), 2200);
    } catch {
      setCopyMessage('공유에 실패했어요. 링크를 직접 복사해 주세요.');
      setTimeout(() => setCopyMessage(''), 2800);
    }
  };

  const handleUseAsTemplateClick = () => {
    if (!currentPoll) {
      return;
    }

    try {
      const draftAttachments = (currentPoll.attachments || [])
        .filter((attachment) => attachment.dataUrl?.startsWith('data:'))
        .slice(0, 3)
        .map((attachment) => ({
          name: attachment.name,
          type: attachment.type,
          size: attachment.size,
          dataUrl: attachment.dataUrl,
        }));
      const draftOptions = currentPoll.options.slice(0, 10).map((option) => ({
        text: option.text,
        imageUrl: option.imageUrl?.startsWith('data:') ? option.imageUrl : '',
      }));

      localStorage.setItem(
        CREATE_POLL_DRAFT_STORAGE_KEY,
        JSON.stringify({
          question: `${currentPoll.question} (복사본)`,
          description: currentPoll.description || '',
          endsAtLocal: '',
          resultsVisibility: currentPoll.resultsVisibility === 'always' ? 'always' : 'afterVote',
          options:
            draftOptions.length >= 2
              ? draftOptions
              : [
                  { text: '', imageUrl: '' },
                  { text: '', imageUrl: '' },
                ],
          attachments: draftAttachments,
          savedAt: new Date().toISOString(),
        }),
      );
      navigate('/create');
    } catch (err) {
      console.error('failed to create template draft', err);
      setCopyMessage('템플릿 복제에 실패했습니다.');
      setTimeout(() => setCopyMessage(''), 2600);
    }
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
    setCopyMessage('');
    // Remove query parameter from URL
    if (searchParams.has('showShare')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('showShare');
      setSearchParams(nextParams);
    }
  };

  if (isLoading && !currentPoll) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}
      >
        <div
          aria-hidden="true"
          style={{
            fontSize: '2rem',
            marginBottom: '10px',
            animation: 'pulse 1.6s ease-in-out infinite',
          }}
        >
          {MASCOT.thinking.emoji}
        </div>
        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          {MASCOT.thinking.line}
        </p>
        <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>{VOICE.loading}</p>
      </div>
    );
  }

  if (!currentPoll) {
    const noPollMessage = error || '존재하지 않거나 삭제된 고민 투표 링크입니다.';
    return (
      <div
        className="content-card"
        style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div aria-hidden="true" style={{ fontSize: '2.6rem' }}>
          {MASCOT.empty.emoji}
        </div>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
            고민을 찾지 못했어요
          </h3>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{noPollMessage}</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="btn-secondary"
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          목록으로 돌아가기
        </button>
        {id ? (
          <button
            type="button"
            onClick={() => fetchPoll(id)}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            다시 불러오기
          </button>
        ) : null}
      </div>
    );
  }

  // 비공개(private) 투표 — 올바른 코드 전까지 질문만 보여주고 선택지/결과를 가린다.
  if (currentPoll.requiresCode) {
    return (
      <div
        className="content-card animate-slide-up"
        style={{
          textAlign: 'center',
          padding: '3rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          maxWidth: '420px',
          margin: '0 auto',
        }}
      >
        <div aria-hidden="true" style={{ fontSize: '2.6rem' }}>
          🔒
        </div>
        <div>
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: '6px',
            }}
          >
            비공개 고민이에요
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {currentPoll.question}
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            참여하려면 접근 코드를 입력해 주세요.
          </p>
        </div>
        <input
          type="text"
          value={codeInput}
          onChange={(event) => {
            setCodeError(null);
            setCodeInput(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void handleUnlockCode();
            }
          }}
          placeholder="접근 코드"
          maxLength={20}
          aria-label="비공개 투표 접근 코드"
          className="form-input"
          style={{ width: '100%', textAlign: 'center', fontSize: '0.95rem' }}
        />
        {codeError ? (
          <p role="alert" style={{ fontSize: '0.78rem', color: 'var(--brand-accent-coral)' }}>
            {codeError}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void handleUnlockCode()}
          disabled={isLoading}
          className="btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}
        >
          들어가기 🔓
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="btn-secondary"
          style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const vm = buildPollViewModel({
    currentPoll,
    hasVoted,
    votedOptionId,
    voterName,
    comment,
    isLoading,
    isSubmittingVote,
    commentFilter,
    commentViewMode,
    resultSummaryMode,
    inviteMessageTone,
    copiedId,
    copyMessage,
  });
  const {
    pollClosed,
    resultsVisibility,
    canViewResults,
    sortedOptionsByVotes,
    commentFilterOptions,
    visibleComments,
    emptyCommentMessage,
    featuredComment,
    originalPollPath,
    consensusLabel,
    decisionHint,
    shareUrl,
    participationQrUrl,
    inviteMessage,
    participantContextItems,
    kakaoShareDiagnostics,
    kakaoShareReadinessItems,
    kakaoReadyCount,
    shareCopyPresets,
    embedCodeModes,
  } = vm;

  if (isPresentationMode) {
    return (
      <PollPresentationView
        currentPoll={currentPoll}
        id={id}
        fetchPoll={fetchPoll}
        isPresentAutoRefreshPaused={isPresentAutoRefreshPaused}
        setIsPresentAutoRefreshPaused={setIsPresentAutoRefreshPaused}
        presentRefreshCountdown={presentRefreshCountdown}
        setPresentRefreshCountdown={setPresentRefreshCountdown}
        originalPollPath={originalPollPath}
        pollClosed={pollClosed}
        consensusLabel={consensusLabel}
        decisionHint={decisionHint}
        sortedOptionsByVotes={sortedOptionsByVotes}
        featuredComment={featuredComment}
        participationQrUrl={participationQrUrl}
        shareUrl={shareUrl}
        copiedId={copiedId}
        copyMessage={copyMessage}
        handleCopyLinkClick={handleCopyLinkClick}
      />
    );
  }

  return (
    <div
      className="animate-slide-up"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      {/* Prominent QR for mobile scanning - makes QR actually usable on web site */}
      {shareUrl && participationQrUrl && <DesktopQrCard participationQrUrl={participationQrUrl} />}

      <PreVoteContextSection
        participantContextItems={participantContextItems}
        setShowShareModal={setShowShareModal}
      />

      <PollTopNav
        isEmbedMode={isEmbedMode}
        originalPollPath={originalPollPath}
        navigate={navigate}
        setShowShareModal={setShowShareModal}
      />

      {/* 작성자/운영자 전용 관리 액션바 — 임베드/발표 모드에서는 숨긴다. */}
      {canManagePoll && !isEmbedMode && !isPresentationMode ? (
        <div
          className="content-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
            padding: '0.75rem 1rem',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
            }}
          >
            <Settings size={14} style={{ color: 'var(--brand-accent-teal)' }} />
            {isPollOwner ? '내 고민 관리' : '운영자 관리'}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleManageEdit}
              className="btn-secondary"
              aria-label="이 고민 수정"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Pencil size={14} />
              수정
            </button>
            <button
              type="button"
              onClick={handleManageDelete}
              className="ghost-btn"
              aria-label="이 고민 삭제"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--brand-accent-coral)',
                borderColor: 'rgba(239, 68, 68, 0.32)',
              }}
            >
              <Trash2 size={14} />
              삭제
            </button>
          </div>
        </div>
      ) : null}

      {/* Main Poll Card — order:-1 로 질문/투표를 최상단 히어로로(토스 정렬). QR·안내는 아래로. */}
      <PollMainCard
        vm={vm}
        activeToolTab={activeToolTab}
        comment={comment}
        copiedId={copiedId}
        copyMessage={copyMessage}
        currentPoll={currentPoll}
        creatorLabel={getCreatorLabel()}
        error={error}
        handleCopyEmbedClick={handleCopyEmbedClick}
        handleCopyJoinCodeClick={handleCopyJoinCodeClick}
        handleCopyLinkClick={handleCopyLinkClick}
        handleCopyMarkdownReportClick={handleCopyMarkdownReportClick}
        handleCopyResultSummaryClick={handleCopyResultSummaryClick}
        handleDownloadResultCsvClick={handleDownloadResultCsvClick}
        handleKakaoShareClick={handleKakaoShareClick}
        handlePreviewResultImageClick={handlePreviewResultImageClick}
        handleUseAsTemplateClick={handleUseAsTemplateClick}
        handleVoteSubmit={handleVoteSubmit}
        hasVoted={hasVoted}
        isEmbedMode={isEmbedMode}
        showVoteCelebrationOverlay={showVoteCelebration && !isEmbedMode && !isPresentationMode}
        showResultTools={!isEmbedMode && !isPresentationMode}
        showLivePreview={!hasVoted && !pollClosed && resultsVisibility === 'always'}
        resultSummaryMode={resultSummaryMode}
        setActiveToolTab={setActiveToolTab}
        setComment={setComment}
        setCopiedId={setCopiedId}
        setCopyMessage={setCopyMessage}
        setResultSummaryMode={setResultSummaryMode}
        setShowShareModal={setShowShareModal}
        setToolsExpanded={setToolsExpanded}
        setVotedOptionId={setVotedOptionId}
        setVoterName={setVoterName}
        toolsExpanded={toolsExpanded}
        voteDraftSavedAt={voteDraftSavedAt}
        voteMessage={voteMessage}
        voteSuccessNote={voteSuccessNote}
        votedHistory={votedHistory}
        votedOptionId={votedOptionId}
        voterName={voterName}
      />

      {/* Comments timeline */}
      {canViewResults ? (
        <>
          <PollFeedbackList
            currentPoll={currentPoll}
            commentViewMode={commentViewMode}
            setCommentViewMode={setCommentViewMode}
            commentFilter={commentFilter}
            setCommentFilter={setCommentFilter}
            commentFilterOptions={commentFilterOptions}
            visibleComments={visibleComments}
            emptyCommentMessage={emptyCommentMessage}
            canManage={canManagePoll}
            pollClosed={pollClosed}
            onDeleteComment={handleDeleteComment}
            onAddReply={handleAddReply}
          />

          {resultImagePreviewUrl ? (
            <ResultImagePreviewModal
              currentPoll={currentPoll}
              resultImagePreviewUrl={resultImagePreviewUrl}
              resultImageTheme={resultImageTheme}
              resultImageContentOptions={resultImageContentOptions}
              copiedId={copiedId}
              closeResultImagePreview={closeResultImagePreview}
              handleResultImageThemeChange={handleResultImageThemeChange}
              handleResultImageContentToggle={handleResultImageContentToggle}
              handleDownloadPreviewImageClick={handleDownloadPreviewImageClick}
              handleCopyJoinCodeClick={handleCopyJoinCodeClick}
            />
          ) : null}
        </>
      ) : (
        <section
          className="content-card"
          style={{
            marginTop: '0.5rem',
            padding: '1.1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            borderColor: 'rgba(232, 200, 77, 0.2)',
          }}
        >
          <Info size={17} style={{ color: 'var(--brand-accent-gold)', flexShrink: 0 }} />
          <div>
            <h3
              style={{
                margin: '0 0 0.35rem',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            >
              의견 타임라인은 참여 후 열립니다
            </h3>
            <p
              style={{
                margin: 0,
                color: 'var(--text-secondary)',
                fontSize: '0.76rem',
                lineHeight: 1.55,
              }}
            >
              투표 전에는 다른 사람의 선택 이유가 판단에 영향을 주지 않도록 숨겨집니다.
            </p>
          </div>
        </section>
      )}

      {/* Share Modal Backdrop */}
      {showShareModal && (
        <PollShareModal
          currentPoll={currentPoll}
          copiedId={copiedId}
          copyMessage={copyMessage}
          setCopiedId={setCopiedId}
          setCopyMessage={setCopyMessage}
          snsPreviewPlatform={snsPreviewPlatform}
          setSnsPreviewPlatform={setSnsPreviewPlatform}
          embedCodeMode={embedCodeMode}
          setEmbedCodeMode={setEmbedCodeMode}
          embedCodeModes={embedCodeModes}
          inviteMessage={inviteMessage}
          inviteMessageTone={inviteMessageTone}
          setInviteMessageTone={setInviteMessageTone}
          shareCopyPresets={shareCopyPresets}
          kakaoShareDiagnostics={kakaoShareDiagnostics}
          kakaoShareReadinessItems={kakaoShareReadinessItems}
          kakaoReadyCount={kakaoReadyCount}
          participationQrUrl={participationQrUrl}
          handleCloseShareModal={handleCloseShareModal}
          handleCopyInviteMessageClick={handleCopyInviteMessageClick}
          handleCopyLinkClick={handleCopyLinkClick}
          handleKakaoShareClick={handleKakaoShareClick}
          handleNativeShareClick={handleNativeShareClick}
        />
      )}

      {/* 모바일 전용 고정 투표 바 — 투표 전(미참여·미마감·비임베드)에만 노출.
          긴 상세 페이지에서도 핵심 액션인 '투표하기'를 항상 손 닿는 곳에 둔다. */}
      {!isEmbedMode && !hasVoted && !pollClosed ? (
        <MobileVoteBar
          votedOptionId={votedOptionId}
          isSubmittingVote={isSubmittingVote}
          handleVoteSubmit={handleVoteSubmit}
        />
      ) : null}
    </div>
  );
};
