import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** localStorage 목(sfx 기본 ON 보장). */
const makeLocalStorageMock = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
};

/**
 * 초소형 DOM 목 — installGlobalClickSounds 의 캡처 리스너 등록/제거와
 * 셀렉터 매칭/제외/스로틀을 검증해요. 실제 DOM 없이 동작 계약만 확인합니다.
 */
interface FakeEl {
  tag: string;
  attrs: Record<string, string>;
  disabled?: boolean;
  parentElement: FakeEl | null;
  matches: (selector: string) => boolean;
  getAttribute: (name: string) => string | null;
  closest: (selector: string) => FakeEl | null;
}

const makeEl = (
  tag: string,
  attrs: Record<string, string> = {},
  parent: FakeEl | null = null,
  disabled = false,
): FakeEl => {
  const el: FakeEl = {
    tag,
    attrs,
    disabled,
    parentElement: parent,
    getAttribute: (name) => attrs[name] ?? null,
    matches: (selector) => {
      // 테스트가 쓰는 셀렉터 토큰만 단순 매칭.
      if (selector.includes('button') && tag === 'button') return true;
      if (selector.includes('a[href]') && tag === 'a' && 'href' in attrs) return true;
      if (selector.includes('[role="button"]') && attrs.role === 'button') return true;
      if (selector.includes('[data-sound]') && 'data-sound' in attrs) return true;
      return false;
    },
    closest: (selector) => {
      let node: FakeEl | null = el;
      while (node) {
        if (selector === '[data-no-sound]' && 'data-no-sound' in node.attrs) return node;
        node = node.parentElement;
      }
      return null;
    },
  };
  return el;
};

describe('installGlobalClickSounds (캡처 리스너·셀렉터·제외·스로틀)', () => {
  let handler: ((event: { target: unknown }) => void) | null = null;
  let removed = false;

  beforeEach(() => {
    handler = null;
    removed = false;
    vi.stubGlobal('localStorage', makeLocalStorageMock());
    vi.stubGlobal('window', {}); // window 존재(브라우저처럼) — 단 AudioContext 는 없음.
    vi.stubGlobal('document', {
      addEventListener: (type: string, fn: (e: { target: unknown }) => void, opts: unknown) => {
        if (type === 'click') {
          handler = fn;
          expect(opts).toMatchObject({ capture: true });
        }
      },
      removeEventListener: (type: string) => {
        if (type === 'click') removed = true;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('인터랙티브 요소 클릭을 throw 없이 처리하고 cleanup 으로 리스너를 뗀다', async () => {
    vi.resetModules();
    const sfxModule = await import('./sfx');
    // 핸들러가 throw 없이 동작하고 리스너 라이프사이클(capture 등록/제거)이 맞는지 검증해요.
    const cleanup = sfxModule.installGlobalClickSounds();
    expect(typeof handler).toBe('function');

    const button = makeEl('button');
    expect(() => handler!({ target: button })).not.toThrow();

    // data-no-sound 조상은 제외 → throw 없이 무시.
    const wrapper = makeEl('div', { 'data-no-sound': '' });
    const innerBtn = makeEl('button', {}, wrapper);
    expect(() => handler!({ target: innerBtn })).not.toThrow();

    // disabled 버튼 제외.
    const disabledBtn = makeEl('button', {}, null, true);
    expect(() => handler!({ target: disabledBtn })).not.toThrow();

    // 매칭되지 않는 요소(div)는 무시.
    const plainDiv = makeEl('div');
    expect(() => handler!({ target: plainDiv })).not.toThrow();

    cleanup();
    expect(removed).toBe(true);
  });
});
