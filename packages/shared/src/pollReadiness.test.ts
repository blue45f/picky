import { describe, expect, it } from 'vitest';
import { evaluatePollReadiness } from './pollReadiness';

describe('evaluatePollReadiness', () => {
  it('scores 100 for a clear question, distinct options, and context', () => {
    const result = evaluatePollReadiness({
      question: '점심 메뉴 무엇이 좋을까요?',
      description: '오늘 회식 장소를 정해야 해서 의견을 모아요.',
      optionTexts: ['김치찌개', '파스타', '초밥'],
    });
    expect(result.score).toBe(100);
    expect(result.items.every((item) => item.passed)).toBe(true);
  });

  it('flags duplicate options and a too-short question', () => {
    const result = evaluatePollReadiness({
      question: '메뉴',
      description: '',
      optionTexts: ['A', 'A', 'B'],
    });
    const optionItem = result.items.find((item) => item.label === '선택지 스캔');
    const questionItem = result.items.find((item) => item.label === '질문 명확성');
    expect(optionItem?.passed).toBe(false);
    expect(questionItem?.passed).toBe(false);
    expect(result.score).toBeLessThan(100);
  });

  it('passes the context item when an attachment is present even without a description', () => {
    const result = evaluatePollReadiness({
      question: '어디로 여행 갈까요?',
      description: '',
      optionTexts: ['제주', '부산'],
      attachmentCount: 1,
    });
    expect(result.items.find((item) => item.label === '결정 맥락')?.passed).toBe(true);
  });

  it('uses injected copy overrides for help text', () => {
    const result = evaluatePollReadiness(
      { question: '메뉴', description: '', optionTexts: ['A', 'B'] },
      { questionShort: 'CUSTOM_SHORT' },
    );
    expect(result.items.find((item) => item.label === '질문 명확성')?.help).toBe('CUSTOM_SHORT');
  });
});
