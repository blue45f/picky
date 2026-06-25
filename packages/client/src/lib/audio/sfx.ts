/**
 * 효과음(SFX) — 전부 WebAudio 합성이라 음원 파일이 없어요(저작권 free).
 *
 * - `playClick('tap')`  : 버튼/링크용 미묘하고 짧은 틱(<100ms). 너무 날카롭지 않게 soft.
 * - `playClick('title')`: 반짝이는 sparkle 화음(짧고 밝게). 강조 인터랙션용.
 * - `installGlobalClickSounds()`: document 캡처 클릭 리스너 1개로 인터랙티브 요소 클릭을
 *   감지해 'tap' 을 재생해요. cleanup 함수를 반환합니다.
 *
 * 마스터 게인을 낮게 잡아 은은하게 깔리도록 했어요. 모든 호출은 미지원/비활성 환경에서
 * graceful no-op 입니다(컨텍스트 가드 + try/catch).
 */

import { audioNow, getAudioContext, resumeAudio } from './context';
import { isSfxEnabled } from './settings';

export type ClickVariant = 'tap' | 'title';

/** 효과음 마스터 게인(은은하게). 0~1. */
const SFX_MASTER_GAIN = 0.16;

/**
 * 단일 오실레이터 톤을 soft attack/decay 엔벨로프로 재생해요.
 * 공유 헬퍼 — sfx 합성의 기본 빌딩 블록입니다.
 */
const playTone = (
  ctx: AudioContext,
  options: {
    type: OscillatorType;
    frequency: number;
    startAt: number;
    duration: number;
    peak: number;
    /** attack 비율(0~1, duration 대비). 클수록 더 부드럽게 시작. */
    attackRatio?: number;
    /** 끝으로 갈수록 주파수를 살짝 내려 '딩' 느낌(선택). */
    glideToFrequency?: number;
  },
): void => {
  const {
    type,
    frequency,
    startAt,
    duration,
    peak,
    attackRatio = 0.25,
    glideToFrequency,
  } = options;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);
  if (glideToFrequency && glideToFrequency > 0) {
    osc.frequency.exponentialRampToValueAtTime(glideToFrequency, startAt + duration);
  }

  const attack = Math.max(0.004, duration * attackRatio);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), startAt + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
};

/** 'tap' — 짧고 미묘한 틱(<100ms). 두 톤을 살짝 겹쳐 둥근 클릭감. */
const playTap = (ctx: AudioContext, now: number): void => {
  playTone(ctx, {
    type: 'sine',
    frequency: 880,
    startAt: now,
    duration: 0.06,
    peak: SFX_MASTER_GAIN,
    attackRatio: 0.18,
    glideToFrequency: 660,
  });
  playTone(ctx, {
    type: 'triangle',
    frequency: 1320,
    startAt: now,
    duration: 0.045,
    peak: SFX_MASTER_GAIN * 0.5,
    attackRatio: 0.12,
  });
};

/** 'title' — 밝은 sparkle 화음(짧게). 메이저 트라이어드+옥타브를 빠르게 아르페지오. */
const playTitle = (ctx: AudioContext, now: number): void => {
  // C6 메이저 트라이어드 + 옥타브(C E G C) — 밝고 반짝이는 결.
  const notes = [1046.5, 1318.5, 1568.0, 2093.0];
  notes.forEach((frequency, index) => {
    const startAt = now + index * 0.028;
    playTone(ctx, {
      type: 'sine',
      frequency,
      startAt,
      duration: 0.5 - index * 0.06,
      peak: SFX_MASTER_GAIN * (0.7 - index * 0.08),
      attackRatio: 0.08,
    });
  });
  // 살짝의 윗배음 반짝임.
  playTone(ctx, {
    type: 'triangle',
    frequency: 2637.0,
    startAt: now + 0.05,
    duration: 0.28,
    peak: SFX_MASTER_GAIN * 0.18,
    attackRatio: 0.1,
  });
};

/**
 * 효과음을 재생해요. sfx 비활성/미지원/비브라우저면 graceful no-op.
 * @param variant 'tap'(기본 클릭) | 'title'(강조 sparkle)
 */
export const playClick = (variant: ClickVariant = 'tap'): void => {
  if (!isSfxEnabled()) {
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  // 첫 제스처에서 suspended 면 언락(반환 Promise 는 무시 — 다음 호출부터 들려요).
  void resumeAudio();
  try {
    const now = Math.max(audioNow(), ctx.currentTime) + 0.001;
    if (variant === 'title') {
      playTitle(ctx, now);
    } else {
      playTap(ctx, now);
    }
  } catch {
    // 합성 실패는 조용히 무시 — UI 흐름을 막지 않아요.
  }
};

const SOUND_SELECTOR =
  'button, a[href], [role="button"], input[type="submit"], input[type="button"], [data-sound]';

/**
 * 요소(또는 조상)가 사운드 대상인지 + 비활성/제외 여부를 판정해요.
 * `instanceof Element` 대신 메서드 존재(duck-typing)로 가드해, 전역 Element 클래스가
 * 없는 환경에서도 ReferenceError 없이 안전하게 동작합니다.
 */
const findSoundTarget = (start: EventTarget | null): Element | null => {
  const isElementLike = (value: unknown): value is Element =>
    typeof (value as Element | null)?.matches === 'function';

  let node: Element | null = isElementLike(start) ? start : null;
  while (node) {
    // 명시적 제외(조상 포함).
    if (typeof node.closest === 'function' && node.closest('[data-no-sound]')) {
      return null;
    }
    if (node.matches(SOUND_SELECTOR)) {
      // disabled 요소는 제외.
      if ((node as HTMLButtonElement).disabled || node.getAttribute('aria-disabled') === 'true') {
        return null;
      }
      return node;
    }
    node = node.parentElement;
  }
  return null;
};

/** 전역 클릭 사운드 스로틀 간격(ms) — 연타로 소리가 뭉치지 않게. */
const CLICK_THROTTLE_MS = 30;

/**
 * document 에 캡처 단계 클릭 리스너 **1개**를 달아 인터랙티브 요소 클릭 시 'tap' 을 재생해요.
 * `[data-no-sound]`·disabled 요소는 제외하고, 30ms 스로틀을 적용합니다.
 * 비브라우저/SSR 이면 no-op cleanup 을 반환해요.
 * @returns 리스너를 제거하는 cleanup 함수
 */
export const installGlobalClickSounds = (): (() => void) => {
  if (typeof document === 'undefined') {
    return () => {};
  }

  let lastPlayedAt = 0;

  const handler = (event: Event): void => {
    // 합성 클릭(키보드 Enter 등 포함)에서도 자연스럽게 동작해요.
    const target = findSoundTarget(event.target);
    if (!target) {
      return;
    }
    const nowMs = Date.now();
    if (nowMs - lastPlayedAt < CLICK_THROTTLE_MS) {
      return;
    }
    lastPlayedAt = nowMs;
    playClick('tap');
  };

  // 캡처 단계 — 자식 핸들러가 stopPropagation 해도 사운드는 일관되게 울려요.
  document.addEventListener('click', handler, { capture: true, passive: true });

  return () => {
    document.removeEventListener('click', handler, { capture: true });
  };
};
