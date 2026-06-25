import { describe, expect, it } from 'vitest';
import type { Poll } from './index';
import { buildActionPlan, buildDecisionMemo } from './decisionMemo';

const makePoll = (over: Partial<Poll> = {}): Poll => ({
  id: 'abc123',
  question: '점심 뭐 먹지?',
  options: [
    { id: 1, text: '김치찌개', voteCount: 7 },
    { id: 2, text: '파스타', voteCount: 3 },
  ],
  comments: [],
  createdAt: '2026-01-01T00:00:00Z',
  totalVotes: 10,
  ...over,
});

describe('buildDecisionMemo', () => {
  it('renders the [picky 결정 메모] block with leader and consensus', () => {
    const memo = buildDecisionMemo({
      poll: makePoll(),
      shareUrl: 'https://picky.io/p/abc123',
      pollClosed: false,
      consensusLabel: '우세',
      decisionHint: '상위 선택지에 의견이 모이고 있습니다.',
    });
    expect(memo).toContain('[picky 결정 메모] 점심 뭐 먹지?');
    expect(memo).toContain('상태: 우세');
    expect(memo).toContain('선두: 김치찌개 (7표, 70%)');
    expect(memo).toContain('참여: 10명 · 의견 0개 · 격차 4표');
    expect(memo).toContain('해석: 상위 선택지에 의견이 모이고 있습니다.');
    expect(memo).toContain('대표 의견: 아직 없음');
    expect(memo).toContain('결과 링크: https://picky.io/p/abc123');
  });

  it('shows 마감 status when closed and uses latest comment as 대표 의견', () => {
    const memo = buildDecisionMemo({
      poll: makePoll({
        comments: [
          { id: 1, voterName: '민수', comment: '먼저', createdAt: '2026-01-01T01:00:00Z' },
          { id: 2, voterName: '지영', comment: '제일 최근', createdAt: '2026-01-02T00:00:00Z' },
        ],
      }),
      shareUrl: 'https://picky.io/p/abc123',
      pollClosed: true,
      consensusLabel: '우세',
      decisionHint: 'hint',
    });
    expect(memo).toContain('상태: 마감');
    expect(memo).toContain('대표 의견: 제일 최근 - 지영');
  });

  it('respects explicit leadingOption/voteGap overrides', () => {
    const memo = buildDecisionMemo({
      poll: makePoll(),
      shareUrl: 's',
      pollClosed: false,
      consensusLabel: '접전',
      decisionHint: 'h',
      leadingOption: { id: 2, text: '파스타', voteCount: 3 },
      leadingShare: 30,
      voteGap: 1,
    });
    expect(memo).toContain('선두: 파스타 (3표, 30%)');
    expect(memo).toContain('격차 1표');
  });
});

describe('buildActionPlan', () => {
  it('builds handoff items, steps, markdown and announcement', () => {
    const plan = buildActionPlan({
      poll: makePoll({
        comments: [
          {
            id: 1,
            voterName: '민수',
            comment: '가성비',
            createdAt: '2026-01-01T00:00:00Z',
            selectedOptionId: 1,
          },
        ],
      }),
      shareUrl: 'https://picky.io/p/abc123',
      owner: '제품팀',
      dueDate: '2026-01-10',
    });
    expect(plan.selectedDecision).toBe('김치찌개 (7표, 70%)');
    expect(plan.assignee).toBe('제품팀');
    expect(plan.handoffItems.map((i) => i.key)).toEqual([
      'owner',
      'dueDate',
      'decision',
      'evidence',
    ]);
    expect(plan.handoffItems.find((i) => i.key === 'owner')?.ready).toBe(true);
    expect(plan.representativeComments).toHaveLength(1);
    expect(plan.markdown).toContain('[picky 액션 플랜]');
    expect(plan.markdown).toContain('담당자: 제품팀');
    expect(plan.markdown).toContain('기한: 2026-01-10');
    expect(plan.markdown).toContain('- 담당자: 제품팀 (준비됨)');
    expect(plan.announcement).toContain('[결정 공지] 점심 뭐 먹지?');
    expect(plan.announcement).toContain('1위와 2위 격차는 4표입니다.');
  });

  it('falls back to placeholders when owner/dueDate empty', () => {
    const plan = buildActionPlan({
      poll: makePoll(),
      shareUrl: 's',
      owner: '   ',
      dueDate: '',
    });
    expect(plan.assignee).toBe('담당자 지정 필요');
    expect(plan.dueDateLabel).toBe('기한 미정');
    expect(plan.handoffItems.find((i) => i.key === 'owner')?.ready).toBe(false);
    expect(plan.markdown).toContain('기한: 기한 미정');
  });
});
