import { useEffect, useRef } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Progressive scroll-reveal: attaches `.reveal` to already-visible content and
 * toggles `.is-visible` via IntersectionObserver as it scrolls into view.
 *
 * Content ships visible by default — the `.reveal` class (and its hidden start
 * state) is only added on the client after mount, so no-JS / headless renders
 * never blank the section. When reduced motion is requested or IO is missing,
 * the element is revealed immediately.
 */
export const useScrollReveal = <T extends HTMLElement>() => {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-visible');
      return;
    }

    node.classList.add('reveal');

    // Already on-screen at mount (above the fold) → reveal on next frame so the
    // transition runs from the hidden start state instead of snapping.
    const raf = window.requestAnimationFrame(() => {
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        node.classList.add('is-visible');
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );

    observer.observe(node);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return ref;
};
