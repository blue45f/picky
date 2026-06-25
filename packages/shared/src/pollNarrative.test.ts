import { describe, expect, it } from 'vitest';
import type { Poll } from './index';
import { buildConsensusNarrative } from './pollNarrative';

const poll = (over: Partial<Pick<Poll, 'totalVotes' | 'options'>> = {}) => ({
  totalVotes: 10,
  options: [
    { id: 1, text: 'a', voteCount: 0 },
    { id: 2, text: 'b', voteCount: 0 },
  ],
  ...over,
});

describe('buildConsensusNarrative', () => {
  it('참여 대기 when no votes', () => {
    const n = buildConsensusNarrative({
      poll: poll({ totalVotes: 0 }),
      voteGap: 0,
      leadingShare: 0,
    });
    expect(n.consensusLabel).toBe('참여 대기');
    expect(n.decisionHint).toContain('첫 투표');
  });

  it('접전 when gap within 1 vote', () => {
    const n = buildConsensusNarrative({ poll: poll(), voteGap: 1, leadingShare: 52 });
    expect(n.consensusLabel).toBe('접전');
    expect(n.decisionHint).toContain('표본을 늘리는');
  });

  it('합의 강함 when leading share >= 65', () => {
    const n = buildConsensusNarrative({ poll: poll(), voteGap: 6, leadingShare: 70 });
    expect(n.consensusLabel).toBe('합의 강함');
    expect(n.decisionHint).toContain('의견이 모이고');
  });

  it('우세 when leading share between 50 and 64', () => {
    expect(
      buildConsensusNarrative({ poll: poll(), voteGap: 4, leadingShare: 55 }).consensusLabel,
    ).toBe('우세');
  });

  it('의견 분산 otherwise', () => {
    expect(
      buildConsensusNarrative({ poll: poll(), voteGap: 3, leadingShare: 40 }).consensusLabel,
    ).toBe('의견 분산');
  });
});
