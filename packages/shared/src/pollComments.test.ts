import { describe, expect, it } from 'vitest';
import type { Poll, PollComment } from './index';
import { buildCommentViews, COMMENT_VIEW_OPTIONS } from './pollComments';

const comment = (over: Partial<PollComment>): PollComment => ({
  id: 1,
  voterName: '익명',
  comment: '',
  createdAt: '2026-01-01T00:00:00Z',
  ...over,
});

const poll: Poll = {
  id: 'p1',
  question: 'Q',
  options: [
    { id: 1, text: 'A', voteCount: 2 },
    { id: 2, text: 'B', voteCount: 1 },
  ],
  comments: [
    comment({
      id: 1,
      comment: '짧은 의견',
      selectedOptionId: 1,
      createdAt: '2026-01-01T01:00:00Z',
    }),
    comment({
      id: 2,
      comment: '아주 길고 자세하게 적은 핵심 의견입니다 그래서 길어요',
      selectedOptionId: 2,
      createdAt: '2026-01-01T02:00:00Z',
    }),
    comment({ id: 3, comment: '답글이에요', parentId: 1, createdAt: '2026-01-01T03:00:00Z' }),
  ],
  createdAt: '2026-01-01T00:00:00Z',
  totalVotes: 3,
};

describe('buildCommentViews', () => {
  it('exposes 3 canonical view modes', () => {
    expect(COMMENT_VIEW_OPTIONS.map((option) => option.value)).toEqual([
      'latest',
      'byOption',
      'highlights',
    ]);
  });

  it('latest sorts newest first', () => {
    const { visibleComments } = buildCommentViews({
      poll,
      commentFilter: 'all',
      commentViewMode: 'latest',
    });
    expect(visibleComments[0]?.id).toBe(3);
  });

  it('highlights surfaces the longest comment first', () => {
    const { visibleComments } = buildCommentViews({
      poll,
      commentFilter: 'all',
      commentViewMode: 'highlights',
    });
    expect(visibleComments[0]?.id).toBe(2);
  });

  it('per-option filter narrows to the matching option', () => {
    const { visibleComments } = buildCommentViews({
      poll,
      commentFilter: 1,
      commentViewMode: 'latest',
    });
    expect(visibleComments.every((item) => item.selectedOptionId === 1)).toBe(true);
  });

  it('computes per-option filter counts', () => {
    const { commentFilterOptions } = buildCommentViews({
      poll,
      commentFilter: 'all',
      commentViewMode: 'latest',
    });
    expect(commentFilterOptions.find((option) => option.id === 1)?.count).toBe(1);
    expect(commentFilterOptions.find((option) => option.id === 2)?.count).toBe(1);
  });

  it('gives a mode-aware empty message', () => {
    const empty: Poll = { ...poll, comments: [] };
    expect(
      buildCommentViews({ poll: empty, commentFilter: 'all', commentViewMode: 'highlights' })
        .emptyCommentMessage,
    ).toContain('핵심 의견');
  });
});
