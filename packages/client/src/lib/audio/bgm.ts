/**
 * 생성형 BGM 로테이션 엔진 — 5개 앰비언트 트랙을 ~90초마다 seamless 하게 순환해요.
 *
 * - 각 트랙은 자기 `out`(전용 게인)에 노트를 lookahead 스케줄링합니다.
 * - 트랙 전환은 짧은 crossfade(이전 트랙 페이드아웃 + 새 트랙 페이드인)로 끊김을 줄여요.
 * - 모든 동작은 미지원/비브라우저면 graceful no-op(컨텍스트 가드 + try/catch).
 *
 * 상태/영속/토글 노출은 settings.ts 가 담당하고, 이 모듈은 "재생 메커니즘"만 책임집니다.
 */

import { audioNow, getAudioContext, resumeAudio } from './context';
import { BGM_TRACKS, barDuration, type BgmTrack } from './tracks';

/** BGM 마스터 게인 기본값(효과음보다 더 낮게, 깔리듯). 0~1. 볼륨 슬라이더가 덮어써요. */
const BGM_DEFAULT_VOLUME = 0.5;
/** 들리는 최소 게인(exponential ramp 는 0 에 못 가므로 바닥값으로 써요). */
const MIN_GAIN = 0.0001;
/** 트랙당 재생 길이(초). ~90초 후 다음 트랙. */
const TRACK_DURATION_S = 90;
/** crossfade 길이(초) — 트랙 전환 시 이전↓·새 트랙↑. */
const FADE_S = 2.5;
/** 켜는 순간 마스터 페이드인 길이(초) — 0→목표로 부드럽게 올려 무자극. */
const FADE_IN_S = 1.5;
/** 스케줄러 lookahead(초) — 이 시간 앞까지 미리 노트를 채워요. */
const SCHEDULE_AHEAD_S = 1.5;
/** 스케줄러 틱 주기(ms). */
const SCHEDULER_INTERVAL_MS = 250;

interface ActiveTrack {
  track: BgmTrack;
  out: GainNode;
  /** 다음으로 스케줄을 채워야 할 절대 시각(초). */
  nextBarAt: number;
  bar: number;
}

let masterGain: GainNode | null = null;
let active: ActiveTrack | null = null;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let rotationTimer: ReturnType<typeof setTimeout> | null = null;
let trackIndex = 0;
let playing = false;
/** 현재 목표 볼륨(마스터 게인). 0~1. settings 가 영속·복원해 주입해요. */
let volume = BGM_DEFAULT_VOLUME;

/** 외부(settings)에서 트랙명 변경을 받아가는 콜백. */
let onTrackChange: ((name: string) => void) | null = null;
/** 외부(settings)에서 재생 상태 변경을 받아가는 콜백(인디케이터용). */
let onPlayingChange: ((playing: boolean) => void) | null = null;

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
};

/** 재생 상태가 바뀌면 한 번만 알려요. */
const setPlaying = (next: boolean): void => {
  if (playing === next) {
    return;
  }
  playing = next;
  onPlayingChange?.(next);
};

const ensureMasterGain = (ctx: AudioContext): GainNode => {
  if (masterGain) {
    return masterGain;
  }
  const gain = ctx.createGain();
  // 시작은 무음 — startBgm 이 제스처 시점에 목표 볼륨으로 페이드인해요.
  gain.gain.setValueAtTime(MIN_GAIN, ctx.currentTime);
  gain.connect(ctx.destination);
  masterGain = gain;
  return gain;
};

/** 마스터 게인을 0(무음)→목표 볼륨으로 ~FADE_IN_S 동안 부드럽게 올려요. */
const fadeMasterIn = (ctx: AudioContext): void => {
  const gain = ensureMasterGain(ctx).gain;
  const now = ctx.currentTime;
  const target = Math.max(MIN_GAIN, volume);
  try {
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(Math.max(MIN_GAIN, gain.value), now);
    gain.exponentialRampToValueAtTime(target, now + FADE_IN_S);
  } catch {
    // 무시 — graceful no-op.
  }
};

/**
 * 마스터 볼륨을 즉시(짧은 ramp) 적용해요. 재생 중이면 들리는 값이 바로 따라옵니다.
 * 정지 중이면 다음 startBgm 페이드인의 목표가 돼요.
 */
const applyVolume = (): void => {
  const ctx = getAudioContext();
  if (!ctx || !masterGain) {
    return;
  }
  const now = ctx.currentTime;
  try {
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(Math.max(MIN_GAIN, masterGain.gain.value), now);
    // 짧은 ramp(zipper noise 회피). 정지 상태(playing=false)면 무음 유지.
    masterGain.gain.exponentialRampToValueAtTime(
      playing ? Math.max(MIN_GAIN, volume) : MIN_GAIN,
      now + 0.08,
    );
  } catch {
    // 무시.
  }
};

/** 한 트랙의 출력 게인을 만들고 마스터에 연결해요. */
const createTrackOut = (ctx: AudioContext): GainNode => {
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, ctx.currentTime);
  out.connect(ensureMasterGain(ctx));
  return out;
};

/** lookahead 범위 안의 묶음들을 채워요. */
const runScheduler = (): void => {
  const ctx = getAudioContext();
  if (!ctx || !active) {
    return;
  }
  const horizon = ctx.currentTime + SCHEDULE_AHEAD_S;
  let guard = 0;
  while (active.nextBarAt < horizon && guard < 16) {
    const { track, out, nextBarAt, bar } = active;
    try {
      track.schedule({
        ctx,
        out,
        startAt: nextBarAt,
        beatDuration: track.beatDuration,
        beats: track.beatsPerBar,
        bar,
      });
    } catch {
      // 한 묶음 합성 실패는 무시하고 다음으로 진행.
    }
    active.nextBarAt = nextBarAt + barDuration(track);
    active.bar = bar + 1;
    guard += 1;
  }
};

/** 현재 트랙을 페이드아웃하고 일정 시간 뒤 정리해요. */
const fadeOutAndDispose = (entry: ActiveTrack): void => {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  try {
    entry.out.gain.cancelScheduledValues(now);
    entry.out.gain.setValueAtTime(Math.max(0.0002, entry.out.gain.value), now);
    entry.out.gain.exponentialRampToValueAtTime(0.0001, now + FADE_S);
  } catch {
    // 무시.
  }
  // 페이드 종료 후 연결 해제(예약된 노트는 자연 종료).
  setTimeout(
    () => {
      try {
        entry.out.disconnect();
      } catch {
        // 무시.
      }
    },
    (FADE_S + 4) * 1000,
  );
};

/** 인덱스 트랙을 시작(페이드인)하고 스케줄러를 돌려요. */
const startTrack = (index: number): void => {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  const track = BGM_TRACKS[((index % BGM_TRACKS.length) + BGM_TRACKS.length) % BGM_TRACKS.length];
  if (!track) {
    return;
  }
  trackIndex = ((index % BGM_TRACKS.length) + BGM_TRACKS.length) % BGM_TRACKS.length;

  const out = createTrackOut(ctx);
  const startAt = Math.max(audioNow(), ctx.currentTime) + 0.05;
  // 페이드인.
  try {
    out.gain.setValueAtTime(0.0001, startAt);
    out.gain.exponentialRampToValueAtTime(1, startAt + FADE_S);
  } catch {
    // 무시.
  }

  active = { track, out, nextBarAt: startAt, bar: 0 };
  onTrackChange?.(track.name);

  // 첫 묶음 즉시 채우고, 주기 스케줄러 가동.
  runScheduler();
  if (!schedulerTimer) {
    schedulerTimer = setInterval(runScheduler, SCHEDULER_INTERVAL_MS);
  }

  // ~90초 후 다음 트랙으로 로테이션.
  if (rotationTimer) {
    clearTimeout(rotationTimer);
  }
  rotationTimer = setTimeout(() => {
    if (playing) {
      advance(1);
    }
  }, TRACK_DURATION_S * 1000);
};

/** delta(보통 +1)만큼 트랙을 전환(crossfade). */
const advance = (delta: number): void => {
  if (!getAudioContext()) {
    return;
  }
  const previous = active;
  startTrack(trackIndex + delta);
  if (previous) {
    fadeOutAndDispose(previous);
  }
};

/** BGM 재생 시작/재개. 제스처 안에서 호출되면 컨텍스트가 언락돼요. */
export const startBgm = (): void => {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  void resumeAudio();
  if (playing) {
    return;
  }
  setPlaying(true);
  // 켜는 순간도 무자극 — 마스터를 0→목표 볼륨으로 ~1.5s 페이드인.
  fadeMasterIn(ctx);
  startTrack(trackIndex);
};

/** BGM 정지(트랙 페이드아웃 + 타이머 정리). 재개 시 같은 트랙부터 다시 시작해요. */
export const stopBgm = (): void => {
  setPlaying(false);
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  if (rotationTimer) {
    clearTimeout(rotationTimer);
    rotationTimer = null;
  }
  if (active) {
    fadeOutAndDispose(active);
    active = null;
  }
};

/** 다음 트랙으로 즉시 전환(재생 중일 때만 의미 있음). */
export const skipToNextTrack = (): void => {
  if (!playing) {
    // 정지 상태면 다음 인덱스만 기억해 둬요(다음 시작 시 반영).
    trackIndex = (trackIndex + 1) % BGM_TRACKS.length;
    onTrackChange?.(BGM_TRACKS[trackIndex]?.name ?? '');
    return;
  }
  advance(1);
};

/** 현재(또는 다음 시작할) 트랙명. */
export const currentBgmTrackName = (): string => BGM_TRACKS[trackIndex]?.name ?? '';

/** 재생 여부. */
export const isBgmPlaying = (): boolean => playing;

/** 트랙명 변경 구독(settings 가 상태 동기화에 사용). */
export const setBgmTrackChangeListener = (listener: ((name: string) => void) | null): void => {
  onTrackChange = listener;
};

/** 재생 상태 변경 구독(settings 가 isBgmPlaying 동기화에 사용). */
export const setBgmPlayingChangeListener = (
  listener: ((playing: boolean) => void) | null,
): void => {
  onPlayingChange = listener;
};

/** 현재 BGM 볼륨(마스터 게인 목표값, 0~1). */
export const getBgmVolume = (): number => volume;

/**
 * BGM 볼륨 설정(0~1, 클램프). 재생 중이면 즉시(짧은 ramp) 반영하고,
 * 정지 중이면 다음 시작 시 페이드인 목표가 돼요. 영속은 settings 가 담당합니다.
 */
export const setBgmVolume = (next: number): void => {
  volume = clamp01(next);
  applyVolume();
};

/** 테스트 전용 — 엔진 내부 상태를 초기화해요. */
export const __resetBgmForTests = (): void => {
  stopBgm();
  masterGain = null;
  trackIndex = 0;
  volume = BGM_DEFAULT_VOLUME;
  onTrackChange = null;
  onPlayingChange = null;
};

/** BGM 볼륨 기본값(settings 의 초기/리셋 기준). */
export const BGM_DEFAULT_VOLUME_VALUE = BGM_DEFAULT_VOLUME;
