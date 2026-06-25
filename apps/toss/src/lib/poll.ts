/**
 * 투표 옵션/마감 순수 헬퍼 — @picky/shared 로 단일화했어요.
 * 토스 앱은 `../shared` 어댑터(.ait 번들러용 상대경로 재수출)를 통해 가져와요.
 */
export { isPollClosed, leadingOption, optionPercent, optionsByVotes } from '../shared';
