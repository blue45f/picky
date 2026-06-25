/**
 * 결정 메모 / 액션 플랜 시트 — 웹 PollDetail(decisionMemo) + ActionItemPlanner 의 토스 포팅.
 * 메모 텍스트·액션 플랜(핸드오프/단계/마크다운/공지문)·합의 라벨은 전부 @picky/shared 에서
 * 소비해요(buildDecisionMemo·buildActionPlan·buildConsensusNarrative). 여기선 담당자·마감
 * 입력(최소)과 마크다운 복사 UI만 토스 카드로 렌더해요(로직 중복 0).
 */
import { useMemo, useState } from 'react';
import type { Poll } from '../shared';
import {
  buildActionPlan,
  buildConsensusNarrative,
  buildDecisionMemo,
  leadingOption,
  optionPercent,
} from '../shared';
import { theme, FONT } from '../theme';

type DecisionMemoSheetProps = Readonly<{
  poll: Poll;
  shareUrl: string;
  pollClosed: boolean;
  /** 마크다운/공지 복사(상위가 토스트·햅틱). 미전달 시 복사 버튼 숨김. */
  onCopyText?: (text: string) => void;
}>;

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '10px 14px',
  borderRadius: theme.radiusSm,
  border: `1px solid ${theme.borderStrong}`,
  background: theme.surface,
  color: theme.text,
  // iOS 16px 미만 입력 포커스 시 줌 방지 플로어.
  fontSize: 16,
  outline: 'none',
};

/** 오늘 + offsetDays 의 YYYY-MM-DD(로컬). 마감 기본값 placeholder. */
const localDateValue = (offsetDays: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

export function DecisionMemoSheet({
  poll,
  shareUrl,
  pollClosed,
  onCopyText,
}: DecisionMemoSheetProps) {
  const [owner, setOwner] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 합의 라벨/해석은 web/toss 공통 buildConsensusNarrative 로 — 메모의 상태/해석 문구 단일화.
  const memo = useMemo(() => {
    const leader = poll.totalVotes > 0 ? leadingOption(poll) : null;
    const leadingShare = leader ? optionPercent(leader.voteCount, poll.totalVotes) : 0;
    const sorted = [...poll.options].sort((a, b) => b.voteCount - a.voteCount);
    const voteGap = leader ? leader.voteCount - (sorted[1]?.voteCount ?? 0) : 0;
    const { consensusLabel, decisionHint } = buildConsensusNarrative({
      poll,
      voteGap,
      leadingShare,
    });
    return buildDecisionMemo({
      poll,
      shareUrl,
      pollClosed,
      consensusLabel,
      decisionHint,
      leadingOption: leader,
      leadingShare,
      voteGap,
    });
  }, [poll, shareUrl, pollClosed]);

  const plan = useMemo(
    () => buildActionPlan({ poll, shareUrl, owner, dueDate }),
    [poll, shareUrl, owner, dueDate],
  );

  const copy = (id: string, text: string) => {
    if (!onCopyText) {
      return;
    }
    onCopyText(text);
    setCopiedId(id);
    globalThis.setTimeout(() => setCopiedId(null), 2200);
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: FONT.small,
    fontWeight: 700,
    color: theme.textMuted,
  };

  const copyButtonStyle: React.CSSProperties = {
    flex: '1 1 140px',
    minHeight: 46,
    borderRadius: theme.radiusSm,
    border: `1px solid ${theme.borderStrong}`,
    background: 'rgba(255,255,255,0.04)',
    color: theme.text,
    fontSize: FONT.small,
    fontWeight: 800,
    cursor: 'pointer',
  };

  return (
    <section
      className="rise"
      aria-label="결정 메모와 액션 플랜"
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
          <span aria-hidden>📝</span>
          결정 메모 · 액션 플랜
        </h2>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: FONT.small,
            color: theme.textMuted,
            lineHeight: 1.5,
          }}
        >
          결과를 회의록·공지로 바로 옮길 수 있게 정리했어요. 담당자·마감만 채우면 더 또렷해져요.
        </p>
      </div>

      {/* 담당자·마감 최소 입력 — 빈 값이면 placeholder 문구로 대체(shared 책임). */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <label style={{ ...labelStyle, flex: '1 1 150px', minWidth: 0 }}>
          <span>👤 담당자</span>
          <input
            type="text"
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="예: 김희준, 제품팀"
            aria-label="실행 담당자"
            maxLength={40}
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flex: '1 1 150px', minWidth: 0 }}>
          <span>🗓️ 후속 점검일</span>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            placeholder={localDateValue(7)}
            aria-label="후속 점검일"
            style={inputStyle}
          />
        </label>
      </div>

      {/* 결정안 요약 한 줄 */}
      <div
        style={{
          borderRadius: theme.radiusSm,
          border: `1px solid ${theme.border}`,
          background: 'rgba(255,255,255,0.03)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <span style={{ fontSize: FONT.caption, fontWeight: 700, color: theme.textMuted }}>
          🎯 결정안
        </span>
        <strong style={{ fontSize: FONT.body, fontWeight: 800, color: theme.text }}>
          {plan.selectedDecision}
        </strong>
        <span style={{ fontSize: FONT.caption, color: theme.textFaint }}>
          대표 의견 {plan.representativeComments.length}개 ·{' '}
          {owner.trim() && dueDate ? '실행 준비됨' : '담당자·마감 보완 권장'}
        </span>
      </div>

      {/* 공지 미리보기 */}
      <div
        style={{
          borderRadius: theme.radiusSm,
          border: `1px solid ${theme.border}`,
          background: 'rgba(255,255,255,0.03)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <span style={{ fontSize: FONT.caption, fontWeight: 700, color: theme.textMuted }}>
          📣 공지 미리보기
        </span>
        <p
          style={{
            margin: 0,
            fontSize: FONT.small,
            color: theme.textMuted,
            lineHeight: 1.6,
            whiteSpace: 'pre-line',
          }}
        >
          {plan.announcement}
        </p>
      </div>

      {/* 복사 액션(메모/액션플랜/공지) */}
      {onCopyText ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            className="pressable"
            onClick={() => copy('memo', memo)}
            style={copyButtonStyle}
          >
            {copiedId === 'memo' ? '복사됨 ✓' : '결정 메모 복사 📋'}
          </button>
          <button
            type="button"
            className="pressable"
            onClick={() => copy('plan', plan.markdown)}
            style={copyButtonStyle}
          >
            {copiedId === 'plan' ? '복사됨 ✓' : '액션 플랜 복사 🧾'}
          </button>
          <button
            type="button"
            className="pressable"
            onClick={() => copy('announce', plan.announcement)}
            style={copyButtonStyle}
          >
            {copiedId === 'announce' ? '복사됨 ✓' : '공지문 복사 📣'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
