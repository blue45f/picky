/**
 * 작성 준비도 채점 — 순수 로직은 @picky/shared 로 단일화했어요.
 * 토스 앱은 `../shared` 어댑터(.ait 번들러용 상대경로 재수출)를 통해 가져와요.
 * 토스 기본 안내 문구가 shared 기본값이라 추가 copy 주입 없이 그대로 써요.
 */
export type { ReadinessCopy, ReadinessItem, ReadinessResult } from '../shared';
export { evaluatePollReadiness } from '../shared';
