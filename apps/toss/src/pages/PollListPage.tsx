import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Top } from '@toss/tds-mobile';
import type { Poll } from '../shared';
import { MASCOT, BETA_NOTICE } from '../shared';
import { usePollStore } from '../store/usePollStore';
import { useAuthStore } from '../store/useAuthStore';
import { theme, pageShell, stickyActionBar } from '../theme';
import { formatNumber, formatRelativeTime } from '../lib/format';
import { isPollClosed, leadingOption, optionPercent } from '../lib/poll';
import { hasVotedLocally } from '../lib/votes';
import { hapticFeedback } from '../lib/toss';
import { getRecentPollHistory, type RecentPollHistoryItem } from '../lib/pollHistory';
import { countPollsBySignal, filterPollsBySignal, type PollSignal } from '../lib/pollSignal';
import { Chip, ProgressBar, SegmentedControl, Skeleton } from '../components/ui';
import { BannerAd } from '../components/BannerAd';
import { useCountdown } from '../components/Countdown';
import { triggerParticleBurst } from '../lib/particles';

type StatusFilter = 'all' | 'open' | 'closed';
type SortKey = 'recent' | 'popular' | 'closing';

const FILTER_OPTIONS = [
  { value: 'all', label: '전체 🥑' },
  { value: 'open', label: '진행중 🔥' },
  { value: 'closed', label: '마감 ⏰' },
] as const satisfies ReadonlyArray<{ value: StatusFilter; label: string }>;

const SORT_OPTIONS = [
  { value: 'recent', label: '최신순 ⚡️' },
  { value: 'popular', label: '인기순 🌟' },
  { value: 'closing', label: '마감임박 ⌛️' },
] as const satisfies ReadonlyArray<{ value: SortKey; label: string }>;

// 발견성 signal 칩 — 서버 쿼리와 무관한 클라 파생 필터(현재 페이지에 적용). 핵심 5종으로 한정.
const SIGNAL_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'closeRace', label: '접전 ⚔️' },
  { value: 'fresh', label: '신규 ✨' },
  { value: 'closingSoon', label: '마감임박 ⌛️' },
  { value: 'feedbackRich', label: '한마디 많은 💬' },
] as const satisfies ReadonlyArray<{ value: PollSignal; label: string }>;

function SignalChips(
  props: Readonly<{
    polls: Poll[];
    signal: PollSignal;
    onChange: (value: PollSignal) => void;
  }>,
) {
  const { polls, signal, onChange } = props;
  return (
    <div
      role="group"
      aria-label="발견성 필터"
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        margin: '0 -20px 18px',
        padding: '0 20px 4px',
        scrollbarWidth: 'none',
      }}
    >
      {SIGNAL_OPTIONS.map((option) => {
        const active = option.value === signal;
        const count = countPollsBySignal(polls, option.value);
        // 'all'이 아닌데 0건이면 비활성(혼란 방지). 현재 선택 중이면 비활성화하지 않음.
        const disabled = option.value !== 'all' && count === 0 && !active;
        return (
          <button
            key={option.value}
            type="button"
            className="pressable"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            style={{
              flexShrink: 0,
              minHeight: 40,
              padding: '8px 14px',
              borderRadius: theme.radiusPill,
              border: `1px solid ${active ? theme.accent : theme.border}`,
              background: active ? theme.accentSoft : 'rgba(255,255,255,0.04)',
              color: active ? theme.accent : theme.textMuted,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.45 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {option.label}
            {option.value === 'all' ? null : (
              <span style={{ marginLeft: 6, color: theme.textFaint, fontWeight: 600 }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function PollCard({
  poll,
  index,
  onClick,
}: Readonly<{ poll: Poll; index: number; onClick: () => void }>) {
  const leading = leadingOption(poll);
  const remaining = useCountdown(poll.endsAt);
  const closed = isPollClosed(poll) || (remaining != null && remaining <= 0);
  const voted = hasVotedLocally(poll.id);
  const percent = leading ? optionPercent(leading.voteCount, poll.totalVotes) : 0;
  const repImage = poll.options.find((option) => option.imageUrl)?.imageUrl ?? null;

  const metaText = useMemo(() => {
    const parts = [];
    if (closed) {
      parts.push('투표 마감됨');
    } else if (remaining != null) {
      const hours = Math.floor(remaining / 3600000);
      const mins = Math.floor((remaining % 3600000) / 60000);
      if (hours > 0) {
        parts.push(`${hours}시간 ${mins}분 남음`);
      } else if (mins > 0) {
        parts.push(`${mins}분 남음`);
      } else {
        parts.push('곧 마감!');
      }
    }
    parts.push(formatRelativeTime(poll.createdAt));
    return parts.join(' · ');
  }, [closed, remaining, poll.createdAt]);

  return (
    <button
      type="button"
      className="pressable rise-stagger"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: theme.surface,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: theme.radius,
        padding: '24px 20px',
        marginBottom: 14,
        color: theme.text,
        border: `1px solid ${theme.border}`,
        cursor: 'pointer',
        animationDelay: `${Math.min(index, 8) * 75}ms`, // 젤리팝 팅-팅-팅 타이밍을 더 명확하게 조절
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
          fontSize: 13,
          color: theme.textMuted,
        }}
      >
        {voted && (
          <span
            style={{
              color: theme.gold,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            ✓ 참여 완료! 🌟
          </span>
        )}
        {voted && <span>·</span>}
        <span style={{ color: closed ? theme.textFaint : theme.accent, fontWeight: 600 }}>
          {closed ? '마감됨' : '진행중'}
        </span>
        <span>·</span>
        <span>{metaText}</span>
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: 18, lineHeight: 1.4, display: 'block', fontWeight: 800 }}>
            {poll.question}
          </strong>
          {poll.description ? (
            <p
              style={{
                margin: '6px 0 0',
                fontSize: 13,
                color: theme.textMuted,
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {poll.description}
            </p>
          ) : null}
        </div>
        {repImage ? (
          <img
            src={repImage}
            alt=""
            loading="lazy"
            style={{
              flexShrink: 0,
              width: 58,
              height: 58,
              objectFit: 'cover',
              borderRadius: theme.radiusSm,
              border: `1px solid rgba(255,255,255,0.06)`,
            }}
          />
        ) : null}
      </div>

      {leading ? (
        <div
          style={{
            marginTop: 14,
            background: 'rgba(255,255,255,0.03)',
            padding: '12px 14px',
            borderRadius: 14,
            border: `1px solid rgba(255,255,255,0.02)`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 12 }}>
            <span
              style={{
                color: theme.textMuted,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 600,
              }}
            >
              📊 {leading.text}
            </span>
            <span style={{ color: theme.accent, fontWeight: 800, flexShrink: 0 }}>{percent}%</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <ProgressBar percent={percent} height={10} />
          </div>
        </div>
      ) : null}

      <div
        style={{
          marginTop: 14,
          fontSize: 13,
          color: theme.textMuted,
          fontWeight: 600,
          lineHeight: 1.3,
          display: 'flex',
          gap: 6,
          alignItems: 'center',
        }}
      >
        <span>🗳️ {formatNumber(poll.totalVotes)}명이 고민을 나누는 중</span>
        <span>·</span>
        <span>💬 한마디 {poll.comments.length}개</span>
      </div>
    </button>
  );
}

function RecentStrip({
  items,
  onSelect,
}: Readonly<{
  items: RecentPollHistoryItem[];
  onSelect: (id: string) => void;
}>) {
  if (items.length === 0) {
    return null;
  }
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: theme.textMuted, margin: '0 0 12px' }}>
        최근 둘러본 고민 🧐
      </h2>
      <div
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 4,
          margin: '0 -20px',
          padding: '0 20px 4px',
          scrollbarWidth: 'none',
        }}
      >
        {items.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            className="pressable"
            onClick={() => onSelect(item.id)}
            style={{
              flexShrink: 0,
              width: 176,
              textAlign: 'left',
              background: theme.surface,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: theme.radiusSm,
              padding: 14,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)',
              cursor: 'pointer',
              animation: 'pf-jelly-pop 0.6s cubic-bezier(0.34, 1.76, 0.64, 1) both',
              animationDelay: `${idx * 60}ms`,
            }}
          >
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {item.hasVoted ? <Chip tone="gold">참여완료</Chip> : <Chip tone="muted">들러봄</Chip>}
            </div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                lineHeight: 1.45,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                height: '2.9em',
              }}
            >
              {item.question}
            </span>
            <div style={{ marginTop: 8, fontSize: 13, color: theme.textMuted, fontWeight: 500 }}>
              🗳️ {formatNumber(item.totalVotes)} · 💬 {item.commentCount}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function HotPollLeading(props: Readonly<{ poll: Poll }>) {
  const { poll } = props;
  const leadingOpt = leadingOption(poll);
  if (!leadingOpt) return null;
  const pct = optionPercent(leadingOpt.voteCount, poll.totalVotes);
  return (
    <div
      style={{
        marginTop: 16,
        background: 'rgba(255,255,255,0.03)',
        padding: '12px 14px',
        borderRadius: 14,
        border: `1px solid rgba(255,255,255,0.02)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 13,
          gap: 12,
        }}
      >
        <span style={{ color: theme.textMuted, fontWeight: 600 }}>📊 1위: {leadingOpt.text}</span>
        <span style={{ color: theme.accent, fontWeight: 800 }}>{pct}%</span>
      </div>
      <div style={{ marginTop: 8 }}>
        <ProgressBar percent={pct} height={10} />
      </div>
    </div>
  );
}

function HotPollBanner(props: Readonly<{ poll: Poll; onClick: () => void }>) {
  const { poll, onClick } = props;
  return (
    <button
      type="button"
      className="pressable"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'linear-gradient(135deg, #123249 0%, #0e2b28 100%)',
        borderRadius: theme.radius,
        padding: '24px 20px',
        marginBottom: 20,
        color: theme.text,
        border: `1.5px solid rgba(49, 130, 246, 0.35)`,
        cursor: 'pointer',
        boxShadow: '0 8px 32px rgba(49, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
          fontSize: 13,
        }}
      >
        <span
          style={{
            background: theme.accent,
            color: theme.accentInk,
            padding: '4px 10px',
            borderRadius: '999px',
            fontWeight: 800,
            fontSize: 12.5,
          }}
        >
          실시간 인기 고민 🔥
        </span>
        <span style={{ color: theme.textMuted, fontWeight: 600 }}>
          🗳️ {formatNumber(poll.totalVotes)}명 참여 중
        </span>
      </div>

      <strong
        style={{
          fontSize: 19,
          lineHeight: 1.4,
          display: 'block',
          fontWeight: 800,
          color: theme.text,
        }}
      >
        {poll.question}
      </strong>

      {poll.description && (
        <p
          style={{
            margin: '8px 0 0',
            fontSize: 13,
            color: theme.textMuted,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.45,
          }}
        >
          {poll.description}
        </p>
      )}

      <HotPollLeading poll={poll} />
    </button>
  );
}

function SearchBar(props: Readonly<{ query: string; onChange: (value: string) => void }>) {
  const { query, onChange } = props;
  return (
    <div style={{ position: 'relative', marginBottom: 18 }}>
      <input
        type="search"
        value={query}
        onChange={(event) => onChange(event.target.value)}
        placeholder="어떤 고민이 있으신가요? 🔍"
        aria-label="고민 검색"
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${theme.border}`,
          borderRadius: theme.radiusSm,
          color: theme.text,
          padding: '13px 14px 13px 38px',
          paddingRight: query ? 38 : 14,
          // iOS 줌 방지를 위한 16px 폰트 플로어.
          fontSize: 16,
          minHeight: 48,
          outline: 'none',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 14,
          opacity: 0.6,
        }}
      >
        🔍
      </span>
      {query ? (
        <button
          type="button"
          aria-label="검색어 지우기"
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: 4,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 40,
            height: 40,
            display: 'grid',
            placeItems: 'center',
            background: 'none',
            border: 'none',
            fontSize: 16,
            color: theme.textFaint,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}

function LoadingState() {
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          color: theme.textMuted,
          fontSize: 13.5,
          fontWeight: 600,
        }}
      >
        <span aria-hidden style={{ fontSize: 20 }}>
          {MASCOT.thinking.emoji}
        </span>
        <span>{MASCOT.thinking.line}</span>
      </div>
      <ListSkeleton />
    </>
  );
}

function ErrorState(props: Readonly<{ error: string; onRetry: () => void }>) {
  const { error, onRetry } = props;
  return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: theme.danger }}>
      <p style={{ fontSize: 14 }}>{error}</p>
      <Button style={{ marginTop: 12 }} variant="weak" onClick={onRetry}>
        다시 시도하기 🔄
      </Button>
    </div>
  );
}

function NoMatchState() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: theme.textMuted }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>{MASCOT.curious.emoji}</div>
      <p style={{ fontSize: 15.5, color: theme.text, fontWeight: 700 }}>
        앗, 조건에 맞는 고민을 찾지 못했어요 😢
      </p>
      <p style={{ fontSize: 13.5, marginTop: 4, lineHeight: 1.5 }}>
        다른 검색어를 입력하거나 필터를 바꿔 볼까요?
      </p>
    </div>
  );
}

function EmptyState(props: Readonly<{ onCreate: () => void }>) {
  const { onCreate } = props;
  return (
    <div style={{ textAlign: 'center', padding: '56px 0', color: theme.textMuted }}>
      <div className="rise" style={{ fontSize: 56, marginBottom: 14 }}>
        {MASCOT.empty.emoji}
      </div>
      <p style={{ fontSize: 16.5, color: theme.text, fontWeight: 800, lineHeight: 1.45 }}>
        {MASCOT.empty.line}
      </p>
      <p style={{ fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>
        가장 먼저 재미있는 고민 투표를 만들어 볼까요? 🚀
      </p>
      <Button style={{ marginTop: 18, borderRadius: 16 }} onClick={onCreate}>
        첫 고민 만들기 ✍️
      </Button>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden>
      {[0, 1, 2, 3].map((key) => (
        <div
          key={key}
          style={{
            background: theme.surface,
            borderRadius: theme.radius,
            padding: 20,
            marginBottom: 12,
            border: `1px solid ${theme.border}`,
          }}
        >
          <Skeleton width={72} height={20} radius={999} />
          <Skeleton height={18} radius={6} style={{ marginTop: 12 }} />
          <Skeleton width="60%" height={14} radius={6} style={{ marginTop: 8 }} />
          <Skeleton height={8} radius={999} style={{ marginTop: 16 }} />
        </div>
      ))}
    </div>
  );
}

function ListHeader(props: Readonly<{ onTitleTap: (x: number, y: number) => void }>) {
  const { onTitleTap } = props;
  return (
    <div style={{ position: 'relative' }}>
      <Top
        title={
          <button
            type="button"
            onClick={(e) => onTitleTap(e.clientX, e.clientY)}
            // 마우스 클릭 시 포커스 링이 생기지 않게(키보드 포커스는 유지 — a11y).
            onMouseDown={(e) => e.preventDefault()}
            style={{
              display: 'inline-flex',
              cursor: 'pointer',
              userSelect: 'none',
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'inherit',
              font: 'inherit',
              textAlign: 'left',
            }}
          >
            <Top.TitleParagraph
              size={22}
              style={{
                fontWeight: 800,
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <span>피키 🥑</span>
              <span
                className="sparkle-icon"
                style={{ top: -6, left: -14, fontSize: 16, animationDelay: '0.1s' }}
              >
                ✦
              </span>
              <span
                className="sparkle-icon"
                style={{
                  top: -14,
                  right: 12,
                  fontSize: 13,
                  animationDelay: '0.6s',
                  color: theme.gold,
                }}
              >
                ✨
              </span>
              <span
                className="sparkle-icon"
                style={{ bottom: -4, right: -12, fontSize: 14, animationDelay: '1.2s' }}
              >
                ✦
              </span>
            </Top.TitleParagraph>
          </button>
        }
        subtitleBottom={
          <>
            <Top.SubtitleParagraph size={15}>
              QR 태그로 친구들과 바로 고민 투표 ⚡️
            </Top.SubtitleParagraph>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 7,
                padding: '4px 10px',
                borderRadius: theme.radiusPill,
                background: theme.accentSoft,
                color: theme.accentStrong,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              🧪 {BETA_NOTICE}
            </span>
          </>
        }
      />
    </div>
  );
}

function ListStats(props: Readonly<{ pollCount: number; totalVotes: number }>) {
  const { pollCount, totalVotes } = props;
  if (pollCount === 0) {
    return null;
  }
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        marginBottom: 14,
        fontSize: 14,
        fontWeight: 500,
        color: theme.textMuted,
      }}
    >
      <span>
        고민 <strong style={{ color: theme.text }}>{formatNumber(pollCount)}</strong>개
      </span>
      <span>
        참여 <strong style={{ color: theme.text }}>{formatNumber(totalVotes)}</strong>명
      </span>
    </div>
  );
}

function ListFilters(
  props: Readonly<{
    statusFilter: StatusFilter;
    sortKey: SortKey;
    myOnly: boolean;
    myPollCount: number;
    onStatusChange: (value: StatusFilter) => void;
    onSortChange: (value: SortKey) => void;
    onToggleMyOnly: () => void;
  }>,
) {
  const {
    statusFilter,
    sortKey,
    myOnly,
    myPollCount,
    onStatusChange,
    onSortChange,
    onToggleMyOnly,
  } = props;
  return (
    <>
      {/* 직관적 필터: 상태 + 정렬을 SegmentedControl로 통일해 한눈에 선택 가능하게 (드롭다운 제거로 단순화) */}
      <div style={{ marginBottom: 12 }}>
        <SegmentedControl
          ariaLabel="상태 필터"
          options={FILTER_OPTIONS}
          value={statusFilter}
          onChange={onStatusChange}
        />
      </div>
      <div style={{ marginBottom: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <SegmentedControl
            ariaLabel="정렬 방식"
            options={SORT_OPTIONS}
            value={sortKey}
            onChange={onSortChange}
          />
        </div>
        {myPollCount > 0 && (
          <button
            type="button"
            className="pressable"
            onClick={onToggleMyOnly}
            aria-pressed={myOnly}
            style={{
              minHeight: 44,
              padding: '8px 16px',
              borderRadius: 14,
              background: myOnly ? theme.accentSoft : 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              color: myOnly ? theme.accent : theme.textMuted,
              fontSize: 13.5,
              fontWeight: 700,
              border: `1px solid ${myOnly ? theme.accent : theme.border}`,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
            }}
          >
            내 고민 🙋
          </button>
        )}
      </div>
    </>
  );
}

function ListBody(
  props: Readonly<{
    polls: Poll[];
    visiblePolls: Poll[];
    isInitialLoading: boolean;
    error: string | null;
    onRetry: () => void;
    onCreate: () => void;
    onSelect: (id: string) => void;
  }>,
) {
  const { polls, visiblePolls, isInitialLoading, error, onRetry, onCreate, onSelect } = props;
  const showNoMatch = !isInitialLoading && polls.length > 0 && visiblePolls.length === 0;
  const showEmpty = !isInitialLoading && polls.length === 0 && !error;
  const showError = Boolean(error) && polls.length === 0 && !isInitialLoading;
  return (
    <>
      {isInitialLoading ? <LoadingState /> : null}
      {showError ? <ErrorState error={error ?? ''} onRetry={onRetry} /> : null}
      {showNoMatch ? <NoMatchState /> : null}
      {showEmpty ? <EmptyState onCreate={onCreate} /> : null}
      {visiblePolls.map((poll, index) => (
        <Fragment key={poll.id}>
          <PollCard poll={poll} index={index} onClick={() => onSelect(poll.id)} />
          {/* 첫 화면 아래(3번째 카드 뒤)에 인앱 배너 광고 — 정책상 진입 직후 전면 광고 금지 */}
          {index === 2 ? <BannerAd /> : null}
        </Fragment>
      ))}
    </>
  );
}

// 현재 페이지 주변 ±2 번호 윈도우.
function buildTossPageWindow(current: number, totalPages: number): number[] {
  const windowSize = 5;
  let start = Math.max(1, current - 2);
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages: number[] = [];
  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }
  return pages;
}

function ListPagination(
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
  if (totalPages <= 1 && !hasMore) {
    return null;
  }

  const pageNumbers = buildTossPageWindow(page, totalPages);
  const canPrev = page > 1;
  const canNext = hasMore || page < totalPages;

  const pillStyle = (active: boolean, disabled: boolean): React.CSSProperties => ({
    minWidth: 40,
    padding: '8px 12px',
    borderRadius: theme.radiusPill,
    border: `1px solid ${active ? theme.accent : theme.border}`,
    background: active ? theme.accentSoft : 'transparent',
    color: active ? theme.accentStrong : theme.textMuted,
    fontSize: 13,
    fontWeight: active ? 800 : 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
  });

  return (
    <nav
      aria-label="고민 목록 페이지"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 18,
      }}
    >
      <button
        type="button"
        onClick={() => onGoToPage(page - 1)}
        disabled={!canPrev || isLoading}
        aria-label="이전 페이지"
        style={pillStyle(false, !canPrev || isLoading)}
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
            style={pillStyle(isCurrent, isLoading)}
          >
            {pageNumber}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onGoToPage(page + 1)}
        disabled={!canNext || isLoading}
        aria-label="다음 페이지"
        style={pillStyle(false, !canNext || isLoading)}
      >
        다음
      </button>

      <span
        aria-live="polite"
        style={{
          width: '100%',
          textAlign: 'center',
          marginTop: 6,
          fontSize: 12,
          color: theme.textFaint,
        }}
      >
        {page} / {totalPages} 페이지 · 총 {formatNumber(total)}개
      </span>
    </nav>
  );
}

export function PollListPage() {
  const navigate = useNavigate();
  const { polls, isLoading, error, fetchPolls, page, limit, total, hasMore, goToPage } =
    usePollStore();
  const myId = useAuthStore((state) => state.user?.id ?? null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [myOnly, setMyOnly] = useState(false);
  // 발견성 signal — 서버 쿼리와 무관한 클라 파생 필터(현재 페이지에만 적용).
  const [signal, setSignal] = useState<PollSignal>('all');
  const [recent, setRecent] = useState<RecentPollHistoryItem[]>([]);

  const myPollCount = useMemo(
    () => (myId ? polls.filter((poll) => poll.creatorId === myId).length : 0),
    [polls, myId],
  );

  useEffect(() => {
    setRecent(getRecentPollHistory());
  }, []);

  // 검색(q)·상태(status)·정렬(sort)을 서버측으로 보낸다(#W2). recent→latest 매핑.
  // myOnly(내 글만)는 식별 기반이라 결과에 대한 클라 보조필터로 남긴다.
  const serverFilters = useMemo(
    () => ({
      q: query.trim(),
      sort: sortKey === 'recent' ? ('latest' as const) : sortKey,
      status: statusFilter,
      category: null,
    }),
    [query, sortKey, statusFilter],
  );

  // 검색/상태/정렬 변경 시 1페이지부터 서버 질의를 다시 보낸다(필터를 함께 전달).
  useEffect(() => {
    fetchPolls(1, serverFilters).catch(() => {});
  }, [fetchPolls, serverFilters]);

  const totalVotes = useMemo(() => polls.reduce((sum, poll) => sum + poll.totalVotes, 0), [polls]);

  const hotPoll = useMemo(() => {
    const activePolls = polls.filter((p) => !isPollClosed(p));
    if (activePolls.length === 0) return null;
    return activePolls.reduce((prev, current) => {
      const prevScore = prev.totalVotes + prev.comments.length * 3;
      const currentScore = current.totalVotes + current.comments.length * 3;
      return currentScore > prevScore ? current : prev;
    });
  }, [polls]);

  // 서버 쿼리(q/sort/status) 적용 후 현재 페이지에 보조필터(myOnly=내 글만)만 덧입힌 기준 목록.
  // signal 칩 카운트도 이 목록을 기준으로 세서, 화면에 보이는 모수와 일치하게 한다.
  const scopedPolls = useMemo(() => {
    if (!myOnly) {
      return polls;
    }
    return polls.filter((poll) => myId != null && poll.creatorId === myId);
  }, [polls, myOnly, myId]);

  const visiblePolls = useMemo(
    // signal은 서버에 없는 클라 파생 필터라 마지막에 현재 페이지(scopedPolls)에 적용한다(#W2).
    () => filterPollsBySignal(scopedPolls, signal),
    [scopedPolls, signal],
  );

  const goToPoll = (id: string) => {
    hapticFeedback('tickWeak');
    navigate(`/poll/${id}`);
  };

  const isInitialLoading = isLoading && polls.length === 0;
  const isDefaultView = !query.trim() && statusFilter === 'all' && !myOnly;
  const showRecent = recent.length > 0 && isDefaultView;
  const featuredHotPoll = isDefaultView ? hotPoll : null;
  const goToCreate = () => {
    hapticFeedback('tap');
    navigate('/create');
  };
  const onTitleTap = (x: number, y: number) => {
    hapticFeedback('success');
    triggerParticleBurst(x, y, { count: 20 });
  };
  const toggleMyOnly = () => setMyOnly((prev) => !prev);
  const retryFetch = () => fetchPolls().catch(() => {});

  return (
    <div style={{ minHeight: '100dvh' }}>
      <ListHeader onTitleTap={onTitleTap} />

      <div style={pageShell}>
        <ListStats pollCount={polls.length} totalVotes={totalVotes} />

        {featuredHotPoll ? (
          <HotPollBanner poll={featuredHotPoll} onClick={() => goToPoll(featuredHotPoll.id)} />
        ) : null}

        <SearchBar query={query} onChange={setQuery} />

        <ListFilters
          statusFilter={statusFilter}
          sortKey={sortKey}
          myOnly={myOnly}
          myPollCount={myPollCount}
          onStatusChange={setStatusFilter}
          onSortChange={setSortKey}
          onToggleMyOnly={toggleMyOnly}
        />

        {scopedPolls.length > 0 ? (
          <SignalChips polls={scopedPolls} signal={signal} onChange={setSignal} />
        ) : null}

        {showRecent ? <RecentStrip items={recent} onSelect={goToPoll} /> : null}

        <ListBody
          polls={polls}
          visiblePolls={visiblePolls}
          isInitialLoading={isInitialLoading}
          error={error}
          onRetry={retryFetch}
          onCreate={goToCreate}
          onSelect={goToPoll}
        />

        <ListPagination
          page={page}
          limit={limit}
          total={total}
          hasMore={hasMore}
          isLoading={isLoading}
          onGoToPage={(nextPage) => {
            hapticFeedback('tickWeak');
            void goToPage(nextPage);
            globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
          }}
        />

        <button
          type="button"
          onClick={() => navigate('/support')}
          style={{
            margin: '18px auto 0',
            display: 'block',
            background: 'none',
            border: 'none',
            color: theme.textMuted,
            fontSize: 13,
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          고객센터 · 문의하기
        </button>
      </div>

      <div style={stickyActionBar}>
        <div style={{ maxWidth: 520, margin: '0 auto', pointerEvents: 'auto' }}>
          <Button
            style={{
              width: '100%',
              borderRadius: 16,
              boxShadow: '0 8px 24px rgba(19, 194, 163, 0.25)',
            }}
            onClick={goToCreate}
          >
            새 고민 작성하기 ✍️
          </Button>
        </div>
      </div>
    </div>
  );
}
