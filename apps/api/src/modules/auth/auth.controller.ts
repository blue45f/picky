import { Controller, Post, Get, Body, UseGuards, Request, UsePipes } from '@nestjs/common';
import { ZodValidationPipe, createZodDto } from 'nestjs-zod';
import { RegisterSchema, LoginSchema, GuestRegisterSchema } from '@picky/shared';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

class RegisterDto extends createZodDto(RegisterSchema) {}
class LoginDto extends createZodDto(LoginSchema) {}
class GuestRegisterDto extends createZodDto(GuestRegisterSchema) {}

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

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Request() req: any) {
    // req.user has payload: { sub: string, email: string, nickname: string }
    const user = await this.authService.validateUser(req.user);
    return user;
  }
}
