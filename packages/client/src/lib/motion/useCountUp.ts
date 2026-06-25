import { useEffect, useRef, useState } from 'react';

import { prefersReducedMotion } from './prefersReducedMotion';
import { useReveal } from './useReveal';

import type { RefObject } from 'react';

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export interface CountUpOptions {
  /** 카운트업 시간(ms). 기본 900. */
  duration?: number;
  /** 표시 뒤에 붙일 접미사(예: '표', '%'). 포맷팅 후 그대로 이어붙여요. */
  suffix?: string;
  /** 진입 임계값(useReveal 로 전달). 기본 0. */
  threshold?: number;
}

export interface CountUpState<T extends HTMLElement> {
  /** 카운트업 대상에 붙이는 ref — 이게 뷰포트에 들어오면 시작해요. */
  ref: RefObject<T | null>;
  /** 현재 표시 숫자(toLocaleString 미적용 raw). */
  value: number;
  /** `value.toLocaleString('ko-KR') + suffix` 로 포맷한 문자열. */
  text: string;
  /** 진입해서 카운트업이 시작/완료됐는지. */
  revealed: boolean;
}

/**
 * 진입 시 0→value 로 한 번 카운트업하는 훅 — web/toss 공유.
 *
 * - rAF 기반(스크롤 리스너 없음)으로 easeOutExpo 곡선을 따라 올라가요.
 * - prefers-reduced-motion·SSR·헤드리스면 **즉시 최종값**을 보여줘요(캐스케이드 렌더 방지).
 * - 진입 후 1회만 실행하고, value 가 바뀌면 다음 진입에서 다시 달려요.
 *
 * @param value 최종 목표 숫자.
 * @returns ref·현재값·포맷 텍스트·revealed.
 */
export function useCountUp<T extends HTMLElement = HTMLSpanElement>(
  value: number,
  options: CountUpOptions = {},
): CountUpState<T> {
  const { duration = 900, suffix = '', threshold = 0 } = options;
  const { ref, revealed } = useReveal<T>({ threshold });
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? value : 0));
  const startedForRef = useRef<number | null>(null);

  useEffect(() => {
    if (!revealed || startedForRef.current === value) {
      return;
    }
    startedForRef.current = value;

    // reduced-motion 이면 즉시 최종값으로 안착시켜요(setState 1회로 동기 처리).
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(easeOutExpo(progress) * value));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [revealed, value, duration]);

  return {
    ref,
    value: display,
    text: `${display.toLocaleString('ko-KR')}${suffix}`,
    revealed,
  };
}
