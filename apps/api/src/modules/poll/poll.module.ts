import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { PollController } from './poll.controller';
import { PollService } from './poll.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PollController],
  providers: [PollService],
})
export class PollModule {}
