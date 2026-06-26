import { describe, expect, it } from 'vitest';
import type { Poll, PollComment } from './index';
import { buildOpinionTopics, buildOpinionTopicBriefing } from './opinionTopics';

const comment = (over: Partial<PollComment>): PollComment => ({
  id: 1,
  voterName: '익명',
  comment: '',
  createdAt: '2026-01-01T00:00:00Z',
  ...over,
});

const poll: Poll = {
  id: 'p1',
  question: '점심 메뉴?',
  options: [
    { id: 1, text: '국밥', voteCount: 5 },
    { id: 2, text: '파스타', voteCount: 2 },
  ],
  comments: [
    comment({ id: 1, comment: '국밥 든든해서 좋아요', selectedOptionId: 1 }),
    comment({ id: 2, comment: '국밥 따뜻하고 든든', selectedOptionId: 1 }),
    comment({ id: 3, comment: '파스타 분위기 좋음', selectedOptionId: 2 }),
  ],
  createdAt: '2026-01-01T00:00:00Z',
  totalVotes: 7,
};

describe('buildOpinionTopics', () => {
  it('counts comments and sorts option groups by votes', () => {
    const topics = buildOpinionTopics(poll);
    expect(topics.commentCount).toBe(3);
    expect(topics.optionGroups[0]?.optionText).toBe('국밥');
    expect(topics.maxCount).toBeGreaterThanOrEqual(1);
  });

  it('extracts repeated keywords above stopwords', () => {
    const topics = buildOpinionTopics(poll);
    expect(topics.topKeywords.some((stat) => stat.word === '국밥')).toBe(true);
  });

  it('respects custom limits', () => {
    const topics = buildOpinionTopics(poll, { topLimit: 1 });
    expect(topics.topKeywords.length).toBeLessThanOrEqual(1);
  });
});

describe('buildOpinionTopicBriefing', () => {
  it('renders the canonical briefing header and per-option block', () => {
    const briefing = buildOpinionTopicBriefing(poll, buildOpinionTopics(poll));
    expect(briefing.startsWith('[picky 의견 토픽 브리핑]')).toBe(true);
    expect(briefing).toContain('질문: 점심 메뉴?');
    expect(briefing).toContain('의견 수: 3개');
    expect(briefing).toContain('[선택지별 키워드]');
    expect(briefing).toContain('- 국밥:');
  });

  it('falls back gracefully when there are no comments', () => {
    const empty: Poll = { ...poll, comments: [] };
    const briefing = buildOpinionTopicBriefing(empty, buildOpinionTopics(empty));
    expect(briefing).toContain('반복 키워드 없음');
  });
});
