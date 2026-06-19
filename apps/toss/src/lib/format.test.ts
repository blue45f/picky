import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatCountdown,
  formatNumber,
  formatRelativeTime,
  fromDateTimeLocalValue,
  getRemainingMs,
  isDeadlineSoon,
  toDateTimeLocalValue,
} from './format';

describe('formatNumber', () => {
  it('adds thousand separators', () => {
    expect(formatNumber(1234)).toBe('1,234');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(54)).toBe('54');
  });
  it('coerces non-finite to 0', () => {
    expect(formatNumber(Number.NaN)).toBe('0');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('0');
  });
});

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

describe('time-based helpers', () => {
  afterEach(() => vi.useRealTimers());

  const freeze = (iso: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
  };

  it('getRemainingMs returns null for missing/invalid and clamps past to 0', () => {
    freeze('2026-06-19T00:00:00Z');
    expect(getRemainingMs(null)).toBeNull();
    expect(getRemainingMs(undefined)).toBeNull();
    expect(getRemainingMs('nope')).toBeNull();
    expect(getRemainingMs('2026-06-19T01:00:00Z')).toBe(3_600_000);
    expect(getRemainingMs('2026-06-18T23:00:00Z')).toBe(0);
  });

  it('isDeadlineSoon is true only within 24h and still future', () => {
    freeze('2026-06-19T00:00:00Z');
    expect(isDeadlineSoon(null)).toBe(false);
    expect(isDeadlineSoon('2026-06-19T06:00:00Z')).toBe(true);
    expect(isDeadlineSoon('2026-06-21T00:00:00Z')).toBe(false);
    expect(isDeadlineSoon('2026-06-18T23:00:00Z')).toBe(false);
  });

  it('formatRelativeTime buckets by elapsed time', () => {
    freeze('2026-06-19T12:00:00Z');
    expect(formatRelativeTime('2026-06-19T11:59:30Z')).toBe('방금 전');
    expect(formatRelativeTime('2026-06-19T11:30:00Z')).toBe('30분 전');
    expect(formatRelativeTime('2026-06-19T09:00:00Z')).toBe('3시간 전');
    expect(formatRelativeTime('2026-06-17T12:00:00Z')).toBe('2일 전');
    expect(formatRelativeTime('2026-06-19T13:00:00Z')).toBe('방금 전');
  });
});

describe('datetime-local conversion', () => {
  it('rejects empty input', () => {
    expect(fromDateTimeLocalValue('')).toBeNull();
    expect(fromDateTimeLocalValue('   ')).toBeNull();
  });
  it('round-trips local wall-clock value in any timezone', () => {
    const iso = fromDateTimeLocalValue('2026-06-19T14:30');
    expect(iso).not.toBeNull();
    expect(toDateTimeLocalValue(new Date(iso as string))).toBe('2026-06-19T14:30');
  });
});
