import { Module } from '@nestjs/common';
import { DatabaseModule } from './modules/database/database.module';
import { PollModule } from './modules/poll/poll.module';
import { AuthModule } from './modules/auth/auth.module';
import { DeskModule } from './modules/desk/desk.module';

@Module({
  imports: [DatabaseModule, PollModule, AuthModule, DeskModule],
})
export class AppModule {}
