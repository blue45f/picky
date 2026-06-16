import { Module } from '@nestjs/common';
import { DatabaseModule } from './modules/database/database.module';
import { PollModule } from './modules/poll/poll.module';

@Module({
  imports: [DatabaseModule, PollModule],
})
export class AppModule {}
