import { describe, it, expect } from 'vitest';
import {
  CreatePollSchema,
  POLL_LIMITS,
  PollListSortSchema,
  PollListStatusSchema,
  resolveDeadlinePresetEndsAt,
  VoteSchema,
} from './index';

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

  describe('POLL_LIMITS (single source for form limits)', () => {
    it('matches the values enforced by CreatePollSchema', () => {
      expect(POLL_LIMITS.QUESTION_MAX).toBe(100);
      expect(POLL_LIMITS.DESC_MAX).toBe(500);
      expect(POLL_LIMITS.OPTION_TEXT_MAX).toBe(60);
      expect(POLL_LIMITS.OPTIONS_MIN).toBe(2);
      expect(POLL_LIMITS.OPTIONS_MAX).toBe(10);
      expect(POLL_LIMITS.IMAGE_DATA_URL_MAX).toBe(160_000);
    });

    it('rejects a question over QUESTION_MAX and accepts one at the limit', () => {
      const base = {
        options: [
          { text: 'a', imageUrl: null },
          { text: 'b', imageUrl: null },
        ],
      };
      expect(
        CreatePollSchema.safeParse({ ...base, question: 'q'.repeat(POLL_LIMITS.QUESTION_MAX) })
          .success,
      ).toBe(true);
      expect(
        CreatePollSchema.safeParse({ ...base, question: 'q'.repeat(POLL_LIMITS.QUESTION_MAX + 1) })
          .success,
      ).toBe(false);
    });
  });

  describe('resolveDeadlinePresetEndsAt (ms -> ISO pure calc)', () => {
    it('returns null for none/custom (no deadline)', () => {
      expect(resolveDeadlinePresetEndsAt('none')).toBeNull();
      expect(resolveDeadlinePresetEndsAt('custom')).toBeNull();
    });

    it('returns a future ISO string for positive-ms presets', () => {
      const before = Date.now();
      const iso = resolveDeadlinePresetEndsAt('6h');
      expect(iso).not.toBeNull();
      const ts = new Date(iso as string).getTime();
      // 6h ahead, within a generous tolerance of "now".
      expect(ts).toBeGreaterThan(before + 6 * 3_600_000 - 5_000);
      expect(ts).toBeLessThan(Date.now() + 6 * 3_600_000 + 5_000);
    });
  });
});
