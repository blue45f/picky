import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Poll } from './index';
import {
  FOLLOW_UP_CONFIDENCE_WEIGHTS,
  REPORT_CONFIDENCE_WEIGHTS,
  buildDecisionRiskItems,
  computeConfidenceScore,
  computeDecisionStats,
  defaultMinimumVotes,
  evaluatePollConfidence,
  resolveDecisionState,
} from './pollConfidence';

const makePoll = (over: Partial<Poll> = {}): Poll => ({
  id: 'p1',
  question: 'q',
  options: [
    { id: 1, text: 'a', voteCount: 0 },
    { id: 2, text: 'b', voteCount: 0 },
  ],
  comments: [],
  createdAt: new Date().toISOString(),
  totalVotes: 0,
  ...over,
});

afterEach(() => {
  vi.useRealTimers();
});

describe('defaultMinimumVotes', () => {
  it('is at least 7 and scales with option count', () => {
    expect(defaultMinimumVotes(makePoll())).toBe(7);
    expect(
      defaultMinimumVotes(
        makePoll({
          options: Array.from({ length: 4 }, (_, i) => ({ id: i, text: 't', voteCount: 0 })),
        }),
      ),
    ).toBe(12);
  });
});

describe('computeDecisionStats', () => {
  it('computes leader/runnerUp/gap/share', () => {
    const poll = makePoll({
      totalVotes: 10,
      options: [
        { id: 1, text: 'a', voteCount: 7 },
        { id: 2, text: 'b', voteCount: 3 },
      ],
      comments: [{ id: 1, voterName: 'x', comment: 'c', createdAt: new Date().toISOString() }],
    });
    const stats = computeDecisionStats(poll, { pollClosed: false });
    expect(stats.leader?.id).toBe(1);
    expect(stats.runnerUp?.id).toBe(2);
    expect(stats.leaderShare).toBe(70);
    expect(stats.voteGap).toBe(4);
    expect(stats.voteGapShare).toBe(40);
    expect(stats.feedbackRate).toBe(10);
  });

  it('flags closeRace when gap within 1 vote', () => {
    const poll = makePoll({
      totalVotes: 10,
      options: [
        { id: 1, text: 'a', voteCount: 5 },
        { id: 2, text: 'b', voteCount: 5 },
      ],
    });
    expect(computeDecisionStats(poll, { pollClosed: false }).closeRace).toBe(true);
  });

  it('flags closingSoon when deadline within 6h and open', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const poll = makePoll({
      totalVotes: 5,
      endsAt: new Date('2026-01-01T03:00:00Z').toISOString(),
    });
    expect(computeDecisionStats(poll, { pollClosed: false }).closingSoon).toBe(true);
    expect(computeDecisionStats(poll, { pollClosed: true }).closingSoon).toBe(false);
  });
});

describe('resolveDecisionState', () => {
  it('collect when low sample', () => {
    const poll = makePoll({
      totalVotes: 2,
      options: [
        { id: 1, text: 'a', voteCount: 2 },
        { id: 2, text: 'b', voteCount: 0 },
      ],
    });
    expect(resolveDecisionState(computeDecisionStats(poll, { pollClosed: false }))).toBe('collect');
  });

  it('runoff when close race with enough sample', () => {
    const poll = makePoll({
      totalVotes: 12,
      options: [
        { id: 1, text: 'a', voteCount: 6 },
        { id: 2, text: 'b', voteCount: 6 },
      ],
      comments: Array.from({ length: 6 }, (_, i) => ({
        id: i,
        voterName: 'x',
        comment: 'c',
        createdAt: new Date().toISOString(),
      })),
    });
    expect(resolveDecisionState(computeDecisionStats(poll, { pollClosed: false }))).toBe('runoff');
  });

  it('discussion when sample ok but low feedback', () => {
    const poll = makePoll({
      totalVotes: 12,
      options: [
        { id: 1, text: 'a', voteCount: 10 },
        { id: 2, text: 'b', voteCount: 2 },
      ],
      comments: [],
    });
    expect(resolveDecisionState(computeDecisionStats(poll, { pollClosed: false }))).toBe(
      'discussion',
    );
  });

  it('ready when sample, margin and feedback are solid', () => {
    const poll = makePoll({
      totalVotes: 12,
      options: [
        { id: 1, text: 'a', voteCount: 10 },
        { id: 2, text: 'b', voteCount: 2 },
      ],
      comments: Array.from({ length: 6 }, (_, i) => ({
        id: i,
        voterName: 'x',
        comment: 'c',
        createdAt: new Date().toISOString(),
      })),
    });
    expect(resolveDecisionState(computeDecisionStats(poll, { pollClosed: false }))).toBe('ready');
  });
});

describe('computeConfidenceScore', () => {
  it('matches DecisionFollowUpPanel formula (35/30/25/closure)', () => {
    const poll = makePoll({
      totalVotes: 10,
      options: [
        { id: 1, text: 'a', voteCount: 7 },
        { id: 2, text: 'b', voteCount: 3 },
      ],
      comments: Array.from({ length: 4 }, (_, i) => ({
        id: i,
        voterName: 'x',
        comment: 'c',
        createdAt: new Date().toISOString(),
      })),
    });
    const stats = computeDecisionStats(poll, { pollClosed: false });
    // minimumVotes=7, sample=min(35,round(10/7*35))=35, voteGapShare=40 -> margin=30,
    // feedbackRate=40 -> discussion=min(25,round(40/35*25))=25, closure(open)=5 => 95
    expect(computeConfidenceScore(stats, { pollClosed: false })).toBe(95);
  });

  it('uses report weights + fixed minimum 12 (StakeholderReportBuilder formula)', () => {
    const poll = makePoll({
      totalVotes: 6,
      options: [
        { id: 1, text: 'a', voteCount: 4 },
        { id: 2, text: 'b', voteCount: 2 },
      ],
      comments: [{ id: 1, voterName: 'x', comment: 'c', createdAt: new Date().toISOString() }],
    });
    const stats = computeDecisionStats(poll, { pollClosed: false, minimumVotes: 12 });
    // sample=min(40,round(6/12*40))=20, voteGapShare=33 -> margin=min(30,round(33/30*30))=30,
    // feedbackRate=17 -> feedback=min(20,round(17/35*20))=10, closure(open)=4 => 64
    const score = computeConfidenceScore(stats, {
      pollClosed: false,
      weights: REPORT_CONFIDENCE_WEIGHTS,
      minimumVotes: 12,
    });
    expect(score).toBe(64);
  });

  it('caps at 100', () => {
    const poll = makePoll({
      totalVotes: 100,
      options: [
        { id: 1, text: 'a', voteCount: 90 },
        { id: 2, text: 'b', voteCount: 10 },
      ],
      comments: Array.from({ length: 80 }, (_, i) => ({
        id: i,
        voterName: 'x',
        comment: 'c',
        createdAt: new Date().toISOString(),
      })),
    });
    const stats = computeDecisionStats(poll, { pollClosed: true });
    expect(
      computeConfidenceScore(stats, {
        pollClosed: true,
        weights: FOLLOW_UP_CONFIDENCE_WEIGHTS,
      }),
    ).toBe(100);
  });
});

describe('buildDecisionRiskItems', () => {
  it('maps four risk keys with active flags', () => {
    const poll = makePoll({
      totalVotes: 1,
      options: [
        { id: 1, text: 'a', voteCount: 1 },
        { id: 2, text: 'b', voteCount: 0 },
      ],
    });
    const items = buildDecisionRiskItems(computeDecisionStats(poll, { pollClosed: false }));
    expect(items.map((i) => i.key)).toEqual(['sample', 'closeRace', 'discussion', 'deadline']);
    expect(items[0]!.active).toBe(true); // low sample
  });
});

describe('evaluatePollConfidence', () => {
  it('bundles stats/state/score/risk', () => {
    const poll = makePoll({ totalVotes: 0 });
    const result = evaluatePollConfidence(poll, { pollClosed: false });
    expect(result.state).toBe('collect');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(result.riskItems).toHaveLength(4);
  });
});
