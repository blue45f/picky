// 파티클 연출 — 코어 물리/버스트는 packages/client 로 단일화하고(토스 인앱과 동일),
// 웹 브랜드 색(아보카도 민트·골드 등 hex)만 주입해 호출부 시그니처는 그대로 유지해요.
import {
  type Particle,
  type ParticleBurstOptions,
  globalParticles,
  triggerParticleBurst as triggerParticleBurstCore,
} from '../../../../packages/client/src/lib/particles';

export type { Particle };
export { globalParticles };

const WEB_PALETTE = {
  colors: ['#13c2a3', '#20d6b2', '#facc15', '#ffffff', '#60a5fa', '#a855f7'],
  chars: ['🥑', '✨', '✦', '🌟', '💚', '💛'],
} as const;

/**
 * (x, y)에 파티클을 "팡" 터뜨려요 — 토스 인앱 효과와 동일.
 * 브랜드 색(아보카도 민트·골드) + 이모지가 중력/공기저항으로 흩어지며 사라져요.
 */
export function triggerParticleBurst(x: number, y: number, options?: ParticleBurstOptions): void {
  triggerParticleBurstCore(x, y, WEB_PALETTE, options);
}
