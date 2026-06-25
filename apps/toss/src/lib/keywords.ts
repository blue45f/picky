/**
 * 한글/영문 의견 토크나이저 — 순수 로직은 @picky/shared 로 단일화했어요.
 * 토스 앱은 `../shared` 어댑터(.ait 번들러용 상대경로 재수출)를 통해 가져와요.
 */
export type { KeywordStat } from '../shared';
export { extractKeywords, normalizeToken, removeKoreanSuffix, trimTokenBoundary } from '../shared';
