import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetHostedForTests,
  configureHostedAudio,
  currentBgmCredit,
  currentBgmSource,
  loadHostedPlaylist,
  startBgm,
  stopBgm,
} from './hosted';

/** 초소형 HTMLAudioElement 목 — node 환경에 주입(재생 성공 경로 검증용). */
class FakeAudio {
  src = '';
  volume = 1;
  paused = true;
  preload = '';
  listeners = new Map<string, Array<() => void>>();
  addEventListener(type: string, handler: () => void) {
    const arr = this.listeners.get(type) ?? [];
    arr.push(handler);
    this.listeners.set(type, arr);
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

const validManifest = {
  tracks: [
    { src: '/audio/a.mp3', title: 'Track A', license: 'Royalty-free' },
    { src: '/audio/b.mp3', title: 'Track B', artist: 'Someone', creditUrl: 'https://x.test' },
    { src: 42, title: 'broken' }, // 잘못된 항목 — 스킵돼야 함
    { src: '/audio/c.mp3' }, // title 없음 — 스킵돼야 함
  ],
};

beforeEach(() => {
  __resetHostedForTests();
});

afterEach(() => {
  __resetHostedForTests();
  vi.unstubAllGlobals();
});

describe('loadHostedPlaylist', () => {
  it('returns null when the manifest is absent (fetch fails) — synth fallback stays intact', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(loadHostedPlaylist()).resolves.toBeNull();
    expect(currentBgmSource()).toBe('synth');
  });

  it('returns null on non-OK responses (404 등)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 404 })));
    await expect(loadHostedPlaylist()).resolves.toBeNull();
  });

  it('parses valid tracks and skips malformed entries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(validManifest), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const tracks = await loadHostedPlaylist();
    expect(tracks).toHaveLength(2);
    expect(tracks?.[0]).toMatchObject({ src: '/audio/a.mp3', title: 'Track A' });
    expect(tracks?.[1]).toMatchObject({ title: 'Track B', artist: 'Someone' });
  });

  it('fetches the manifest from the configured base URL (토스 크로스 오리진)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(validManifest), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    configureHostedAudio({ baseUrl: 'https://picky-olive.vercel.app/' });
    await loadHostedPlaylist();
    expect(fetchMock).toHaveBeenCalledWith('https://picky-olive.vercel.app/audio/playlist.json');
  });
});

describe('hosted playback', () => {
  it('plays the hosted track (with credit) once the manifest is available', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(validManifest), { status: 200 })),
    );
    vi.stubGlobal('Audio', FakeAudio as unknown as typeof Audio);

    await loadHostedPlaylist();
    startBgm();
    // playCurrent 의 el.play() Promise 해소를 기다린다.
    await Promise.resolve();
    await Promise.resolve();

    expect(currentBgmSource()).toBe('hosted');
    expect(currentBgmCredit()).toEqual({ license: 'Royalty-free' });
    stopBgm();
  });

  it('stays on synth when the manifest is known-absent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x', { status: 404 })));
    vi.stubGlobal('Audio', FakeAudio as unknown as typeof Audio);

    await loadHostedPlaylist();
    startBgm();
    await Promise.resolve();

    expect(currentBgmSource()).toBe('synth');
    stopBgm();
  });
});
