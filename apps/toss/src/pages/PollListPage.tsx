import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Top } from '@toss/tds-mobile';
import type { Poll } from '../shared';
import { usePollStore } from '../store/usePollStore';
import { useAuthStore } from '../store/useAuthStore';
import { theme, pageShell, stickyActionBar } from '../theme';
import { formatNumber, formatRelativeTime, getRemainingMs } from '../lib/format';
import { isPollClosed, leadingOption, optionPercent } from '../lib/poll';
import { hasVotedLocally } from '../lib/votes';
import { hapticFeedback } from '../lib/toss';
import { getRecentPollHistory, type RecentPollHistoryItem } from '../lib/pollHistory';
import { Chip, ProgressBar, SegmentedControl, Skeleton } from '../components/ui';
import { useCountdown } from '../components/Countdown';
import { WelcomeSplash } from '../components/WelcomeSplash';
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

function PollCard({ poll, index, onClick }: { poll: Poll; index: number; onClick: () => void }) {
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
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: theme.radius,
        padding: '22px 20px',
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
          fontSize: 12,
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
          <strong style={{ fontSize: 17, lineHeight: 1.4, display: 'block', fontWeight: 700 }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 12 }}>
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
            <span style={{ color: theme.accent, fontWeight: 700, flexShrink: 0 }}>{percent}%</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <ProgressBar percent={percent} height={6} />
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 14, fontSize: 11, color: theme.textFaint, display: 'flex', gap: 8 }}>
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
}: {
  items: RecentPollHistoryItem[];
  onSelect: (id: string) => void;
}) {
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
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
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
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                height: '2.8em',
              }}
            >
              {item.question}
            </span>
            <div style={{ marginTop: 8, fontSize: 11, color: theme.textFaint }}>
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

export function PollListPage() {
  const navigate = useNavigate();
  const { polls, isLoading, error, fetchPolls } = usePollStore();
  const myId = useAuthStore((state) => state.user?.id ?? null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [myOnly, setMyOnly] = useState(false);
  const [recent, setRecent] = useState<RecentPollHistoryItem[]>([]);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const myPollCount = useMemo(
    () => (myId ? polls.filter((poll) => poll.creatorId === myId).length : 0),
    [polls, myId],
  );

  useEffect(() => {
    void fetchPolls();
    setRecent(getRecentPollHistory());
  }, [fetchPolls]);

  const totalVotes = useMemo(() => polls.reduce((sum, poll) => sum + poll.totalVotes, 0), [polls]);

  const visiblePolls = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = polls.filter((poll) => {
      if (myOnly && (!myId || poll.creatorId !== myId)) return false;
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
  }, [polls, query, statusFilter, sortKey, myOnly, myId]);

  const goToPoll = (id: string) => {
    hapticFeedback('tickWeak');
    navigate(`/poll/${id}`);
  };

  const isInitialLoading = isLoading && polls.length === 0;
  const showRecent = recent.length > 0 && !query.trim() && statusFilter === 'all' && !myOnly;

  return (
    <div style={{ minHeight: '100dvh' }}>
      <WelcomeSplash />
      <div style={{ position: 'relative' }}>
        <Top
          title={
            <div
              onClick={(e) => {
                hapticFeedback('success');
                triggerParticleBurst(e.clientX, e.clientY, { count: 20 });
              }}
              style={{ display: 'inline-flex', cursor: 'pointer', userSelect: 'none' }}
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
                픽플로우 🥑
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
            </div>
          }
          subtitleBottom={
            <Top.SubtitleParagraph size={15} style={{ opacity: 0.85 }}>
              친구들과 나누는 까다로운 결정!
            </Top.SubtitleParagraph>
          }
        />
      </div>

      <div style={pageShell}>
        {polls.length > 0 ? (
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginBottom: 14,
              fontSize: 13,
              color: theme.textMuted,
            }}
          >
            <span>
              고민 <strong style={{ color: theme.text }}>{formatNumber(polls.length)}</strong>개
            </span>
            <span>
              참여 <strong style={{ color: theme.text }}>{formatNumber(totalVotes)}</strong>명
            </span>
          </div>
        ) : null}

        <div style={{ position: 'relative', marginBottom: 18 }}>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
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
              padding: '12px 14px 12px 38px',
              fontSize: 14,
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
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <div style={{ flex: 1, marginRight: 8 }}>
            <SegmentedControl
              ariaLabel="상태 필터"
              options={FILTER_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {myPollCount > 0 && (
              <button
                type="button"
                className="pressable"
                onClick={() => setMyOnly((prev) => !prev)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 14,
                  background: myOnly ? theme.accentSoft : 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  color: myOnly ? theme.accent : theme.textMuted,
                  fontSize: 13,
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

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="pressable"
                onClick={() => setShowSortMenu(!showSortMenu)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  color: theme.textMuted,
                  fontSize: 13,
                  fontWeight: 700,
                  border: `1px solid ${theme.border}`,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  whiteSpace: 'nowrap',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
                }}
              >
                <span>{SORT_OPTIONS.find((o) => o.value === sortKey)?.label.split(' ')[0]}</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
              </button>
              {showSortMenu && (
                <>
                  <div
                    onClick={() => setShowSortMenu(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      background: theme.surfaceStrong,
                      borderRadius: 14,
                      border: `1px solid ${theme.border}`,
                      boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
                      padding: 6,
                      zIndex: 11,
                      minWidth: 110,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSortKey(option.value);
                          setShowSortMenu(false);
                        }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: option.value === sortKey ? theme.accentSoft : 'transparent',
                          color: option.value === sortKey ? theme.accent : theme.text,
                          fontSize: 13,
                          fontWeight: option.value === sortKey ? 700 : 500,
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          width: '100%',
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {showRecent ? <RecentStrip items={recent} onSelect={goToPoll} /> : null}

        {isInitialLoading ? <ListSkeleton /> : null}

        {error && polls.length === 0 && !isInitialLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: theme.danger }}>
            <p style={{ fontSize: 14 }}>{error}</p>
            <Button style={{ marginTop: 12 }} variant="weak" onClick={() => void fetchPolls()}>
              다시 시도하기 🔄
            </Button>
          </div>
        ) : null}

        {!isInitialLoading && polls.length > 0 && visiblePolls.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: theme.textMuted }}>
            <p style={{ fontSize: 15 }}>앗, 조건에 맞는 고민을 찾지 못했어요 😢</p>
            <p style={{ fontSize: 13 }}>다른 검색어를 입력하거나 필터를 변경해 보세요!</p>
          </div>
        ) : null}

        {!isInitialLoading && polls.length === 0 && !error ? (
          <div style={{ textAlign: 'center', padding: '56px 0', color: theme.textMuted }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🥑</div>
            <p style={{ fontSize: 16, color: theme.text, fontWeight: 700 }}>
              아직 등록된 고민이 없어요.
            </p>
            <p style={{ fontSize: 13, marginTop: 4 }}>
              가장 먼저 재미있는 고민 투표를 만들어볼까요? 🚀
            </p>
          </div>
        ) : null}

        {visiblePolls.map((poll, index) => (
          <PollCard key={poll.id} poll={poll} index={index} onClick={() => goToPoll(poll.id)} />
        ))}
      </div>

      <div style={stickyActionBar}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <Button
            style={{
              width: '100%',
              borderRadius: 16,
              boxShadow: '0 8px 24px rgba(19, 194, 163, 0.25)',
            }}
            onClick={() => {
              hapticFeedback('tap');
              navigate('/create');
            }}
          >
            새 고민 작성하기 ✍️
          </Button>
        </div>
      </div>
    </div>
  );
}
