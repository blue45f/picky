import { describe, expect, it } from 'vitest';
import { buildSnsPreviewContent } from './snsPreview';

describe('buildSnsPreviewContent', () => {
  it('uses placeholders when empty', () => {
    const c = buildSnsPreviewContent({ question: '   ', options: [] });
    expect(c.title).toBe('공유될 투표 질문');
    expect(c.summary).toContain('링크를 받은 사람이');
    expect(c.previewReady).toBe(false);
    expect(c.visibleOptions).toEqual([]);
    expect(c.hiddenOptionCount).toBe(0);
  });

  it('falls back to option list as summary when no description', () => {
    const c = buildSnsPreviewContent({
      question: '점심?',
      options: ['김밥', '라면', '국밥', '파스타'],
    });
    expect(c.summary).toBe('1. 김밥 · 2. 라면 · 3. 국밥');
    expect(c.visibleOptions).toEqual(['김밥', '라면', '국밥']);
    expect(c.hiddenOptionCount).toBe(1);
    expect(c.previewReady).toBe(true);
  });

  it('prefers description over option list', () => {
    const c = buildSnsPreviewContent({
      question: '점심?',
      description: '  맛집 추천 받아요  ',
      options: ['김밥', '라면'],
    });
    expect(c.summary).toBe('맛집 추천 받아요');
  });

  it('builds meta items and estimated reading seconds', () => {
    const c = buildSnsPreviewContent({
      question: '점심?',
      options: ['김밥', '라면'],
      imageUrl: 'data:image/png;base64,xxx',
    });
    expect(c.hasImagePreview).toBe(true);
    expect(c.metaItems).toEqual([
      '참여 가능',
      '2개 선택지',
      '이미지 반영',
      `${c.estimatedSeconds}초 예상`,
    ]);
    expect(c.estimatedSeconds).toBeGreaterThanOrEqual(5);
  });

  it('marks 작성 중 and 기본 이미지 when not ready and no image', () => {
    const c = buildSnsPreviewContent({ question: '점심?', options: ['김밥'] });
    expect(c.metaItems[0]).toBe('작성 중');
    expect(c.metaItems[2]).toBe('기본 이미지');
  });
});
