/** 마감 카운트다운 순수 포맷 유틸 — web/toss 두 앱이 공유해요. */

/** 마감까지 남은 밀리초. 마감 없음/무효 → null, 이미 지남 → 0. */
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
