import { theme } from '../theme';

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

// 파티클 연출용 난수 — crypto.getRandomValues로 S2245(PRNG) 룰을 충족하고, 미지원 환경에서만 폴백해요.
const secureRandom = () => {
  if (typeof globalThis.window !== 'undefined' && globalThis.crypto) {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    return (array[0] ?? 0) / 4294967296; // 2^32 → [0, 1)
  }
  return 0.5;
};

// 파티클 폭발 트리거 유틸리티
export function triggerParticleBurst(
  x: number,
  y: number,
  options?: {
    count?: number;
    charSet?: string[];
    speedMultiplier?: number;
  },
) {
  const count = options?.count ?? 25;
  const speedMult = options?.speedMultiplier ?? 1;
  const colors = [theme.accent, theme.accentStrong, theme.gold, '#ffffff', '#60a5fa', '#a855f7'];
  const chars = options?.charSet ?? ['🥑', '✨', '✦', '🌟', '💚', '💛'];

  for (let i = 0; i < count; i++) {
    const angle = secureRandom() * Math.PI * 2;
    const speed = (2 + secureRandom() * 8) * speedMult;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - (1 + secureRandom() * 2); // 살짝 위로 솟는 효과 추가
    const size = 11 + secureRandom() * 15;
    const color = colors[Math.floor(secureRandom() * colors.length)] ?? theme.accent;
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
