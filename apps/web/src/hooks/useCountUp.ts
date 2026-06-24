import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof globalThis.window !== 'undefined' &&
  typeof globalThis.matchMedia === 'function' &&
  globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ease-out-expo — matches the design system's confident deceleration curve.
const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Animates a number from its previous value to `target` over `duration` ms.
 * Returns the displayed integer. Respects reduced-motion (jumps to target) and
 * never animates on the very first paint of a zero value, so there's no CLS or
 * distracting count when there's nothing to count.
 */
export const useCountUp = (target: number, duration = 900): number => {
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
      const value = Math.round(from + delta * easeOutExpo(progress));
      setDisplay(value);

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
};
