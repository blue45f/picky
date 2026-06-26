// 카운트업 모션은 packages/client(lib/motion)로 단일화했어요(웹↔토스 동일 이징·prefers-reduced-motion).
// 페이지 소비처는 useCountUp(target, duration)→number 시그니처를 유지하도록 값-전용 변형을 감싼다.
import { useCountUpValue } from '../../../../packages/client/src/lib/motion';

/**
 * 값이 바뀔 때 직전값→target 으로 한 번 카운트업하는 표시 숫자 훅.
 * 코어 동작(easeOutExpo·reduced-motion·SSR 즉시 점프)은 client/motion useCountUpValue 단일 소스.
 * 기존 web 시그니처(target, duration)를 보존해 호출부를 바꾸지 않는다.
 */
export const useCountUp = (target: number, duration = 900): number =>
  useCountUpValue(target, { duration });
