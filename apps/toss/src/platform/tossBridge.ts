import { createTossPlatformBridge } from '@heejun/platform-bridge/toss';
import { isSfxEnabled } from '../lib/sound';

/**
 * 토스 PlatformBridge — 공통 패키지 @heejun/platform-bridge 의 팩토리 사용.
 * 앱별 차이는 옵션으로만 주입: 효과음 음소거(🔇) 시 햅틱도 함께 끈다.
 */
export const tossPlatformBridge = createTossPlatformBridge({
  hapticEnabled: () => isSfxEnabled(),
});
