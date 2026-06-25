import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatNumber,
  formatPollEndAt,
  formatRelativeTime,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from './format';

const NOW = new Date('2026-06-19T12:00:00Z');

/** NOW에서 지정한 시간만큼 과거인 ISO 문자열을 만든다(가짜 타이머 기준 상대 표기 검증용). */
const agoIso = (ms: number): string => new Date(NOW.getTime() - ms).toISOString();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatRelativeTime', () => {
  afterEach(() => vi.useRealTimers());

  const freezeNow = () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  };

  it("returns '방금 전' for under a minute", () => {
    freezeNow();
    expect(formatRelativeTime(agoIso(0))).toBe('방금 전');
    expect(formatRelativeTime(agoIso(59 * 1000))).toBe('방금 전');
  });

  it("returns '방금 전' for a future timestamp (negative elapsed)", () => {
    freezeNow();
    expect(formatRelativeTime(new Date(NOW.getTime() + 5 * MINUTE).toISOString())).toBe('방금 전');
  });

  it("returns 'N분 전' under an hour", () => {
    freezeNow();
    expect(formatRelativeTime(agoIso(1 * MINUTE))).toBe('1분 전');
    expect(formatRelativeTime(agoIso(59 * MINUTE))).toBe('59분 전');
  });

  it("returns 'N시간 전' under a day", () => {
    freezeNow();
    expect(formatRelativeTime(agoIso(1 * HOUR))).toBe('1시간 전');
    expect(formatRelativeTime(agoIso(23 * HOUR))).toBe('23시간 전');
  });

  it("returns 'N일 전' under a week", () => {
    freezeNow();
    expect(formatRelativeTime(agoIso(1 * DAY))).toBe('1일 전');
    expect(formatRelativeTime(agoIso(6 * DAY))).toBe('6일 전');
  });

  it("returns 'N주 전' under 30 days", () => {
    freezeNow();
    expect(formatRelativeTime(agoIso(7 * DAY))).toBe('1주 전');
    expect(formatRelativeTime(agoIso(29 * DAY))).toBe('4주 전');
  });

  it("returns 'N개월 전' under a year", () => {
    freezeNow();
    expect(formatRelativeTime(agoIso(30 * DAY))).toBe('1개월 전');
    expect(formatRelativeTime(agoIso(364 * DAY))).toBe('12개월 전');
  });

  it("returns 'N년 전' at or beyond a year", () => {
    freezeNow();
    expect(formatRelativeTime(agoIso(365 * DAY))).toBe('1년 전');
    expect(formatRelativeTime(agoIso(2 * 365 * DAY))).toBe('2년 전');
  });

  it("returns '' for an unparseable date string", () => {
    freezeNow();
    expect(formatRelativeTime('not-a-date')).toBe('');
  });
});

describe('formatNumber', () => {
  it('groups thousands with commas', () => {
    expect(formatNumber(1234)).toBe('1,234');
    expect(formatNumber(1_000_000)).toBe('1,000,000');
  });

  it("returns '0' for non-finite values", () => {
    expect(formatNumber(Number.NaN)).toBe('0');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('0');
  });

  it('rounds to the nearest integer', () => {
    expect(formatNumber(1234.6)).toBe('1,235');
    expect(formatNumber(1234.4)).toBe('1,234');
  });
});

describe('formatPollEndAt', () => {
  it("returns '마감 없음' for null/undefined/empty", () => {
    expect(formatPollEndAt(null)).toBe('마감 없음');
    expect(formatPollEndAt(undefined)).toBe('마감 없음');
    expect(formatPollEndAt('')).toBe('마감 없음');
  });

  it("returns '마감 확인 필요' for an invalid date string", () => {
    expect(formatPollEndAt('garbage')).toBe('마감 확인 필요');
  });

  it('returns a non-empty formatted string containing the day for a valid ISO', () => {
    // TZ에 따라 정확한 로컬 문자열이 달라지므로 폴백 문구가 아니고 숫자를 포함하는지만 단언한다.
    const result = formatPollEndAt('2026-06-25T14:30:00Z');
    expect(result).not.toBe('마감 없음');
    expect(result).not.toBe('마감 확인 필요');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toMatch(/\d/);
  });
});

describe('toDateTimeLocalValue / fromDateTimeLocalValue', () => {
  it('round-trips a date to the minute (ignoring seconds/ms truncation)', () => {
    const original = new Date(2026, 5, 25, 14, 30, 45, 123); // 로컬 타임존 기준
    const roundTripped = fromDateTimeLocalValue(toDateTimeLocalValue(original));
    expect(roundTripped).not.toBeNull();

    const back = new Date(roundTripped as string);
    expect(back.getFullYear()).toBe(original.getFullYear());
    expect(back.getMonth()).toBe(original.getMonth());
    expect(back.getDate()).toBe(original.getDate());
    expect(back.getHours()).toBe(original.getHours());
    expect(back.getMinutes()).toBe(original.getMinutes());
    // 초/밀리초는 datetime-local 표기에서 잘려나간다.
    expect(back.getSeconds()).toBe(0);
  });

  it('produces a YYYY-MM-DDTHH:mm shaped value', () => {
    const value = toDateTimeLocalValue(new Date(2026, 0, 5, 9, 7));
    expect(value).toBe('2026-01-05T09:07');
  });

  it('returns null for an empty (or whitespace-only) value', () => {
    expect(fromDateTimeLocalValue('')).toBeNull();
    expect(fromDateTimeLocalValue('   ')).toBeNull();
  });

  it('returns null for an unparseable value', () => {
    expect(fromDateTimeLocalValue('garbage')).toBeNull();
  });
});
