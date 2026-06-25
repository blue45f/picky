import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isAdminEmail } from './admin';
import { JWT_SECRET } from './jwt.constant';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('유효하지 않거나 만료된 토큰입니다.');
    }
    // 토큰 서명/만료가 유효해도, 탈퇴/삭제된 계정의 토큰은 쓰기 경로에서 막는다.
    // 서명만 보면 만료(7d) 전까지 탈퇴자가 폴 작성/수정/삭제를 계속할 수 있어 DB 존재를 항상 확인한다.
    if (typeof payload?.sub !== 'string' || !(await this.db.getUserById(payload.sub))) {
      throw new UnauthorizedException('유효하지 않은 사용자입니다.');
    }
    request['user'] = { ...payload, isAdmin: isAdminEmail(payload?.email) };
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

/**
 * 운영자 전용 가드. 유효한 토큰을 요구하고, 그 계정 이메일이 ADMIN_EMAILS에 포함될 때만 통과한다.
 * 토큰의 isAdmin 클레임은 신뢰하지 않고 요청 시점의 환경변수로 재검증한다(권한 변경 즉시 반영).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('유효하지 않거나 만료된 토큰입니다.');
    }
    if (!isAdminEmail(payload?.email)) {
      throw new ForbiddenException('운영자만 접근할 수 있습니다.');
    }
    // 탈퇴/삭제된 운영자 계정의 토큰은 거부한다(AuthGuard 와 동일한 DB 존재검사).
    if (typeof payload?.sub !== 'string' || !(await this.db.getUserById(payload.sub))) {
      throw new UnauthorizedException('유효하지 않은 사용자입니다.');
    }
    request['user'] = { ...payload, isAdmin: true };
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: JWT_SECRET,
        });
        // 토큰 서명은 유효해도 탈퇴/삭제된 계정이면 회원으로 인정하지 않는다. Optional 경로(투표·댓글)는
        // 게스트도 voterKey 로 참여하므로 에러를 던지지 않고 request.user 를 비워 익명으로 처리한다.
        if (typeof payload?.sub === 'string' && (await this.db.getUserById(payload.sub))) {
          // isAdmin 은 토큰 클레임을 믿지 않고 요청 시점 ADMIN_EMAILS 로 재검증한다(AuthGuard와 동일).
          // OptionalAuthGuard 경로(댓글 수정/삭제 등)에서도 어드민 모더레이션이 유지되게 한다.
          request['user'] = { ...payload, isAdmin: isAdminEmail(payload?.email) };
        }
      } catch {
        // Optional 이므로 에러를 던지지 않고 그냥 넘어감
      }
    }
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
