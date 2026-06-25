import { useCountUp } from './useCountUp';

export interface CountUpProps {
  /** 최종 목표 숫자. */
  value: number;
  /** 카운트업 시간(ms). 기본 900. */
  duration?: number;
  /** 표시 뒤 접미사(예: '표', '%'). */
  suffix?: string;
  className?: string;
}

/**
 * 진입 시 0→value 로 한 번 카운트업하는 숫자 — web/toss 공유.
 *
 * - prefers-reduced-motion·SSR·헤드리스면 즉시 최종값을 보여줘요.
 * - `toLocaleString('ko-KR')` 로 천 단위 구분, 진입 후 rAF easeOutExpo 1회.
 * - 한 번 "톡" 올라오는 from-state 는 앱이 `.count-pop.is-revealed`
 *   (`@keyframes count-pop`, var(--ease-out-expo)) 으로 소유해요. 이 컴포넌트는
 *   숫자만 다루므로, 그 연출을 원하면 `className="count-pop is-revealed"` 처럼 넘겨요.
 */
export function CountUp({ value, duration = 900, suffix = '', className }: Readonly<CountUpProps>) {
  const { ref, text } = useCountUp<HTMLSpanElement>(value, { duration, suffix });
  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
