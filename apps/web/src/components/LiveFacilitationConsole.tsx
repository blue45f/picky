import { useMemo, useState } from 'react';
import {
  BarChart3,
  Check,
  ClipboardList,
  Clock,
  Copy,
  MessageSquare,
  Mic2,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import type { Poll } from '@picky/shared';
import { copyText } from '../lib/pollShare';

type CommentSignal = 'support' | 'risk' | 'question' | 'neutral';
type RunbookStatus = 'done' | 'current' | 'pending';

type LiveFacilitationConsoleProps = Readonly<{
  poll: Poll;
  shareUrl: string;
  pollClosed: boolean;
}>;

const SIGNAL_LABELS: Record<CommentSignal, string> = {
  support: '찬성 근거',
  risk: '리스크',
  question: '질문',
  neutral: '일반 의견',
};

const SIGNAL_COLORS: Record<CommentSignal, string> = {
  support: 'var(--brand-accent-teal)',
  risk: 'var(--brand-accent-coral)',
  question: 'var(--brand-accent-gold)',
  neutral: 'var(--text-muted)',
};

const SUPPORT_KEYWORDS = ['좋', '추천', '선호', '찬성', '효율', '빠르', '쉬', '맞', '필요', '가자'];

const RISK_KEYWORDS = [
  '걱정',
  '리스크',
  '문제',
  '어렵',
  '불안',
  '비싸',
  '늦',
  '복잡',
  '부담',
  '반대',
];

const QUESTION_KEYWORDS = ['?', '왜', '어떻게', '언제', '가능', '질문', '확인', '무엇'];

const classifyComment = (comment: string): CommentSignal => {
  const normalized = comment.toLowerCase();
  if (QUESTION_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
    return 'question';
  }
  if (RISK_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
    return 'risk';
  }
  if (SUPPORT_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
    return 'support';
  }
  return 'neutral';
};

const formatCommentTime = (createdAt: string): string => {
  if (!createdAt) {
    return '시간 정보 없음';
  }

  try {
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(createdAt));
  } catch {
    return createdAt;
  }
};

const getRunbookStatus = (done: boolean, current: boolean): RunbookStatus => {
  if (done) {
    return 'done';
  }
  return current ? 'current' : 'pending';
};

export function LiveFacilitationConsole({
  poll,
  shareUrl,
  pollClosed,
}: LiveFacilitationConsoleProps) {
  const [copied, setCopied] = useState(false);
  const facilitation = useMemo(() => {
    const comments = poll.comments || [];
    const sortedOptions = [...poll.options].sort((a, b) => b.voteCount - a.voteCount);
    const leader = sortedOptions[0] || null;
    const runnerUp = sortedOptions[1] || null;
    const targetVotes = Math.max(8, poll.options.length * 3);
    const voteProgress =
      targetVotes > 0 ? Math.min(100, Math.round((poll.totalVotes / targetVotes) * 100)) : 0;
    const leaderShare =
      poll.totalVotes > 0 && leader ? Math.round((leader.voteCount / poll.totalVotes) * 100) : 0;
    const voteGap = leader ? leader.voteCount - (runnerUp?.voteCount || 0) : 0;
    const hasEnoughVotes = poll.totalVotes >= targetVotes;
    const hasDiscussion = comments.length > 0;
    const needsDiscussion = poll.totalVotes >= 3 && comments.length < 2;

    const commentQueue = comments
      .map((commentItem) => ({
        ...commentItem,
        signal: classifyComment(commentItem.comment),
      }))
      .sort((a, b) => {
        const priority: Record<CommentSignal, number> = {
          risk: 0,
          question: 1,
          support: 2,
          neutral: 3,
        };
        return priority[a.signal] - priority[b.signal];
      })
      .slice(0, 5);

    const signalCounts = commentQueue.reduce(
      (acc, item) => ({
        ...acc,
        [item.signal]: acc[item.signal] + 1,
      }),
      {
        support: 0,
        risk: 0,
        question: 0,
        neutral: 0,
      } satisfies Record<CommentSignal, number>,
    );

    const runbook = [
      {
        id: 'open',
        title: '오프닝',
        minute: '0:00',
        status: getRunbookStatus(poll.totalVotes > 0, poll.totalVotes === 0),
        script: `질문은 "${poll.question}"입니다. 링크나 QR로 접속해 선택하고, 가능하면 한 줄 이유도 남겨주세요.`,
      },
      {
        id: 'collect',
        title: '응답 수집',
        minute: '1:00',
        status: getRunbookStatus(
          hasEnoughVotes || pollClosed,
          poll.totalVotes > 0 && !hasEnoughVotes,
        ),
        script: `현재 ${poll.totalVotes}명 참여, 목표 표본은 ${targetVotes}명입니다. 아직 참여 전이면 지금 선택해 주세요.`,
      },
      {
        id: 'discuss',
        title: '의견 큐 토론',
        minute: '3:00',
        status: getRunbookStatus(
          hasDiscussion && !needsDiscussion,
          needsDiscussion || hasDiscussion,
        ),
        script: hasDiscussion
          ? `리스크와 질문부터 확인하겠습니다. 의견 ${comments.length}개 중 핵심 코멘트를 먼저 다루겠습니다.`
          : '선택 이유가 아직 부족합니다. 왜 이 선택지를 골랐는지 한 줄만 더 남겨주세요.',
      },
      {
        id: 'close',
        title: '정리',
        minute: '5:00',
        status: getRunbookStatus(pollClosed, hasEnoughVotes && voteGap > 1),
        script: leader
          ? `현재 선두는 ${leader.text}, ${leader.voteCount}표(${leaderShare}%)입니다. 이 결론으로 갈지 마지막 이견을 확인하겠습니다.`
          : '아직 선두 선택지가 없습니다. 응답을 더 모은 뒤 정리하겠습니다.',
      },
    ];

    const liveBrief = [
      `[picky 진행자 노트]`,
      `질문: ${poll.question}`,
      `참여: ${poll.totalVotes}/${targetVotes}명 (${voteProgress}%)`,
      leader ? `선두: ${leader.text} (${leader.voteCount}표, ${leaderShare}%)` : '선두: 아직 없음',
      runnerUp ? `2위: ${runnerUp.text} (${runnerUp.voteCount}표)` : '2위: 비교 대상 없음',
      `격차: ${voteGap}표`,
      `의견: ${comments.length}개`,
      `결과 링크: ${shareUrl}`,
      '',
      '[진행 순서]',
      ...runbook.map((item) => `- ${item.minute} ${item.title}: ${item.script}`),
      '',
      '[먼저 다룰 의견]',
      ...(commentQueue.length > 0
        ? commentQueue.map(
            (item, index) =>
              `${index + 1}. [${SIGNAL_LABELS[item.signal]}] ${item.comment} - ${
                item.voterName || '익명'
              }`,
          )
        : ['아직 의견이 없습니다. 참여자에게 선택 이유를 요청하세요.']),
    ].join('\n');

    return {
      commentQueue,
      hasEnoughVotes,
      leader,
      leaderShare,
      liveBrief,
      runbook,
      signalCounts,
      targetVotes,
      voteGap,
      voteProgress,
    };
  }, [poll, pollClosed, shareUrl]);

  const handleCopyBrief = async () => {
    try {
      await copyText(facilitation.liveBrief);
      setCopied(true);
      globalThis.setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('facilitation brief copy failed', err);
    }
  };

  return (
    <section
      className="content-card"
      style={{
        display: 'grid',
        gap: '1rem',
        border: '1px solid rgba(148, 163, 184, 0.18)',
        background:
          'linear-gradient(135deg, rgba(148, 163, 184, 0.08), rgba(32, 214, 178, 0.045) 46%, rgba(255,255,255,0.025))',
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
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--brand-accent-teal)',
              fontSize: '0.68rem',
              fontWeight: 900,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            <Mic2 size={13} />
            Live facilitation console
          </span>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>
            진행자가 바로 읽는 운영 콘솔
          </h3>
          <p
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: '0.76rem',
              lineHeight: 1.55,
              maxWidth: '62ch',
            }}
          >
            참여 수집, 의견 큐, 마무리 멘트를 한 화면에 모아 회의 중 클릭과 해석 시간을 줄입니다.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopyBrief}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            fontSize: '0.72rem',
            whiteSpace: 'nowrap',
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? '노트 복사됨' : '진행 노트 복사'}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
          gap: '0.65rem',
        }}
      >
        <div className="insight-tile">
          <span>
            <Users size={13} />
            참여 진행률
          </span>
          <strong>{facilitation.voteProgress}%</strong>
          <small>
            {poll.totalVotes}/{facilitation.targetVotes}명 기준
          </small>
        </div>
        <div className="insight-tile">
          <span>
            <BarChart3 size={13} />
            선두 흐름
          </span>
          <strong>
            {facilitation.leader
              ? `${facilitation.leaderShare}% · ${facilitation.voteGap}표 차`
              : '대기'}
          </strong>
          <small>{facilitation.leader?.text || '첫 표가 들어오면 선두가 표시됩니다.'}</small>
        </div>
        <div className="insight-tile">
          <span>
            <ShieldAlert size={13} />
            리스크/질문
          </span>
          <strong>{facilitation.signalCounts.risk + facilitation.signalCounts.question}개</strong>
          <small>토론에서 먼저 다룰 의견 신호입니다.</small>
        </div>
        <div className="insight-tile">
          <span>
            <MessageSquare size={13} />
            의견 큐
          </span>
          <strong>{facilitation.commentQueue.length}개</strong>
          <small>위험, 질문, 찬성 근거 순으로 정렬했습니다.</small>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: '0.85rem',
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: '0.65rem',
            border: '1px solid var(--bg-card-border)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(3, 14, 12, 0.34)',
            padding: '0.85rem',
          }}
        >
          <strong
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
            }}
          >
            <Clock size={14} />
            5분 진행 런북
          </strong>
          <div style={{ display: 'grid', gap: '0.55rem' }}>
            {facilitation.runbook.map((item) => {
              const active = item.status === 'current';
              const done = item.status === 'done';
              const activeBorderColor = active
                ? 'var(--brand-accent-gold)'
                : 'rgba(148, 163, 184, 0.24)';
              const borderColor = done ? 'var(--brand-accent-teal)' : activeBorderColor;

              return (
                <article
                  key={item.id}
                  style={{
                    display: 'grid',
                    gap: '0.3rem',
                    borderLeft: `3px solid ${borderColor}`,
                    paddingLeft: '0.65rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{ color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 900 }}
                    >
                      {item.title}
                    </span>
                    <small
                      style={{ color: active ? 'var(--brand-accent-gold)' : 'var(--text-muted)' }}
                    >
                      {item.minute}
                    </small>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: 'var(--text-secondary)',
                      fontSize: '0.7rem',
                      lineHeight: 1.45,
                    }}
                  >
                    {item.script}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gap: '0.65rem',
            border: '1px solid var(--bg-card-border)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,0.03)',
            padding: '0.85rem',
          }}
        >
          <strong
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
            }}
          >
            <ClipboardList size={14} />
            먼저 다룰 의견 큐
          </strong>
          {facilitation.commentQueue.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.55rem' }}>
              {facilitation.commentQueue.map((commentItem, index) => (
                <article
                  key={`${commentItem.createdAt}-${index}`}
                  style={{
                    display: 'grid',
                    gap: '0.34rem',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(3, 14, 12, 0.28)',
                    padding: '0.68rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '0.55rem',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        color: SIGNAL_COLORS[commentItem.signal],
                        fontSize: '0.64rem',
                        fontWeight: 900,
                      }}
                    >
                      {SIGNAL_LABELS[commentItem.signal]}
                    </span>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>
                      {formatCommentTime(commentItem.createdAt)}
                    </small>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: 'var(--text-secondary)',
                      fontSize: '0.72rem',
                      lineHeight: 1.45,
                    }}
                  >
                    {commentItem.comment}
                  </p>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.64rem' }}>
                    {commentItem.selectedOptionText || '선택지 미기록'} ·{' '}
                    {commentItem.voterName || '익명'}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: '0.35rem',
                placeItems: 'center',
                textAlign: 'center',
                minHeight: '154px',
                color: 'var(--text-muted)',
                border: '1px dashed rgba(148, 163, 184, 0.24)',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
              }}
            >
              <Sparkles size={18} />
              <p style={{ margin: 0, fontSize: '0.72rem', lineHeight: 1.45 }}>
                아직 토론할 의견이 없습니다. 참여자에게 선택 이유 한 줄을 요청하세요.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
