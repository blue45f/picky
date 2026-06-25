import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatCountdown, getRemainingMs } from './countdown';

describe('formatCountdown', () => {
  it('formats by largest two units', () => {
    expect(formatCountdown(2 * 86_400_000 + 3 * 3_600_000)).toBe('2일 3시간');
    expect(formatCountdown(5 * 3_600_000 + 12 * 60_000)).toBe('5시간 12분');
    expect(formatCountdown(12 * 60_000 + 30_000)).toBe('12분 30초');
    expect(formatCountdown(5_000)).toBe('5초');
  });
  it('treats zero or negative as 마감', () => {
    expect(formatCountdown(0)).toBe('마감');
    expect(formatCountdown(-1)).toBe('마감');
  });
});

describe('getRemainingMs', () => {
  afterEach(() => vi.useRealTimers());

  it('returns null for missing/invalid and clamps past to 0', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-19T00:00:00Z'));
    expect(getRemainingMs(null)).toBeNull();
    expect(getRemainingMs(undefined)).toBeNull();
    expect(getRemainingMs('nope')).toBeNull();
    expect(getRemainingMs('2026-06-19T01:00:00Z')).toBe(3_600_000);
    expect(getRemainingMs('2026-06-18T23:00:00Z')).toBe(0);
  });
});
