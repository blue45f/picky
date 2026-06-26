/** 날짜·숫자·카운트다운 포맷 유틸. 토스 미니앱 전반에서 공유해요. */

// 순수 포맷터(상대시간·숫자·마감표기·datetime-local 변환)와 카운트다운 헬퍼,
// 마감 임박 판정(isDeadlineSoon / 24h 임계값 CLOSING_SOON_MS)은 @picky/shared 로 단일화했어요.
// 토스 앱은 `../shared` 어댑터를 통해 가져와 그대로 재수출해요(인라인 24h 재구현 제거 — 단일 소스).
export {
  CLOSING_SOON_MS,
  formatCountdown,
  formatNumber,
  formatPollEndAt,
  formatRelativeTime,
  fromDateTimeLocalValue,
  getRemainingMs,
  isDeadlineSoon,
  toDateTimeLocalValue,
} from '../shared';
