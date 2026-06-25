import { describe, it, expect } from 'vitest';
import { CreatePollSchema, VoteSchema, PollListSortSchema, PollListStatusSchema } from './index';

describe('Shared Schemas', () => {
  describe('CreatePollSchema', () => {
    it('should validate valid poll input', () => {
      const input = {
        question: '어떤 프로젝트를 상용화할까요?',
        description: '설명글입니다.',
        options: [
          { text: 'PromptMarket', imageUrl: 'https://example.com/image.png' },
          { text: 'proto-live', imageUrl: null },
        ],
      };
      const result = CreatePollSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty options', () => {
      const input = {
        question: '어떤 프로젝트를 상용화할까요?',
        options: [
          { text: '', imageUrl: null },
          { text: 'proto-live', imageUrl: null },
        ],
      };
      const result = CreatePollSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject less than 2 options', () => {
      const input = {
        question: '어떤 프로젝트를 상용화할까요?',
        options: [{ text: 'PromptMarket', imageUrl: null }],
      };
      const result = CreatePollSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('VoteSchema', () => {
    it('should validate valid vote input', () => {
      const input = {
        optionId: 1,
        voterName: '김희준',
        comment: '좋은 의견입니다!',
      };
      const result = VoteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should allow anonymous vote comment', () => {
      const input = {
        optionId: 2,
        comment: 'Anonymous comment',
      };
      const result = VoteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept an optional voterKey for one-person-one-vote', () => {
      const input = {
        optionId: 1,
        voterKey: 'stable-anon-key-123',
      };
      const result = VoteSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.voterKey).toBe('stable-anon-key-123');
      }
    });

    it('should reject an overly long voterKey', () => {
      const input = {
        optionId: 1,
        voterKey: 'x'.repeat(257),
      };
      const result = VoteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('PollListSortSchema / PollListStatusSchema (server-side filters)', () => {
    it('accepts every supported sort key', () => {
      for (const sort of ['latest', 'popular', 'commented', 'closing']) {
        expect(PollListSortSchema.safeParse(sort).success).toBe(true);
      }
    });

    it('rejects an unknown sort key', () => {
      expect(PollListSortSchema.safeParse('trending').success).toBe(false);
    });

    it('accepts every supported status key', () => {
      for (const status of ['all', 'open', 'closed']) {
        expect(PollListStatusSchema.safeParse(status).success).toBe(true);
      }
    });

    it('falls back to latest/all via .catch for invalid input', () => {
      expect(PollListSortSchema.catch('latest').parse('nope')).toBe('latest');
      expect(PollListStatusSchema.catch('all').parse('nope')).toBe('all');
    });
  });
});
