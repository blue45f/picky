import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';
import { usePollStore } from '../store/usePollStore';
import { useAuthStore } from '../store/useAuthStore';

export const PollList: React.FC = () => {
  const { polls, isLoading, fetchPolls } = usePollStore();
  const userId = useAuthStore((state) => state.user?.id);
  const navigate = useNavigate();

  const getCreatorLabel = (creatorId?: string | null, creatorIsGuest?: boolean) => {
    if (userId && creatorId === userId) {
      return '내가 작성';
    }

    if (creatorIsGuest || (creatorId && creatorId.startsWith('guest-'))) {
      return '비회원 작성';
    }

    return creatorId ? '회원 작성' : '비회원 작성';
  };

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  return (
    <div
      className="animate-slide-up"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}
    >
      {/* Header Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h1
          style={{
            fontSize: '1.65rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          쉽고 빠른 투표 링크, 픽플로우
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          결정이 어려운 일상의 순간들을 선택지 카드로 작성해보세요. SNS 및 메신저에 공유하여
          지인들의 진짜 속마음 피드백을 모을 수 있습니다.
        </p>
      </div>

      {isLoading && polls.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
          <Sparkles
            size={24}
            style={{
              animation: 'spin 2s linear infinite',
              marginBottom: '8px',
              color: 'var(--brand-primary)',
            }}
          />
          <p style={{ fontSize: '0.85rem' }}>고민 데이터를 불러오고 있습니다...</p>
        </div>
      ) : polls.length === 0 ? (
        <div
          className="content-card"
          style={{
            textAlign: 'center',
            padding: '4.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <HelpCircle size={36} style={{ color: 'var(--brand-accent-gold)' }} />
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
              아직 등록된 고민이 없습니다
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              첫 번째 투표 카드를 등록하고 지인에게 공유해보세요!
            </p>
          </div>
          <button
            onClick={() => navigate('/create')}
            className="btn-primary"
            style={{ padding: '10px 20px', fontSize: '0.85rem' }}
          >
            첫 고민 작성하러 가기
          </button>
        </div>
      ) : (
        // Poll List Grid
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {polls.map((poll) => {
            const creatorLabel = getCreatorLabel(poll.creatorId, poll.creatorIsGuest);

            return (
              <div
                key={poll.id}
                className="content-card"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  usePollStore.setState({ currentPoll: poll });
                  navigate(`/poll/${poll.id}`);
                }}
              >
                <div>
                  {/* Card Info Eyebrow */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: 'var(--brand-primary)',
                        backgroundColor: 'rgba(99, 102, 241, 0.08)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        letterSpacing: '0.02em',
                      }}
                    >
                      POLL #{poll.id}
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.725rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <Calendar size={12} />
                      <span>{new Date(poll.createdAt).toLocaleDateString()}</span>
                      <span
                        style={{
                          padding: '2px 7px',
                          borderRadius: '12px',
                          fontSize: '0.62rem',
                          border: '1px solid rgba(148, 163, 184, 0.35)',
                          color: 'var(--text-muted)',
                          backgroundColor: 'rgba(255,255,255,0.03)',
                        }}
                      >
                        {creatorLabel}
                      </span>
                    </div>
                  </div>

                  {/* Question */}
                  <h3
                    style={{
                      fontSize: '1.075rem',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.45,
                    }}
                  >
                    {poll.question}
                  </h3>
                  {poll.description && (
                    <p
                      style={{
                        fontSize: '0.825rem',
                        color: 'var(--text-secondary)',
                        marginTop: '6px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.5,
                      }}
                    >
                      {poll.description}
                    </p>
                  )}
                </div>

                {/* Stats summary */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    paddingTop: '0.85rem',
                    fontSize: '0.775rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      color: 'var(--text-secondary)',
                      fontWeight: 500,
                    }}
                  >
                    <span>
                      🗳️ <strong>{poll.totalVotes}</strong>명 투표함
                    </span>
                    <span>
                      💬 <strong>{poll.comments.length}</strong>개 한마디
                    </span>
                  </div>
                  <span
                    style={{
                      color: 'var(--brand-primary-light)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <span>투표하기</span>
                    <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
