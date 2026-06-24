import {
  BadRequestException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * desk-platform(DeskCloud) 문의 어드민 프록시.
 *
 * 어드민 토큰(picky 전용·appId 스코프)은 **서버 env(DESK_INQUIRY_ADMIN_TOKEN)에만** 두고,
 * picky 운영자(AdminGuard)만 이 프록시를 통해 desk-platform 어드민 엔드포인트를 호출한다.
 * 토큰은 브라우저로 절대 노출하지 않는다.
 */
const INQUIRY_STATUSES = ['new', 'in_progress', 'resolved', 'closed'] as const;
type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

@Injectable()
export class DeskInquiryService {
  private readonly base = (
    process.env.DESK_PLATFORM_URL?.trim() || 'https://desk-platform.vercel.app'
  ).replace(/\/+$/, '');
  private readonly appId = (process.env.DESK_INQUIRY_APP_ID?.trim() || 'picky').toLowerCase();
  private readonly token = process.env.DESK_INQUIRY_ADMIN_TOKEN?.trim() || '';

  private ensureConfigured() {
    if (!this.token) {
      throw new ServiceUnavailableException(
        '문의 관리 토큰이 설정되지 않았어요. 서버에 DESK_INQUIRY_ADMIN_TOKEN 환경변수를 설정해 주세요.',
      );
    }
  }

  private async readError(res: Response): Promise<string> {
    try {
      const data = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(data.message)) return data.message.join(', ');
      if (typeof data.message === 'string' && data.message.trim()) return data.message;
    } catch {
      // ignore parse failure
    }
    return '문의 관리 요청에 실패했어요.';
  }

  async listAdmin(status?: string): Promise<unknown> {
    this.ensureConfigured();
    const url = new URL(`${this.base}/api/v1/apps/${this.appId}/inquiries/admin`);
    if (status && (INQUIRY_STATUSES as readonly string[]).includes(status)) {
      url.searchParams.set('status', status);
    }
    const res = await fetch(url, { headers: { 'X-Admin-Token': this.token } });
    if (!res.ok) {
      throw new HttpException(await this.readError(res), res.status);
    }
    return res.json();
  }

  async updateStatus(id: string, status: string): Promise<unknown> {
    this.ensureConfigured();
    if (!(INQUIRY_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException(`상태는 ${INQUIRY_STATUSES.join('/')} 중 하나여야 합니다.`);
    }
    const res = await fetch(
      `${this.base}/api/v1/apps/${this.appId}/inquiries/${encodeURIComponent(id)}/status`,
      {
        method: 'PATCH',
        headers: { 'X-Admin-Token': this.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status as InquiryStatus }),
      },
    );
    if (!res.ok) {
      throw new HttpException(await this.readError(res), res.status);
    }
    return res.json();
  }
}
