import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Share2,
  BarChart3,
  User,
  MessageSquare,
  Copy,
  Check,
  Sparkles,
  Info,
  AlertCircle,
} from 'lucide-react';
import { usePollStore } from '../store/usePollStore';
import { useAuthStore } from '../store/useAuthStore';
import { VoteDonutChart, OPTION_COLORS } from '../components/VoteDonutChart';
import { SnsPreviewCard } from '../components/SnsPreviewCard';
import { Poll } from '@picky/shared';
const POLL_AUTHOR_LABELS: {
  mine: string;
  otherMember: string;
  guest: string;
} = {
  mine: '내가 작성',
  otherMember: '회원 작성',
  guest: '비회원 작성',
};

export const PollDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { currentPoll, isLoading, fetchPoll, vote, setCurrentPoll } = usePollStore();
  const { user, guestName } = useAuthStore((state) => ({
    user: state.user,
    guestName: state.guestName,
  }));

  const buildShareablePollSnapshot = (poll: Poll): string | null => {
    try {
      const encoded = encodeURIComponent(
        btoa(
          encodeURIComponent(
            JSON.stringify({
              version: 1,
              poll,
            }),
          ),
        ),
      );
      return encoded;
    } catch {
      return null;
    }
  };

  const resolveShareUrl = (poll?: Poll | null) => {
    if (!poll) {
      return `${window.location.origin}/poll/${id}`;
    }

    const snapshot = buildShareablePollSnapshot(poll);
    if (!snapshot) {
      return `${window.location.origin}/poll/${poll.id}`;
    }

    return `${window.location.origin}/poll/${poll.id}?snapshot=${snapshot}`;
  };

  const restorePollFromSnapshot = () => {
    if (!id) {
      return;
    }

    const snapshot = searchParams.get('snapshot');
    if (!snapshot) {
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

  // Modal share check
  const showShareParam = searchParams.get('showShare') === 'true';
  const snapshotParam = searchParams.get('snapshot');

  // Forms
  const [votedOptionId, setVotedOptionId] = useState<number | null>(null);
  const [voterName, setVoterName] = useState('');
  const [comment, setComment] = useState('');

  // User Local History
  const [votedHistory, setVotedHistory] = useState<Record<string, number>>({});

  // UI States
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(showShareParam);
  const [snsPreviewPlatform, setSnsPreviewPlatform] = useState<'x' | 'kakao'>('x');

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
  useEffect(() => {
    restorePollFromSnapshot();

    if (id) {
      fetchPoll(id);
    }
  }, [id, fetchPoll, snapshotParam]);

  // Pre-fill voter name from auth/guest profile
  useEffect(() => {
    const nextName = (user?.nickname || guestName || '').trim();
    setVoterName(nextName);
  }, [user?.id, guestName, id]);

  // Submit Vote
  const handleVoteSubmit = async () => {
    if (!id || votedOptionId === null) return;

    const success = await vote(id, {
      optionId: votedOptionId,
      voterName: voterName.trim() || null,
      comment: comment.trim() || null,
    });

    if (success) {
      const nextHistory = { ...votedHistory, [id]: votedOptionId };
      setVotedHistory(nextHistory);
      localStorage.setItem('picky_voted_history', JSON.stringify(nextHistory));

      // Reset inputs
      setVoterName('');
      setComment('');
      setVotedOptionId(null);
    }
  };

  // Click-to-copy
  const handleCopyLinkClick = (pollId: string) => {
    const shareUrl = resolveShareUrl(currentPoll);
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedId(pollId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
    // Remove query parameter from URL
    if (searchParams.has('showShare')) {
      searchParams.delete('showShare');
      setSearchParams(searchParams);
    }
  };

  if (isLoading && !currentPoll) {
    return (
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
    );
  }

  if (!currentPoll) {
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
        <AlertCircle size={36} style={{ color: 'var(--brand-accent-coral)' }} />
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
            고민 정보를 찾을 수 없습니다
          </h3>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            존재하지 않거나 삭제된 고민 투표 링크입니다.
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="btn-secondary"
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const hasVoted = votedHistory[currentPoll.id] !== undefined;

  return (
    <div
      className="animate-slide-up"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      {/* Header Back Controls */}
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

      {/* Main Poll Card */}
      <div
        className="content-card"
        style={{
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          cursor: 'default',
        }}
      >
        <div>
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
            {getCreatorLabel()}
          </span>

          <h2
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
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

        {/* Results Screen vs Voting Screen */}
        {hasVoted ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              paddingTop: '1.5rem',
            }}
          >
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
                    <span>실시간 투표 통계</span>
                  </span>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    총 {currentPoll.totalVotes}명 참여
                  </span>
                </div>

                {currentPoll.options.map((opt, idx) => {
                  const percentage =
                    currentPoll.totalVotes > 0
                      ? Math.round((opt.voteCount / currentPoll.totalVotes) * 100)
                      : 0;
                  const isMyChoice = votedHistory[currentPoll.id] === opt.id;
                  const barColor = OPTION_COLORS[idx % OPTION_COLORS.length];

                  return (
                    <div
                      key={opt.id}
                      style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
                    >
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
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              paddingTop: '1.5rem',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              🗳️ 원하시는 항목을 선택하고 의견을 남겨주세요:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentPoll.options.map((opt, idx) => {
                const isSelected = votedOptionId === opt.id;
                const bulletColor = OPTION_COLORS[idx % OPTION_COLORS.length];

                return (
                  <div
                    key={opt.id}
                    onClick={() => setVotedOptionId(opt.id)}
                    className={`choice-card ${isSelected ? 'selected' : ''}`}
                    style={{ justifyContent: 'space-between' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
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
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--brand-primary)',
                            }}
                          />
                        )}
                      </div>

                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
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
                        {opt.text}
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
                  </div>
                );
              })}
            </div>

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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="닉네임 (기본 익명)"
                    value={voterName}
                    onChange={(e) => setVoterName(e.target.value)}
                    maxLength={15}
                    className="form-input"
                  />
                  <input
                    type="text"
                    placeholder="선택 사유 혹은 피드백 한마디를 적어주세요."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={100}
                    className="form-input"
                  />
                </div>
                <button
                  onClick={handleVoteSubmit}
                  className="btn-primary"
                  style={{ padding: '12px', fontSize: '0.85rem' }}
                >
                  투표 제출 및 한마디 등록
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comments timeline */}
      <div style={{ marginTop: '0.5rem' }}>
        <h3
          style={{
            fontSize: '0.95rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '0.85rem',
            color: 'var(--text-primary)',
          }}
        >
          <MessageSquare size={15} style={{ color: 'var(--brand-accent-gold)' }} />
          <span>참여자 피드백 한마디 ({currentPoll.comments.length})</span>
        </h3>

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
            {currentPoll.comments.map((comm) => (
              <div
                key={comm.id}
                className="content-card"
                style={{
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  cursor: 'default',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}
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
                      <User size={12} style={{ color: 'var(--text-muted)' }} />
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
                  style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}
                >
                  {comm.comment}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal Backdrop */}
      {showShareModal && (
        <div className="modal-overlay" onClick={handleCloseShareModal}>
          <div
            className="modal-content animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '460px' }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <Sparkles
                size={32}
                style={{ color: 'var(--brand-accent-gold)', marginBottom: '8px' }}
              />
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
                      color:
                        snsPreviewPlatform === 'x' ? 'var(--text-primary)' : 'var(--text-muted)',
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
              />
            </div>

            {/* Copy link input */}
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
                {resolveShareUrl(currentPoll)}
              </span>
              <button
                onClick={() => handleCopyLinkClick(currentPoll.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color:
                    copiedId === currentPoll.id
                      ? 'var(--brand-accent-teal)'
                      : 'var(--brand-primary)',
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
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`[픽플로우 투표] ${currentPoll.question}\n지인분들의 투표와 의견을 들려주세요!`)}&url=${encodeURIComponent(resolveShareUrl(currentPoll))}`}
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
              <a
                href={`https://share.kakaocast.daum.net/intent?text=${encodeURIComponent(`[고민 해결 투표] ${currentPoll.question}\n아래 링크를 클릭해 투표해 주세요!\n${resolveShareUrl(currentPoll)}`)}`}
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
                  color: 'var(--brand-accent-gold)',
                  borderColor: 'rgba(251, 191, 36, 0.2)',
                }}
              >
                <span>💬 카카오톡 공유</span>
              </a>
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
      )}
    </div>
  );
};
