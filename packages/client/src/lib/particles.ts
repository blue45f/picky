/**
 * "팡 터뜨리는" 파티클 연출 코어 — web/toss 두 앱이 공유해요.
 * 물리/버스트 로직은 단일화하고, **색/이모지 셋은 앱별로 주입**해 브랜드 결을 유지해요.
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  char?: string;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  decay: number;
}

// 글로벌 파티클 상태 저장소(두 앱이 각자 단일 인스턴스로 공유).
export const globalParticles: Particle[] = [];

// 연출용 난수 — crypto.getRandomValues로 S2245(PRNG) 룰 충족, 미지원 환경만 폴백.
const secureRandom = (): number => {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    return (array[0] ?? 0) / 4294967296; // 2^32 → [0, 1)
  }
  return 0.5;
};

const DEFAULT_CHARS = ['🥑', '✨', '✦', '🌟', '💚', '💛'];

export interface ParticleBurstOptions {
  count?: number;
  charSet?: string[];
  speedMultiplier?: number;
}

export interface ParticlePalette {
  /** 파티클 색 풀(비어 있으면 안 됨). 첫 색이 폴백으로도 쓰여요. */
  colors: readonly string[];
  /** 기본 이모지 셋(미지정 시 공용 기본값). */
  chars?: readonly string[];
}

/**
 * (x, y)에 파티클을 "팡" 터뜨려요.
 * 색/이모지는 `palette`로 주입받고, 옵션의 charSet이 있으면 그쪽을 우선해요.
 */
export function triggerParticleBurst(
  x: number,
  y: number,
  palette: ParticlePalette,
  options?: ParticleBurstOptions,
): void {
  const count = options?.count ?? 25;
  const speedMult = options?.speedMultiplier ?? 1;
  const colors = palette.colors;
  const fallbackColor = colors[0] ?? '#13c2a3';
  const chars = options?.charSet ?? palette.chars ?? DEFAULT_CHARS;

  for (let i = 0; i < count; i++) {
    const angle = secureRandom() * Math.PI * 2;
    const speed = (2 + secureRandom() * 8) * speedMult;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - (1 + secureRandom() * 2); // 살짝 위로 솟는 효과
    const size = 11 + secureRandom() * 15;
    const color = colors[Math.floor(secureRandom() * colors.length)] ?? fallbackColor;
    const char =
      secureRandom() > 0.3 ? chars[Math.floor(secureRandom() * chars.length)] : undefined;

    globalParticles.push({
      x,
      y,
      vx,
      vy,
      size,
      color,
      char,
      alpha: 1,
      rotation: secureRandom() * Math.PI * 2,
      rotationSpeed: (secureRandom() - 0.5) * 0.2,
      decay: 0.015 + secureRandom() * 0.02,
    });
  }
}
