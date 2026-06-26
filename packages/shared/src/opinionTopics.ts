/**
 * 의견 토픽 — 한마디(댓글)에서 키워드를 뽑아 토론 주제/선택지별 대표 키워드와
 * 복사용 브리핑 텍스트를 만드는 순수 로직. web/toss 두 앱의 OpinionTopicCloud 가
 * 같은 결과·같은 브리핑을 쓰도록 단일화해요(과거엔 web 18 / toss 16 키워드로 드리프트).
 * UI(폰트 가중 칩 클라우드/색)는 앱별로 두고, 여기선 콘텐츠만 만들어요.
 */
import type { Poll } from './index';
import { extractKeywords, type KeywordStat } from './keywords';
import { optionsByVotes } from './poll';

/** 전체 토픽 클라우드에 노출할 최상위 키워드 수(web/toss 공통 캐노니컬). */
export const OPINION_TOPIC_LIMIT = 18;
/** 선택지별 대표 키워드 수. */
export const OPINION_OPTION_KEYWORD_LIMIT = 5;

export interface OpinionOptionGroup {
  optionId: number;
  optionText: string;
  voteCount: number;
  keywords: KeywordStat[];
}

export interface OpinionTopics {
  /** 의견(한마디) 총 개수. */
  commentCount: number;
  /** 전체 한마디에서 뽑은 상위 키워드(빈도순). */
  topKeywords: KeywordStat[];
  /** 폰트 가중치 계산용 최대 빈도(최소 1). */
  maxCount: number;
  /** 득표순 선택지별 대표 키워드 그룹. */
  optionGroups: OpinionOptionGroup[];
}

/**
 * 투표의 한마디를 분석해 토픽 클라우드 데이터를 만든다.
 * - topKeywords: 전체 의견에서 빈도순 상위 `topLimit`개
 * - optionGroups: 득표순 선택지별 상위 `optionLimit`개 키워드
 */
export const buildOpinionTopics = (
  poll: Poll,
  options?: { topLimit?: number; optionLimit?: number },
): OpinionTopics => {
  const topLimit = options?.topLimit ?? OPINION_TOPIC_LIMIT;
  const optionLimit = options?.optionLimit ?? OPINION_OPTION_KEYWORD_LIMIT;
  const comments = poll.comments ?? [];
  const commentTexts = comments.map((item) => item.comment).filter(Boolean);
  const topKeywords = extractKeywords(commentTexts, topLimit);
  const maxCount = Math.max(1, ...topKeywords.map((stat) => stat.count));

  const optionGroups: OpinionOptionGroup[] = optionsByVotes(poll).map((option) => {
    const optionTexts = comments
      .filter((item) => item.selectedOptionId === option.id)
      .map((item) => item.comment)
      .filter(Boolean);
    return {
      optionId: option.id,
      optionText: option.text,
      voteCount: option.voteCount,
      keywords: extractKeywords(optionTexts, optionLimit),
    };
  });

  return { commentCount: comments.length, topKeywords, maxCount, optionGroups };
};

/** 키워드 통계 배열을 `단어(N), 단어(N)` 형태로. 비면 폴백 문구. */
const formatKeywordLine = (keywords: KeywordStat[], emptyLabel: string): string =>
  keywords.length > 0
    ? keywords.map((keyword) => `${keyword.word}(${keyword.count})`).join(', ')
    : emptyLabel;

/**
 * 토픽 분석을 카카오/회의/노션에 그대로 붙여넣을 수 있는 브리핑 텍스트로.
 * web/toss 동일 출력(과거 두 앱이 각자 만들던 동일 포맷을 단일화).
 */
export const buildOpinionTopicBriefing = (poll: Poll, topics: OpinionTopics): string => {
  const keywordLine = formatKeywordLine(topics.topKeywords, '반복 키워드 없음');
  const optionLines = topics.optionGroups
    .map((group) => `- ${group.optionText}: ${formatKeywordLine(group.keywords, '키워드 없음')}`)
    .join('\n');

  return [
    '[picky 의견 토픽 브리핑]',
    `질문: ${poll.question}`,
    `의견 수: ${topics.commentCount}개`,
    `전체 반복 키워드: ${keywordLine}`,
    '',
    '[선택지별 키워드]',
    optionLines || '- 아직 선택지별 의견이 없습니다.',
  ].join('\n');
};
