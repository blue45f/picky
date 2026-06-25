/**
 * `prefers-reduced-motion: reduce` 를 1회 동기 측정해요(구독 없음).
 *
 * SSR·비브라우저·헤드리스(`window`/`matchMedia` 부재)에서는 **true**(=모션 끔)를
 * 돌려줘요. 모션은 어디까지나 향상(enhancement)이라, 환경을 모를 땐 "안 움직임"이
 * 안전한 기본값이에요. 리렌더로 변화를 구독하려면 `useReducedMotion()` 을 쓰세요.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}
