/**
 * 호스티드 BGM 레이어 — 런타임에 `<base>/audio/playlist.json` 을 읽어, 실제 mp3 트랙
 * (가사 있는 곡 대비)을 HTMLAudioElement 로 재생하는 "우선 레이어"예요.
 *
 * - manifest 가 있고 트랙이 1개 이상이면 mp3 재생이 합성 BGM(bgm.ts)보다 우선.
 * - 없거나(404/네트워크/파싱) `play()` 거부 등 **어떤 실패든** 합성 5트랙으로 조용히 폴백.
 *   → manifest/파일이 전혀 없는 상태에서도 완전 무해해야 해요(기존 동작 그대로).
 * - 자동재생 정책: BGM ON 토글(제스처)에서 manifest 가 아직 미확정이면 합성을 먼저 즉시
 *   시작하고(WebAudio 언락), 백그라운드 로드 후 재생 의도가 유지되면 호스티드로 크로스페이드.
 *   manifest 가 캐시돼 있으면 제스처 스택 안에서 바로 `el.play()`.
 * - settings.ts(두뇌)는 이 파사드만 바라봅니다 — 합성 엔진(bgm.ts)은 무수정.
 *
 * 모든 동작은 SSR/비브라우저/미지원 환경에서 graceful no-op 입니다.
 */

import {
  BGM_DEFAULT_VOLUME_VALUE,
  currentBgmTrackName as synthTrackName,
  isBgmPlaying as synthIsPlaying,
  setBgmPlayingChangeListener as synthSetPlayingListener,
  setBgmTrackChangeListener as synthSetTrackListener,
  setBgmVolume as synthSetVolume,
  skipToNextTrack as synthSkip,
  startBgm as synthStart,
  stopBgm as synthStop,
} from './bgm';

export { BGM_DEFAULT_VOLUME_VALUE };

/** 트랙 크레딧(라이선스 표기용) — SoundControls 가 표시해요. */
export interface HostedTrackCredit {
  artist?: string;
  license?: string;
  creditUrl?: string;
}

/** manifest 스키마: `{ tracks: [{ src, title, artist?, license?, creditUrl? }] }` */
export interface HostedTrack extends HostedTrackCredit {
  src: string;
  title: string;
}

export type BgmSource = 'hosted' | 'synth';

const MANIFEST_PATH = '/audio/playlist.json';
/** 호스티드 페이드인 길이(ms) — 합성 crossfade(2.5s)보다 살짝 짧게. */
const FADE_IN_MS = 1200;
/** 정지 페이드아웃 길이(ms). */
const FADE_OUT_MS = 500;
/** 페이드 스텝 주기(ms). */
const FADE_STEP_MS = 50;

let baseUrl = '';
/** undefined=미확정(아직 안 읽음), null=없음/실패(합성 확정), 배열=호스티드 사용. */
let manifest: HostedTrack[] | null | undefined;
let manifestPromise: Promise<HostedTrack[] | null> | null = null;

let el: HTMLAudioElement | null = null;
let index = 0;
/** 현재 재생 주체가 호스티드인지(정지 중에도 유지 — 재개 시 같은 트랙부터). */
let hostedActive = false;
/** 파사드 관점의 재생 의도(startBgm 후 stopBgm 전). */
let shouldPlay = false;
let volume = BGM_DEFAULT_VOLUME_VALUE;
let fadeTimer: ReturnType<typeof setInterval> | null = null;

let onTrack: ((name: string) => void) | null = null;
let onPlaying: ((playing: boolean) => void) | null = null;

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
};

/**
 * 호스티드 자산의 base URL 설정(기본 '' = same-origin).
 * 토스 미니앱처럼 WebView 오리진이 웹과 다른 환경에서 웹 공개 오리진을 주입해요.
 */
export const configureHostedAudio = (options: Readonly<{ baseUrl?: string }>): void => {
  baseUrl = (options.baseUrl ?? '').trim().replace(/\/+$/, '');
};

/** manifest 의 src 를 절대 URL 로 해석해요('/'-경로는 base 에 절대화). */
const resolveTrackSrc = (src: string): string => {
  if (/^https?:\/\//i.test(src)) {
    return src;
  }
  if (src.startsWith('/')) {
    return `${baseUrl}${src}`;
  }
  return `${baseUrl}/audio/${src}`;
};

/** 항목 단위 런타임 가드 — 잘못된 항목은 스킵(전체 실패 아님). */
const parseManifest = (data: unknown): HostedTrack[] | null => {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const rawTracks = (data as { tracks?: unknown }).tracks;
  if (!Array.isArray(rawTracks)) {
    return null;
  }
  const tracks: HostedTrack[] = [];
  for (const entry of rawTracks) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.src !== 'string' || !candidate.src.trim()) {
      continue;
    }
    if (typeof candidate.title !== 'string' || !candidate.title.trim()) {
      continue;
    }
    tracks.push({
      src: candidate.src.trim(),
      title: candidate.title.trim(),
      artist: typeof candidate.artist === 'string' ? candidate.artist : undefined,
      license: typeof candidate.license === 'string' ? candidate.license : undefined,
      creditUrl: typeof candidate.creditUrl === 'string' ? candidate.creditUrl : undefined,
    });
  }
  return tracks.length > 0 ? tracks : null;
};

/**
 * manifest 를 1회 로드(캐시)해요. 없음/실패는 null — 콘솔 스팸 없이 합성 폴백 확정.
 * 공개 API 로도 노출(테스트·프리페치용).
 */
export const loadHostedPlaylist = (): Promise<HostedTrack[] | null> => {
  if (manifestPromise) {
    return manifestPromise;
  }
  if (typeof fetch !== 'function') {
    manifest = null;
    return Promise.resolve(null);
  }
  manifestPromise = fetch(`${baseUrl}${MANIFEST_PATH}`)
    .then(async (response) => {
      if (!response.ok) {
        return null;
      }
      return parseManifest(await response.json());
    })
    .catch(() => null)
    .then((tracks) => {
      manifest = tracks;
      return tracks;
    });
  return manifestPromise;
};

const stopFade = (): void => {
  if (fadeTimer) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
};

/** element.volume 을 target 까지 선형 페이드(zipper-free 수준의 짧은 스텝). */
const fadeElementTo = (target: number, durationMs: number, done?: () => void): void => {
  if (!el) {
    done?.();
    return;
  }
  stopFade();
  const element = el;
  const start = clamp01(element.volume);
  const goal = clamp01(target);
  const steps = Math.max(1, Math.round(durationMs / FADE_STEP_MS));
  let step = 0;
  fadeTimer = setInterval(() => {
    step += 1;
    const progress = step / steps;
    try {
      element.volume = clamp01(start + (goal - start) * progress);
    } catch {
      // 무시 — 일부 WebView 는 volume 설정이 막혀 있을 수 있어요.
    }
    if (step >= steps) {
      stopFade();
      done?.();
    }
  }, FADE_STEP_MS);
};

const emitTrack = (): void => {
  onTrack?.(currentBgmTrackName());
};

const emitPlaying = (playing: boolean): void => {
  onPlaying?.(playing);
};

const ensureElement = (): HTMLAudioElement | null => {
  if (el) {
    return el;
  }
  if (typeof Audio === 'undefined') {
    return null;
  }
  try {
    el = new Audio();
    el.preload = 'auto';
    el.addEventListener('ended', () => {
      // 로테이션: 마지막 트랙 뒤엔 처음으로 순환.
      if (!manifest || manifest.length === 0) {
        return;
      }
      index = (index + 1) % manifest.length;
      if (shouldPlay) {
        void playCurrent();
      } else {
        emitTrack();
      }
    });
    return el;
  } catch {
    el = null;
    return null;
  }
};

/**
 * 현재 인덱스 트랙을 재생(페이드인). 실패 시 합성으로 폴백.
 * @returns 호스티드 재생 시작 여부
 */
const playCurrent = async (): Promise<boolean> => {
  const tracks = manifest;
  if (!tracks || tracks.length === 0) {
    return false;
  }
  const element = ensureElement();
  const track = tracks[index % tracks.length];
  if (!element || !track) {
    return false;
  }
  const nextSrc = resolveTrackSrc(track.src);
  try {
    // 같은 트랙 재개면 src 를 갈아끼우지 않아 위치가 보존돼요.
    if (!element.src || !element.src.endsWith(track.src)) {
      element.src = nextSrc;
    }
    element.volume = 0;
    await element.play();
  } catch {
    // 재생 거부(자동재생 정책/파일 없음 등) — 합성 폴백. 재생 의도가 있고 합성이 쉬면 시작.
    hostedActive = false;
    if (shouldPlay && !synthIsPlaying()) {
      synthStart();
    }
    return false;
  }
  const wasSynthPlaying = synthIsPlaying();
  hostedActive = true;
  if (wasSynthPlaying) {
    // 크로스페이드: 합성은 자체 페이드아웃으로 정리(stopBgm), 호스티드는 페이드인.
    synthStop();
  }
  fadeElementTo(volume, FADE_IN_MS);
  emitTrack();
  emitPlaying(true);
  return true;
};

/** BGM 재생 시작/재개 — 호스티드 우선, 미확정이면 합성 선재생 후 전환 시도. */
export const startBgm = (): void => {
  shouldPlay = true;
  if (manifest && manifest.length > 0) {
    void playCurrent();
    return;
  }
  if (manifest === null) {
    synthStart();
    return;
  }
  // 미확정 — 제스처 스택 안에서 합성을 즉시 시작해 무음을 피하고, 로드 후 전환.
  synthStart();
  void loadHostedPlaylist().then((tracks) => {
    if (!shouldPlay || !tracks || tracks.length === 0) {
      return;
    }
    void playCurrent();
  });
};

/** BGM 정지(페이드아웃). 재개 시 같은 트랙·위치부터 이어가요. */
export const stopBgm = (): void => {
  shouldPlay = false;
  if (hostedActive && el) {
    fadeElementTo(0, FADE_OUT_MS, () => {
      try {
        el?.pause();
      } catch {
        // 무시.
      }
    });
    emitPlaying(false);
    return;
  }
  synthStop();
};

/** 다음 트랙으로 전환(호스티드 활성 시 mp3 로테이션, 아니면 합성 스킵). */
export const skipToNextTrack = (): void => {
  if (hostedActive && manifest && manifest.length > 0) {
    index = (index + 1) % manifest.length;
    if (el) {
      // 다음 곡은 처음부터 — src 교체를 강제하기 위해 위치를 리셋해요.
      try {
        el.src = resolveTrackSrc(manifest[index % manifest.length]?.src ?? '');
      } catch {
        // 무시.
      }
    }
    if (shouldPlay) {
      void playCurrent();
    } else {
      emitTrack();
    }
    return;
  }
  synthSkip();
};

/** 현재(또는 다음 시작할) 트랙명 — 호스티드면 manifest title, 아니면 합성 트랙명. */
export const currentBgmTrackName = (): string => {
  if (hostedActive && manifest && manifest.length > 0) {
    return manifest[index % manifest.length]?.title ?? '';
  }
  return synthTrackName();
};

/** 실제 재생 중 여부(인디케이터·가시성 일시정지 판정용). */
export const isBgmPlaying = (): boolean => {
  if (hostedActive) {
    return Boolean(shouldPlay && el && !el.paused);
  }
  return synthIsPlaying();
};

/** 현재 재생 주체. */
export const currentBgmSource = (): BgmSource => (hostedActive ? 'hosted' : 'synth');

/** 현재 트랙 크레딧(호스티드일 때만, 라이선스 표기용). */
export const currentBgmCredit = (): HostedTrackCredit | null => {
  if (!hostedActive || !manifest || manifest.length === 0) {
    return null;
  }
  const track = manifest[index % manifest.length];
  if (!track) {
    return null;
  }
  const credit: HostedTrackCredit = {};
  if (track.artist) credit.artist = track.artist;
  if (track.license) credit.license = track.license;
  if (track.creditUrl) credit.creditUrl = track.creditUrl;
  return credit;
};

/** BGM 볼륨(0~1) — 합성 마스터 게인과 호스티드 element 볼륨에 함께 반영. */
export const setBgmVolume = (next: number): void => {
  volume = clamp01(next);
  synthSetVolume(volume);
  if (el && hostedActive && !fadeTimer) {
    try {
      el.volume = volume;
    } catch {
      // 무시.
    }
  }
};

/** 트랙명 변경 구독 — 합성 엔진의 변경도 이 파사드가 감싸 전달해요. */
export const setBgmTrackChangeListener = (listener: ((name: string) => void) | null): void => {
  onTrack = listener;
  synthSetTrackListener((name: string) => {
    if (!hostedActive) {
      onTrack?.(name);
    }
  });
};

/** 재생 상태 변경 구독(인디케이터용). */
export const setBgmPlayingChangeListener = (
  listener: ((playing: boolean) => void) | null,
): void => {
  onPlaying = listener;
  synthSetPlayingListener((playing: boolean) => {
    if (!hostedActive) {
      onPlaying?.(playing);
    }
  });
};

/** 테스트 전용 — 파사드 내부 상태를 초기화해요. */
export const __resetHostedForTests = (): void => {
  stopFade();
  try {
    el?.pause();
  } catch {
    // 무시.
  }
  el = null;
  index = 0;
  hostedActive = false;
  shouldPlay = false;
  manifest = undefined;
  manifestPromise = null;
  baseUrl = '';
  volume = BGM_DEFAULT_VOLUME_VALUE;
  onTrack = null;
  onPlaying = null;
};
