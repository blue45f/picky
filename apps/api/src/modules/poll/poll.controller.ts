import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UsePipes,
  UseGuards,
  ForbiddenException,
  Request,
  Res,
} from '@nestjs/common';
import { ZodValidationPipe, createZodDto } from 'nestjs-zod';
import {
  CreateCommentSchema,
  CreatePollSchema,
  DeleteCommentSchema,
  DeletePollSchema,
  EditCommentSchema,
  UpdatePollSchema,
  VoteSchema,
  canRevealResults,
} from '@picky/shared';
import { PollService } from './poll.service';
import { OptionalAuthGuard } from '../auth/auth.guard';

class CreatePollDto extends createZodDto(CreatePollSchema) {}
class UpdatePollDto extends createZodDto(UpdatePollSchema) {}
class DeletePollDto extends createZodDto(DeletePollSchema) {}
class VoteDto extends createZodDto(VoteSchema) {}
class CreateCommentDto extends createZodDto(CreateCommentSchema) {}
class EditCommentDto extends createZodDto(EditCommentSchema) {}
class DeleteCommentDto extends createZodDto(DeleteCommentSchema) {}

const trimTrailingSlashes = (value: string): string => {
  let end = value.length;
  while (end > 0 && value.codePointAt(end - 1) === 47) {
    end -= 1;
  }
  return end === value.length ? value : value.slice(0, end);
};

@Controller('polls')
@UsePipes(ZodValidationPipe)
export class PollController {
  constructor(private readonly pollService: PollService) {}

  /**
   * 실로그인 회원이면 그 userId(JWT sub)를, 게스트(isGuest=true)·익명(토큰 없음)이면 null 을 돌려준다.
   * 게스트의 ephemeral guest-uuid 는 폴 소유자(creatorId)로 쓰지 않는다 — 게스트의 portable 본인 식별은
   * 관리 비밀번호이기 때문이다. 이 값으로 service 가 creatorIsGuest 를 정확히 재계산한다(creatorId 유무).
   */
  private resolveCreatorId(user: any): string | null {
    return user?.sub && user.isGuest !== true ? user.sub : null;
  }

  /**
   * 폴 관리(수정/삭제) 게이트 — 게스트(또는 익명)는 관리 비밀번호가 있어야 통과한다(댓글과 동일 모델).
   * 회원/어드민은 비번 없이 JWT 로 통과한다. 게스트가 비번을 안 보내면 401 로 막는다(service 의 비번 대조 전 1차 게이트).
   * 실제 비번 일치 여부는 service.assertCanManage 가 저장 해시와 대조해 최종 강제한다.
   */
  private assertManageCredential(user: any, password?: string | null): void {
    const isMember = Boolean(user?.sub && user.isGuest !== true);
    if (isMember) {
      return;
    }
    if (!password?.trim()) {
      throw new ForbiddenException(
        '비회원은 관리 비밀번호를 입력해야 고민을 수정/삭제할 수 있어요.',
      );
    }
  }

  @Get()
  getPolls(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    const parsedPage = page === undefined ? undefined : Number(page);
    const parsedLimit = limit === undefined ? undefined : Number(limit);
    return this.pollService.getPolls({
      page: parsedPage,
      limit: parsedLimit,
      q,
      sort,
      status,
      category,
    });
  }

  @Post()
  @UseGuards(OptionalAuthGuard)
  createPoll(@Request() req: any, @Body() dto: CreatePollDto) {
    // 정체성 정책(댓글과 동일 모델): 회원은 JWT(creatorId)로, 게스트는 관리 비밀번호로 본인 식별.
    // - 회원(isGuest!==true): creatorId=sub 로 작성, creatorIsGuest=false(service 가 creatorId 유무로 재계산).
    // - 게스트/익명: creatorId=null. 비번이 있어야 작성 가능(없으면 service 가 400 으로 거부).
    const creatorId = this.resolveCreatorId(req.user);
    // creatorIsGuest 인자는 service 가 creatorId 유무로 무시·재계산하므로 형식상 전달만 한다.
    return this.pollService.createPoll(dto, creatorId, creatorId === null);
  }

  @Get(':id/share')
  async getPollSharePreview(@Param('id') id: string, @Request() req: any, @Res() res: any) {
    // 비공개(private) 투표는 올바른 접근 코드가 없으면 선택지·득표를 OG/JSON-LD로 노출하지 않는다.
    // getPollForViewer가 코드 미검증 시 options=[]의 게이트 응답을 돌려준다.
    const shareCode = typeof req.query?.code === 'string' ? req.query.code : undefined;
    const poll = await this.pollService.getPollForViewer(id, shareCode);
    const requestOrigin = this.getRequestOrigin(req);
    const appOrigin = this.getPublicAppOrigin(req);
    const pollUrl = this.resolveSafePollRedirectUrl(
      req,
      `${appOrigin}/poll/${encodeURIComponent(poll.id)}`,
    );
    const shareUrl = pollUrl;
    const shareImage = this.resolvePollShareImage(poll, requestOrigin, appOrigin);
    const safeShareUrl = this.escapeHtml(shareUrl);
    const safePollUrl = this.escapeHtml(pollUrl);
    const safeImageUrl = this.escapeHtml(shareImage.url);
    const imageType = this.escapeHtml(shareImage.mimeType);
    const titleText = `${poll.question} | picky`;
    const descriptionText = poll.description || '결정에 참여하고 의견을 남겨주세요.';
    const publishedTimeText = poll.createdAt || new Date().toISOString();
    const updatedTimeText =
      (poll as { updatedAt?: string }).updatedAt || poll.createdAt || new Date().toISOString();
    const title = this.escapeHtml(titleText);
    const description = this.escapeHtml(descriptionText);
    const publishedTime = this.escapeHtml(publishedTimeText);
    const updatedTime = this.escapeHtml(updatedTimeText);
    const optionSummaryText = poll.options
      .slice(0, 4)
      .map((option, index) => `${index + 1}. ${option.text}`)
      .join(' · ');
    const optionSummary = this.escapeHtml(optionSummaryText);
    // afterVote 폴은 공유/크롤러(미투표) 컨텍스트에서 득표를 노출하면 "투표해야 결과가 보인다"는
    // 약속이 새므로, 결과를 드러낼 수 있을 때(always·마감)만 옵션별 upvoteCount를 채운다.
    const revealResults = canRevealResults(poll, false);
    const appDomain = this.escapeHtml(new URL(appOrigin).host);
    const structuredData = this.escapeJsonForHtml({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: titleText,
      description: descriptionText,
      url: shareUrl,
      image: shareImage.url,
      datePublished: publishedTimeText,
      dateModified: updatedTimeText,
      isPartOf: {
        '@type': 'WebSite',
        name: 'picky',
        url: appOrigin,
      },
      mainEntity: {
        '@type': 'Question',
        name: poll.question,
        text: descriptionText,
        answerCount: poll.options.length,
        suggestedAnswer: poll.options.slice(0, 6).map((option) => ({
          '@type': 'Answer',
          text: option.text,
          // afterVote+미투표 컨텍스트에선 득표(upvoteCount)를 제외해 결과 누출을 막는다.
          ...(revealResults ? { upvoteCount: option.voteCount } : {}),
        })),
      },
    });

    res
      .status(200)
      .set({
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
      })
      .type('text/html').send(`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="application-name" content="picky" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#061411" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="picky" />
    <meta property="og:locale" content="ko_KR" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${safeShareUrl}" />
    <meta property="og:image" content="${safeImageUrl}" />
    <meta property="og:image:url" content="${safeImageUrl}" />
    <meta property="og:image:secure_url" content="${safeImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="${imageType}" />
    <meta property="og:image:alt" content="${title}" />
    <meta property="al:web:url" content="${safePollUrl}" />
    <meta property="article:published_time" content="${publishedTime}" />
    <meta property="article:modified_time" content="${updatedTime}" />
    <meta property="article:section" content="poll" />
    <meta property="og:updated_time" content="${updatedTime}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@picky_io" />
    <meta name="twitter:creator" content="@picky_io" />
    <meta name="twitter:domain" content="${appDomain}" />
    <meta name="twitter:url" content="${safeShareUrl}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${safeImageUrl}" />
    <meta name="twitter:image:alt" content="${title}" />
    <link rel="canonical" href="${safePollUrl}" />
    <link rel="image_src" href="${safeImageUrl}" />
    <script type="application/ld+json">${structuredData}</script>
    <script>
      window.setTimeout(function () {
        window.location.replace(${JSON.stringify(pollUrl)});
      }, 80);
    </script>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #061411;
        color: #f4fffc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(92vw, 560px);
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 14px;
        padding: 28px;
        background: #0e211e;
      }
      a { color: #20d6b2; }
      p { color: #b8d6cf; line-height: 1.6; }
      small { color: #7ca59b; }
    </style>
  </head>
  <body>
    <main>
      <small>picky poll</small>
      <h1>${title}</h1>
      <p>${description}</p>
      <p>${optionSummary}</p>
      <a href="${safePollUrl}">투표 화면으로 이동</a>
    </main>
  </body>
</html>`);
  }

  @Get(':id/options/:optionId/image')
  async getPollOptionImage(
    @Param('id') id: string,
    @Param('optionId') optionId: string,
    @Request() req: any,
    @Res() res: any,
  ) {
    // 비공개 투표 옵션 이미지도 코드 게이트를 거친다(미검증 시 options=[]라 자연히 fallback).
    const imageCode = typeof req.query?.code === 'string' ? req.query.code : undefined;
    const poll = await this.pollService.getPollForViewer(id, imageCode);
    const fallbackImageUrl = `${this.getPublicAppOrigin(req)}/og-default.png`;
    const option = poll.options.find((pollOption) => String(pollOption.id) === optionId);
    const imageUrl = option?.imageUrl || '';

    if (!option || !imageUrl) {
      return res.redirect(302, fallbackImageUrl);
    }

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return res.redirect(302, imageUrl);
    }

    const dataImage = this.parseDataImage(imageUrl);
    if (!dataImage) {
      return res.redirect(302, fallbackImageUrl);
    }

    return res
      .status(200)
      .set({
        'Content-Type': dataImage.mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      })
      .send(dataImage.buffer);
  }

  @Get(':id')
  getPoll(@Param('id') id: string, @Query('code') code?: string) {
    return this.pollService.getPollForViewer(id, code);
  }

  @Post(':id/vote')
  @UseGuards(OptionalAuthGuard)
  vote(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: VoteDto,
    @Query('code') code?: string,
  ) {
    // 비공개(private) 투표는 GET 상세와 동일하게 ?code= 로 접근 코드를 검증한 뒤에만 표를 받는다.
    // 로그인 상태면 userId 를 함께 넘겨, 투표 시 남긴 한마디를 작성자 본인이 관리할 수 있게 한다.
    return this.pollService.vote(id, dto, code, req.user?.sub ?? null);
  }

  @Post(':id/comments')
  @UseGuards(OptionalAuthGuard)
  addComment(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: CreateCommentDto,
    @Query('code') code?: string,
  ) {
    // 비공개(private) 투표는 ?code= 접근 코드 검증을 통과해야 한마디를 남길 수 있다.
    // 회원이면 JWT userId→authorId, 비회원이면 바디 voterKey→authorKey 로 작성자를 식별·저장한다.
    return this.pollService.addComment(id, dto, req.user?.sub ?? null, code);
  }

  @Patch(':id')
  @UseGuards(OptionalAuthGuard)
  updatePoll(@Param('id') id: string, @Request() req: any, @Body() dto: UpdatePollDto) {
    // 회원은 JWT 로, 게스트는 관리 비밀번호로 본인 식별(댓글과 동일 모델).
    // 게스트가 비번을 안 보내면 여기서 401 게이트로 막고, 비번이 있으면 service 가 저장 해시와 대조해 최종 강제한다.
    this.assertManageCredential(req.user, dto?.password);
    const userId = this.resolveCreatorId(req.user);
    return this.pollService.updatePoll(id, dto, userId, Boolean(req.user?.isAdmin), dto?.password);
  }

  @Delete(':id')
  @UseGuards(OptionalAuthGuard)
  deletePoll(@Param('id') id: string, @Request() req: any, @Body() dto: DeletePollDto) {
    // 회원/어드민은 JWT 로, 게스트는 관리 비밀번호로 본인 식별(댓글과 동일 모델). 비번 원문은 바디로만 받는다.
    this.assertManageCredential(req.user, dto?.password);
    const userId = this.resolveCreatorId(req.user);
    return this.pollService.deletePoll(
      id,
      userId,
      Boolean(req.user?.isAdmin),
      dto?.password ?? null,
    );
  }

  // 댓글 삭제는 작성자 본인(회원/비회원/비번 일치)·폴 소유자·어드민이 할 수 있다.
  // 비회원 본인 확인용 voterKey·관리 비번(password)은 GET 쿼리가 아니라 요청 바디로 받는다(로그 누출 방지).
  @Delete(':id/comments/:commentId')
  @UseGuards(OptionalAuthGuard)
  deleteComment(
    @Param('id') id: string,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Request() req: any,
    @Body() dto: DeleteCommentDto,
    @Query('code') code?: string,
  ) {
    // 비공개(private) 투표는 ?code= 접근 코드 검증을 통과해야 댓글을 삭제할 수 있다(vote/addComment와 동일 게이트).
    return this.pollService.deleteComment(
      id,
      commentId,
      req.user?.sub ?? null,
      dto?.voterKey ?? null,
      Boolean(req.user?.isAdmin),
      dto?.password ?? null,
      code,
    );
  }

  // 댓글 수정은 작성자 본인(회원 authorId / 비회원 바디 voterKey→authorKey / 바디 password 일치) 또는 어드민만 가능.
  // voterKey·password 원문은 바디(EditCommentDto)로만 받는다(GET 쿼리 누출 방지).
  @Patch(':id/comments/:commentId')
  @UseGuards(OptionalAuthGuard)
  editComment(
    @Param('id') id: string,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Request() req: any,
    @Body() dto: EditCommentDto,
    @Query('code') code?: string,
  ) {
    return this.pollService.editComment(
      id,
      commentId,
      dto,
      req.user?.sub ?? null,
      Boolean(req.user?.isAdmin),
      code,
    );
  }

  private getRequestOrigin(req: any): string {
    const proto = (
      String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0] ?? ''
    ).trim();
    const host = (
      String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5173').split(
        ',',
      )[0] ?? ''
    ).trim();
    return `${proto}://${host}`;
  }

  private getPublicAppOrigin(req: any): string {
    return (
      this.normalizeOrigin(
        process.env.PUBLIC_APP_URL ||
          process.env.FRONTEND_URL ||
          process.env.WEB_ORIGIN ||
          process.env.VITE_PUBLIC_APP_URL,
      ) || this.getRequestOrigin(req)
    );
  }

  private normalizeOrigin(value: unknown): string | null {
    const raw = trimTrailingSlashes((typeof value === 'string' ? value : '').trim());
    if (!raw) {
      return null;
    }

    const withProtocol =
      raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
    try {
      return new URL(withProtocol).origin;
    } catch {
      return null;
    }
  }

  private resolveSafePollRedirectUrl(req: any, fallbackUrl: string): string {
    const rawRedirect = String(req.query?.redirectUrl || req.query?.redirect || '').trim();
    if (!rawRedirect || rawRedirect.length > 2048) {
      return fallbackUrl;
    }

    try {
      const redirectUrl = new URL(rawRedirect);
      const fallback = new URL(fallbackUrl);
      if (redirectUrl.origin !== fallback.origin || !redirectUrl.pathname.startsWith('/poll/')) {
        return fallbackUrl;
      }

      return redirectUrl.href;
    } catch {
      return fallbackUrl;
    }
  }

  private resolvePollShareImage(
    poll: any,
    apiOrigin: string,
    appOrigin: string,
  ): { url: string; mimeType: string } {
    const defaultImage = {
      url: `${appOrigin}/og-default.png`,
      mimeType: 'image/png',
    };
    const firstImageOption = poll.options.find((option: any) => Boolean(option.imageUrl));

    if (!firstImageOption) {
      return defaultImage;
    }

    const imageUrl = firstImageOption.imageUrl || '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return {
        url: imageUrl,
        mimeType: this.resolveImageMimeType(imageUrl),
      };
    }

    if (imageUrl.startsWith('data:image/')) {
      return {
        url: `${apiOrigin}/api/polls/${encodeURIComponent(poll.id)}/options/${encodeURIComponent(
          String(firstImageOption.id),
        )}/image`,
        mimeType: this.resolveDataImageMimeType(imageUrl) || 'image/jpeg',
      };
    }

    return defaultImage;
  }

  private resolveImageMimeType(value: string): string {
    const pathname = (value.split('?')[0] ?? '').toLowerCase();
    if (pathname.endsWith('.png')) {
      return 'image/png';
    }
    if (pathname.endsWith('.webp')) {
      return 'image/webp';
    }
    return 'image/jpeg';
  }

  private resolveDataImageMimeType(value: string): string | null {
    const match = /^data:(image\/(?:png|jpe?g|webp));base64,/.exec(value);
    if (!match) {
      return null;
    }

    return match[1] === 'image/jpg' ? 'image/jpeg' : (match[1] ?? null);
  }

  private parseDataImage(value: string): { mimeType: string; buffer: Buffer } | null {
    const match = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
    if (!match) {
      return null;
    }

    const mimeType = match[1] === 'image/jpg' ? 'image/jpeg' : (match[1] ?? 'image/jpeg');
    const buffer = Buffer.from(match[2] ?? '', 'base64');
    if (!buffer.length) {
      return null;
    }

    return { mimeType, buffer };
  }

  private escapeJsonForHtml(value: unknown): string {
    return JSON.stringify(value)
      .replaceAll('&', String.raw`\u0026`)
      .replaceAll('<', String.raw`\u003c`)
      .replaceAll('>', String.raw`\u003e`);
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
