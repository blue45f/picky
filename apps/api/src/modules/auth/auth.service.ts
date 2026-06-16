import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { DatabaseService, DatabaseUser } from '../database/database.service';
import {
  RegisterInput,
  LoginInput,
  GuestRegisterInput,
  UserProfile,
  AuthResult,
} from '@picky/shared';

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
    if (hash !== user.passwordHash) {
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

  async validateUser(payload: any): Promise<UserProfile> {
    if (!payload?.sub || typeof payload?.sub !== 'string') {
      throw new UnauthorizedException('유효하지 않은 사용자입니다.');
    }

    if (payload.isGuest === undefined || typeof payload.nickname !== 'string' || typeof payload.email !== 'string') {
      const user = await this.db.getUserById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('유효하지 않은 사용자입니다.');
      }
      return this.toProfile(user);
    }

    return {
      id: payload.sub,
      email: payload.email,
      nickname: payload.nickname,
      createdAt: new Date().toISOString(),
      isGuest: payload.isGuest,
    };
  }
}
