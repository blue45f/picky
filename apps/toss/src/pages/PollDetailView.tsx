import { useState } from 'react';
import { Button } from '@toss/tds-mobile';
import type { Poll, PollComment, PollOption } from '../shared';
import { MASCOT, VOICE, resolveCreatorLabel } from '../shared';
import { formatNumber } from '../lib/format';
import { optionPercent } from '../lib/poll';
import { theme, stickyActionBar, FONT } from '../theme';
import { AppBar, Chip, ProgressBar } from '../components/ui';
import { CountdownChip } from '../components/Countdown';
import { PollShareQrSection } from '../components/PollShareQrSection';
import { OPTION_COLORS, VoteDonutChart } from '../components/VoteDonutChart';

interface PollDetailViewProps {
  poll: Poll | null;
  isLoading: boolean;
  closed: boolean;
  showResults: boolean;
  hasVoted: boolean;
  votedOptionId: number | null;
  selectedOptionId: number | null;
  onSelect: (optionId: number) => void;
  onVote: () => void;
  voterName: string;
  setVoterName: (name: string) => void;
  comment: string;
  setComment: (comment: string) => void;
  /** 옵트인 '토스 프로필 불러오기'. 미전달(키 없음/토스 밖)이면 버튼 미노출. */
  onLoadProfile?: () => void;
  /** 프로필 불러오는 중 로딩 표시. */
  profileLoading?: boolean;
  /** 실패/거부 시 인라인 안내(차단하지 않음). */
  profileNotice?: string | null;
  leader: PollOption | null;
  displayOptions: PollOption[];
  winnerId: number | null;
  isOwner: boolean;
  /** 본인 글이거나 어드민이면 수정/삭제/댓글관리 가능. 미전달 시 isOwner로 폴백. */
  canManage?: boolean;
  confirmDelete: boolean;
  onDelete: () => void;
  /** 수정 화면 진입(소유자/어드민). 미전달 시 수정 버튼 미노출. */
  onEdit?: () => void;
  /** 댓글 삭제(소유자/어드민). 미전달 시 댓글 삭제 버튼 미노출. */
  onDeleteComment?: (commentId: number) => void;
  /** 답글(대댓글) 작성. 미전달 시 답글 UI 미노출. */
  onAddReply?: (parentId: number, text: string) => Promise<void> | void;
  remaining: number | null;
  shareUrl: string;
  onShare: () => void;
  onCopy: () => void;
  onCopyResult?: () => void;
  onBack: () => void;
  totalVotes: number;
  comments: PollComment[];
}

function PollEmptyState() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.textMuted,
      }}
    >
      <span style={{ fontSize: 48 }}>{MASCOT.empty.emoji}</span>
      <span style={{ fontSize: 15 }}>{MASCOT.empty.line}</span>
    </div>
  );
}

function OptionButtonStyle(
  isMine: boolean,
  isWinner: boolean,
  highlight: boolean,
  disabled: boolean,
): React.CSSProperties {
  const highlightBorderColor = highlight ? 'rgba(19, 194, 163, 0.7)' : 'rgba(255, 255, 255, 0.06)';
  const cardBorderColor = isWinner ? 'rgba(244, 197, 96, 0.7)' : highlightBorderColor;
  const highlightBoxShadow = highlight
    ? '0 8px 20px rgba(19, 194, 163, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
    : '0 4px 16px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.02)';
  const cardBoxShadow = isWinner
    ? '0 8px 24px rgba(244, 197, 96, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
    : highlightBoxShadow;
  return {
    textAlign: 'left',
    minHeight: 64,
    padding: '20px 22px',
    borderRadius: theme.radius,
    border: `${highlight ? 2 : 1.5}px solid ${cardBorderColor}`,
    boxShadow: cardBoxShadow,
    background: isMine || isWinner ? theme.accentSoft : theme.surface,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    color: theme.text,
    cursor: disabled ? 'default' : 'pointer',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.25s ease',
  };
}

function OptionLabel(props: Readonly<{ text: string; isMine: boolean; isWinner: boolean }>) {
  const { text, isMine, isWinner } = props;
  return (
    <span
      style={{
        fontWeight: 800,
        minWidth: 0,
        fontSize: 18,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
      }}
    >
      {isMine ? (
        <span
          aria-hidden
          style={{
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            width: 24,
            height: 24,
            borderRadius: theme.radiusPill,
            background: theme.accent,
            color: theme.accentInk,
            fontSize: 15,
            fontWeight: 900,
          }}
        >
          ✓
        </span>
      ) : null}
      {isWinner ? <span style={{ flexShrink: 0, fontSize: 20 }}>👑</span> : null}
      {text}
    </span>
  );
}

function OptionResultBadge(
  props: Readonly<{ percent: number; voteCount: number; isWinner: boolean }>,
) {
  const { percent, voteCount, isWinner } = props;
  return (
    <span
      style={{
        color: isWinner ? theme.gold : theme.accent,
        fontWeight: 900,
        flexShrink: 0,
        fontSize: 17,
      }}
    >
      {percent}% · {formatNumber(voteCount)}표
    </span>
  );
}

function OptionResultButton(
  props: Readonly<{
    option: PollOption;
    percent: number;
    selected: boolean;
    isMine: boolean;
    isWinner: boolean;
    showResults: boolean;
    disabled: boolean;
    onSelect: (optionId: number) => void;
  }>,
) {
  const { option, percent, selected, isMine, isWinner, showResults, disabled, onSelect } = props;
  const highlight = selected || isMine || isWinner;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      className="pressable"
      onClick={() => onSelect(option.id)}
      style={OptionButtonStyle(isMine, isWinner, highlight, disabled)}
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
        <OptionLabel text={option.text} isMine={isMine} isWinner={isWinner} />
        {showResults ? (
          <OptionResultBadge percent={percent} voteCount={option.voteCount} isWinner={isWinner} />
        ) : null}
      </div>
      {showResults ? (
        <div style={{ marginTop: 12 }}>
          <ProgressBar percent={percent} tone={isWinner ? 'gold' : 'accent'} height={10} />
        </div>
      ) : null}
    </button>
  );
}

function OptionList(
  props: Readonly<{
    displayOptions: PollOption[];
    totalVotes: number;
    selectedOptionId: number | null;
    votedOptionId: number | null;
    winnerId: number | null;
    showResults: boolean;
    disabled: boolean;
    onSelect: (optionId: number) => void;
  }>,
) {
  const {
    displayOptions,
    totalVotes,
    selectedOptionId,
    votedOptionId,
    winnerId,
    showResults,
    disabled,
    onSelect,
  } = props;
  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {displayOptions.map((option) => (
        <OptionResultButton
          key={option.id}
          option={option}
          percent={optionPercent(option.voteCount, totalVotes)}
          selected={selectedOptionId === option.id}
          isMine={votedOptionId === option.id}
          isWinner={winnerId === option.id}
          showResults={showResults}
          disabled={disabled}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

/**
 * 결과 도넛 차트 섹션 — 진행바(선택지별) 위에 전체 분포를 한눈에 보여줘요.
 * `displayOptions`는 득표순 정렬본이라 도넛 조각/범례 색이 OptionList 순서와 1:1로 맞아요.
 * 총 0표면 빈 도넛을 그리지 않도록 숨김 가드를 둬요(차트 컴포넌트도 방어적으로 null 반환).
 */
function ResultDonutSection(
  props: Readonly<{ options: PollOption[]; totalVotes: number; closed: boolean }>,
) {
  const { options, totalVotes, closed } = props;
  if (totalVotes < 1) {
    return null;
  }
  const legendOptions = options.filter((option) => option.voteCount > 0);
  return (
    <div
      className="rise"
      style={{
        marginTop: 14,
        padding: '18px 16px',
        borderRadius: theme.radius,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* 마감된 폴은 '실시간'이 아니라 '최종 결과'로 표기해 집계가 끝났음을 분명히 한다. */}
      <h2
        style={{
          margin: '0 0 12px',
          fontSize: 14,
          fontWeight: 800,
          color: theme.text,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span aria-hidden>{closed ? '🏁' : '📊'}</span>
        {closed ? '최종 결과' : '실시간 결과'}
      </h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flexShrink: 0 }}>
          <VoteDonutChart options={options} />
        </div>
        <ul
          style={{
            flex: 1,
            minWidth: 0,
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {legendOptions.map((option) => {
            const colorIndex = options.findIndex((candidate) => candidate.id === option.id);
            const color = OPTION_COLORS[colorIndex % OPTION_COLORS.length];
            return (
              <li
                key={option.id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}
              >
                <span
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: color,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    color: theme.textMuted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {option.text}
                </span>
                <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 800, color: theme.text }}>
                  {optionPercent(option.voteCount, totalVotes)}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/**
 * 결과를 보여줄 수 있는 상태(showResults)지만 아직 표가 없거나(0표) 선택지가 1개뿐이라
 * 선두·합의·비율 같은 결과 지표가 의미 없을 때, 가짜 수치 대신 중립 '참여 대기' 상태로 모은다.
 */
function ResultPendingNotice() {
  return (
    <div
      className="rise"
      style={{
        marginTop: 14,
        padding: '16px 16px',
        borderRadius: theme.radius,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span aria-hidden style={{ fontSize: 24, flexShrink: 0 }}>
        🫧
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: FONT.bodyLg, fontWeight: 800, color: theme.text }}>참여 대기</div>
        <div
          style={{ fontSize: FONT.small, color: theme.textMuted, marginTop: 2, lineHeight: 1.4 }}
        >
          아직 결과를 해석할 만큼 표가 모이지 않았어요. 첫 한 표가 들어오면 결과가 채워져요.
        </div>
      </div>
    </div>
  );
}

/** 투표 후 '나는 다수파/소수파' 사회적 비교 배지 — 기존 % 데이터만 재활용한다. */
function SocialComparisonBadge(
  props: Readonly<{ options: PollOption[]; votedOptionId: number | null; totalVotes: number }>,
) {
  const { options, votedOptionId, totalVotes } = props;
  if (votedOptionId == null || totalVotes < 1) {
    return null;
  }
  const voted = options.find((o) => o.id === votedOptionId);
  if (!voted) {
    return null;
  }
  const percent = optionPercent(voted.voteCount, totalVotes);
  const topVote = options.reduce((max, o) => Math.max(max, o.voteCount), 0);
  const isMajority = voted.voteCount === topVote && voted.voteCount > 0;
  const avg = 100 / Math.max(1, options.length);
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
        marginTop: 14,
        padding: '14px 16px',
        borderRadius: theme.radiusSm,
        background: gold ? theme.goldSoft : theme.accentSoft,
        border: `1px solid ${gold ? 'rgba(244,197,96,0.3)' : 'rgba(19,194,163,0.3)'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span aria-hidden style={{ fontSize: 28, flexShrink: 0 }}>
        {emoji}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: FONT.bodyLg, fontWeight: 800, color: theme.text }}>{title}</div>
        <div style={{ fontSize: FONT.small, color: theme.textMuted, marginTop: 2 }}>
          내 선택: {voted.text}
        </div>
      </div>
    </div>
  );
}

function CommentDeleteButton(props: Readonly<{ onClick: () => void }>) {
  const { onClick } = props;
  return (
    <button
      type="button"
      className="pressable"
      aria-label="이 한마디 삭제하기"
      onClick={onClick}
      style={{
        flexShrink: 0,
        minWidth: 44,
        minHeight: 44,
        display: 'grid',
        placeItems: 'center',
        background: 'none',
        border: 'none',
        color: theme.textFaint ?? theme.textMuted,
        fontSize: FONT.small,
        fontWeight: 700,
        cursor: 'pointer',
        borderRadius: theme.radiusSm,
      }}
    >
      🗑
    </button>
  );
}

function CommentCard(
  props: Readonly<{
    comment: PollComment;
    canManage: boolean;
    onDelete?: (commentId: number) => void;
    onReply?: () => void;
    isReply?: boolean;
  }>,
) {
  const { comment: c, canManage, onDelete, onReply, isReply = false } = props;
  const showDelete = canManage && Boolean(onDelete);
  return (
    <div
      style={{
        background: isReply ? 'rgba(255,255,255,0.04)' : theme.surface,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: theme.radiusSm,
        padding: isReply ? '10px 14px' : '12px 16px',
        marginLeft: isReply ? 22 : 0,
        border: `1px solid ${theme.border}`,
        boxShadow: isReply
          ? 'none'
          : '0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <strong
          style={{
            color: theme.text,
            fontSize: 14,
            fontWeight: 800,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {isReply ? (
            <span aria-hidden style={{ color: theme.textFaint, marginRight: 4 }}>
              ↳
            </span>
          ) : null}
          {c.voterName}
        </strong>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, maxWidth: '60%' }}
        >
          {c.selectedOptionText ? (
            <Chip tone="accent" style={{ flexShrink: 1, minWidth: 0 }}>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.selectedOptionText}
              </span>
              <span>콕 찝음 👈</span>
            </Chip>
          ) : null}
          {showDelete ? <CommentDeleteButton onClick={() => onDelete?.(c.id)} /> : null}
        </div>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.5, color: theme.text }}>
        {c.comment}
      </p>
      {onReply && !isReply ? (
        <button
          type="button"
          className="pressable"
          onClick={onReply}
          style={{
            marginTop: 8,
            background: 'none',
            border: 'none',
            color: theme.accent,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          답글 달기 💬
        </button>
      ) : null}
    </div>
  );
}

function CommentsSection(
  props: Readonly<{
    comments: PollComment[];
    canManage: boolean;
    closed: boolean;
    onDeleteComment?: (commentId: number) => void;
    onAddReply?: (parentId: number, text: string) => Promise<void> | void;
  }>,
) {
  const { comments, canManage, closed, onDeleteComment, onAddReply } = props;
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  if (comments.length === 0) {
    return null;
  }
  // 마감된 고민은 서버가 한마디/답글 작성을 막는다 → 답글 UI를 숨겨 헛된 시도를 막는다.
  const replyEnabled = Boolean(onAddReply) && !closed;

  const topLevel = comments.filter((c) => c.parentId == null);
  const repliesByParent = new Map<number, PollComment[]>();
  for (const c of comments) {
    if (c.parentId != null) {
      const arr = repliesByParent.get(c.parentId) ?? [];
      arr.push(c);
      repliesByParent.set(c.parentId, arr);
    }
  }

  const submitReply = async (parentId: number) => {
    const text = replyText.trim();
    if (!text || !onAddReply) return;
    await onAddReply(parentId, text);
    setReplyText('');
    setReplyingTo(null);
  };
  return (
    <section style={{ marginTop: 16 }}>
      <h2
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: theme.text,
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}
      >
        <span aria-hidden style={{ fontSize: 18 }}>
          {MASCOT.curious.emoji}
        </span>
        친구들 한마디 {formatNumber(comments.length)}개
      </h2>
      {closed ? (
        <p
          role="note"
          style={{
            margin: '0 0 12px',
            fontSize: 13,
            color: theme.textMuted,
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          🔒 마감된 고민이에요. 한마디·답글은 더 남길 수 없어요.
        </p>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {topLevel.map((c) => (
          <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <CommentCard
              comment={c}
              canManage={canManage}
              onDelete={onDeleteComment}
              onReply={
                replyEnabled
                  ? () => {
                      setReplyingTo((prev) => (prev === c.id ? null : c.id));
                      setReplyText('');
                    }
                  : undefined
              }
            />
            {(repliesByParent.get(c.id) ?? []).map((r) => (
              <CommentCard
                key={r.id}
                comment={r}
                canManage={canManage}
                onDelete={onDeleteComment}
                isReply
              />
            ))}
            {replyEnabled && replyingTo === c.id ? (
              <div style={{ display: 'flex', gap: 8, marginLeft: 22 }}>
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void submitReply(c.id);
                  }}
                  placeholder="따뜻한 답글을 남겨요 💬"
                  maxLength={100}
                  aria-label="답글 입력"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 44,
                    padding: '10px 14px',
                    borderRadius: theme.radiusSm,
                    border: `1px solid ${theme.borderStrong}`,
                    background: theme.surface,
                    color: theme.text,
                    // iOS 16px 미만 입력은 포커스 시 화면 확대 → 줌 방지 플로어.
                    fontSize: 16,
                  }}
                />
                <button
                  type="button"
                  className="pressable"
                  onClick={() => void submitReply(c.id)}
                  style={{
                    flexShrink: 0,
                    minHeight: 44,
                    padding: '0 18px',
                    borderRadius: theme.radiusSm,
                    border: 'none',
                    background: theme.accent,
                    color: theme.accentInk,
                    fontSize: FONT.body,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  등록
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function VoteCelebration() {
  return (
    <div
      className="rise"
      style={{
        marginTop: 4,
        marginBottom: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        borderRadius: theme.radius,
        background: theme.accentSoft,
        border: `1px solid rgba(19, 194, 163, 0.28)`,
      }}
    >
      <span aria-hidden style={{ fontSize: 22 }}>
        {MASCOT.celebrate.emoji}
      </span>
      <span style={{ fontSize: 14, fontWeight: 800, color: theme.accent, lineHeight: 1.4 }}>
        {MASCOT.celebrate.line}
      </span>
    </div>
  );
}

function ConsentedProfileButton(
  props: Readonly<{ loading: boolean; notice: string | null | undefined; onClick: () => void }>,
) {
  const { loading, notice, onClick } = props;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        type="button"
        className="pressable"
        onClick={onClick}
        disabled={loading}
        aria-busy={loading}
        style={{
          alignSelf: 'flex-start',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          minHeight: 40,
          padding: '8px 14px',
          borderRadius: theme.radiusPill,
          border: `1px solid rgba(19,194,163,0.28)`,
          background: theme.accentSoft,
          color: theme.accent,
          fontSize: 13,
          fontWeight: 700,
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        <span aria-hidden>🪪</span>
        {loading ? '불러오는 중…' : '토스 프로필로 이름 채우기'}
      </button>
      {notice ? (
        <span
          role="status"
          style={{ fontSize: FONT.small, color: theme.textMuted, lineHeight: 1.4 }}
        >
          {notice}
        </span>
      ) : null}
    </div>
  );
}

function CommentDraftFields(
  props: Readonly<{
    selectedOptionId: number | null;
    voterName: string;
    setVoterName: (name: string) => void;
    comment: string;
    setComment: (comment: string) => void;
    onLoadProfile?: () => void;
    profileLoading?: boolean;
    profileNotice?: string | null;
  }>,
) {
  const {
    selectedOptionId,
    voterName,
    setVoterName,
    comment,
    setComment,
    onLoadProfile,
    profileLoading = false,
    profileNotice,
  } = props;
  return (
    <div
      className="disclosure-enter"
      style={{
        maxHeight: selectedOptionId === null ? 0 : 340,
        opacity: selectedOptionId === null ? 0 : 1,
        overflow: 'hidden',
        marginTop: selectedOptionId === null ? 0 : 24,
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
      {onLoadProfile ? (
        <ConsentedProfileButton
          loading={profileLoading}
          notice={profileNotice}
          onClick={onLoadProfile}
        />
      ) : null}
      <input
        style={inputStyle}
        value={comment}
        maxLength={100}
        placeholder="재미있는 한마디도 같이 남겨요 (선택)"
        aria-label="의견"
        onChange={(e) => setComment(e.target.value)}
      />
    </div>
  );
}

function ShareSection(
  props: Readonly<{
    shareUrl: string;
    showResults: boolean;
    onShare: () => void;
    onCopy: () => void;
    onCopyResult?: () => void;
  }>,
) {
  const { shareUrl, showResults, onShare, onCopy, onCopyResult } = props;
  return (
    <div
      style={{
        marginTop: 16,
        padding: 18,
        background: theme.surface,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: theme.radius,
        border: `1px solid ${theme.border}`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <span
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: theme.text,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}
      >
        <span aria-hidden style={{ fontSize: 18 }}>
          {MASCOT.idle.emoji}
        </span>
        {VOICE.sharePrompt}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="pressable"
          onClick={onShare}
          style={{
            flex: 1,
            minHeight: 48,
            borderRadius: 14,
            background: theme.accent,
            color: theme.accentInk,
            fontWeight: 800,
            fontSize: 15,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          🔗 친구에게 물어보기
        </button>
        <button
          type="button"
          className="pressable"
          onClick={onCopy}
          style={{
            flex: 1,
            minHeight: 48,
            borderRadius: 14,
            background: 'rgba(255, 255, 255, 0.06)',
            color: theme.text,
            fontWeight: 800,
            fontSize: 15,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          링크 복사 📋
        </button>
      </div>
      {showResults && onCopyResult && (
        <button
          type="button"
          className="pressable"
          onClick={onCopyResult}
          style={{
            width: '100%',
            minHeight: 44,
            borderRadius: 14,
            background: 'transparent',
            color: theme.accent,
            fontWeight: 700,
            fontSize: 14,
            border: `1.5px solid ${theme.accentSoft}`,
            cursor: 'pointer',
          }}
        >
          📊 결과 글자로 복사하기
        </button>
      )}

      {/* QR 태그 포함 완전 통합 공유 영역 — 직관적으로 스캔/복사 강조 */}
      <div style={{ marginTop: 6 }}>
        <div
          style={{
            fontSize: 13,
            color: theme.textMuted,
            marginBottom: 6,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          {VOICE.scanHint}
        </div>
        {shareUrl ? <PollShareQrSection shareUrl={shareUrl} onCopyLink={onCopy} /> : null}
      </div>
    </div>
  );
}

function VoteActionBar(
  props: Readonly<{
    isLoading: boolean;
    selectedOptionId: number | null;
    onVote: () => void;
  }>,
) {
  const { isLoading, selectedOptionId, onVote } = props;
  return (
    <div style={stickyActionBar}>
      <div style={{ maxWidth: 520, margin: '0 auto', pointerEvents: 'auto' }}>
        <Button
          style={{
            width: '100%',
            borderRadius: 16,
            boxShadow: '0 8px 24px rgba(19, 194, 163, 0.25)',
          }}
          loading={isLoading}
          disabled={selectedOptionId == null}
          onClick={onVote}
        >
          {selectedOptionId == null ? '마음 가는 거 골라보세요 👇' : '투표 완료하기! 🗳️'}
        </Button>
      </div>
    </div>
  );
}

function DeleteAction(props: Readonly<{ confirmDelete: boolean; onDelete: () => void }>) {
  const { confirmDelete, onDelete } = props;
  return (
    <button
      type="button"
      className="pressable"
      onClick={onDelete}
      style={{
        minHeight: 44,
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
      {confirmDelete ? VOICE.deleteConfirm : '지우기 🗑'}
    </button>
  );
}

function EditAction(props: Readonly<{ onEdit: () => void }>) {
  const { onEdit } = props;
  return (
    <button
      type="button"
      className="pressable"
      aria-label="고민 수정하기"
      onClick={onEdit}
      style={{
        minHeight: 44,
        background: 'none',
        border: 'none',
        color: theme.textFaint ?? theme.textMuted,
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        padding: '8px 10px',
        borderRadius: theme.radiusSm,
        transition: 'all 0.2s ease',
      }}
    >
      수정 ✏️
    </button>
  );
}

function HeaderActions(
  props: Readonly<{
    canManage: boolean;
    confirmDelete: boolean;
    onDelete: () => void;
    onEdit?: () => void;
  }>,
) {
  const { canManage, confirmDelete, onDelete, onEdit } = props;
  if (!canManage) {
    return null;
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {onEdit ? <EditAction onEdit={onEdit} /> : null}
      <DeleteAction confirmDelete={confirmDelete} onDelete={onDelete} />
    </div>
  );
}

function DetailHeader(
  props: Readonly<{
    closed: boolean;
    remaining: number | null;
    canManage: boolean;
    confirmDelete: boolean;
    onDelete: () => void;
    onEdit?: () => void;
    onBack: () => void;
  }>,
) {
  const { closed, remaining, canManage, confirmDelete, onDelete, onEdit, onBack } = props;
  return (
    <AppBar
      onBack={onBack}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Chip tone={closed ? 'muted' : 'accent'}>{closed ? '마감됨 ⏰' : '투표중 🔥'}</Chip>
          {closed ? null : <CountdownChip remaining={remaining} />}
        </div>
      }
      right={
        <HeaderActions
          canManage={canManage}
          confirmDelete={confirmDelete}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      }
    />
  );
}

function PollHero(
  props: Readonly<{
    question: string;
    description: string | null | undefined;
    totalVotes: number;
    leader: PollOption | null;
    creatorNickname: string | null | undefined;
    creatorId: string | null | undefined;
    creatorIsGuest: boolean | undefined;
  }>,
) {
  const { question, description, totalVotes, leader, creatorNickname, creatorId, creatorIsGuest } =
    props;
  // 작성자 라벨은 web/toss 공통 resolveCreatorLabel(@picky/shared)로 단일화.
  const authorLabel = resolveCreatorLabel(creatorNickname, creatorId, creatorIsGuest);
  return (
    <>
      {/* Hero main issue question - stands out first like NatePan main post for eye-catch on mobile */}
      <h1
        style={{
          fontSize: 26,
          lineHeight: 1.35,
          margin: '8px 0 12px',
          fontWeight: 900,
          color: theme.text,
          letterSpacing: '-0.3px',
        }}
      >
        {question}
      </h1>
      {/* 작성자 — 닉네임이 있으면 닉네임, 없으면 비회원/회원/익명 라벨(회원이 '익명'으로 표기되는 모순 제거). */}
      <p style={{ margin: '0 0 8px', fontSize: 13, color: theme.textMuted, fontWeight: 600 }}>
        작성자 <span style={{ color: theme.text, fontWeight: 800 }}>{authorLabel}</span>
      </p>
      {description ? (
        <p
          style={{
            color: theme.textMuted,
            fontSize: 13,
            lineHeight: 1.5,
            margin: '0 0 8px',
            // compact: limit height to reduce top text dominance
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {description}
        </p>
      ) : null}
      {/* Compact single-line meta (stats + leader) to save space vs voting content */}
      <div
        style={{
          color: theme.textMuted,
          fontSize: 13,
          marginBottom: 14,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          fontWeight: 600,
        }}
      >
        <span>🗳️ {formatNumber(totalVotes)}명 참여</span>
        {leader ? (
          <span>
            👑 {leader.text} ({optionPercent(leader.voteCount, totalVotes)}%)
          </span>
        ) : null}
      </div>
    </>
  );
}

export function PollDetailView(props: Readonly<PollDetailViewProps>) {
  const {
    poll,
    isLoading,
    closed,
    showResults,
    hasVoted,
    votedOptionId,
    selectedOptionId,
    onSelect,
    onVote,
    voterName,
    setVoterName,
    comment,
    setComment,
    onLoadProfile,
    profileLoading,
    profileNotice,
    leader,
    displayOptions,
    winnerId,
    isOwner,
    canManage: canManageProp,
    confirmDelete,
    onDelete,
    onEdit,
    onDeleteComment,
    onAddReply,
    remaining,
    shareUrl,
    onShare,
    onCopy,
    onCopyResult,
    onBack,
    totalVotes,
    comments,
  } = props;

  // 신규 canManage(소유자|어드민)가 없으면 기존 isOwner로 폴백해 호환을 지켜요.
  const canManage = canManageProp ?? isOwner;

  if (!poll) {
    return <PollEmptyState />;
  }

  // 하단 고정 액션바가 떠 있을 때(미투표·진행중)만 그 높이만큼 바닥 여백을 확보해
  // QR·링크복사·결과복사 같은 마지막 콘텐츠가 바에 가려지지 않게 해요.
  const actionBarVisible = !hasVoted && !closed;
  const bottomPadding = actionBarVisible
    ? 'calc(96px + env(safe-area-inset-bottom))'
    : 'calc(32px + env(safe-area-inset-bottom))';

  return (
    <div style={{ minHeight: '100dvh' }}>
      <DetailHeader
        closed={closed}
        remaining={remaining}
        canManage={canManage}
        confirmDelete={confirmDelete}
        onDelete={onDelete}
        onEdit={onEdit}
        onBack={onBack}
      />

      <div style={{ maxWidth: 520, margin: '0 auto', padding: `0 20px ${bottomPadding}` }}>
        <PollHero
          question={poll.question}
          description={poll.description}
          totalVotes={totalVotes}
          leader={leader}
          creatorNickname={poll.creatorNickname}
          creatorId={poll.creatorId}
          creatorIsGuest={poll.creatorIsGuest}
        />

        {hasVoted && !closed ? <VoteCelebration /> : null}

        {/* 결과를 열 수 있어도 0표/선택지 1개면 선두·합의 같은 지표가 거짓이 되므로 중립 '참여 대기'로 모은다(R1). */}
        {showResults ? (
          totalVotes === 0 || displayOptions.length < 2 ? (
            <ResultPendingNotice />
          ) : (
            <ResultDonutSection options={displayOptions} totalVotes={totalVotes} closed={closed} />
          )
        ) : null}

        <OptionList
          displayOptions={displayOptions}
          totalVotes={totalVotes}
          selectedOptionId={selectedOptionId}
          votedOptionId={votedOptionId}
          winnerId={winnerId}
          showResults={showResults}
          disabled={hasVoted || closed}
          onSelect={onSelect}
        />

        {showResults ? (
          <SocialComparisonBadge
            options={displayOptions}
            votedOptionId={votedOptionId}
            totalVotes={totalVotes}
          />
        ) : null}

        {!hasVoted && !closed && (
          <CommentDraftFields
            selectedOptionId={selectedOptionId}
            voterName={voterName}
            setVoterName={setVoterName}
            comment={comment}
            setComment={setComment}
            onLoadProfile={onLoadProfile}
            profileLoading={profileLoading}
            profileNotice={profileNotice}
          />
        )}

        <CommentsSection
          comments={comments}
          canManage={canManage}
          closed={closed}
          onDeleteComment={onDeleteComment}
          onAddReply={onAddReply}
        />

        <ShareSection
          shareUrl={shareUrl}
          showResults={showResults}
          onShare={onShare}
          onCopy={onCopy}
          onCopyResult={onCopyResult}
        />
      </div>

      {!hasVoted && !closed && (
        <VoteActionBar isLoading={isLoading} selectedOptionId={selectedOptionId} onVote={onVote} />
      )}
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
  padding: '13px 14px',
  // iOS는 16px 미만 입력 포커스 시 화면을 강제 확대해요 → 16px 플로어로 줌 방지.
  fontSize: 16,
  minHeight: 48,
  outline: 'none',
  transition: 'border-color 0.2s ease',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
};
