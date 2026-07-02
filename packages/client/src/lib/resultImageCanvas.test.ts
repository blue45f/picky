import { describe, expect, it, vi } from 'vitest';
import type { Poll } from '../../../shared/src/index';
import {
  DEFAULT_RESULT_IMAGE_CONTENT,
  RESULT_IMAGE_THEMES,
  buildPollResultImageDataUrl,
  type CanvasFactory,
} from './resultImageCanvas';

const poll = (over: Partial<Poll> = {}): Poll => ({
  id: 'JOIN42',
  question: '오늘 점심 뭐 먹지?',
  options: [
    { id: 1, text: '김치찌개', voteCount: 7 },
    { id: 2, text: '파스타', voteCount: 3 },
  ],
  comments: [
    {
      id: 1,
      voterName: '민수',
      comment: '가성비 최고',
      createdAt: '2026-01-01T00:00:00Z',
      selectedOptionText: '김치찌개',
    },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  totalVotes: 10,
  ...over,
});

/** DOM 없이 CanvasRenderingContext2D를 흉내내는 가짜 컨텍스트 — 호출만 기록한다. */
const makeFakeCanvasFactory = (): { factory: CanvasFactory; calls: { fillText: string[] } } => {
  const calls = { fillText: [] as string[] };
  const gradient = { addColorStop: vi.fn() };
  const context = {
    scale: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    fillRect: vi.fn(),
    fillText: vi.fn((text: string) => {
      calls.fillText.push(text);
    }),
    measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
    set fillStyle(_v: unknown) {},
    set font(_v: unknown) {},
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toDataURL: vi.fn(() => 'data:image/png;base64,FAKE'),
  } as unknown as HTMLCanvasElement;

  return { factory: () => canvas, calls };
};

describe('buildPollResultImageDataUrl', () => {
  it('returns a PNG data URL using an injected canvas factory', () => {
    const { factory } = makeFakeCanvasFactory();
    const url = buildPollResultImageDataUrl(
      poll(),
      'https://picky.io/p/JOIN42',
      'classic',
      DEFAULT_RESULT_IMAGE_CONTENT,
      factory,
    );
    expect(url).toBe('data:image/png;base64,FAKE');
  });

  it('draws the question, vote tally, join code and share url', () => {
    const { factory, calls } = makeFakeCanvasFactory();
    buildPollResultImageDataUrl(
      poll(),
      'https://picky.io/p/JOIN42',
      'classic',
      { comment: true, joinCode: true, shareUrl: true },
      factory,
    );
    const joined = calls.fillText.join('\n');
    expect(joined).toContain('PICKY RESULT');
    expect(joined).toContain('오늘 점심 뭐 먹지?');
    expect(joined).toContain('총 10표 · 의견 1개');
    expect(joined).toContain('JOIN CODE');
    expect(joined).toContain('JOIN42');
    expect(joined).toContain('대표 의견');
    expect(joined).toContain('https://picky.io/p/JOIN42');
  });

  it('omits comment/joinCode/shareUrl when content options are off', () => {
    const { factory, calls } = makeFakeCanvasFactory();
    buildPollResultImageDataUrl(
      poll(),
      'https://picky.io/p/JOIN42',
      'light',
      { comment: false, joinCode: false, shareUrl: false },
      factory,
    );
    const joined = calls.fillText.join('\n');
    expect(joined).not.toContain('JOIN CODE');
    expect(joined).not.toContain('대표 의견');
    expect(joined).not.toContain('https://picky.io/p/JOIN42');
  });

  it('throws a friendly error when 2d context is unavailable', () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => null,
    } as unknown as HTMLCanvasElement;
    expect(() =>
      buildPollResultImageDataUrl(
        poll(),
        's',
        'classic',
        DEFAULT_RESULT_IMAGE_CONTENT,
        () => canvas,
      ),
    ).toThrow('이미지 생성을 지원하지 않는 브라우저입니다.');
  });

  it('exposes all four themes (incl. rewarded premium gold)', () => {
    expect(Object.keys(RESULT_IMAGE_THEMES)).toEqual(['classic', 'light', 'presentation', 'gold']);
  });
});
