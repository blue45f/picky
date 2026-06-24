import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DeskInquiryController } from './desk-inquiry.controller';
import { DeskInquiryService } from './desk-inquiry.service';

/**
 * desk-platform(DeskCloud) 연동 — 운영자용 문의 관리 프록시.
 * AuthModule(AdminGuard) 을 가져와 운영자 인증 가드를 사용한다.
 */
@Module({
  imports: [AuthModule],
  controllers: [DeskInquiryController],
  providers: [DeskInquiryService],
})
export class DeskModule {}
