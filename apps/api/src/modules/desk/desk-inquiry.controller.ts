import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/auth.guard';
import { DeskInquiryService } from './desk-inquiry.service';

/**
 * picky 운영자 전용 문의 관리(어드민) — desk-platform 어드민 엔드포인트를 서버에서 프록시.
 * AdminGuard(운영자 JWT)로만 접근 가능하며, desk-platform 토큰은 서버에만 보관된다.
 */
@Controller('admin/inquiries')
@UseGuards(AdminGuard)
export class DeskInquiryController {
  constructor(private readonly deskInquiry: DeskInquiryService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.deskInquiry.listAdmin(status);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status?: string }) {
    return this.deskInquiry.updateStatus(id, String(body?.status ?? ''));
  }
}
