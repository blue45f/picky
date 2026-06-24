import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, Eye, MessageSquare, Pencil, ShieldCheck, Trash2, Users } from 'lucide-react';
import { usePollStore } from '../store/usePollStore';
import { useAuthStore } from '../store/useAuthStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { Poll } from '@picky/shared';

const resolveAuthorLabel = (poll: Poll, userId?: string): { label: string; tone: string } => {
  if (userId && poll.creatorId === userId) {
    return { label: '내 글', tone: 'var(--brand-primary-light)' };
  }
  if (poll.creatorIsGuest || poll.creatorId?.startsWith('guest-')) {
    return { label: '비회원', tone: 'var(--brand-accent-gold)' };
  }
  return poll.creatorId
    ? { label: '회원', tone: 'var(--brand-accent-teal)' }
    : { label: '비회원', tone: 'var(--brand-accent-gold)' };
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString([], {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  });
};

const summaryCardStyle: React.CSSProperties = {
  display: 'grid',
  gap: '0.3rem',
  padding: '1rem 1.1rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--bg-card-border)',
  background: 'rgba(255,255,255,0.02)',
};

export const Admin: React.FC = () => {
  useDocumentTitle('운영자 게시물 관리');
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const polls = usePollStore((state) => state.polls);
  const isLoading = usePollStore((state) => state.isLoading);
  const error = usePollStore((state) => state.error);
  const fetchPolls = usePollStore((state) => state.fetchPolls);
  const deletePoll = usePollStore((state) => state.deletePoll);

  const isAdmin = !!user?.isAdmin;
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchPolls();
    }
  }, [isAdmin, fetchPolls]);

  const summary = useMemo(() => {
    const totalVotes = polls.reduce((sum, poll) => sum + (poll.totalVotes || 0), 0);
    const totalComments = polls.reduce((sum, poll) => sum + poll.comments.length, 0);
    return { totalPolls: polls.length, totalVotes, totalComments };
  }, [polls]);

  if (!isAdmin) {
    return (
      <div
        className="content-card"
        style={{ display: 'grid', gap: '0.85rem', padding: '1.5rem', maxWidth: '640px' }}
      >
        <h1
          style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}
        >
          운영자 전용 페이지예요
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}
        >
          이 페이지는 운영자만 볼 수 있어요. 권한이 필요하면 운영팀에 문의해 주세요.
        </p>
        <Link
          to="/"
          className="btn-secondary"
          style={{ textDecoration: 'none', justifySelf: 'start' }}
        >
          고민 목록으로
        </Link>
      </div>
    );
  }

  const handleDelete = async (poll: Poll) => {
    // 2-step 확인 — 첫 클릭은 확인 상태로, 두 번째 클릭에 실제 삭제.
    if (pendingDeleteId !== poll.id) {
      setPendingDeleteId(poll.id);
      return;
    }
    const ok = await deletePoll(poll.id);
    setPendingDeleteId(null);
    if (!ok) {
      // store.error 에 사유가 세팅되며 상단 배너로 노출된다.
      return;
    }
  };

  return (
    <div
      className="animate-slide-up"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
        <ShieldCheck size={20} style={{ color: 'var(--brand-accent-teal)' }} />
        <h1
          style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)' }}
        >
          운영자 게시물 관리
        </h1>
      </div>

      {error ? (
        <p
          style={{
            margin: 0,
            fontSize: '0.8rem',
            color: 'var(--brand-accent-coral)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            background: 'rgba(239, 68, 68, 0.12)',
          }}
        >
          {error}
        </p>
      ) : null}

      <section
        aria-label="운영 요약"
        style={{
          display: 'grid',
          gap: '0.75rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        }}
      >
        <div style={summaryCardStyle}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              fontWeight: 700,
            }}
          >
            <BarChart3 size={13} style={{ color: 'var(--brand-primary-light)' }} />총 고민 수
          </span>
          <strong style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>
            {summary.totalPolls}
          </strong>
        </div>
        <div style={summaryCardStyle}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              fontWeight: 700,
            }}
          >
            <Users size={13} style={{ color: 'var(--brand-accent-teal)' }} />총 투표 수
          </span>
          <strong style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>
            {summary.totalVotes}
          </strong>
        </div>
        <div style={summaryCardStyle}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              fontWeight: 700,
            }}
          >
            <MessageSquare size={13} style={{ color: 'var(--brand-accent-gold)' }} />총 댓글 수
          </span>
          <strong style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>
            {summary.totalComments}
          </strong>
        </div>
      </section>

      {isLoading && polls.length === 0 ? (
        <div aria-busy="true" aria-live="polite" style={{ display: 'grid', gap: '0.75rem' }}>
          <span className="sr-only">고민 목록을 불러오는 중…</span>
          <div className="skeleton" style={{ height: 64 }} />
          <div className="skeleton" style={{ height: 64 }} />
          <div className="skeleton" style={{ height: 64 }} />
        </div>
      ) : null}

      {!isLoading && polls.length === 0 ? (
        <div
          className="content-card"
          style={{ textAlign: 'center', padding: '1.6rem', color: 'var(--text-muted)' }}
        >
          아직 등록된 고민이 없어요.
        </div>
      ) : null}

      {polls.length > 0 ? (
        <div className="content-card" style={{ padding: '0.4rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
            <caption className="sr-only">운영자 고민 관리 표</caption>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                {['질문', '작성자', '투표', '댓글', '생성일', '관리'].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    style={{
                      padding: '0.6rem 0.7rem',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      borderBottom: '1px solid var(--bg-card-border)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {polls.map((poll) => {
                const author = resolveAuthorLabel(poll, user?.id);
                const isPendingDelete = pendingDeleteId === poll.id;
                return (
                  <tr key={poll.id} style={{ borderBottom: '1px solid var(--bg-card-border)' }}>
                    <td
                      style={{
                        padding: '0.6rem 0.7rem',
                        fontSize: '0.82rem',
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        maxWidth: '320px',
                      }}
                    >
                      {poll.question}
                    </td>
                    <td style={{ padding: '0.6rem 0.7rem' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: author.tone,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          border: `1px solid ${author.tone}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {author.label}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '0.6rem 0.7rem',
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {poll.totalVotes}
                    </td>
                    <td
                      style={{
                        padding: '0.6rem 0.7rem',
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {poll.comments.length}
                    </td>
                    <td
                      style={{
                        padding: '0.6rem 0.7rem',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatDate(poll.createdAt)}
                    </td>
                    <td style={{ padding: '0.6rem 0.7rem' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <Link
                          to={`/poll/${encodeURIComponent(poll.id)}`}
                          className="ghost-btn"
                          aria-label={`${poll.question} 상세 보기`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={13} />
                          상세
                        </Link>
                        <button
                          type="button"
                          onClick={() => navigate(`/poll/${encodeURIComponent(poll.id)}/edit`)}
                          className="ghost-btn"
                          aria-label={`${poll.question} 수정`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Pencil size={13} />
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(poll)}
                          onBlur={() => isPendingDelete && setPendingDeleteId(null)}
                          className="ghost-btn"
                          aria-label={`${poll.question} 삭제`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--brand-accent-coral)',
                            borderColor: isPendingDelete
                              ? 'var(--brand-accent-coral)'
                              : 'var(--bg-card-border)',
                            background: isPendingDelete ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                          }}
                        >
                          <Trash2 size={13} />
                          {isPendingDelete ? '확인' : '삭제'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};
