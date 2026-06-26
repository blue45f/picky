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

export interface CountUpValueOptions {
  /** 카운트업 시간(ms). 기본 900. */
  duration?: number;
}

/**
 * 값-전용 카운트업 훅 — ref 없이 **표시 숫자(number)만** 돌려주는 변형(web 통계 칩 등 재사용).
 *
 * useCountUp 과 달리 뷰포트 진입이 아니라 **값이 바뀔 때** 직전 값→target 으로 한 번 달린다
 * (요약 숫자가 갱신될 때 톡 올라오는 용도). 따라서 관찰 대상 ref 가 필요 없다.
 * - prefers-reduced-motion·SSR·헤드리스(rAF 부재)면 즉시 target 으로 점프(CLS·잡음 없음).
 * - 첫 페인트(직전 값===target)에도 애니메이션 없이 그대로 둔다.
 *
 * web 의 로컬 useCountUp(target, duration) 과 동일 동작이라 그 자리를 단일 소스로 대체할 수 있다.
 *
 * @param target 목표 숫자.
 * @returns 현재 표시 정수(number).
 */
export function useCountUpValue(target: number, options: CountUpValueOptions = {}): number {
  const { duration = 900 } = options;
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target || prefersReducedMotion() || typeof requestAnimationFrame === 'undefined') {
      fromRef.current = target;
      setDisplay(target);
      return;
    }

    const start = performance.now();
    const delta = target - from;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(from + delta * easeOutExpo(progress)));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      fromRef.current = target;
    };
  }, [target, duration]);

  return display;
}
