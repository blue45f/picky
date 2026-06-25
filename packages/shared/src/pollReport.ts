import type { Poll, PollComment, PollOption } from './index';
import { optionPercent } from './poll';
import {
  REPORT_CONFIDENCE_WEIGHTS,
  computeConfidenceScore,
  computeDecisionStats,
} from './pollConfidence';

/**
 * 청중별 결과 리포트 — 같은 투표 결과를 의사결정권자/참여자/운영 회고 3가지 청중에 맞춰
 * 텍스트로 재구성하는 순수 로직. 정서(감성) 요약 + 신뢰도 점수를 함께 제공한다.
 * web/toss 두 앱이 동일 문구·판정을 쓰도록 단일화한다.
 */

/** 리포트 청중(3종). */
export type ReportAudience = 'decision' | 'participants' | 'retrospective';

/** 청중 메타(라벨/설명) — 단일 소스. */
export interface ReportAudienceConfig {
  id: ReportAudience;
  label: string;
  description: string;
}

export const REPORT_AUDIENCES: readonly [ReportAudienceConfig, ...ReportAudienceConfig[]] = [
  {
    id: 'decision',
    label: '의사결정권자',
    description: '결론, 표본, 격차, 리스크를 압축해 보고합니다.',
  },
  {
    id: 'participants',
    label: '참여자 공지',
    description: '참여해준 사람들에게 결과와 다음 단계를 공유합니다.',
  },
  {
    id: 'retrospective',
    label: '운영 회고',
    description: '참여율, 의견률, 개선 포인트를 다음 투표에 남깁니다.',
  },
];

const POSITIVE_WORDS = ['좋', '추천', '찬성', '효율', '빠르', '쉬', '만족', '필요', '선호'];
const NEGATIVE_WORDS = ['걱정', '문제', '리스크', '어렵', '불안', '비싸', '부담', '반대', '복잡'];

const countMatches = (text: string, keywords: string[]): number => {
  const normalized = text.toLowerCase();
  return keywords.reduce(
    (count, keyword) => count + (normalized.includes(keyword.toLowerCase()) ? 1 : 0),
    0,
  );
};

/** 정서(감성) 요약. */
export interface SentimentLabel {
  label: '긍정 우세' | '리스크 우세' | '중립';
  help: string;
}

/** 한마디(댓글)들의 긍/부정 단어 매칭으로 정서를 판정한다(순수). */
export const getSentimentLabel = (comments: PollComment[]): SentimentLabel => {
  const score = comments.reduce((total, commentItem) => {
    const positive = countMatches(commentItem.comment, POSITIVE_WORDS);
    const negative = countMatches(commentItem.comment, NEGATIVE_WORDS);
    return total + positive - negative;
  }, 0);

  if (score > 1) {
    return { label: '긍정 우세', help: '찬성/선호 근거가 상대적으로 많습니다.' };
  }
  if (score < -1) {
    return { label: '리스크 우세', help: '우려나 반대 신호를 먼저 정리해야 합니다.' };
  }
  return { label: '중립', help: '찬반 신호가 혼재되어 있습니다.' };
};

interface ReportTextInput {
  audience: ReportAudience;
  confidenceScore: number;
  feedbackRate: number;
  leaderLine: string;
  poll: Poll;
  pollClosed: boolean;
  sentimentLabel: string;
  shareUrl: string;
  voteGap: number;
  voteGapShare: number;
}

/** 청중별 리포트 텍스트 본문을 만든다(StakeholderReportBuilder 동일 문구). */
export const buildReportText = (input: ReportTextInput): string => {
  const {
    audience,
    confidenceScore,
    feedbackRate,
    leaderLine,
    poll,
    pollClosed,
    sentimentLabel,
    shareUrl,
    voteGap,
    voteGapShare,
  } = input;

  const topComments = poll.comments
    .slice(0, 3)
    .map(
      (commentItem, index) =>
        `${index + 1}. ${commentItem.comment} - ${commentItem.voterName || '익명'}`,
    )
    .join('\n');

  if (audience === 'participants') {
    return [
      `[picky 결과 공유]`,
      `질문: ${poll.question}`,
      `결과: ${leaderLine}`,
      `참여: ${poll.totalVotes}명 · 의견 ${poll.comments.length}개`,
      `상태: ${pollClosed ? '마감' : '진행 중'}`,
      '',
      '참여해주셔서 감사합니다. 남겨주신 선택과 의견은 다음 결정/실행에 반영하겠습니다.',
      `결과 확인: ${shareUrl}`,
    ].join('\n');
  }

  if (audience === 'retrospective') {
    return [
      `[picky 운영 회고]`,
      `질문: ${poll.question}`,
      `참여: ${poll.totalVotes}명`,
      `의견: ${poll.comments.length}개`,
      `의견률: ${feedbackRate}%`,
      `정서: ${sentimentLabel}`,
      `결정 신뢰도: ${confidenceScore}%`,
      '',
      '[개선 포인트]',
      poll.totalVotes < 8
        ? '- 표본이 작습니다. 다음에는 공유 채널과 리마인더를 늘리세요.'
        : '- 표본은 기본 기준을 충족했습니다.',
      feedbackRate < 25
        ? '- 의견률이 낮습니다. 선택 이유 입력을 더 강하게 유도하세요.'
        : '- 의견 근거가 충분히 쌓였습니다.',
      voteGapShare < 12
        ? '- 표 차이가 작습니다. 결선이나 짧은 토론을 고려하세요.'
        : '- 선두 흐름이 비교적 명확합니다.',
      '',
      `결과 링크: ${shareUrl}`,
    ].join('\n');
  }

  return [
    `[picky 의사결정 리포트]`,
    `질문: ${poll.question}`,
    `권고안: ${leaderLine}`,
    `참여: ${poll.totalVotes}명 · 의견 ${poll.comments.length}개`,
    `격차: ${voteGap}표 (${voteGapShare}%)`,
    `정서: ${sentimentLabel}`,
    `결정 신뢰도: ${confidenceScore}%`,
    `상태: ${pollClosed ? '마감' : '진행 중'}`,
    '',
    '[대표 의견]',
    topComments || '아직 대표 의견이 없습니다.',
    '',
    `근거 링크: ${shareUrl}`,
  ].join('\n');
};

/** 청중별 리포트 산출물(텍스트 + 파생값). */
export interface PollReport {
  activeAudience: ReportAudienceConfig;
  leader: PollOption | null;
  leaderLine: string;
  confidenceScore: number;
  feedbackRate: number;
  voteGap: number;
  voteGapShare: number;
  sentiment: SentimentLabel;
  reportText: string;
}

/** 리포트 빌드 입력. */
export interface BuildPollReportInput {
  poll: Poll;
  shareUrl: string;
  pollClosed: boolean;
  audience: ReportAudience;
}

/**
 * 청중·정서·신뢰도를 종합해 리포트를 만든다(StakeholderReportBuilder 동일 산출).
 * 신뢰도는 REPORT_CONFIDENCE_WEIGHTS + 고정 표본 12 기준을 쓴다.
 */
export const buildPollReport = (input: BuildPollReportInput): PollReport => {
  const { poll, shareUrl, pollClosed, audience } = input;
  const stats = computeDecisionStats(poll, { pollClosed, minimumVotes: 12 });
  const confidenceScore = computeConfidenceScore(stats, {
    pollClosed,
    weights: REPORT_CONFIDENCE_WEIGHTS,
    minimumVotes: 12,
  });
  const leaderShare =
    poll.totalVotes > 0 && stats.leader
      ? optionPercent(stats.leader.voteCount, poll.totalVotes)
      : 0;
  const sentiment = getSentimentLabel(poll.comments || []);
  const leaderLine = stats.leader
    ? `${stats.leader.text} (${stats.leader.voteCount}표, ${leaderShare}%)`
    : '아직 선두 선택지 없음';
  const activeAudience =
    REPORT_AUDIENCES.find((item) => item.id === audience) || REPORT_AUDIENCES[0];
  const reportText = buildReportText({
    audience,
    confidenceScore,
    feedbackRate: stats.feedbackRate,
    leaderLine,
    poll,
    pollClosed,
    sentimentLabel: sentiment.label,
    shareUrl,
    voteGap: stats.voteGap,
    voteGapShare: stats.voteGapShare,
  });

  return {
    activeAudience,
    leader: stats.leader,
    leaderLine,
    confidenceScore,
    feedbackRate: stats.feedbackRate,
    voteGap: stats.voteGap,
    voteGapShare: stats.voteGapShare,
    sentiment,
    reportText,
  };
};
