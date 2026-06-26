import { useEffect, useRef } from 'react';

import { prefersReducedMotion } from './prefersReducedMotion';

import type { RefObject } from 'react';

export interface ScrollRevealOptions {
  /**
   * 진입 전 from-state 를 거는 클래스. 마운트 후 클라에서만 붙으므로 no-JS·헤드리스·SSR 은
   * 이 클래스 없이 그냥 보인다(빈 출하·CLS 없음). 기본 'reveal'.
   */
  revealClassName?: string;
  /** 진입(또는 reduced-motion·IO 부재) 시 붙여 안착시키는 클래스. 기본 'is-visible'. */
  visibleClassName?: string;
  /** IO 루트 여백 — 살짝 일찍 트리거. 기본 '0px 0px -8% 0px'. */
  rootMargin?: string;
  /** IO 임계값(0~1). 기본 0.12. */
  threshold?: number;
}

/**
 * ref 반환형 스크롤 진입 훅 — 반환한 ref 를 요소에 붙이면, 뷰포트 진입 시 클래스를 토글해
 * CSS 트랜지션으로 한 번 안착시킨다(web 의 로컬 useScrollReveal 단일 소스 대체).
 *
 * useReveal 가 React state(`revealed`)를 돌려주는 반면, 이 훅은 **명령형 클래스 토글**이라
 * 리렌더 없이 가볍고, 단일 ref 만 요소에 꽂으면 되는 web 섹션 앵커 패턴에 맞는다.
 *
 * - 콘텐츠는 기본 "보임" — `revealClassName`(from-state)은 마운트 후 클라에서만 붙어
 *   no-JS·헤드리스·SSR 은 절대 빈 채로 출하되지 않는다(**CLS 0 안전**).
 * - prefers-reduced-motion·IntersectionObserver 부재면 즉시 `visibleClassName` 으로 안착.
 * - 마운트 시 이미 화면 안(above-the-fold)이면 다음 프레임에 안착시켜 스냅 대신 트랜지션이 돈다.
 * - 발화 후 관찰 해제(스크롤 리스너 없음).
 *
 * 키프레임/from-state 는 각 앱이 자기 CSS(`.reveal` / `.reveal.is-visible`)로 소유한다.
 *
 * @returns 진입 연출을 걸 요소에 붙이는 ref.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {},
): RefObject<T | null> {
  const {
    revealClassName = 'reveal',
    visibleClassName = 'is-visible',
    rootMargin = '0px 0px -8% 0px',
    threshold = 0.12,
  } = options;
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      node.classList.add(visibleClassName);
      return;
    }

    node.classList.add(revealClassName);

    // 마운트 시 이미 화면 안이면 다음 프레임에 안착(스냅 대신 from-state 에서 트랜지션).
    const raf = window.requestAnimationFrame(() => {
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        node.classList.add(visibleClassName);
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add(visibleClassName);
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(node);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [revealClassName, visibleClassName, rootMargin, threshold]);

  return ref;
}
