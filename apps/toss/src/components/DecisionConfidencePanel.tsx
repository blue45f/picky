/**
 * 결정 신뢰도 패널 — 웹 DecisionFollowUpPanel 의 토스(TDS) 포팅.
 * 점수/4상태/통계/리스크 판정은 전부 @picky/shared(pollConfidence)에서 소비하고(로직 중복 0),
 * 여기선 그 순수 결과를 토스 카드 UI(점수·상태 배지·리스크 타일·추천 문구 복사)로만 렌더해요.
 *
 * 노출 게이트는 호출부(PollDetailView)가 책임져요: 결과 공개(showResults) + 0표 가드(R1).
 */
import { useMemo, useState } from 'react';
import type { DecisionState, Poll } from '../shared';
import { evaluatePollConfidence } from '../shared';
import { theme, FONT } from '../theme';
import { Chip, ProgressBar } from './ui';

type DecisionConfidencePanelProps = Readonly<{
  poll: Poll;
  shareUrl: string;
  pollClosed: boolean;
  /** 추천 문구 복사(상위가 토스트/햅틱 처리). 미전달 시 복사 버튼 숨김. */
  onCopyText?: (text: string) => void;
}>;

type StateMeta = {
  label: string;
  tone: 'accent' | 'gold' | 'danger';
  summary: string;
  nextStep: string;
};

const formatPercent = (value: number): string => `${Math.max(0, Math.min(100, value))}%`;

/** 신뢰도 점수 막대 색 — 상태 tone 과 같은 결로. */
const progressTone = (tone: StateMeta['tone']): 'accent' | 'gold' | 'muted' =>
  tone === 'accent' ? 'accent' : tone === 'gold' ? 'gold' : 'muted';

const chipColor = (tone: StateMeta['tone']): string =>
  tone === 'accent' ? theme.accent : tone === 'gold' ? theme.gold : theme.danger;

/** 리스크 키별 라벨/문구 — 웹 buildRiskItems 와 동일 카피(active 판정은 shared). */
const RISK_LABEL: Record<'sample' | 'closeRace' | 'discussion' | 'deadline', string> = {
  sample: '표본',
  closeRace: '접전',
  discussion: '의견',
  deadline: '마감',
};

export function DecisionConfidencePanel({
  poll,
  shareUrl,
  pollClosed,
  onCopyText,
}: DecisionConfidencePanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const decision = useMemo(() => {
    const { stats, state, confidenceScore, riskItems } = evaluatePollConfidence(poll, {
      pollClosed,
    });
    const {
      leader,
      runnerUp,
      totalVotes,
      minimumVotes,
      leaderShare,
      voteGap,
      voteGapShare,
      feedbackRate,
    } = stats;
    const comments = poll.comments || [];

    const stateMeta: Record<DecisionState, StateMeta> = {
      collect: {
        label: '추가 표본 필요',
        tone: 'gold',
        summary: `최소 ${minimumVotes}표 기준으로 아직 표본이 부족해요.`,
        nextStep: '링크를 한 번 더 공유하고, 마감 전까지 참여자를 보강하세요.',
      },
      runoff: {
        label: '결선 추천',
        tone: 'danger',
        summary: `1위와 2위 격차가 ${voteGap}표라 바로 확정하기엔 근거가 약해요.`,
        nextStep: '상위 2개 선택지만 남긴 결선 투표나 짧은 토론을 진행하세요.',
      },
      discussion: {
        label: '의견 보강 필요',
        tone: 'gold',
        summary: `투표는 모였지만 의견 비율이 ${feedbackRate}%라 결정 이유가 부족해요.`,
        nextStep: '대표 이유를 더 받아 회의록이나 결정 공지에 붙일 근거를 보강하세요.',
      },
      ready: {
        label: '결정 공지 가능',
        tone: 'accent',
        summary: '선두 선택지, 표본, 의견 근거가 결정 공유에 충분한 상태예요.',
        nextStep: '결정 메모를 복사해 공지하고 후속 실행자를 정하세요.',
      },
    };

    const leaderLine = leader
      ? `${leader.text} (${leader.voteCount}표, ${leaderShare}%)`
      : '아직 선두 없음';
    const runnerUpLine = runnerUp ? `${runnerUp.text} (${runnerUp.voteCount}표)` : '비교 대상 없음';

    const meta = stateMeta[state];
    const recommendation = [
      `[picky 결정 공지] ${poll.question}`,
      '',
      `최종안: ${leaderLine}`,
      `2위: ${runnerUpLine}`,
      `참여: ${totalVotes}명 · 의견 ${comments.length}개`,
      `격차: ${voteGap}표 (${voteGapShare}%)`,
      `판정: ${meta.label}`,
      `근거: ${meta.summary}`,
      `후속 액션: ${meta.nextStep}`,
      '',
      `결과 링크: ${shareUrl}`,
    ].join('\n');

    return {
      confidenceScore,
      feedbackRate,
      leaderLine,
      minimumVotes,
      meta,
      recommendation,
      riskItems,
      totalVotes,
      voteGap,
      voteGapShare,
      commentCount: comments.length,
    };
  }, [poll, pollClosed, shareUrl]);

  const handleCopy = () => {
    if (!onCopyText) {
      return;
    }
    onCopyText(decision.recommendation);
    setCopiedId('recommendation');
    globalThis.setTimeout(() => setCopiedId(null), 2200);
  };

  const tileBaseStyle: React.CSSProperties = {
    flex: '1 1 132px',
    minWidth: 0,
    borderRadius: theme.radiusSm,
    border: `1px solid ${theme.border}`,
    background: 'rgba(255,255,255,0.03)',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  };

  return (
    <section
      className="rise"
      aria-label="결정 신뢰도"
      style={{
        marginTop: 16,
        padding: 18,
        borderRadius: theme.radius,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: FONT.subtitle,
              fontWeight: 800,
              color: theme.text,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <span aria-hidden>🧭</span>
            결정 신뢰도
          </h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: FONT.small,
              color: theme.textMuted,
              lineHeight: 1.5,
            }}
          >
            표본·격차·의견을 기준으로 지금 확정해도 될지 알려드려요.
          </p>
        </div>
        <Chip tone={decision.meta.tone === 'danger' ? 'danger' : decision.meta.tone}>
          {decision.meta.label}
        </Chip>
      </div>

      {/* 0~100 신뢰도 점수 + 막대 */}
      <div
        style={{
          borderRadius: theme.radiusSm,
          border: `1px solid ${theme.border}`,
          background: 'rgba(255,255,255,0.03)',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: FONT.small, fontWeight: 700, color: theme.textMuted }}>
            신뢰도
          </span>
          <strong
            style={{
              fontSize: 30,
              fontWeight: 900,
              color: chipColor(decision.meta.tone),
              lineHeight: 1,
            }}
          >
            {formatPercent(decision.confidenceScore)}
          </strong>
        </div>
        <ProgressBar
          percent={decision.confidenceScore}
          tone={progressTone(decision.meta.tone)}
          height={10}
        />
        <p style={{ margin: 0, fontSize: FONT.small, color: theme.textMuted, lineHeight: 1.5 }}>
          {decision.meta.summary}
        </p>
      </div>

      {/* 핵심 통계 타일 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <div style={tileBaseStyle}>
          <span style={{ fontSize: FONT.caption, fontWeight: 700, color: theme.textMuted }}>
            👥 표본
          </span>
          <strong style={{ fontSize: FONT.body, fontWeight: 800, color: theme.text }}>
            {decision.totalVotes}/{decision.minimumVotes}명
          </strong>
        </div>
        <div style={tileBaseStyle}>
          <span style={{ fontSize: FONT.caption, fontWeight: 700, color: theme.textMuted }}>
            🪢 격차
          </span>
          <strong style={{ fontSize: FONT.body, fontWeight: 800, color: theme.text }}>
            {decision.voteGap}표 · {formatPercent(decision.voteGapShare)}
          </strong>
        </div>
        <div style={tileBaseStyle}>
          <span style={{ fontSize: FONT.caption, fontWeight: 700, color: theme.textMuted }}>
            💬 의견률
          </span>
          <strong style={{ fontSize: FONT.body, fontWeight: 800, color: theme.text }}>
            {formatPercent(decision.feedbackRate)}
          </strong>
        </div>
      </div>

      {/* 리스크 타일(표본/접전/의견/마감) — active 판정은 shared, 색만 매핑 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} aria-label="결정 리스크 점검">
        {decision.riskItems.map((item) => (
          <span
            key={item.key}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: theme.radiusPill,
              padding: '6px 12px',
              fontSize: FONT.small,
              fontWeight: 700,
              border: `1px solid ${item.active ? 'rgba(244,197,96,0.32)' : 'rgba(19,194,163,0.26)'}`,
              background: item.active ? theme.goldSoft : theme.accentSoft,
              color: item.active ? theme.gold : theme.accent,
            }}
          >
            <span aria-hidden>{item.active ? '⚠️' : '✓'}</span>
            {RISK_LABEL[item.key]}
          </span>
        ))}
      </div>

      {/* 추천 다음 단계 + 공지 문구 복사 */}
      <div
        style={{
          borderRadius: theme.radiusSm,
          border: `1px solid ${theme.border}`,
          background: 'rgba(255,255,255,0.03)',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <strong style={{ fontSize: FONT.body, fontWeight: 800, color: theme.text }}>
          추천 다음 단계
        </strong>
        <p style={{ margin: 0, fontSize: FONT.small, color: theme.textMuted, lineHeight: 1.55 }}>
          {decision.meta.nextStep}
        </p>
        {onCopyText ? (
          <button
            type="button"
            className="pressable"
            onClick={handleCopy}
            style={{
              alignSelf: 'flex-start',
              marginTop: 2,
              minHeight: 40,
              padding: '8px 14px',
              borderRadius: theme.radiusSm,
              border: `1px solid ${theme.borderStrong}`,
              background: 'rgba(255,255,255,0.04)',
              color: theme.text,
              fontSize: FONT.small,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {copiedId === 'recommendation' ? '복사됨 ✓' : '결정 공지 문구 복사 📋'}
          </button>
        ) : null}
      </div>
    </section>
  );
}
