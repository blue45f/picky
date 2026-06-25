import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Poll } from './index';
import {
  countPollsBySignal,
  filterPollsBySignal,
  isCloseRacePoll,
  isFeedbackRichPoll,
  isFreshPoll,
  matchesPollSignal,
} from './pollSignal';

const makePoll = (over: Partial<Poll> = {}): Poll => ({
  id: 'p1',
  question: 'q',
  options: [],
  comments: [],
  createdAt: new Date().toISOString(),
  totalVotes: 0,
  ...over,
});

describe('isCloseRacePoll', () => {
  it('is true when the top two are within 12% of total votes', () => {
    const poll = makePoll({
      options: [
        { id: 1, text: 'a', voteCount: 5 },
        { id: 2, text: 'b', voteCount: 5 },
      ],
      totalVotes: 10,
    });
    expect(isCloseRacePoll(poll)).toBe(true);
  });
  it('is false for a clear lead and for fewer than 2 votes', () => {
    expect(
      isCloseRacePoll(
        makePoll({
          options: [
            { id: 1, text: 'a', voteCount: 9 },
            { id: 2, text: 'b', voteCount: 1 },
          ],
          totalVotes: 10,
        }),
      ),
    ).toBe(false);
    expect(isCloseRacePoll(makePoll({ totalVotes: 1 }))).toBe(false);
  });
});

describe('isFreshPoll', () => {
  afterEach(() => vi.useRealTimers());
  it('is true within 3 days, false after', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T00:00:00Z'));
    expect(isFreshPoll(makePoll({ createdAt: '2026-06-24T00:00:00Z' }))).toBe(true);
    expect(isFreshPoll(makePoll({ createdAt: '2026-06-10T00:00:00Z' }))).toBe(false);
  });
});

describe('isFeedbackRichPoll', () => {
  it('is true with 2+ comments', () => {
    expect(
      isFeedbackRichPoll(
        makePoll({
          comments: [
            { id: 1, voterName: 'a', comment: 'x', createdAt: '' },
            { id: 2, voterName: 'b', comment: 'y', createdAt: '' },
          ],
        }),
      ),
    ).toBe(true);
  });
  it('is false with no comments', () => {
    expect(isFeedbackRichPoll(makePoll())).toBe(false);
  });
});

describe('matchesPollSignal / filter / count', () => {
  const close = makePoll({
    id: 'close',
    options: [
      { id: 1, text: 'a', voteCount: 5 },
      { id: 2, text: 'b', voteCount: 5 },
    ],
    totalVotes: 10,
  });
  const landslide = makePoll({
    id: 'landslide',
    options: [
      { id: 1, text: 'a', voteCount: 9 },
      { id: 2, text: 'b', voteCount: 1 },
    ],
    totalVotes: 10,
  });

  it("'all' matches everything", () => {
    expect(matchesPollSignal(landslide, 'all')).toBe(true);
  });
  it('filterPollsBySignal keeps only matching polls', () => {
    expect(filterPollsBySignal([close, landslide], 'closeRace')).toEqual([close]);
    expect(filterPollsBySignal([close, landslide], 'all')).toHaveLength(2);
  });
  it('countPollsBySignal counts matches', () => {
    expect(countPollsBySignal([close, landslide], 'closeRace')).toBe(1);
    expect(countPollsBySignal([close, landslide], 'all')).toBe(2);
  });
});
