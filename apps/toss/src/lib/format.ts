/** 날짜·숫자·카운트다운 포맷 유틸. 토스 미니앱 전반에서 공유해요. */

// 순수 포맷터(상대시간·숫자·마감표기·datetime-local 변환)와 카운트다운 헬퍼는
// @picky/shared 로 단일화했어요. 토스 앱은 `../shared` 어댑터를 통해 가져와 그대로 재수출해요.
// isDeadlineSoon 만 토스 전용(getRemainingMs 사용)이라 로컬에 둬요.
import { getRemainingMs } from '../shared';

export {
  formatCountdown,
  formatNumber,
  formatPollEndAt,
  formatRelativeTime,
  fromDateTimeLocalValue,
  getRemainingMs,
  toDateTimeLocalValue,
} from '../shared';

/** 마감 임박(24시간 이내, 진행중) 여부. */
export function isDeadlineSoon(endsAt: string | null | undefined): boolean {
  const remaining = getRemainingMs(endsAt);
  return remaining != null && remaining > 0 && remaining <= 24 * 60 * 60 * 1000;
}
