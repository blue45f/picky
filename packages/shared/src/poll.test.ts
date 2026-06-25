import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Poll } from './index';
import {
  RESULTS_VISIBILITY_LABELS,
  canRevealResults,
  isPollClosed,
  leadingOption,
  normalizeResultsVisibility,
  optionPercent,
  optionsByVotes,
} from './poll';

const makePoll = (over: Partial<Poll> = {}): Poll => ({
  id: 'p1',
  question: 'q',
  options: [],
  comments: [],
  createdAt: '2026-01-01T00:00:00Z',
  totalVotes: 0,
  ...over,
});

describe('optionPercent', () => {
  it('rounds to the nearest integer', () => {
    expect(optionPercent(1, 3)).toBe(33);
    expect(optionPercent(2, 3)).toBe(67);
    expect(optionPercent(19, 54)).toBe(35);
  });
  it('returns 0 when there are no votes', () => {
    expect(optionPercent(0, 0)).toBe(0);
  });
});

describe('leadingOption / optionsByVotes', () => {
  const poll = makePoll({
    options: [
      { id: 1, text: 'a', voteCount: 3 },
      { id: 2, text: 'b', voteCount: 7 },
      { id: 3, text: 'c', voteCount: 7 },
    ],
    totalVotes: 17,
  });

  it('leadingOption returns the highest-voted option', () => {
    expect(leadingOption(poll)?.id).toBe(2);
  });
  it('leadingOption returns null when there are no options', () => {
    expect(leadingOption(makePoll())).toBeNull();
  });
  it('optionsByVotes sorts descending with a stable tie order', () => {
    expect(optionsByVotes(poll).map((option) => option.id)).toEqual([2, 3, 1]);
  });
  it('optionsByVotes does not mutate the original order', () => {
    optionsByVotes(poll);
    expect(poll.options.map((option) => option.id)).toEqual([1, 2, 3]);
  });
});

describe('isPollClosed', () => {
  afterEach(() => vi.useRealTimers());

  it('is open without a deadline and for a null poll', () => {
    expect(isPollClosed(makePoll())).toBe(false);
    expect(isPollClosed(null)).toBe(false);
  });
  it('flips based on the deadline relative to now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-19T00:00:00Z'));
    expect(isPollClosed(makePoll({ endsAt: '2026-06-18T23:59:00Z' }))).toBe(true);
    expect(isPollClosed(makePoll({ endsAt: '2026-06-19T01:00:00Z' }))).toBe(false);
  });
});

describe('canRevealResults', () => {
  afterEach(() => vi.useRealTimers());

  it('always reveals when resultsVisibility is always (regardless of vote)', () => {
    expect(canRevealResults(makePoll({ resultsVisibility: 'always' }), false)).toBe(true);
    expect(canRevealResults(makePoll({ resultsVisibility: 'always' }), true)).toBe(true);
  });

  it('hides afterVote results until the viewer has voted', () => {
    expect(canRevealResults(makePoll({ resultsVisibility: 'afterVote' }), false)).toBe(false);
    expect(canRevealResults(makePoll({ resultsVisibility: 'afterVote' }), true)).toBe(true);
  });

  it('treats a missing resultsVisibility as afterVote', () => {
    expect(canRevealResults(makePoll(), false)).toBe(false);
    expect(canRevealResults(makePoll(), true)).toBe(true);
  });

  it('reveals afterVote results once the poll is closed even without voting', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-19T00:00:00Z'));
    const closed = makePoll({ resultsVisibility: 'afterVote', endsAt: '2026-06-18T23:00:00Z' });
    expect(canRevealResults(closed, false)).toBe(true);
  });

  it('returns false for a null/undefined poll', () => {
    expect(canRevealResults(null, true)).toBe(false);
    expect(canRevealResults(undefined, true)).toBe(false);
  });
});

describe('normalizeResultsVisibility / RESULTS_VISIBILITY_LABELS', () => {
  it('normalizes anything other than always to afterVote', () => {
    expect(normalizeResultsVisibility('always')).toBe('always');
    expect(normalizeResultsVisibility('afterVote')).toBe('afterVote');
    expect(normalizeResultsVisibility(null)).toBe('afterVote');
    expect(normalizeResultsVisibility(undefined)).toBe('afterVote');
  });

  it('exposes a label set for both visibilities', () => {
    expect(RESULTS_VISIBILITY_LABELS.always.full).toBe('실시간 결과 공개');
    expect(RESULTS_VISIBILITY_LABELS.afterVote.full).toBe('투표 후 결과 공개');
  });
});
