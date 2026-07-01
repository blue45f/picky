import { UnauthorizedException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TossLoginSchema, TossUnlinkSchema } from '@picky/shared';

import { DatabaseService } from '../database/database.service';

import { AuthService } from './auth.service';

import type { JwtService } from '@nestjs/jwt';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Toss auth contracts', () => {
  it('accepts only the documented appLogin referrers', () => {
    expect(TossLoginSchema.parse({ authorizationCode: 'one-time-code' }).referrer).toBe('DEFAULT');
    expect(
      TossLoginSchema.parse({ authorizationCode: 'one-time-code', referrer: 'SANDBOX' }).referrer,
    ).toBe('SANDBOX');
    expect(
      TossLoginSchema.safeParse({ authorizationCode: 'one-time-code', referrer: 'UNLINK' }).success,
    ).toBe(false);
  });

  it('validates the documented unlink callback payload', () => {
    expect(TossUnlinkSchema.parse({ userKey: '443731104', referrer: 'UNLINK' })).toEqual({
      userKey: 443731104,
      referrer: 'UNLINK',
    });
    expect(TossUnlinkSchema.safeParse({ userKey: 1, referrer: 'UNKNOWN' }).success).toBe(false);
  });
});

describe('AuthService.unlinkTossLogin', () => {
  const createService = () => {
    const deleteUser = vi.fn().mockResolvedValue(true);
    const db = { deleteUser } as unknown as DatabaseService;
    return {
      deleteUser,
      service: new AuthService(db, {} as JwtService),
    };
  };

  it('deletes the app-scoped account after Basic Auth verification', async () => {
    vi.stubEnv('APPS_IN_TOSS_UNLINK_USERNAME', 'callback-user');
    vi.stubEnv('APPS_IN_TOSS_UNLINK_PASSWORD', 'long-random-password');
    const { deleteUser, service } = createService();
    const authorization = `Basic ${Buffer.from('callback-user:long-random-password').toString(
      'base64',
    )}`;

    await expect(
      service.unlinkTossLogin({ userKey: 443731104, referrer: 'WITHDRAWAL_TOSS' }, authorization),
    ).resolves.toEqual({ ok: true });
    expect(deleteUser).toHaveBeenCalledWith('toss-user-443731104');
  });

  it('rejects a callback with mismatched credentials', async () => {
    vi.stubEnv('APPS_IN_TOSS_UNLINK_USERNAME', 'callback-user');
    vi.stubEnv('APPS_IN_TOSS_UNLINK_PASSWORD', 'long-random-password');
    const { deleteUser, service } = createService();
    const authorization = `Basic ${Buffer.from('callback-user:wrong').toString('base64')}`;

    await expect(
      service.unlinkTossLogin({ userKey: 443731104, referrer: 'UNLINK' }, authorization),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(deleteUser).not.toHaveBeenCalled();
  });
});
