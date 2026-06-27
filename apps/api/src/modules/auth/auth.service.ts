import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'node:crypto';
import * as https from 'node:https';
import * as fs from 'node:fs';
import { DatabaseService, DatabaseUser } from '../database/database.service';
import { isAdminEmail } from './admin';
import {
  RegisterInput,
  LoginInput,
  GuestRegisterInput,
  UserProfile,
  AuthResult,
  TossIdentityInput,
  TossLoginInput,
} from '@picky/shared';

const APPS_IN_TOSS_API_BASE = 'https://apps-in-toss-api.toss.im';

/**
 * env 변수에 담긴 PEM 본문을 정규화. 환경변수로 넣은 PEM은 줄바꿈이 흔히 "\n" 리터럴로
 * 저장되므로 실제 개행으로 되돌린다. 빈 값이면 null.
 */
const normalizeMtlsPem = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\\n/g, '\n') : null;
};

/** 파일 경로에서 PEM을 읽어온다(폴백 경로). 없거나 읽기 실패 시 null. */
const readMtlsPemFile = (path: string | undefined): string | null => {
  const trimmed = path?.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return fs.readFileSync(trimmed, 'utf8');
  } catch {
    return null;
  }
};

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  }

  private generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private async signPayload(payload: {
    sub: string;
    email: string;
    nickname: string;
    isGuest: boolean;
  }) {
    return this.jwtService.signAsync(payload);
  }

  private toProfile(user: DatabaseUser): UserProfile {
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      createdAt: user.createdAt,
      isGuest: user.isGuest,
      isAdmin: isAdminEmail(user.email),
    };
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedNickname = input.nickname.trim();

    const existing = await this.db.getUserByEmail(normalizedEmail);
    if (existing) {
      throw new BadRequestException('이미 등록된 이메일 주소입니다.');
    }

    const salt = this.generateSalt();
    const passwordHash = this.hashPassword(input.password, salt);
    const userId = crypto.randomUUID();

    const newUser: DatabaseUser = {
      id: userId,
      email: normalizedEmail,
      passwordHash,
      salt,
      nickname: normalizedNickname,
      createdAt: new Date().toISOString(),
      isGuest: false,
    };

    await this.db.createUser(newUser);

    const accessToken = await this.signPayload({
      sub: newUser.id,
      email: newUser.email,
      nickname: newUser.nickname,
      isGuest: false,
    });

    return {
      accessToken,
      user: this.toProfile(newUser),
    };
  }

  async registerGuest(input: GuestRegisterInput): Promise<AuthResult> {
    const normalizedNickname = input.nickname.trim();
    const userId = `guest-${crypto.randomUUID()}`;

    const guestUser: DatabaseUser = {
      id: userId,
      email: '',
      passwordHash: '',
      salt: '',
      nickname: normalizedNickname,
      createdAt: new Date().toISOString(),
      isGuest: true,
    };

    await this.db.createUser(guestUser);

    const accessToken = await this.signPayload({
      sub: guestUser.id,
      email: guestUser.email,
      nickname: guestUser.nickname,
      isGuest: true,
    });

    return {
      accessToken,
      user: this.toProfile(guestUser),
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await this.db.getUserByEmail(normalizedEmail);
    if (!user || user.isGuest) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const hash = this.hashPassword(input.password, user.salt);
    // 타이밍 사이드채널을 막기 위해 상수 시간 비교를 사용한다(단순 !== 비교 금지).
    const expected = Buffer.from(user.passwordHash, 'hex');
    const actual = Buffer.from(hash, 'hex');
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const accessToken = await this.signPayload({
      sub: user.id,
      email: user.email,
      nickname: user.nickname,
      isGuest: false,
    });

    return {
      accessToken,
      user: this.toProfile(user),
    };
  }

  /**
   * 앱인토스 getAnonymousKey(hash) 기반 식별 로그인.
   * anonymousKey로 결정적 userId를 만들어 멱등 생성 → 같은 사용자는 항상 같은 계정.
   * 서버 mTLS·사용자 동의 없이 동작해요.
   */
  async loginWithTossIdentity(input: TossIdentityInput): Promise<AuthResult> {
    const fingerprint = crypto
      .createHash('sha256')
      .update(input.anonymousKey)
      .digest('hex')
      .slice(0, 32);
    const userId = `toss-${fingerprint}`;
    const nickname = (input.nickname?.trim() || '토스 사용자').slice(0, 20);

    let user = await this.db.getUserById(userId);
    if (!user) {
      user = {
        id: userId,
        email: '',
        passwordHash: '',
        salt: '',
        nickname,
        createdAt: new Date().toISOString(),
        isGuest: false,
      };
      await this.db.createUser(user);
    }

    const accessToken = await this.signPayload({
      sub: user.id,
      email: user.email,
      nickname: user.nickname,
      isGuest: user.isGuest,
    });

    return { accessToken, user: this.toProfile(user) };
  }

  /**
   * 앱인토스 토스 로그인(appLogin) 인가 코드 → 서버 mTLS 토큰 교환 → 사용자 조회.
   * mTLS 인증서(콘솔 발급)가 환경변수로 설정돼야 동작해요. 미설정 시 503으로 안내.
   */
  async loginWithTossAuthCode(input: TossLoginInput): Promise<AuthResult> {
    const agent = this.createMtlsAgent();

    const tokenResponse = await this.requestTossApi<{
      success?: { accessToken?: string };
    }>('POST', '/api-partner/v1/apps-in-toss/user/oauth2/generate-token', agent, {
      body: { authorizationCode: input.authorizationCode, referrer: input.referrer ?? 'DEFAULT' },
    });

    const tossAccessToken = tokenResponse?.success?.accessToken;
    if (!tossAccessToken) {
      throw new UnauthorizedException('토스 로그인 토큰 발급에 실패했어요.');
    }

    const meResponse = await this.requestTossApi<{
      success?: { userKey?: number };
    }>('GET', '/api-partner/v1/apps-in-toss/user/oauth2/login-me', agent, {
      bearer: tossAccessToken,
    });

    const userKey = meResponse?.success?.userKey;
    if (userKey == null) {
      throw new UnauthorizedException('토스 사용자 정보를 가져오지 못했어요.');
    }

    const userId = `toss-user-${userKey}`;
    let user = await this.db.getUserById(userId);
    if (!user) {
      user = {
        id: userId,
        email: '',
        passwordHash: '',
        salt: '',
        nickname: '토스 사용자',
        createdAt: new Date().toISOString(),
        isGuest: false,
      };
      await this.db.createUser(user);
    }

    const accessToken = await this.signPayload({
      sub: user.id,
      email: user.email,
      nickname: user.nickname,
      isGuest: user.isGuest,
    });

    return { accessToken, user: this.toProfile(user) };
  }

  private createMtlsAgent(): https.Agent {
    // Vercel 서버리스엔 고정 경로 인증서 파일이 없어, PEM 본문(env)을 우선 지원하고 파일 경로는 폴백으로 둔다.
    const cert =
      normalizeMtlsPem(process.env.APPS_IN_TOSS_MTLS_CERT) ??
      readMtlsPemFile(process.env.APPS_IN_TOSS_MTLS_CERT_PATH);
    const key =
      normalizeMtlsPem(process.env.APPS_IN_TOSS_MTLS_KEY) ??
      readMtlsPemFile(process.env.APPS_IN_TOSS_MTLS_KEY_PATH);
    if (!cert || !key) {
      throw new ServiceUnavailableException(
        '토스 로그인(서버 mTLS) 인증서가 설정되지 않았어요. ' +
          '콘솔에서 mTLS 인증서를 발급해 APPS_IN_TOSS_MTLS_CERT/KEY(PEM 본문) 또는 ' +
          'APPS_IN_TOSS_MTLS_CERT_PATH/KEY_PATH(파일 경로) 환경변수에 설정하거나, ' +
          'getAnonymousKey 기반 식별 로그인을 사용해 주세요.',
      );
    }
    return new https.Agent({ cert, key });
  }

  private requestTossApi<T>(
    method: 'GET' | 'POST',
    path: string,
    agent: https.Agent,
    options: { body?: unknown; bearer?: string } = {},
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const url = new URL(`${APPS_IN_TOSS_API_BASE}${path}`);
      const payload = options.body == null ? undefined : JSON.stringify(options.body);
      const request = https.request(
        url,
        {
          method,
          agent,
          headers: {
            'Content-Type': 'application/json',
            ...(options.bearer ? { Authorization: `Bearer ${options.bearer}` } : {}),
            ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          },
        },
        (response) => {
          let raw = '';
          response.on('data', (chunk) => {
            raw += chunk;
          });
          response.on('end', () => {
            try {
              resolve(raw ? (JSON.parse(raw) as T) : ({} as T));
            } catch {
              reject(new UnauthorizedException('토스 API 응답을 해석하지 못했어요.'));
            }
          });
        },
      );
      request.on('error', (error) => reject(error));
      if (payload) {
        request.write(payload);
      }
      request.end();
    });
  }

  async validateUser(payload: any): Promise<UserProfile> {
    if (!payload?.sub || typeof payload?.sub !== 'string') {
      throw new UnauthorizedException('유효하지 않은 사용자입니다.');
    }

    // 탈퇴/삭제된 계정의 토큰을 막기 위해 DB 존재를 항상 확인한다(stateless 토큰 유지 + 탈퇴자 차단).
    // 사용자를 못 찾으면 만료 전이라도 401 — 탈퇴 후 /me 200 노출을 닫는다.
    // 프로필은 payload가 아니라 DB 최신 값으로 재구성해 닉네임/권한 변경도 즉시 반영한다.
    const user = await this.db.getUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('유효하지 않은 사용자입니다.');
    }
    return this.toProfile(user);
  }

  /** 회원 탈퇴 — 본인 계정 삭제. 작성한 고민은 익명화되어 보존된다. */
  async deleteAccount(userId: string): Promise<{ deleted: true }> {
    const user = await this.db.getUserById(userId);
    if (!user) {
      throw new BadRequestException('이미 탈퇴했거나 존재하지 않는 계정입니다.');
    }
    await this.db.deleteUser(userId);
    return { deleted: true };
  }
}
