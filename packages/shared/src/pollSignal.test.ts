import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Poll } from './index';
import {
  CLOSING_SOON_MS,
  SIGNAL_CHIP_LABELS,
  SIGNAL_OPTIONS,
  countPollsBySignal,
  countPollsBySignalForViewer,
  filterPollsBySignal,
  filterPollsBySignalForViewer,
  hottestActivePoll,
  isCloseRacePoll,
  isClosingSoonPoll,
  isDeadlineSoon,
  isFeedbackRichPoll,
  isFreshPoll,
  isResultDerivedSignal,
  matchesPollSignal,
  matchesPollSignalForViewer,
  pollEngagementScore,
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

describe('pollEngagementScore / hottestActivePoll', () => {
  afterEach(() => vi.useRealTimers());

  it('scores votes plus comments weighted x3', () => {
    expect(
      pollEngagementScore(
        makePoll({
          totalVotes: 4,
          comments: [
            { id: 1, voterName: 'a', comment: 'x', createdAt: '' },
            { id: 2, voterName: 'b', comment: 'y', createdAt: '' },
          ],
        }),
      ),
    ).toBe(10);
  });

  it('returns null when there are no active polls', () => {
    expect(hottestActivePoll([])).toBeNull();
  });

  it('picks the highest-engagement active poll and ignores closed ones', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T00:00:00Z'));
    const quiet = makePoll({ id: 'quiet', totalVotes: 2 });
    const loud = makePoll({
      id: 'loud',
      totalVotes: 3,
      comments: [{ id: 1, voterName: 'a', comment: 'x', createdAt: '' }],
    });
    const closedButLoud = makePoll({
      id: 'closed',
      totalVotes: 100,
      endsAt: '2026-06-24T00:00:00Z',
    });
    expect(hottestActivePoll([quiet, loud, closedButLoud])?.id).toBe('loud');
  });

  it('keeps the first poll on an engagement tie', () => {
    const first = makePoll({ id: 'first', totalVotes: 5 });
    const second = makePoll({ id: 'second', totalVotes: 5 });
    expect(hottestActivePoll([first, second])?.id).toBe('first');
  });
});

describe('isDeadlineSoon / CLOSING_SOON_MS', () => {
  afterEach(() => vi.useRealTimers());

  it('exports the 24h closing threshold', () => {
    expect(CLOSING_SOON_MS).toBe(24 * 60 * 60 * 1000);
  });

  it('is true only within the threshold and still in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T00:00:00Z'));
    expect(isDeadlineSoon(null)).toBe(false);
    expect(isDeadlineSoon(undefined)).toBe(false);
    expect(isDeadlineSoon('not-a-date')).toBe(false);
    // 23h ahead → 임박.
    expect(isDeadlineSoon('2026-06-20T23:00:00Z')).toBe(true);
    // 25h ahead → 아직 멀음.
    expect(isDeadlineSoon('2026-06-21T01:00:00Z')).toBe(false);
    // 이미 지남(과거) → false.
    expect(isDeadlineSoon('2026-06-19T23:00:00Z')).toBe(false);
  });

  it('agrees with isClosingSoonPoll on the same threshold', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T00:00:00Z'));
    const endsAt = '2026-06-20T12:00:00Z';
    expect(isDeadlineSoon(endsAt)).toBe(true);
    expect(isClosingSoonPoll(makePoll({ endsAt }))).toBe(true);
  });
});

describe('isResultDerivedSignal', () => {
  it('is true only for result-derived signals (closeRace / feedbackRich)', () => {
    expect(isResultDerivedSignal('closeRace')).toBe(true);
    expect(isResultDerivedSignal('feedbackRich')).toBe(true);
    expect(isResultDerivedSignal('fresh')).toBe(false);
    expect(isResultDerivedSignal('closingSoon')).toBe(false);
    expect(isResultDerivedSignal('all')).toBe(false);
  });
});

describe('SIGNAL_CHIP_LABELS / SIGNAL_OPTIONS', () => {
  it('exposes 5 options whose labels come from SIGNAL_CHIP_LABELS', () => {
    expect(SIGNAL_OPTIONS).toHaveLength(5);
    for (const option of SIGNAL_OPTIONS) {
      expect(option.label).toBe(SIGNAL_CHIP_LABELS[option.value]);
    }
  });
  it('uses the canonical feedbackRich label', () => {
    expect(SIGNAL_CHIP_LABELS.feedbackRich).toBe('한마디 많은 💬');
    expect(SIGNAL_OPTIONS.find((option) => option.value === 'feedbackRich')?.label).toBe(
      '한마디 많은 💬',
    );
  });
});

describe('matchesPollSignalForViewer (result-derived gating)', () => {
  afterEach(() => vi.useRealTimers());

  const voted = () => true;
  const notVoted = () => false;

  const closeOptions = [
    { id: 1, text: 'a', voteCount: 5 },
    { id: 2, text: 'b', voteCount: 5 },
  ];
  const richComments = [
    { id: 1, voterName: 'a', comment: 'x', createdAt: '' },
    { id: 2, voterName: 'b', comment: 'y', createdAt: '' },
  ];

  it('gates an open afterVote close-race poll behind a vote', () => {
    const poll = makePoll({
      options: closeOptions,
      totalVotes: 10,
      resultsVisibility: 'afterVote',
      endsAt: null,
    });
    expect(matchesPollSignalForViewer(poll, 'closeRace', notVoted)).toBe(false);
    expect(matchesPollSignalForViewer(poll, 'closeRace', voted)).toBe(true);
  });

  it('matches an always-visible close-race poll even without a vote', () => {
    const poll = makePoll({
      options: closeOptions,
      totalVotes: 10,
      resultsVisibility: 'always',
      endsAt: null,
    });
    expect(matchesPollSignalForViewer(poll, 'closeRace', notVoted)).toBe(true);
  });

  it('matches a closed close-race poll even without a vote (closed reveals results)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T00:00:00Z'));
    const poll = makePoll({
      options: closeOptions,
      totalVotes: 10,
      resultsVisibility: 'afterVote',
      endsAt: '2026-06-24T00:00:00Z',
    });
    expect(matchesPollSignalForViewer(poll, 'closeRace', notVoted)).toBe(true);
  });

  it('gates an open afterVote feedbackRich poll behind a vote', () => {
    const poll = makePoll({
      comments: richComments,
      resultsVisibility: 'afterVote',
      endsAt: null,
    });
    expect(matchesPollSignalForViewer(poll, 'feedbackRich', notVoted)).toBe(false);
    expect(matchesPollSignalForViewer(poll, 'feedbackRich', voted)).toBe(true);
  });

  it('does not gate non-result signals like fresh regardless of vote state', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T00:00:00Z'));
    const poll = makePoll({
      createdAt: '2026-06-25T00:00:00Z',
      resultsVisibility: 'afterVote',
      endsAt: null,
    });
    expect(matchesPollSignalForViewer(poll, 'fresh', notVoted)).toBe(true);
    expect(matchesPollSignalForViewer(poll, 'fresh', voted)).toBe(true);
  });
});

describe('filterPollsBySignalForViewer / countPollsBySignalForViewer', () => {
  const closeA = makePoll({
    id: 'closeA',
    options: [
      { id: 1, text: 'a', voteCount: 5 },
      { id: 2, text: 'b', voteCount: 5 },
    ],
    totalVotes: 10,
    resultsVisibility: 'afterVote',
    endsAt: null,
  });
  const closeB = makePoll({
    id: 'closeB',
    options: [
      { id: 1, text: 'a', voteCount: 4 },
      { id: 2, text: 'b', voteCount: 4 },
    ],
    totalVotes: 8,
    resultsVisibility: 'afterVote',
    endsAt: null,
  });

  const votedForA = (poll: Poll) => poll.id === 'closeA';

  it('reflects per-poll gating over the array', () => {
    expect(
      filterPollsBySignalForViewer([closeA, closeB], 'closeRace', votedForA).map((poll) => poll.id),
    ).toEqual(['closeA']);
    expect(countPollsBySignalForViewer([closeA, closeB], 'closeRace', votedForA)).toBe(1);
  });

  it("returns all polls for 'all' regardless of vote state", () => {
    expect(filterPollsBySignalForViewer([closeA, closeB], 'all', () => false)).toHaveLength(2);
    expect(countPollsBySignalForViewer([closeA, closeB], 'all', () => false)).toBe(2);
  });
});
