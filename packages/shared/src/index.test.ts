import { describe, it, expect } from 'vitest';
import { CreatePollSchema, VoteSchema } from './index';

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
  });
});
