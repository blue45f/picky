// 토스 인앱과 동일한 "팡 터뜨리는" 파티클 연출(apps/toss/src/lib/particles.ts 미러).
// 브랜드마크 클릭 등에서 (x,y)에 파티클을 폭발시켜요.

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

// 글로벌 파티클 상태 저장소
export const globalParticles: Particle[] = [];

// 연출용 난수 — crypto.getRandomValues(미지원 환경만 폴백).
const secureRandom = (): number => {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    return (array[0] ?? 0) / 4294967296; // 2^32 → [0, 1)
  }
  return 0.5;
};

/**
 * (x, y)에 파티클을 "팡" 터뜨려요 — 토스 인앱 효과와 동일.
 * 브랜드 색(아보카도 민트·골드) + 이모지가 중력/공기저항으로 흩어지며 사라져요.
 */
export function triggerParticleBurst(
  x: number,
  y: number,
  options?: {
    count?: number;
    charSet?: string[];
    speedMultiplier?: number;
  },
): void {
  const count = options?.count ?? 25;
  const speedMult = options?.speedMultiplier ?? 1;
  const colors = ['#13c2a3', '#20d6b2', '#facc15', '#ffffff', '#60a5fa', '#a855f7'];
  const chars = options?.charSet ?? ['🥑', '✨', '✦', '🌟', '💚', '💛'];

  for (let i = 0; i < count; i++) {
    const angle = secureRandom() * Math.PI * 2;
    const speed = (2 + secureRandom() * 8) * speedMult;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - (1 + secureRandom() * 2); // 살짝 위로 솟는 효과
    const size = 11 + secureRandom() * 15;
    const color = colors[Math.floor(secureRandom() * colors.length)] ?? '#13c2a3';
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
