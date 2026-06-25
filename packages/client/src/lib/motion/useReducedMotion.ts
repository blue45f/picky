import { useSyncExternalStore } from 'react';

import { prefersReducedMotion } from './prefersReducedMotion';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  let mql: MediaQueryList;
  try {
    mql = window.matchMedia(QUERY);
  } catch {
    return () => {};
  }
  // Safari < 14 는 addEventListener 미지원이라 addListener 로 폴백해요.
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }
  mql.addListener(onChange);
  return () => mql.removeListener(onChange);
}

/**
 * `prefers-reduced-motion` 을 **구독**해, 사용자가 OS 설정을 바꾸면 리렌더해요.
 * web/toss 두 앱이 공유하는 단일 소스예요(둘 다 react-dom 위에서 동작).
 *
 * - SSR·비브라우저·헤드리스에서는 `true`(모션 끔)로 시작해 깜빡임 없이 안전해요.
 * - `useSyncExternalStore` 기반이라 동시성 렌더에서도 tearing 이 없어요.
 *
 * @returns 모션을 줄여야 하면 `true`.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => prefersReducedMotion(),
    () => true,
  );
}
