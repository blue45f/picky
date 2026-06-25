/**
 * 공유 애니메이션 훅·컴포넌트 — web/toss 단일 소스(packages/client/lib/motion)를
 * 토스 앱이 소비하는 얇은 어댑터. 시그니처/동작은 web과 동일하고, 키프레임/이징
 * 토큰은 토스 index.css(`--ease-out-*`, `.reveal`/`.count-pop`)가 소유해요.
 *
 * framework-agnostic React·SSR/비브라우저/헤드리스 안전·enhancement-only(CLS 0).
 * reduced-motion 에선 모션 없이 즉시 보여요.
 */
export {
  Reveal,
  CountUp,
  useReveal,
  useCountUp,
  useReducedMotion,
  prefersReducedMotion,
} from '../../../../packages/client/src/lib/motion';
export type {
  RevealProps,
  CountUpProps,
  RevealOptions,
  RevealState,
  CountUpOptions,
  CountUpState,
} from '../../../../packages/client/src/lib/motion';
