import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  ClipboardCheck,
  Copy,
  GitBranch,
  MessageSquare,
  Target,
  TimerReset,
  Users,
} from 'lucide-react';
import type { DecisionStats, Poll } from '@picky/shared';
import {
  computeConfidenceScore,
  computeDecisionStats,
  resolveDecisionState,
  type DecisionState,
} from '@picky/shared';
import { copyText } from '../lib/pollShare';

type FollowUpAction = {
  id: string;
  label: string;
  description: string;
  body: string;
  icon: 'target' | 'runoff' | 'discussion' | 'ready';
};

type DecisionFollowUpPanelProps = Readonly<{
  poll: Poll;
  shareUrl: string;
  pollClosed: boolean;
}>;

const formatPercent = (value: number): string => `${Math.max(0, Math.min(100, value))}%`;

const formatDeadline = (value: string | null | undefined): string => {
  if (!value) {
    return '마감 없음';
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '마감 확인 필요';
  }

  return date.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDecisionIcon = (icon: FollowUpAction['icon']) => {
  if (icon === 'runoff') {
    return <GitBranch size={14} />;
  }
  if (icon === 'discussion') {
    return <MessageSquare size={14} />;
  }
  if (icon === 'ready') {
    return <ClipboardCheck size={14} />;
  }
  return <Target size={14} />;
};

// 신뢰도 점수·4상태·통계·리스크 active 판정은 @picky/shared(pollConfidence)로 단일화했어요.
// 이 컴포넌트는 그 순수 결과를 받아 웹 UI 라벨/문구/색으로만 매핑해요(동작 불변).

const resolveDeadlineCopy = (
  poll: Poll,
  pollClosed: boolean,
  closingSoon: boolean,
): { value: string; help: string } => {
  if (pollClosed) {
    return {
      value: '마감됨',
      help: '마감된 투표라 후속 공지나 실행 액션으로 전환하기 좋습니다.',
    };
  }
  if (closingSoon) {
    return {
      value: '임박',
      help: '마감이 임박했습니다. 마지막 리마인더를 보내기 좋은 시점입니다.',
    };
  }
  return {
    value: '진행 중',
    help: `현재 마감 상태: ${formatDeadline(poll.endsAt)}`,
  };
};

const buildRiskItems = (
  stats: DecisionStats,
  deadline: { value: string; help: string },
): Array<{ label: string; value: string; active: boolean; help: string }> => {
  const { lowSample, closeRace, lowDiscussion, closingSoon, minimumVotes, totalVotes } = stats;
  return [
    {
      label: '표본',
      value: lowSample ? '보강 필요' : '충분',
      active: lowSample,
      help: lowSample
        ? `최소 ${minimumVotes}명 기준까지 ${Math.max(minimumVotes - totalVotes, 0)}명 더 필요합니다.`
        : '현재 표본은 기본 의사결정 기준을 충족했습니다.',
    },
    {
      label: '접전',
      value: closeRace ? '결선 권장' : '격차 확보',
      active: closeRace,
      help: closeRace
        ? '상위 선택지 차이가 작아 바로 확정하면 반발이나 재논의가 생길 수 있습니다.'
        : '상위 선택지 사이에 해석 가능한 격차가 있습니다.',
    },
    {
      label: '의견',
      value: lowDiscussion ? '근거 부족' : '근거 확보',
      active: lowDiscussion,
      help: lowDiscussion
        ? '선택 이유가 부족해 결과 공지나 회의록 근거가 약할 수 있습니다.'
        : '댓글이 결과 해석을 보강하고 있습니다.',
    },
    {
      label: '마감',
      value: deadline.value,
      active: closingSoon,
      help: deadline.help,
    },
  ];
};

export function DecisionFollowUpPanel({ poll, shareUrl, pollClosed }: DecisionFollowUpPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const decision = useMemo(() => {
    const stats: DecisionStats = computeDecisionStats(poll, { pollClosed });
    const {
      leader,
      runnerUp,
      totalVotes,
      minimumVotes,
      leaderShare,
      voteGap,
      voteGapShare,
      feedbackRate,
      closingSoon,
    } = stats;
    const comments = poll.comments || [];

    const state = resolveDecisionState(stats);
    const confidenceScore = computeConfidenceScore(stats, { pollClosed });

    const stateMeta: Record<
      DecisionState,
      { label: string; tone: string; summary: string; nextStep: string }
    > = {
      collect: {
        label: '추가 표본 필요',
        tone: 'var(--brand-accent-gold)',
        summary: `최소 ${minimumVotes}표 기준으로 아직 표본이 부족합니다.`,
        nextStep: '링크를 한 번 더 공유하고, 마감 전까지 참여자를 보강하세요.',
      },
      runoff: {
        label: '결선 추천',
        tone: 'var(--brand-accent-coral)',
        summary: `1위와 2위 격차가 ${voteGap}표라서 바로 확정하기엔 근거가 약합니다.`,
        nextStep: '상위 2개 선택지만 남긴 결선 투표나 짧은 토론을 진행하세요.',
      },
      discussion: {
        label: '의견 보강 필요',
        tone: 'var(--brand-accent-gold)',
        summary: `투표는 모였지만 의견 비율이 ${feedbackRate}%라 결정 이유가 부족합니다.`,
        nextStep: '대표 이유를 더 받아 회의록이나 결정 공지에 붙일 근거를 보강하세요.',
      },
      ready: {
        label: '결정 공지 가능',
        tone: 'var(--brand-accent-teal)',
        summary: '선두 선택지, 표본, 의견 근거가 결정 공유에 충분한 상태입니다.',
        nextStep: '결정 메모를 복사해 공지하고 후속 실행자를 정하세요.',
      },
    };

    const leaderLine = leader
      ? `${leader.text} (${leader.voteCount}표, ${leaderShare}%)`
      : '아직 선두 없음';
    const runnerUpLine = runnerUp ? `${runnerUp.text} (${runnerUp.voteCount}표)` : '비교 대상 없음';

    const actions: FollowUpAction[] = [
      {
        id: 'collect',
        label: '추가 참여 요청',
        description: '표본이 부족하거나 마감 전일 때 공유할 리마인더',
        icon: 'target',
        body: `투표 참여를 한 번 더 부탁드립니다.\n\n질문: ${poll.question}\n현재 참여: ${totalVotes}명\n목표 표본: ${minimumVotes}명 이상\n참여 링크: ${shareUrl}\n\n결정 전에 더 많은 의견을 모으겠습니다.`,
      },
      {
        id: 'runoff',
        label: '결선/토론 안내',
        description: '상위 선택지가 박빙일 때 다음 회의에 붙일 문구',
        icon: 'runoff',
        body: `이번 투표는 상위 선택지 격차가 작아 결선 또는 짧은 토론이 필요합니다.\n\n질문: ${poll.question}\n1위: ${leaderLine}\n2위: ${runnerUpLine}\n격차: ${voteGap}표 (${voteGapShare}%)\n결과 링크: ${shareUrl}\n\n다음 단계: 상위 2개 선택지를 기준으로 추가 의견을 받고 최종 결정하겠습니다.`,
      },
      {
        id: 'discussion',
        label: '의견 보강 요청',
        description: '선택 이유가 부족할 때 코멘트를 더 받는 문구',
        icon: 'discussion',
        body: `투표 결과 해석을 위해 선택 이유를 조금 더 모으겠습니다.\n\n질문: ${poll.question}\n현재 선두: ${leaderLine}\n참여: ${totalVotes}명 · 의견: ${comments.length}개\n결과 링크: ${shareUrl}\n\n가능하면 왜 이 선택지가 좋은지 한 줄 이유를 남겨주세요.`,
      },
      {
        id: 'ready',
        label: '결정 공지',
        description: '결과를 확정하고 팀/참여자에게 알리는 문구',
        icon: 'ready',
        body: `[picky 결정 공지]\n${poll.question}\n\n최종안: ${leaderLine}\n참여: ${totalVotes}명 · 의견 ${comments.length}개\n격차: ${voteGap}표 (${voteGapShare}%)\n판정: ${stateMeta[state].label}\n근거: ${stateMeta[state].summary}\n후속 액션: ${stateMeta[state].nextStep}\n\n결과 링크: ${shareUrl}`,
      },
    ];

    const recommendedActionId: FollowUpAction['id'] = state;
    const deadline = resolveDeadlineCopy(poll, pollClosed, closingSoon);
    const riskItems = buildRiskItems(stats, deadline);

    return {
      actions,
      comments,
      confidenceScore,
      feedbackRate,
      leaderLine,
      leaderShare,
      minimumVotes,
      recommendedActionId,
      riskItems,
      state,
      stateMeta: stateMeta[state],
      totalVotes,
      voteGap,
      voteGapShare,
    };
  }, [poll, pollClosed, shareUrl]);

  const handleCopy = async (action: FollowUpAction) => {
    try {
      await copyText(action.body);
      setCopiedId(action.id);
      globalThis.setTimeout(() => setCopiedId(null), 2200);
    } catch (err) {
      console.error('decision follow-up copy failed', err);
    }
  };

  const recommendedAction = decision.actions.find(
    (action) => action.id === decision.recommendedActionId,
  );
  const displayActions = recommendedAction
    ? [
        recommendedAction,
        ...decision.actions.filter((action) => action.id !== recommendedAction.id).slice(0, 2),
      ]
    : decision.actions.slice(0, 3);

  return (
    <section
      className="content-card"
      style={{
        display: 'grid',
        gap: '1rem',
        border: '1px solid rgba(250, 204, 21, 0.18)',
        background:
          'linear-gradient(135deg, rgba(250, 204, 21, 0.08), rgba(32, 214, 178, 0.04) 48%, rgba(255,255,255,0.025))',
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
              color: decision.stateMeta.tone,
              fontSize: '0.68rem',
              fontWeight: 900,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            <ClipboardCheck size={13} />
            Decision follow-up
          </span>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>
            결과를 다음 행동으로 전환
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
            표본 수, 표 차이, 의견 비율을 기준으로 결정을 확정할지, 더 모을지, 결선으로 넘길지
            제안합니다.
          </p>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            border: `1px solid ${decision.stateMeta.tone}`,
            borderRadius: '999px',
            color: decision.stateMeta.tone,
            background: 'rgba(0,0,0,0.14)',
            padding: '6px 10px',
            fontSize: '0.68rem',
            fontWeight: 900,
            whiteSpace: 'nowrap',
          }}
        >
          <AlertCircle size={13} />
          {decision.stateMeta.label}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
          gap: '0.65rem',
        }}
      >
        <div className="insight-tile">
          <span>
            <Target size={13} />
            신뢰도
          </span>
          <strong style={{ color: decision.stateMeta.tone }}>
            {formatPercent(decision.confidenceScore)}
          </strong>
          <small>{decision.stateMeta.summary}</small>
        </div>
        <div className="insight-tile">
          <span>
            <Users size={13} />
            표본
          </span>
          <strong>
            {decision.totalVotes}/{decision.minimumVotes}명
          </strong>
          <small>최소 표본 기준 대비 참여 현황입니다.</small>
        </div>
        <div className="insight-tile">
          <span>
            <GitBranch size={13} />
            격차
          </span>
          <strong>
            {decision.voteGap}표 · {formatPercent(decision.voteGapShare)}
          </strong>
          <small>선두: {decision.leaderLine}</small>
        </div>
        <div className="insight-tile">
          <span>
            <MessageSquare size={13} />
            의견률
          </span>
          <strong>{formatPercent(decision.feedbackRate)}</strong>
          <small>의견 {decision.comments.length}개가 결정 근거로 남았습니다.</small>
        </div>
      </div>

      <div
        style={{
          border: '1px solid var(--bg-card-border)',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(3, 14, 12, 0.32)',
          padding: '0.85rem',
          display: 'grid',
          gap: '0.35rem',
        }}
      >
        <strong style={{ color: 'var(--text-primary)', fontSize: '0.82rem' }}>
          추천 다음 단계
        </strong>
        <p
          style={{
            margin: 0,
            color: 'var(--text-secondary)',
            fontSize: '0.74rem',
            lineHeight: 1.55,
          }}
        >
          {decision.stateMeta.nextStep}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))',
          gap: '0.55rem',
        }}
        aria-label="결정 리스크 점검"
      >
        {decision.riskItems.map((item) => (
          <article
            key={item.label}
            style={{
              display: 'grid',
              gap: '0.3rem',
              border: item.active
                ? '1px solid rgba(250, 204, 21, 0.26)'
                : '1px solid rgba(45, 212, 191, 0.16)',
              borderRadius: 'var(--radius-sm)',
              background: item.active ? 'rgba(250, 204, 21, 0.055)' : 'rgba(45, 212, 191, 0.035)',
              padding: '0.7rem',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: item.active ? 'var(--brand-accent-gold)' : 'var(--brand-accent-teal)',
                fontSize: '0.66rem',
                fontWeight: 900,
              }}
            >
              {item.label === '마감' ? <TimerReset size={13} /> : <AlertCircle size={13} />}
              {item.label}
            </span>
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.78rem', lineHeight: 1.35 }}>
              {item.value}
            </strong>
            <small
              style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', lineHeight: 1.42 }}
            >
              {item.help}
            </small>
          </article>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: '0.65rem',
        }}
      >
        {displayActions.map((action) => {
          const recommended = action.id === decision.recommendedActionId;
          const copied = copiedId === action.id;

          return (
            <article
              key={action.id}
              style={{
                display: 'grid',
                gap: '0.6rem',
                alignContent: 'space-between',
                border: recommended
                  ? '1px solid rgba(32, 214, 178, 0.34)'
                  : '1px solid var(--bg-card-border)',
                borderRadius: 'var(--radius-sm)',
                background: recommended ? 'rgba(32, 214, 178, 0.07)' : 'rgba(255,255,255,0.032)',
                padding: '0.8rem',
                minHeight: '142px',
              }}
            >
              <div style={{ display: 'grid', gap: '0.36rem' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: recommended ? 'var(--brand-accent-teal)' : 'var(--text-primary)',
                    fontSize: '0.76rem',
                    fontWeight: 900,
                  }}
                >
                  {getDecisionIcon(action.icon)}
                  {action.label}
                  {recommended ? (
                    <small
                      style={{
                        color: 'var(--brand-accent-teal)',
                        fontSize: '0.6rem',
                        fontWeight: 900,
                      }}
                    >
                      추천
                    </small>
                  ) : null}
                </span>
                <p
                  style={{
                    margin: 0,
                    color: 'var(--text-muted)',
                    fontSize: '0.68rem',
                    lineHeight: 1.45,
                  }}
                >
                  {action.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(action)}
                className="ghost-btn"
                style={{
                  justifySelf: 'start',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 10px',
                  fontSize: '0.68rem',
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? '복사됨' : '문구 복사'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
