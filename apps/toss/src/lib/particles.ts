/**
 * 파티클 연출 — 코어 물리/버스트는 packages/client 로 단일화하고,
 * 토스 브랜드(테마 토큰) 색만 주입해 호출부 시그니처는 그대로 유지해요.
 */
import {
  type Particle,
  type ParticleBurstOptions,
  globalParticles,
  triggerParticleBurst as triggerParticleBurstCore,
} from '../../../../packages/client/src/lib/particles';
import { theme } from '../theme';

export type { Particle };
export { globalParticles };

const TOSS_PALETTE = {
  colors: [theme.accent, theme.accentStrong, theme.gold, '#ffffff', '#60a5fa', '#a855f7'],
  chars: ['🥑', '✨', '✦', '🌟', '💚', '💛'],
} as const;

/** (x, y)에 토스 브랜드 색/이모지로 파티클을 "팡" 터뜨려요. */
export function triggerParticleBurst(x: number, y: number, options?: ParticleBurstOptions): void {
  triggerParticleBurstCore(x, y, TOSS_PALETTE, options);
}
