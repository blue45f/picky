import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard, AdminGuard, OptionalAuthGuard } from './auth.guard';
import { JWT_SECRET } from './jwt.constant';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      global: true,
      secret: JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AdminGuard, OptionalAuthGuard],
  exports: [AuthService, AuthGuard, AdminGuard, OptionalAuthGuard],
})
export class AuthModule {}
