/** 날짜·숫자·카운트다운 포맷 유틸. 토스 미니앱 전반에서 공유해요. */

/** "방금 전" · "12분 전" · "3시간 전" · "2일 전" · "3주 전". */
export function formatRelativeTime(iso: string): string {
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
}

/** 1234 → "1,234". */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  return Math.round(value).toLocaleString('ko-KR');
}

/** 마감까지 남은 밀리초. 마감 없음/이미 지남 → null/0. */
export function getRemainingMs(endsAt: string | null | undefined): number | null {
  if (!endsAt) {
    return null;
  }
  const target = new Date(endsAt).getTime();
  if (!Number.isFinite(target)) {
    return null;
  }
  return Math.max(0, target - Date.now());
}

/** 남은 시간(ms) → "2일 3시간" · "5시간 12분" · "12분 30초" · "마감". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) {
    return '마감';
  }

  const totalSec = Math.floor(ms / 1000);
  const day = Math.floor(totalSec / 86400);
  const hour = Math.floor((totalSec % 86400) / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;

  if (day > 0) return `${day}일 ${hour}시간`;
  if (hour > 0) return `${hour}시간 ${min}분`;
  if (min > 0) return `${min}분 ${sec}초`;
  return `${sec}초`;
}

/** 마감 임박(24시간 이내, 진행중) 여부. */
export function isDeadlineSoon(endsAt: string | null | undefined): boolean {
  const remaining = getRemainingMs(endsAt);
  return remaining != null && remaining > 0 && remaining <= 24 * 60 * 60 * 1000;
}

const pad = (value: number): string => String(value).padStart(2, '0');

/** Date → datetime-local input value (YYYY-MM-DDTHH:mm, 로컬 타임존). */
export function toDateTimeLocalValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** datetime-local value → ISO 문자열. 빈 값/무효 → null. */
export function fromDateTimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const date = new Date(trimmed);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
