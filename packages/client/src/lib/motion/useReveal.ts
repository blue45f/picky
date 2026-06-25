import { useEffect, useRef, useState } from 'react';

import type { RefObject } from 'react';

import { prefersReducedMotion } from './prefersReducedMotion';

function supportsObserver(): boolean {
  return typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function';
}

export interface RevealOptions {
  /** 뷰포트 진입 임계값(0~1). 기본 0(살짝이라도 보이면 발화). */
  threshold?: number;
  /** 루트 여백 — 살짝 일찍 트리거해 스크롤이 매끄럽게 보이게 해요. */
  rootMargin?: string;
}

export interface RevealState<T extends HTMLElement> {
  ref: RefObject<T | null>;
  revealed: boolean;
}

/**
 * 스크롤 진입 시 한 번만 `revealed` 를 켜는 enhancement-only 훅 — web/toss 공유.
 *
 * - 기본값은 **보임**이에요. IntersectionObserver/모션 미지원·헤드리스·SSR·
 *   prefers-reduced-motion 이면 마운트 즉시 `revealed=true` 로 처리해, 콘텐츠가
 *   절대 빈 채로 출하되지 않아요(**CLS 0 안전**: 가시성은 모션에 의존하지 않음).
 * - 관찰은 1회 발화 후 해제해요(스크롤 리스너 없음, 60fps 안전).
 * - IO 가 어떤 이유로든 발화하지 않아도 페일세이프 타이머로 강제 안착시켜요.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options: RevealOptions = {},
): RevealState<T> {
  const { threshold = 0, rootMargin = '0px 0px -6% 0px' } = options;
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(() => !supportsObserver() || prefersReducedMotion());

  useEffect(() => {
    if (revealed) {
      return;
    }
    const node = ref.current;
    if (!node) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(node);

    // 페일세이프 — IO 가 발화하지 않아도 콘텐츠가 영구히 숨지 않게,
    // 마운트 후 일정 시간 뒤 강제로 안착시켜요. 가시성은 모션에 의존하지 않아요.
    const fallback = window.setTimeout(() => {
      setRevealed(true);
      observer.disconnect();
    }, 1600);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [revealed, rootMargin, threshold]);

  return { ref, revealed };
}
