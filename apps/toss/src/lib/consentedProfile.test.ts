import { describe, expect, it, vi } from 'vitest';

// web-framework v3는 getConsentedUserData(동의 기반 프로필 조회)를 제거했어요(레거시 bedrock 전용).
// 옵트인 '토스 프로필 불러오기'는 비활성화 상태라, 항상 비활성(false)·null 을 반환해요.
vi.mock('@apps-in-toss/web-framework', () => ({
  appLogin: vi.fn(),
  generateHapticFeedback: vi.fn(),
  getAnonymousKey: vi.fn(),
  getOperationalEnvironment: () => 'toss',
  getSchemeUri: vi.fn(),
  getTossShareLink: vi.fn(),
  requestReview: vi.fn(),
  share: vi.fn(),
}));

describe('fetchConsentedProfile (v3에서 비활성화)', () => {
  it('기능이 꺼져 있고 항상 null을 반환해요', async () => {
    const { fetchConsentedProfile, isConsentedProfileEnabled } = await import('./toss');
    expect(isConsentedProfileEnabled()).toBe(false);
    expect(await fetchConsentedProfile()).toBeNull();
  });
});
