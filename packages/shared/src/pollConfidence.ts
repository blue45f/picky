import type { Poll, PollOption } from './index';
import { optionPercent } from './poll';

/**
 * 결정 신뢰도(confidence) — 투표 결과를 "지금 확정해도 되는지"로 환산하는 순수 로직.
 * web/toss 두 앱이 동일한 점수·상태·리스크 판정을 쓰도록 단일화한다.
 *
 * 플랫폼/UI 분기 없이 순수 함수만 둔다. UI 색/문구/아이콘은 앱이 상태값으로 매핑한다.
 */

/**
 * 결정 진행 상태(4상태).
 * - collect: 표본이 부족해 더 모아야 함
 * - runoff: 상위 선택지가 접전이라 결선/토론이 필요
 * - discussion: 표는 모였지만 의견(근거)이 부족
 * - ready: 확정·공지해도 되는 상태
 */
export type DecisionState = 'collect' | 'runoff' | 'discussion' | 'ready';

/** 신뢰도 점수 가중치(정책). 합이 100이 되도록 앱이 정한다. */
export interface ConfidenceWeights {
  /** 표본(참여 수) 충족도 최대 점수. */
  sample: number;
  /** 상위 격차(해석 가능성) 최대 점수. */
  margin: number;
  /** 의견(근거) 충족도 최대 점수. */
  discussion: number;
  /** 마감 시 부여 점수. */
  closedClosure: number;
  /** 진행 중일 때 부여 점수. */
  openClosure: number;
}

/** DecisionFollowUpPanel(웹) 기준 가중치 — 35/30/25/(10|5). */
export const FOLLOW_UP_CONFIDENCE_WEIGHTS: ConfidenceWeights = {
  sample: 35,
  margin: 30,
  discussion: 25,
  closedClosure: 10,
  openClosure: 5,
};

/** StakeholderReportBuilder(웹) 기준 가중치 — 40/30/20/(10|4), 고정 표본 12 기준. */
export const REPORT_CONFIDENCE_WEIGHTS: ConfidenceWeights = {
  sample: 40,
  margin: 30,
  discussion: 20,
  closedClosure: 10,
  openClosure: 4,
};

/** 신뢰도 채점 입력 정책. */
export interface ConfidenceOptions {
  /** 표본이 마감됐는지(마감이면 closure 점수 가산). */
  pollClosed: boolean;
  /** 점수 가중치(미지정 시 FOLLOW_UP_CONFIDENCE_WEIGHTS). */
  weights?: ConfidenceWeights;
  /**
   * 표본 만점 기준이 되는 최소 표본 수.
   * 미지정 시 `max(7, 선택지수 * 3)` 로 동적 산출(DecisionFollowUpPanel 방식).
   * 고정 12를 쓰려면 명시한다(StakeholderReportBuilder 방식).
   */
  minimumVotes?: number;
  /** 의견률 만점 기준(%, 기본 35). */
  feedbackTargetRate?: number;
  /** 격차 만점 기준(%, 기본 30). */
  marginTargetShare?: number;
}

/** 결과 표에서 파생되는 결정 통계(순수 계산값). */
export interface DecisionStats {
  leader: PollOption | null;
  runnerUp: PollOption | null;
  totalVotes: number;
  commentCount: number;
  /** 표본 만점 기준 표 수. */
  minimumVotes: number;
  /** 선두 득표율(%). */
  leaderShare: number;
  /** 1·2위 격차(표). */
  voteGap: number;
  /** 1·2위 격차(전체 대비 %). */
  voteGapShare: number;
  /** 의견률(전체 대비 %). */
  feedbackRate: number;
  /** 표본 부족 여부. */
  lowSample: boolean;
  /** 접전 여부(격차 1표 이하 또는 12% 이하). */
  closeRace: boolean;
  /** 의견 근거 부족 여부(표 3 이상인데 의견률 25% 미만). */
  lowDiscussion: boolean;
  /** 마감 임박 여부(진행 중 & 6시간 이내). */
  closingSoon: boolean;
}

const DEFAULT_FEEDBACK_TARGET_RATE = 35;
const DEFAULT_MARGIN_TARGET_SHARE = 30;
const CLOSING_SOON_MS = 6 * 60 * 60 * 1000;

/** 기본 최소 표본 기준 — `max(7, 선택지수 * 3)`. */
export const defaultMinimumVotes = (poll: Poll): number => Math.max(7, poll.options.length * 3);

/** 결과 표에서 결정 통계를 계산한다(순수). */
export const computeDecisionStats = (
  poll: Poll,
  options: { pollClosed: boolean; minimumVotes?: number },
): DecisionStats => {
  const comments = poll.comments || [];
  const sortedOptions = [...poll.options].sort((a, b) => b.voteCount - a.voteCount);
  const leader = sortedOptions[0] || null;
  const runnerUp = sortedOptions[1] || null;
  const totalVotes = poll.totalVotes || 0;
  const minimumVotes = options.minimumVotes ?? defaultMinimumVotes(poll);
  const leaderShare = totalVotes > 0 && leader ? optionPercent(leader.voteCount, totalVotes) : 0;
  const voteGap = leader ? leader.voteCount - (runnerUp?.voteCount || 0) : 0;
  const voteGapShare = totalVotes > 0 ? Math.round((voteGap / totalVotes) * 100) : 0;
  const feedbackRate = totalVotes > 0 ? Math.round((comments.length / totalVotes) * 100) : 0;
  const lowSample = totalVotes < minimumVotes;
  const closeRace = totalVotes > 0 && Boolean(runnerUp) && (voteGap <= 1 || voteGapShare <= 12);
  const lowDiscussion = totalVotes >= 3 && feedbackRate < 25;
  const deadlineTime = poll.endsAt ? new Date(poll.endsAt).getTime() : null;
  const hasValidDeadline = typeof deadlineTime === 'number' && Number.isFinite(deadlineTime);
  const timeUntilDeadline = hasValidDeadline ? (deadlineTime as number) - Date.now() : null;
  const closingSoon =
    !options.pollClosed &&
    typeof timeUntilDeadline === 'number' &&
    timeUntilDeadline > 0 &&
    timeUntilDeadline <= CLOSING_SOON_MS;

  return {
    leader,
    runnerUp,
    totalVotes,
    commentCount: comments.length,
    minimumVotes,
    leaderShare,
    voteGap,
    voteGapShare,
    feedbackRate,
    lowSample,
    closeRace,
    lowDiscussion,
    closingSoon,
  };
};

/** 통계로부터 결정 상태(4상태)를 판정한다. */
export const resolveDecisionState = (stats: DecisionStats): DecisionState => {
  if (!stats.leader || stats.totalVotes === 0 || stats.lowSample) {
    return 'collect';
  }
  if (stats.closeRace) {
    return 'runoff';
  }
  if (stats.lowDiscussion) {
    return 'discussion';
  }
  return 'ready';
};

/** 0~100 신뢰도 점수를 계산한다(가중치/기준은 정책 인자). */
export const computeConfidenceScore = (
  stats: DecisionStats,
  options: ConfidenceOptions,
): number => {
  const weights = options.weights ?? FOLLOW_UP_CONFIDENCE_WEIGHTS;
  const feedbackTargetRate = options.feedbackTargetRate ?? DEFAULT_FEEDBACK_TARGET_RATE;
  const marginTargetShare = options.marginTargetShare ?? DEFAULT_MARGIN_TARGET_SHARE;

  const sampleScore = Math.min(
    weights.sample,
    Math.round((stats.totalVotes / stats.minimumVotes) * weights.sample),
  );
  const marginScore = stats.runnerUp
    ? Math.min(
        weights.margin,
        Math.round((stats.voteGapShare / marginTargetShare) * weights.margin),
      )
    : weights.margin;
  const discussionScore = Math.min(
    weights.discussion,
    Math.round((stats.feedbackRate / feedbackTargetRate) * weights.discussion),
  );
  const closureScore = options.pollClosed ? weights.closedClosure : weights.openClosure;

  return Math.min(100, sampleScore + marginScore + discussionScore + closureScore);
};

/** 결정 리스크 타일(표본/접전/의견/마감) 판정값(라벨/문구는 순수, 색은 active로 앱이 매핑). */
export interface DecisionRiskItem {
  /** 리스크 키. */
  key: 'sample' | 'closeRace' | 'discussion' | 'deadline';
  /** active=주의 필요(앱에서 경고색). */
  active: boolean;
}

/** 4종 리스크 타일의 active 여부를 판정한다(문구·색은 앱 UI 담당). */
export const buildDecisionRiskItems = (stats: DecisionStats): DecisionRiskItem[] => [
  { key: 'sample', active: stats.lowSample },
  { key: 'closeRace', active: stats.closeRace },
  { key: 'discussion', active: stats.lowDiscussion },
  { key: 'deadline', active: stats.closingSoon },
];

/** 통계+점수+상태를 한 번에 묶어 돌려주는 편의 함수. */
export interface PollConfidence {
  stats: DecisionStats;
  state: DecisionState;
  confidenceScore: number;
  riskItems: DecisionRiskItem[];
}

export const evaluatePollConfidence = (poll: Poll, options: ConfidenceOptions): PollConfidence => {
  const stats = computeDecisionStats(poll, {
    pollClosed: options.pollClosed,
    minimumVotes: options.minimumVotes,
  });
  return {
    stats,
    state: resolveDecisionState(stats),
    confidenceScore: computeConfidenceScore(stats, options),
    riskItems: buildDecisionRiskItems(stats),
  };
};
