/**
 * 공유 애니메이션 훅·컴포넌트 — picky web/toss 두 앱이 함께 소비하는 단일 소스.
 *
 * framework-agnostic React(둘 다 react-dom 위)·SSR/비브라우저 안전·enhancement-only.
 * 모든 모션은 가시성과 분리돼 있어 **CLS 0**이고, reduced-motion·헤드리스에서는 그냥 보여요.
 * 키프레임/이징은 각 앱이 자기 토큰(웹 index.css `--ease-out-*` / 토스 동치)으로 소유해요.
 */
export { prefersReducedMotion } from './prefersReducedMotion';
export { useReducedMotion } from './useReducedMotion';

export { useReveal } from './useReveal';
export type { RevealOptions, RevealState } from './useReveal';

export { useScrollReveal } from './useScrollReveal';
export type { ScrollRevealOptions } from './useScrollReveal';

export { Reveal } from './Reveal';
export type { RevealProps } from './Reveal';

export { useCountUp, useCountUpValue } from './useCountUp';
export type { CountUpOptions, CountUpState, CountUpValueOptions } from './useCountUp';

export { CountUp } from './CountUp';
export type { CountUpProps } from './CountUp';
