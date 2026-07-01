import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe, createZodDto } from 'nestjs-zod';
import {
  RegisterSchema,
  LoginSchema,
  GuestRegisterSchema,
  TossIdentitySchema,
  TossLoginSchema,
  TossUnlinkSchema,
} from '@picky/shared';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

class RegisterDto extends createZodDto(RegisterSchema) {}
class LoginDto extends createZodDto(LoginSchema) {}
class GuestRegisterDto extends createZodDto(GuestRegisterSchema) {}
class TossIdentityDto extends createZodDto(TossIdentitySchema) {}
class TossLoginDto extends createZodDto(TossLoginSchema) {}
class TossUnlinkDto extends createZodDto(TossUnlinkSchema) {}

@Controller('auth')
@UsePipes(ZodValidationPipe)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('guest')
  async registerGuest(@Body() dto: GuestRegisterDto) {
    return this.authService.registerGuest(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // 앱인토스 getAnonymousKey 기반 식별 로그인 (서버 mTLS 불필요)
  @Post('toss')
  async loginWithTossIdentity(@Body() dto: TossIdentityDto) {
    return this.authService.loginWithTossIdentity(dto);
  }

  // 앱인토스 토스 로그인(appLogin) 인가 코드 → 서버 mTLS 토큰 교환
  @Post('toss/login')
  async loginWithTossAuthCode(@Body() dto: TossLoginDto) {
    return this.authService.loginWithTossAuthCode(dto);
  }

  @Post('toss/unlink')
  @HttpCode(HttpStatus.OK)
  async unlinkTossLogin(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: TossUnlinkDto,
  ) {
    return this.authService.unlinkTossLogin(dto, authorization);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Request() req: any) {
    // req.user has payload: { sub: string, email: string, nickname: string }
    const user = await this.authService.validateUser(req.user);
    return user;
  }

  // 회원 탈퇴 — 본인 계정 삭제. 작성한 고민은 익명화(creatorId 해제)해 토론은 보존한다.
  @Delete('account')
  @UseGuards(AuthGuard)
  async deleteAccount(@Request() req: any) {
    return this.authService.deleteAccount(req.user.sub);
  }
}
