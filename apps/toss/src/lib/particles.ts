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
    const angle = Math.random() * Math.PI * 2;
    const speed = (2 + Math.random() * 8) * speedMult;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - (1 + Math.random() * 2); // 살짝 위로 솟는 효과 추가
    const size = 11 + Math.random() * 15;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const char = Math.random() > 0.3 ? chars[Math.floor(Math.random() * chars.length)] : undefined;

    globalParticles.push({
      x,
      y,
      vx,
      vy,
      size,
      color,
      char,
      alpha: 1.0,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      decay: 0.015 + Math.random() * 0.02,
    });
  }
}
