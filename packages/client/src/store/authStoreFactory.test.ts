import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthStoreState, type AuthState } from './authStoreFactory';

describe('Toss account login store flow', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('always exchanges an appLogin authorization code for a Toss account session', async () => {
    const tossAppLogin = vi.fn().mockResolvedValue({
      authorizationCode: 'one-time-code',
      referrer: 'SANDBOX',
    });
    const requestApi = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'service-jwt',
          user: {
            id: 'toss-user-443731104',
            email: '',
            nickname: '토스 사용자',
            createdAt: '2026-07-01T00:00:00.000Z',
            isGuest: false,
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const parseApiPayload = (response: Response) => response.json();

    const holder: { state?: AuthState } = {};
    const set = (partial: Partial<AuthState> | ((current: AuthState) => Partial<AuthState>)) => {
      const current = holder.state;
      if (!current) throw new Error('store is not initialized');
      Object.assign(current, typeof partial === 'function' ? partial(current) : partial);
    };
    const get = () => {
      if (!holder.state) throw new Error('store is not initialized');
      return holder.state;
    };
    const state = createAuthStoreState({ parseApiPayload, requestApi, tossAppLogin })(set, get);
    holder.state = state;

    await expect(state.loginWithTossAccount()).resolves.toEqual({ ok: true });
    expect(tossAppLogin).toHaveBeenCalledOnce();
    expect(requestApi).toHaveBeenCalledWith(
      '/auth/toss/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ authorizationCode: 'one-time-code', referrer: 'SANDBOX' }),
      }),
    );
    expect(storage.get('picky_token')).toBe('service-jwt');
    expect(state.user?.id).toBe('toss-user-443731104');
  });

  it('sends only the server contract fields even when appLogin returns unknown extras', async () => {
    // 2026-01-02부터 scope에 user_key 등 항목이 추가됨 — SDK가 필드를 더 얹어도
    // 서버로는 계약 필드(authorizationCode/referrer)만 골라 보내야 한다.
    const tossAppLogin = vi.fn().mockResolvedValue({
      authorizationCode: 'one-time-code',
      referrer: 'FUTURE_UNKNOWN',
      scope: ['user_key', 'something_new'],
    });
    const requestApi = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'service-jwt',
          user: {
            id: 'toss-user-1',
            email: '',
            nickname: '토스 사용자',
            createdAt: '2026-07-01T00:00:00.000Z',
            isGuest: false,
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const parseApiPayload = (response: Response) => response.json();

    const holder: { state?: AuthState } = {};
    const set = (partial: Partial<AuthState> | ((current: AuthState) => Partial<AuthState>)) => {
      const current = holder.state;
      if (!current) throw new Error('store is not initialized');
      Object.assign(current, typeof partial === 'function' ? partial(current) : partial);
    };
    const get = () => {
      if (!holder.state) throw new Error('store is not initialized');
      return holder.state;
    };
    const state = createAuthStoreState({ parseApiPayload, requestApi, tossAppLogin })(set, get);
    holder.state = state;

    await expect(state.loginWithTossAccount()).resolves.toEqual({ ok: true });
    expect(requestApi).toHaveBeenCalledWith(
      '/auth/toss/login',
      expect.objectContaining({
        // 미지의 referrer 값은 DEFAULT로 정규화, scope 등 추가 필드는 전송하지 않는다.
        body: JSON.stringify({ authorizationCode: 'one-time-code', referrer: 'DEFAULT' }),
      }),
    );
  });
});
