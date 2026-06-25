import { describe, expect, it } from 'vitest';
import { extractKeywords, normalizeToken, removeKoreanSuffix, trimTokenBoundary } from './keywords';

describe('trimTokenBoundary', () => {
  it('strips surrounding punctuation and lowercases', () => {
    expect(trimTokenBoundary('(가격!)')).toBe('가격');
    expect(trimTokenBoundary('"Price."')).toBe('price');
  });
  it('keeps inner keyword characters', () => {
    expect(trimTokenBoundary('맛집123')).toBe('맛집123');
  });
});

describe('removeKoreanSuffix', () => {
  it('removes one trailing josa/eomi suffix', () => {
    expect(removeKoreanSuffix('가격으로')).toBe('가격');
    expect(removeKoreanSuffix('집에서')).toBe('집');
  });
  it('leaves tokens without a known suffix untouched', () => {
    expect(removeKoreanSuffix('가격')).toBe('가격');
  });
});

describe('normalizeToken', () => {
  it('trims boundary then removes suffix', () => {
    expect(normalizeToken('(가격에서)')).toBe('가격');
  });
});

describe('extractKeywords', () => {
  it('counts by frequency, drops stop words, sorts desc', () => {
    // '가격으로'→'가격'(suffix 으로 제거), 맨 '가격' 그대로 → 합산 count 3.
    // '가격이'는 '이'가 접미사 목록에 없어 별도 토큰이라 합산되지 않음(의도된 동작).
    const result = extractKeywords(
      ['가격으로 중요해요', '가격 때문에 고민', '가격 비교 디자인도'],
      5,
    );
    expect(result[0]).toEqual({ word: '가격', count: 3 });
    expect(result.some((keyword) => keyword.word === '디자인도')).toBe(true);
    // '좋아요' is a stop word and must be filtered out.
    expect(extractKeywords(['좋아요 좋아요'], 5).some((k) => k.word === '좋아요')).toBe(false);
  });
  it('respects the limit and returns empty for no usable tokens', () => {
    expect(extractKeywords(['좋아요 정말 너무'], 3)).toEqual([]);
    expect(extractKeywords(['하나 둘 셋 넷 다섯 여섯'], 2).length).toBeLessThanOrEqual(2);
  });
});
