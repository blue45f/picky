import { describe, expect, it } from 'vitest';
import type { Poll } from './index';
import {
  SHARE_PREFIX,
  buildSharePresets,
  isPublicWebHost,
  normalizeOrigin,
  resolveShareText,
  trimTrailingSlashes,
} from './pollShare';

const makePoll = (over: Partial<Poll> = {}): Poll => ({
  id: 'p1',
  question: '점심 뭐 먹지?',
  options: [],
  comments: [],
  createdAt: '2026-01-01T00:00:00Z',
  totalVotes: 0,
  ...over,
});

describe('resolveShareText', () => {
  it('prefixes the question and appends the participation prompt', () => {
    const text = resolveShareText(makePoll({ question: '점심 뭐 먹지?' }));
    expect(text.startsWith(SHARE_PREFIX)).toBe(true);
    expect(text).toContain('점심 뭐 먹지?');
    expect(text).toContain('결정에 참여하고 의견을 남겨주세요.');
  });
});

describe('trimTrailingSlashes', () => {
  it('removes only trailing slashes', () => {
    expect(trimTrailingSlashes('https://a.com///')).toBe('https://a.com');
    expect(trimTrailingSlashes('https://a.com/path')).toBe('https://a.com/path');
    expect(trimTrailingSlashes('https://a.com')).toBe('https://a.com');
  });
});

describe('normalizeOrigin', () => {
  it('returns null for empty/invalid input', () => {
    expect(normalizeOrigin('')).toBeNull();
    expect(normalizeOrigin(null)).toBeNull();
    expect(normalizeOrigin(undefined)).toBeNull();
  });
  it('adds https:// when protocol is missing and narrows to origin', () => {
    expect(normalizeOrigin('picky.example.com')).toBe('https://picky.example.com');
    expect(normalizeOrigin('https://picky.example.com/path/')).toBe('https://picky.example.com');
    expect(normalizeOrigin('http://localhost:5173')).toBe('http://localhost:5173');
  });
});

describe('isPublicWebHost', () => {
  it('treats real public hosts as shareable', () => {
    expect(isPublicWebHost('https://picky-olive.vercel.app')).toBe(true);
  });
  it('rejects localhost and toss mini-app webview hosts', () => {
    expect(isPublicWebHost('http://localhost:5173')).toBe(false);
    expect(isPublicWebHost('http://127.0.0.1:3000')).toBe(false);
    expect(isPublicWebHost('https://anything.tossmini.com')).toBe(false);
  });
  it('rejects malformed origins', () => {
    expect(isPublicWebHost('not a url')).toBe(false);
  });
});

describe('buildSharePresets', () => {
  const poll = makePoll({
    question: '제주 vs 부산 어디로?',
    options: [
      { id: 1, text: '제주', voteCount: 3 },
      { id: 2, text: '부산', voteCount: 1 },
    ],
  });
  const url = 'https://picky-olive.vercel.app/poll/p1';

  it('returns the 4 canonical presets in order', () => {
    const presets = buildSharePresets(poll, url);
    expect(presets.map((preset) => preset.id)).toEqual(['kakao', 'meeting', 'social', 'reminder']);
  });

  it('embeds the question, options, and share url in every preset body', () => {
    for (const preset of buildSharePresets(poll, url)) {
      expect(preset.body).toContain('제주 vs 부산 어디로?');
      expect(preset.body).toContain(url);
      expect(preset.label.length).toBeGreaterThan(0);
      expect(preset.title.length).toBeGreaterThan(0);
    }
  });

  it('lists options for context-rich presets (kakao/meeting)', () => {
    const presets = buildSharePresets(poll, url);
    const kakao = presets.find((preset) => preset.id === 'kakao');
    expect(kakao?.body).toContain('1. 제주');
    expect(kakao?.body).toContain('2. 부산');
  });

  it('never produces doubled blank lines', () => {
    for (const preset of buildSharePresets(poll, url)) {
      expect(preset.body).not.toContain('\n\n\n');
    }
  });
});
