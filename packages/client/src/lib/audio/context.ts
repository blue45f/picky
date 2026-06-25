/**
 * WebAudio 컨텍스트 싱글톤 — web/토스 두 앱이 공유하는 통합 오디오 엔진의 토대예요.
 *
 * 핵심 원칙:
 * - **음원 파일 0개**: 모든 소리는 오실레이터/필터/게인으로 코드 생성합니다(저작권 free).
 * - **graceful no-op**: SSR/비브라우저/미지원 환경에서는 어떤 호출도 조용히 무시되고
 *   절대 throw 하지 않아요. window·AudioContext 가드 + 전역 try/catch 로 보장합니다.
 * - **제스처 언락**: 브라우저 자동재생 정책상 사용자 제스처 전엔 컨텍스트가 suspended 일 수
 *   있어요. `resumeAudio()` 를 토글(제스처) 시점에 호출해 언락합니다.
 */

type AudioContextCtor = typeof AudioContext;

let cachedContext: AudioContext | null = null;
let contextUnavailable = false;

const resolveAudioContextCtor = (): AudioContextCtor | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const candidate =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  return typeof candidate === 'function' ? candidate : null;
};

/**
 * 공유 AudioContext 를 반환해요. 미지원/비브라우저면 null(호출부는 no-op 처리).
 * 최초 호출은 보통 사용자 제스처 안에서 일어나도록 설계되어 있어요.
 */
export const getAudioContext = (): AudioContext | null => {
  if (cachedContext) {
    return cachedContext;
  }
  if (contextUnavailable) {
    return null;
  }
  const Ctor = resolveAudioContextCtor();
  if (!Ctor) {
    contextUnavailable = true;
    return null;
  }
  try {
    cachedContext = new Ctor();
    return cachedContext;
  } catch {
    contextUnavailable = true;
    return null;
  }
};

/**
 * 컨텍스트를 resume 해 언락해요(제스처 핸들러 안에서 호출).
 * 반환된 Promise 는 절대 reject 되지 않아요(엔진 어디서도 await 실패가 새지 않도록).
 */
export const resumeAudio = async (): Promise<void> => {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      // 무시 — 다음 제스처에서 다시 시도돼요.
    }
  }
};

/** 현재 오디오 클럭(초). 컨텍스트 없으면 0. 스케줄링 기준 시각으로 써요. */
export const audioNow = (): number => {
  const ctx = getAudioContext();
  return ctx ? ctx.currentTime : 0;
};

/** 테스트 전용 — 캐시된 컨텍스트/플래그를 리셋해요. */
export const __resetAudioContextForTests = (): void => {
  cachedContext = null;
  contextUnavailable = false;
};
