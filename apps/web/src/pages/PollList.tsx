import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Search,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Vote,
  Plus,
  X,
} from 'lucide-react';
import { usePollStore } from '../store/usePollStore';
import { useAuthStore } from '../store/useAuthStore';

type SortMode = 'latest' | 'popular' | 'commented';
type ScopeMode = 'all' | 'mine' | 'guest';

const isSortMode = (value: string | null): value is SortMode => {
  return value === 'latest' || value === 'popular' || value === 'commented';
};

const isScopeMode = (value: string | null): value is ScopeMode => {
  return value === 'all' || value === 'mine' || value === 'guest';
};

const isGuestCreator = (creatorId?: string | null, creatorIsGuest?: boolean) => {
  return creatorIsGuest || Boolean(creatorId?.startsWith('guest-'));
};

const getCreatorLabel = (creatorId?: string | null, creatorIsGuest?: boolean) => {
  if (isGuestCreator(creatorId, creatorIsGuest)) {
    return '비회원 작성';
  }

  if (creatorId) {
    return '회원 작성';
  }

  return '비회원 작성';
};

const sortOptions: { value: SortMode; label: string }[] = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '투표 많은순' },
  { value: 'commented', label: '댓글 많은순' },
];

const scopeOptions: { value: ScopeMode; label: string }[] = [
  { value: 'all', label: '전체 보기' },
  { value: 'mine', label: '내가 작성' },
  { value: 'guest', label: '비회원 작성' },
];

export const PollList: React.FC = () => {
  const { polls, isLoading, fetchPolls, error, setCurrentPoll } = usePollStore();
  const userId = useAuthStore((state) => state.user?.id);
  const isGuest = useAuthStore((state) => state.user?.isGuest);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('latest');
  const [scope, setScope] = useState<ScopeMode>('all');

  useEffect(() => {
    const nextQuery = (searchParams.get('q') || '').trim();
    const nextSort = searchParams.get('sort');
    const nextScope = searchParams.get('scope');

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
        return;
      }

      setScope((current) => (current === nextScope ? current : nextScope));
      return;
    }

    setScope('all');
  }, [searchParams, userId, query, searchInput, sortBy]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = searchInput.trim();
      if (nextQuery !== query) {
        setQuery(nextQuery);
      }
    }, 260);

    return () => {
      window.clearTimeout(timer);
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

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [query, sortBy, scope, userId, searchParams, setSearchParams]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  const normalizedQuery = query.trim().toLowerCase();

  const scopedCounts = useMemo(() => {
    const mine = userId ? polls.filter((poll) => poll.creatorId === userId).length : 0;
    const guest = polls.filter((poll) => isGuestCreator(poll.creatorId, poll.creatorIsGuest)).length;

    return {
      all: polls.length,
      mine,
      guest,
    };
  }, [polls, userId]);

  const displayScopeOptions = useMemo(
    () =>
      scopeOptions.map((option) => ({
        ...option,
        count:
          option.value === 'all'
            ? scopedCounts.all
            : option.value === 'mine'
              ? scopedCounts.mine
              : scopedCounts.guest,
      })),
    [scopedCounts],
  );

  const visiblePolls = useMemo(() => {
    let next = [...polls];

    if (scope === 'mine' && userId) {
      next = next.filter((poll) => poll.creatorId === userId);
    }

    if (scope === 'guest') {
      next = next.filter((poll) => isGuestCreator(poll.creatorId, poll.creatorIsGuest));
    }

    if (normalizedQuery) {
      next = next.filter((poll) => {
        const inQuestion = poll.question.toLowerCase().includes(normalizedQuery);
        const inDescription = (poll.description || '').toLowerCase().includes(normalizedQuery);
        return inQuestion || inDescription;
      });
    }

    switch (sortBy) {
      case 'popular':
        next = next.sort((a, b) => b.totalVotes - a.totalVotes);
        break;
      case 'commented':
        next = next.sort((a, b) => b.comments.length - a.comments.length);
        break;
      default:
        next = next.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
    }

    return next;
  }, [polls, scope, sortBy, normalizedQuery, userId]);

  const totalVotes = useMemo(() => polls.reduce((acc, poll) => acc + poll.totalVotes, 0), [polls]);
  const totalComments = useMemo(
    () => polls.reduce((acc, poll) => acc + poll.comments.length, 0),
    [polls],
  );

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

    return labels;
  }, [scope, normalizedQuery]);

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <section
      className="animate-slide-up"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}
    >
      <div className="hero-shell">
        <div
          style={{
            position: 'absolute',
            width: '280px',
            height: '280px',
            right: '-100px',
            top: '-120px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle at center, rgba(250, 204, 21, 0.18), rgba(250, 204, 21, 0))',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'grid', gap: '0.65rem', position: 'relative' }}>
          <p
            style={{
              fontSize: '0.7rem',
              color: 'var(--brand-accent-gold)',
              fontWeight: 700,
              letterSpacing: '0.07em',
            }}
          >
            PICKFLOW NOW
          </p>
          <h1
            style={{
              fontSize: '1.8rem',
              fontWeight: 900,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            빠른 의사결정이 필요한 순간을 위한 투표 플랫폼
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              maxWidth: '640px',
              fontSize: '0.89rem',
              lineHeight: 1.65,
            }}
          >
            일상이나 팀 회의에서 결정이 어려운 항목을 카드로 등록하고, 지인/동료에게 링크를
            전달하면 바로 의견을 수집할 수 있습니다.
          </p>

          <div className="kpi-grid" style={{ marginTop: '0.4rem' }}>
            <article className="kpi-item">
              <span className="segment-title" style={{ fontSize: '0.83rem' }}>
                지금 운영 중인 고민
              </span>
              <strong style={{ fontSize: '1.35rem', color: 'var(--brand-primary)' }}>
                {polls.length}
              </strong>
              <span className="form-note">누적 등록 수</span>
            </article>
            <article className="kpi-item">
              <span className="segment-title" style={{ fontSize: '0.83rem' }}>
                총 투표 수
              </span>
              <strong style={{ fontSize: '1.35rem', color: 'var(--brand-accent-teal)' }}>
                {totalVotes}
              </strong>
              <span className="form-note">실제 참여 누적 건수</span>
            </article>
            <article className="kpi-item">
              <span className="segment-title" style={{ fontSize: '0.83rem' }}>
                참여 피드백 수
              </span>
              <strong style={{ fontSize: '1.35rem', color: 'var(--brand-accent-gold)' }}>
                {totalComments}
              </strong>
              <span className="form-note">코멘트/한마디 건수</span>
            </article>
          </div>
        </div>
      </div>

      <div
        className="content-card"
        style={{ padding: '0.95rem', display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}
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
          <Search size={14} style={{ position: 'absolute', left: '11px', color: 'var(--text-muted)' }} />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="고민 제목/설명을 검색하세요"
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
          {displayScopeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setScope(option.value)}
              className="ghost-btn"
              disabled={option.value === 'mine' && !userId}
              title={option.value === 'mine' && !userId ? '로그인/비회원 닉네임 시작 후 내 항목을 확인할 수 있어요' : ''}
              style={{
                borderColor:
                  scope === option.value
                    ? 'rgba(99, 102, 241, 0.52)'
                    : 'var(--bg-card-border)',
                color: scope === option.value ? 'var(--brand-primary-light)' : 'var(--text-muted)',
                backgroundColor:
                  scope === option.value ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                padding: '6px 10px',
                opacity: option.value === 'mine' && !userId ? 0.5 : 1,
              }}
            >
              {option.label} ({option.count})
            </button>
          ))}

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
            <Plus size={14} />
            새 투표 만들기
          </button>
        </div>
      </div>

      {hasActiveFilters ? (
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
              onClick={() => {
                setScope('all');
                setQuery('');
                setSortBy('latest');
              }}
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
      ) : null}

      {isLoading && visiblePolls.length === 0 ? (
        <div className="content-card" style={{ padding: '1.75rem', display: 'grid', gap: '0.75rem' }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} style={{ display: 'grid', gap: '0.55rem' }}>
              <div className="skeleton" style={{ height: '0.8rem', width: '42%' }} />
              <div className="skeleton" style={{ height: '1.35rem', width: '72%' }} />
              <div className="skeleton" style={{ height: '0.75rem', width: '56%' }} />
            </div>
          ))}
        </div>
      ) : visiblePolls.length === 0 ? (
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
          <Sparkles size={36} style={{ color: 'var(--brand-accent-gold)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
            {scope !== 'all' || normalizedQuery
              ? '조건에 맞는 고민이 없습니다.'
              : '아직 등록된 고민이 없습니다'}
          </h3>
          <p
            style={{
              fontSize: '0.825rem',
              color: 'var(--text-secondary)',
              maxWidth: '460px',
              lineHeight: 1.6,
            }}
          >
            {scope !== 'all' || normalizedQuery
              ? '검색어 또는 필터를 바꿔 다시 확인해보세요.'
              : userId && isGuest
                ? '비회원으로도 간단히 시작할 수 있습니다. 첫 질문을 등록하고 링크를 공유해보세요.'
                : '첫 번째 고민을 생성하고 팀/커뮤니티의 판단을 빠르게 받아보세요.'}
          </p>
          <button
            onClick={() => navigate('/create')}
            className="btn-primary"
            style={{ padding: '10px 20px', fontSize: '0.85rem' }}
          >
            첫 고민 작성하러 가기
          </button>
        </div>
      ) : (
        <>
        <div style={{ display: 'grid', gap: '0.9rem' }}>
          {visiblePolls.map((poll) => {
            const creatorLabel = getCreatorLabel(poll.creatorId, poll.creatorIsGuest);
            const isMine = userId && poll.creatorId === userId;
            const topOptions = [...poll.options]
              .sort((a, b) => b.voteCount - a.voteCount)
              .slice(0, 2)
              .map((option) => option.text)
              .join(' / ');

            return (
              <button
                type="button"
                key={poll.id}
                className="poll-card"
                onClick={() => {
                  setCurrentPoll(poll);
                  navigate(`/poll/${poll.id}`);
                }}
                style={{
                  textAlign: 'left',
                  textDecoration: 'none',
                  padding: '1.25rem',
                  width: '100%',
                  border: isMine ? '1px solid rgba(99, 102, 241, 0.45)' : undefined,
                }}
              >
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
                    fontSize: '1.06rem',
                    fontWeight: 800,
                    letterSpacing: '-0.015em',
                    lineHeight: 1.45,
                    marginBottom: '0.4rem',
                  }}
                >
                  {poll.question}
                </h3>

                {poll.description ? (
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.825rem',
                      marginBottom: '0.6rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: 1.56,
                    }}
                  >
                    {poll.description}
                  </p>
                ) : null}

                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.66rem',
                  }}
                >
                  <strong style={{ color: 'var(--text-primary)' }}>현재 상위 선택지:</strong>{' '}
                  {topOptions || '아직 등록된 선택지가 없습니다'}
                </div>

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
                      <strong style={{ color: 'var(--text-primary)' }}>{poll.comments.length}</strong>{' '}
                      의견
                    </span>
                  </div>

                  <span
                    style={{
                      color: 'var(--brand-primary-light)',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.76rem',
                    }}
                  >
                    투표하기
                    <ArrowRight size={13} />
                  </span>
                </div>
              </button>
            );
          })}
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
      )}

      {error ? (
        <div
          className="content-card"
          style={{
            marginTop: '0.2rem',
            padding: '0.85rem 1rem',
            display: 'grid',
            gap: '0.6rem',
          }}
        >
          <p
            style={{
              color: 'var(--brand-accent-coral)',
              fontSize: '0.78rem',
              margin: 0,
            }}
          >
            {error}
          </p>
          <button
            type="button"
            onClick={fetchPolls}
            className="btn-secondary"
            style={{ width: 'fit-content', padding: '6px 10px', fontSize: '0.74rem' }}
          >
            다시 시도
          </button>
        </div>
      ) : null}
    </section>
  );
};
