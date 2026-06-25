import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks for the toss web-framework bridge. getOperationalEnvironment drives isInToss().
const getOperationalEnvironment = vi.fn<() => 'toss' | 'sandbox' | 'web'>(() => 'toss');
const getConsentedUserData =
  vi.fn<(o: { consentedUserDataKey: string }) => Promise<Record<string, string> | undefined>>();

vi.mock('@apps-in-toss/web-framework', () => ({
  appLogin: vi.fn(),
  generateHapticFeedback: vi.fn(),
  getAnonymousKey: vi.fn(),
  getConsentedUserData: (o: { consentedUserDataKey: string }) => getConsentedUserData(o),
  getOperationalEnvironment: () => getOperationalEnvironment(),
  getSchemeUri: vi.fn(),
  getTossShareLink: vi.fn(),
  requestReview: vi.fn(),
  share: vi.fn(),
}));

async function load() {
  vi.resetModules();
  return import('./toss');
}

beforeEach(() => {
  getOperationalEnvironment.mockReturnValue('toss');
  getConsentedUserData.mockReset();
  vi.stubEnv('VITE_TOSS_CUD_PROFILE_KEY', 'cud_picky_profile');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('fetchConsentedProfile (opt-in)', () => {
  it('returns null and never calls the bridge outside toss (web)', async () => {
    getOperationalEnvironment.mockReturnValue('web');
    const { fetchConsentedProfile } = await load();
    expect(await fetchConsentedProfile()).toBeNull();
    expect(getConsentedUserData).not.toHaveBeenCalled();
  });

  it('returns null and stays disabled when the key is empty', async () => {
    vi.stubEnv('VITE_TOSS_CUD_PROFILE_KEY', '');
    const { fetchConsentedProfile, isConsentedProfileEnabled } = await load();
    expect(isConsentedProfileEnabled()).toBe(false);
    expect(await fetchConsentedProfile()).toBeNull();
    expect(getConsentedUserData).not.toHaveBeenCalled();
  });

  it('maps USER_NAME/USER_EMAIL when the user consents', async () => {
    getConsentedUserData.mockResolvedValue({ USER_NAME: '김희준', USER_EMAIL: 'a@b.com' });
    const { fetchConsentedProfile } = await load();
    expect(await fetchConsentedProfile()).toEqual({ name: '김희준', email: 'a@b.com' });
    expect(getConsentedUserData).toHaveBeenCalledWith({
      consentedUserDataKey: 'cud_picky_profile',
    });
  });

  it('absorbs declines/errors and undefined into null (never throws)', async () => {
    getConsentedUserData.mockRejectedValue(
      Object.assign(new Error('declined'), { code: 'USER_DECLINED' }),
    );
    const { fetchConsentedProfile } = await load();
    expect(await fetchConsentedProfile()).toBeNull();

    getConsentedUserData.mockResolvedValue(undefined);
    const reloaded = await load();
    expect(await reloaded.fetchConsentedProfile()).toBeNull();
  });

  it('returns null when no usable fields come back', async () => {
    getConsentedUserData.mockResolvedValue({ USER_NAME: '   ' });
    const { fetchConsentedProfile } = await load();
    expect(await fetchConsentedProfile()).toBeNull();
  });
});
