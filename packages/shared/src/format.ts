/**
 * 날짜·숫자·입력값 포맷 순수 유틸 — web/toss 두 앱이 같은 표기를 쓰도록 단일화한 곳.
 * DOM에 의존하지 않는 순수 함수만 둔다(브라우저 전용 처리는 packages/client).
 */

/** "방금 전" · "12분 전" · "3시간 전" · "2일 전" · "3주 전" · "5개월 전" · "1년 전". */
export const formatRelativeTime = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) {
    return '';
  }
  if (ms < 0) {
    return '방금 전';
  }

  const min = Math.floor(ms / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;

  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;

  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  if (day < 30) return `${Math.floor(day / 7)}주 전`;
  if (day < 365) return `${Math.floor(day / 30)}개월 전`;
  return `${Math.floor(day / 365)}년 전`;
};

/** 1234 → "1,234". 무효값은 "0". */
export const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '0';
  }
  return Math.round(value).toLocaleString('ko-KR');
};

/**
 * 마감 시각 표시 — "마감 없음" / "마감 확인 필요" / "6월 25일 14:30" 형태.
 * 목록·상세에서 동일 문구를 쓰도록 단일화(web formatPollEndAt 대체).
 */
export const formatPollEndAt = (endsAt: string | null | undefined): string => {
  if (!endsAt) {
    return '마감 없음';
  }
  const endAtTime = new Date(endsAt);
  if (!Number.isFinite(endAtTime.getTime())) {
    return '마감 확인 필요';
  }
  return endAtTime.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const pad = (value: number): string => String(value).padStart(2, '0');

/** Date → datetime-local input value (YYYY-MM-DDTHH:mm, 로컬 타임존). */
export const toDateTimeLocalValue = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;

/** datetime-local value → ISO 문자열. 빈 값/무효 → null. */
export const fromDateTimeLocalValue = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const date = new Date(trimmed);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};
