import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** 초소형 localStorage 목 — node 환경에 주입. */
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
 * settings/sfx/bgm 모듈은 import 시점에 localStorage 를 읽으므로,
 * 각 테스트가 모듈 상태를 격리하도록 resetModules + 동적 import 패턴을 써요.
 */
const loadModules = async () => {
  vi.resetModules();
  const settings = await import('./settings');
  const sfx = await import('./sfx');
  return { settings, sfx };
};

describe('audio settings (web/toss 공통 단일 소스)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeLocalStorageMock());
    // node 환경 — window/document/AudioContext 없음 → graceful no-op 경로.
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('기본값: sfx ON, bgm OFF', async () => {
    const { settings } = await loadModules();
    const state = settings.getSoundState();
    expect(state.sfxEnabled).toBe(true);
    expect(state.bgmEnabled).toBe(false);
    expect(settings.isSfxEnabled()).toBe(true);
    expect(settings.isBgmEnabled()).toBe(false);
  });

  it('setSfxEnabled 가 상태/영속/구독자를 갱신한다', async () => {
    const { settings } = await loadModules();
    const seen: boolean[] = [];
    const unsub = settings.onSoundStateChange((s) => seen.push(s.sfxEnabled));

    settings.setSfxEnabled(false);
    expect(settings.isSfxEnabled()).toBe(false);
    expect(seen).toContain(false);
    expect(localStorage.getItem('picky_sfx_enabled')).toBe('0');

    // 같은 값 재설정은 emit 하지 않는다(no-op).
    const before = seen.length;
    settings.setSfxEnabled(false);
    expect(seen.length).toBe(before);

    unsub();
    settings.setSfxEnabled(true);
    // 구독 해제 후엔 더 이상 받지 않는다.
    expect(seen.length).toBe(before);
  });

  it('영속된 값을 재로드 시 복원한다', async () => {
    localStorage.setItem('picky_sfx_enabled', '0');
    localStorage.setItem('picky_bgm_enabled', '1');
    const { settings } = await loadModules();
    expect(settings.isSfxEnabled()).toBe(false);
    expect(settings.isBgmEnabled()).toBe(true);
  });

  it('비브라우저(AudioContext 없음)에서 bgm 토글이 throw 하지 않는다', async () => {
    const { settings } = await loadModules();
    expect(() => settings.setBgmEnabled(true)).not.toThrow();
    // 상태는 토글되지만 실제 재생은 no-op.
    expect(settings.isBgmEnabled()).toBe(true);
    expect(() => settings.setBgmEnabled(false)).not.toThrow();
    expect(settings.isBgmEnabled()).toBe(false);
  });

  it('nextTrack 이 트랙명을 순환시킨다', async () => {
    const { settings } = await loadModules();
    const tracks = (await import('./tracks')).BGM_TRACKS;
    expect(settings.getCurrentTrackName()).toBe(tracks[0]!.name);
    settings.nextTrack();
    expect(settings.getCurrentTrackName()).toBe(tracks[1]!.name);
  });
});

describe('playClick / installGlobalClickSounds graceful no-op', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeLocalStorageMock());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('비브라우저에서 playClick 이 throw 하지 않는다', async () => {
    const { sfx } = await loadModules();
    expect(() => sfx.playClick('tap')).not.toThrow();
    expect(() => sfx.playClick('title')).not.toThrow();
  });

  it('document 없으면 installGlobalClickSounds 가 no-op cleanup 을 준다', async () => {
    const { sfx } = await loadModules();
    const cleanup = sfx.installGlobalClickSounds();
    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });
});
