import { afterEach, describe, expect, it, vi } from 'vitest';

import { prefersReducedMotion } from './prefersReducedMotion';

// vitest 는 node 환경(jsdom 없음)이라 window/matchMedia 가 없어요.
// 이 상태가 곧 "SSR·비브라우저·헤드리스"의 안전 기본값을 검증하는 자리예요.

describe('prefersReducedMotion (비브라우저 안전)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('window 가 없으면 true(모션 끔)로 폴백해요', () => {
    expect(typeof window).toBe('undefined');
    expect(prefersReducedMotion()).toBe(true);
  });

  it('matchMedia 가 reduce 를 매칭하면 true 예요', () => {
    vi.stubGlobal('window', {
      matchMedia: (q: string) => ({ matches: q.includes('reduce') }),
    });
    expect(prefersReducedMotion()).toBe(true);
  });

  it('matchMedia 가 매칭 안 하면 false(모션 허용)예요', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false }),
    });
    expect(prefersReducedMotion()).toBe(false);
  });

  it('matchMedia 가 던져도 try/catch 로 true 폴백해요', () => {
    vi.stubGlobal('window', {
      matchMedia: () => {
        throw new Error('unsupported');
      },
    });
    expect(prefersReducedMotion()).toBe(true);
  });
});

describe('ko-KR 천 단위 포맷(카운트업 표시 규약)', () => {
  it('toLocaleString("ko-KR") 으로 구분자를 넣어요', () => {
    expect((12345).toLocaleString('ko-KR')).toBe('12,345');
    expect((0).toLocaleString('ko-KR')).toBe('0');
  });
});
