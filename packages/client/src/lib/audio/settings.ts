/**
 * 오디오 상태·영속·구독 — 통합 오디오 엔진의 "두뇌"예요.
 *
 * - `sfxEnabled`(기본 ON)·`bgmEnabled`(기본 OFF — 자동재생 차단 회피) 토글
 * - localStorage 영속, `onChange(listener)` 구독(React 훅이 소비)
 * - 탭 숨김(visibilitychange) 시 BGM 일시정지, 복귀 시 재개
 * - `prefers-reduced-motion: reduce` 면 sfx 기본 OFF
 * - bgmEnabled 토글 ON 은 사용자 제스처라 AudioContext 를 언락하고 즉시 첫 트랙 재생
 *
 * 모든 동작은 SSR/비브라우저에서 graceful no-op 입니다.
 */

import {
  BGM_DEFAULT_VOLUME_VALUE,
  currentBgmTrackName,
  isBgmPlaying,
  setBgmPlayingChangeListener,
  setBgmTrackChangeListener,
  setBgmVolume as engineSetBgmVolume,
  skipToNextTrack,
  startBgm,
  stopBgm,
} from './bgm';

const SFX_KEY = 'picky_sfx_enabled';
const BGM_KEY = 'picky_bgm_enabled';
const BGM_VOLUME_KEY = 'picky_bgm_volume';
const ALL_MUTED_KEY = 'picky_all_muted';

export interface SoundState {
  sfxEnabled: boolean;
  bgmEnabled: boolean;
  /** 현재(또는 다음 시작할) BGM 트랙명. */
  currentTrackName: string;
  /** BGM 볼륨(0~1). 슬라이더용. */
  bgmVolume: number;
  /** BGM 이 실제로 재생 중인지(인디케이터용). */
  isBgmPlaying: boolean;
  /** 마스터 음소거(SFX+BGM 전체) 여부. */
  allMuted: boolean;
}

export type SoundStateListener = (state: SoundState) => void;

const hasWindow = (): boolean => typeof window !== 'undefined';

const readStored = (key: string): boolean | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return null;
    }
    return raw === '1' || raw === 'true';
  } catch {
    return null;
  }
};

const writeStored = (key: string, value: boolean): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // 무시(프라이빗 모드 등).
  }
};

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) {
    return BGM_DEFAULT_VOLUME_VALUE;
  }
  return Math.min(1, Math.max(0, value));
};

const readStoredNumber = (key: string): number | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return null;
    }
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? clamp01(parsed) : null;
  } catch {
    return null;
  }
};

const writeStoredNumber = (key: string, value: number): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // 무시(프라이빗 모드 등).
  }
};

const prefersReducedMotion = (): boolean => {
  if (!hasWindow() || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/** sfx 기본값 — reduce 모션이면 OFF, 아니면 ON. */
const defaultSfxEnabled = (): boolean => !prefersReducedMotion();

const initialBgmVolume = readStoredNumber(BGM_VOLUME_KEY) ?? BGM_DEFAULT_VOLUME_VALUE;
// 영속된 볼륨을 엔진 마스터 게인 목표값으로 동기화(재생 시 페이드인 목표가 돼요).
engineSetBgmVolume(initialBgmVolume);

const state: SoundState = {
  sfxEnabled: readStored(SFX_KEY) ?? defaultSfxEnabled(),
  bgmEnabled: readStored(BGM_KEY) ?? false, // 기본 OFF.
  currentTrackName: currentBgmTrackName(),
  bgmVolume: initialBgmVolume,
  isBgmPlaying: isBgmPlaying(),
  allMuted: readStored(ALL_MUTED_KEY) ?? false,
};

const listeners = new Set<SoundStateListener>();
let pausedByVisibility = false;
let wired = false;
/**
 * 마스터 음소거 직전의 SFX/BGM 토글 상태(해제 시 복원용).
 * null 이면 "복원할 직전 상태 없음" — 해제 시 SFX 만 켜는 폴백을 써요.
 */
let preMuteState: { sfxEnabled: boolean; bgmEnabled: boolean } | null = null;

/**
 * 캐시된 스냅샷 — `useSyncExternalStore` 의 getSnapshot 은 상태가 안 바뀌면 **같은 참조**를
 * 받아야 무한 렌더 루프("Maximum update depth exceeded")가 안 나요. 변경(emit) 시에만 새
 * 객체로 교체하고, 그 사이엔 이 캐시를 그대로 돌려줍니다.
 */
let cachedSnapshot: SoundState = { ...state };

const emit = (): void => {
  cachedSnapshot = { ...state };
  listeners.forEach((listener) => {
    try {
      listener(cachedSnapshot);
    } catch {
      // 한 구독자의 오류가 다른 구독자/엔진을 막지 않도록.
    }
  });
};

/** 가시성/트랙명 변경 등 1회성 전역 배선. */
const ensureWired = (): void => {
  if (wired || !hasWindow()) {
    return;
  }
  wired = true;

  // 엔진의 트랙명 변경을 상태에 반영.
  setBgmTrackChangeListener((name) => {
    if (state.currentTrackName !== name) {
      state.currentTrackName = name;
      emit();
    }
  });

  // 엔진의 실제 재생 상태 변경을 상태에 반영(인디케이터용).
  setBgmPlayingChangeListener((isPlaying) => {
    if (state.isBgmPlaying !== isPlaying) {
      state.isBgmPlaying = isPlaying;
      emit();
    }
  });

  // 탭 숨김 시 일시정지, 복귀 시 (켜져 있으면) 재개.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (state.bgmEnabled && isBgmPlaying()) {
          pausedByVisibility = true;
          stopBgm();
        }
      } else if (document.visibilityState === 'visible') {
        if (pausedByVisibility && state.bgmEnabled) {
          pausedByVisibility = false;
          startBgm();
          state.currentTrackName = currentBgmTrackName();
          emit();
        }
        pausedByVisibility = false;
      }
    });
  }
};

/** 현재 sfx 활성 여부(엔진 내부에서 재생 게이팅에 사용). 마스터 음소거 시 강제 OFF. */
export const isSfxEnabled = (): boolean => state.sfxEnabled && !state.allMuted;

/** 현재 bgm 활성 여부(토글 상태). */
export const isBgmEnabled = (): boolean => state.bgmEnabled;

/** 마스터 음소거(SFX+BGM 전체) 여부. */
export const isAllMuted = (): boolean => state.allMuted;

/** 상태 스냅샷(캐시된 안정 참조 — getSnapshot 무한 루프 방지). */
export const getSoundState = (): SoundState => cachedSnapshot;

/** 상태 변경 구독. 반환된 함수로 구독 해제. */
export const onSoundStateChange = (listener: SoundStateListener): (() => void) => {
  ensureWired();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** 효과음 on/off. ON 으로 켜면 마스터 음소거가 걸려 있어도 해제(개별 의사 존중). */
export const setSfxEnabled = (enabled: boolean): void => {
  ensureWired();
  let changed = false;
  // 채널을 켜는 의도면 마스터 음소거를 우선 해제(복원 스냅샷은 폐기).
  if (enabled && state.allMuted) {
    state.allMuted = false;
    preMuteState = null;
    writeStored(ALL_MUTED_KEY, false);
    changed = true;
  }
  if (state.sfxEnabled !== enabled) {
    state.sfxEnabled = enabled;
    writeStored(SFX_KEY, enabled);
    changed = true;
  }
  if (changed) {
    emit();
  }
};

/**
 * BGM on/off. ON 토글은 제스처로 간주해 즉시 첫 트랙 재생(컨텍스트 언락).
 * OFF 토글은 페이드아웃하며 정지해요.
 */
export const setBgmEnabled = (enabled: boolean): void => {
  ensureWired();
  let changed = false;
  // 채널을 켜는 의도면 마스터 음소거를 우선 해제(복원 스냅샷은 폐기).
  if (enabled && state.allMuted) {
    state.allMuted = false;
    preMuteState = null;
    writeStored(ALL_MUTED_KEY, false);
    changed = true;
  }
  if (state.bgmEnabled !== enabled) {
    state.bgmEnabled = enabled;
    writeStored(BGM_KEY, enabled);
    pausedByVisibility = false;
    if (enabled) {
      startBgm();
      state.currentTrackName = currentBgmTrackName();
    } else {
      stopBgm();
    }
    changed = true;
  }
  if (changed) {
    emit();
  }
};

/** 다음 트랙으로 전환. */
export const nextTrack = (): void => {
  ensureWired();
  skipToNextTrack();
  state.currentTrackName = currentBgmTrackName();
  emit();
};

/** 현재 BGM 볼륨(0~1). */
export const getBgmVolume = (): number => state.bgmVolume;

/**
 * BGM 볼륨 설정(0~1, 클램프). 재생 중이면 즉시 반영하고 localStorage 에 영속합니다.
 * 슬라이더 onChange 가 바로 호출해도 무자극(짧은 ramp)이에요.
 */
export const setBgmVolume = (value: number): void => {
  ensureWired();
  const next = clamp01(value);
  if (state.bgmVolume === next) {
    return;
  }
  state.bgmVolume = next;
  engineSetBgmVolume(next);
  writeStoredNumber(BGM_VOLUME_KEY, next);
  emit();
};

/**
 * 마스터 음소거(SFX+BGM 전체) 즉시 on/off.
 * - ON: 직전 SFX/BGM 토글 상태를 기억하고 BGM 정지·SFX 게이트를 끕니다.
 * - OFF: 직전 상태를 복원해요(없으면 SFX 만 켜는 폴백).
 */
export const setAllMuted = (muted: boolean): void => {
  ensureWired();
  if (state.allMuted === muted) {
    return;
  }

  if (muted) {
    // 직전 상태 캡처 후 전체 차단.
    preMuteState = { sfxEnabled: state.sfxEnabled, bgmEnabled: state.bgmEnabled };
    state.allMuted = true;
    writeStored(ALL_MUTED_KEY, true);
    // BGM 이 켜져 있었다면 실제 재생을 멈춰요(토글 상태 bgmEnabled 는 보존).
    if (state.bgmEnabled) {
      stopBgm();
    }
    // SFX 는 isSfxEnabled 게이트가 allMuted 로 자동 차단(상태 보존).
    emit();
    return;
  }

  // 해제 — 직전 상태 복원(없으면 SFX 만 켜는 폴백).
  state.allMuted = false;
  writeStored(ALL_MUTED_KEY, false);
  const restore = preMuteState ?? { sfxEnabled: true, bgmEnabled: state.bgmEnabled };
  preMuteState = null;

  if (state.sfxEnabled !== restore.sfxEnabled) {
    state.sfxEnabled = restore.sfxEnabled;
    writeStored(SFX_KEY, restore.sfxEnabled);
  }
  // BGM 이 직전에 켜져 있었다면 다시 재생(페이드인).
  if (restore.bgmEnabled) {
    if (!state.bgmEnabled) {
      state.bgmEnabled = true;
      writeStored(BGM_KEY, true);
    }
    pausedByVisibility = false;
    startBgm();
    state.currentTrackName = currentBgmTrackName();
  }
  emit();
};

/** 현재 트랙명. */
export const getCurrentTrackName = (): string => state.currentTrackName;

/** 테스트 전용 — 구독자/배선/상태를 초기화해요. */
export const __resetSettingsForTests = (): void => {
  listeners.clear();
  wired = false;
  pausedByVisibility = false;
  preMuteState = null;
  state.sfxEnabled = readStored(SFX_KEY) ?? defaultSfxEnabled();
  state.bgmEnabled = readStored(BGM_KEY) ?? false;
  state.currentTrackName = currentBgmTrackName();
  state.bgmVolume = readStoredNumber(BGM_VOLUME_KEY) ?? BGM_DEFAULT_VOLUME_VALUE;
  state.isBgmPlaying = isBgmPlaying();
  state.allMuted = readStored(ALL_MUTED_KEY) ?? false;
  engineSetBgmVolume(state.bgmVolume);
  cachedSnapshot = { ...state };
};
