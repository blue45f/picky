import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Top } from '@toss/tds-mobile';
import type { Poll } from '../shared';
import { usePollStore } from '../store/usePollStore';
import { theme, pageShell, stickyActionBar } from '../theme';
import { formatNumber, formatRelativeTime, getRemainingMs } from '../lib/format';
import { isPollClosed, leadingOption, optionPercent } from '../lib/poll';
import { hasVotedLocally } from '../lib/votes';
import { hapticFeedback } from '../lib/toss';
import { getRecentPollHistory, type RecentPollHistoryItem } from '../lib/pollHistory';
import { Chip, ProgressBar, SegmentedControl, Skeleton } from '../components/ui';
import { CountdownChip } from '../components/Countdown';

type StatusFilter = 'all' | 'open' | 'closed';
type SortKey = 'recent' | 'popular' | 'closing';

const FILTER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'open', label: '진행중' },
  { value: 'closed', label: '마감' },
] as const satisfies ReadonlyArray<{ value: StatusFilter; label: string }>;

const SORT_OPTIONS = [
  { value: 'recent', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'closing', label: '마감임박' },
] as const satisfies ReadonlyArray<{ value: SortKey; label: string }>;

function PollCard({ poll, index, onClick }: { poll: Poll; index: number; onClick: () => void }) {
  const leading = leadingOption(poll);
  const closed = isPollClosed(poll);
  const voted = hasVotedLocally(poll.id);
  const percent = leading ? optionPercent(leading.voteCount, poll.totalVotes) : 0;

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
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        padding: 18,
        marginBottom: 12,
        color: theme.text,
        cursor: 'pointer',
        animationDelay: `${Math.min(index, 8) * 45}ms`,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        <Chip tone={closed ? 'muted' : 'accent'}>{closed ? '마감' : '진행중'}</Chip>
        {voted ? <Chip tone="gold">✓ 참여함</Chip> : null}
        {!closed ? <CountdownChip endsAt={poll.endsAt} /> : null}
        <span style={{ fontSize: 12, color: theme.textMuted, alignSelf: 'center' }}>
          {formatRelativeTime(poll.createdAt)}
        </span>
      </div>

      <strong style={{ fontSize: 16, lineHeight: 1.4, display: 'block' }}>{poll.question}</strong>
      {poll.description ? (
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 13,
            color: theme.textMuted,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {poll.description}
        </p>
      ) : null}

      {leading ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 12 }}>
            <span
              style={{
                color: theme.text,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {leading.text}
            </span>
            <span style={{ color: theme.accent, fontWeight: 700, flexShrink: 0 }}>{percent}%</span>
          </div>
          <div style={{ marginTop: 6 }}>
            <ProgressBar percent={percent} />
          </div>
        </div>
      ) : null}

      <div
        style={{ marginTop: 12, fontSize: 12, color: theme.textMuted, display: 'flex', gap: 12 }}
      >
        <span>🗳️ {formatNumber(poll.totalVotes)}표</span>
        <span>💬 의견 {poll.comments.length}개</span>
        <span>· 선택지 {poll.options.length}개</span>
      </div>
    </button>
  );
}

function RecentStrip({
  items,
  onSelect,
}: {
  items: RecentPollHistoryItem[];
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <section style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: theme.textMuted, margin: '0 0 8px' }}>
        최근 본 고민
      </h2>
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
          margin: '0 -20px',
          padding: '0 20px 4px',
          scrollbarWidth: 'none',
        }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="pressable"
            onClick={() => onSelect(item.id)}
            style={{
              flexShrink: 0,
              width: 188,
              textAlign: 'left',
              background: theme.surfaceAlt,
              border: `1px solid ${theme.border}`,
              borderRadius: theme.radiusSm,
              padding: 12,
              color: theme.text,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              {item.hasVoted ? <Chip tone="gold">참여함</Chip> : <Chip tone="muted">봤음</Chip>}
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {item.question}
            </span>
            <div style={{ marginTop: 8, fontSize: 11, color: theme.textMuted }}>
              🗳️ {formatNumber(item.totalVotes)} · 💬 {item.commentCount}
            </div>
          </button>
        ))}
      </div>
    </section>
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
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radius,
            padding: 18,
            marginBottom: 12,
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

export function PollListPage() {
  const navigate = useNavigate();
  const { polls, isLoading, error, fetchPolls } = usePollStore();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [recent, setRecent] = useState<RecentPollHistoryItem[]>([]);

  useEffect(() => {
    void fetchPolls();
    setRecent(getRecentPollHistory());
  }, [fetchPolls]);

  const totalVotes = useMemo(() => polls.reduce((sum, poll) => sum + poll.totalVotes, 0), [polls]);

  const visiblePolls = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = polls.filter((poll) => {
      const closed = isPollClosed(poll);
      if (statusFilter === 'open' && closed) return false;
      if (statusFilter === 'closed' && !closed) return false;
      if (!normalizedQuery) return true;
      return (
        poll.question.toLowerCase().includes(normalizedQuery) ||
        (poll.description ?? '').toLowerCase().includes(normalizedQuery)
      );
    });

    const sorted = [...filtered];
    if (sortKey === 'popular') {
      sorted.sort((a, b) => b.totalVotes - a.totalVotes);
    } else if (sortKey === 'closing') {
      sorted.sort((a, b) => {
        const ra = getRemainingMs(a.endsAt);
        const rb = getRemainingMs(b.endsAt);
        const aActive = ra != null && ra > 0;
        const bActive = rb != null && rb > 0;
        if (aActive && bActive) return ra! - rb!;
        if (aActive) return -1;
        if (bActive) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [polls, query, statusFilter, sortKey]);

  const goToPoll = (id: string) => {
    hapticFeedback('tickWeak');
    navigate(`/poll/${id}`);
  };

  const isInitialLoading = isLoading && polls.length === 0;
  const showRecent = recent.length > 0 && !query.trim() && statusFilter === 'all';

  return (
    <div style={{ background: theme.bg, minHeight: '100dvh' }}>
      <Top
        title={<Top.TitleParagraph size={22}>픽플로우</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>고민을 투표로 빠르게 결정</Top.SubtitleParagraph>
        }
      />

      <div style={pageShell}>
        {polls.length > 0 ? (
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 14,
              fontSize: 13,
              color: theme.textMuted,
            }}
          >
            <span>
              <strong style={{ color: theme.text }}>{formatNumber(polls.length)}</strong>개 고민
            </span>
            <span>
              <strong style={{ color: theme.text }}>{formatNumber(totalVotes)}</strong>표 참여
            </span>
          </div>
        ) : null}

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="고민 검색"
            aria-label="고민 검색"
            style={{
              width: '100%',
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: theme.radiusSm,
              color: theme.text,
              padding: '11px 14px 11px 38px',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: 13,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 15,
              opacity: 0.6,
            }}
          >
            🔍
          </span>
        </div>

        <div style={{ marginBottom: 10 }}>
          <SegmentedControl
            ariaLabel="상태 필터"
            options={FILTER_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {SORT_OPTIONS.map((option) => {
            const active = option.value === sortKey;
            return (
              <button
                key={option.value}
                type="button"
                className="pressable"
                aria-pressed={active}
                onClick={() => setSortKey(option.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: theme.radiusPill,
                  border: `1px solid ${active ? theme.accent : theme.border}`,
                  background: active ? theme.accentSoft : 'transparent',
                  color: active ? theme.accent : theme.textMuted,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {showRecent ? <RecentStrip items={recent} onSelect={goToPoll} /> : null}

        {isInitialLoading ? <ListSkeleton /> : null}

        {error && polls.length === 0 && !isInitialLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: theme.danger }}>
            <p style={{ fontSize: 14 }}>{error}</p>
            <Button style={{ marginTop: 12 }} variant="weak" onClick={() => void fetchPolls()}>
              다시 시도
            </Button>
          </div>
        ) : null}

        {!isInitialLoading && polls.length > 0 && visiblePolls.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: theme.textMuted }}>
            <p style={{ fontSize: 15 }}>조건에 맞는 고민이 없어요.</p>
            <p style={{ fontSize: 13 }}>검색어나 필터를 바꿔 보세요.</p>
          </div>
        ) : null}

        {!isInitialLoading && polls.length === 0 && !error ? (
          <div style={{ textAlign: 'center', padding: '56px 0', color: theme.textMuted }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🗳️</div>
            <p style={{ fontSize: 15, color: theme.text }}>아직 등록된 고민이 없어요.</p>
            <p style={{ fontSize: 13 }}>첫 번째 고민을 투표로 만들어 보세요!</p>
          </div>
        ) : null}

        {visiblePolls.map((poll, index) => (
          <PollCard key={poll.id} poll={poll} index={index} onClick={() => goToPoll(poll.id)} />
        ))}
      </div>

      <div style={stickyActionBar}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <Button
            style={{ width: '100%' }}
            onClick={() => {
              hapticFeedback('tap');
              navigate('/create');
            }}
          >
            새 고민 만들기
          </Button>
        </div>
      </div>
    </div>
  );
}
