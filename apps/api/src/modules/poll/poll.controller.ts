import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UsePipes,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { ZodValidationPipe, createZodDto } from 'nestjs-zod';
import { CreatePollSchema, VoteSchema } from '@picky/shared';
import { PollService } from './poll.service';
import { OptionalAuthGuard } from '../auth/auth.guard';

class CreatePollDto extends createZodDto(CreatePollSchema) {}
class VoteDto extends createZodDto(VoteSchema) {}

@Controller('polls')
@UsePipes(ZodValidationPipe)
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Get()
  getPolls() {
    return this.pollService.getPolls();
  }

  @Post()
  @UseGuards(OptionalAuthGuard)
  createPoll(@Request() req: any, @Body() dto: CreatePollDto) {
    const user = req.user;
    const creatorId = user?.sub || null;
    const creatorIsGuest = user ? Boolean(user.isGuest) : true;
    return this.pollService.createPoll(dto, creatorId, creatorIsGuest);
  }

  @Get(':id/share')
  async getPollSharePreview(@Param('id') id: string, @Request() req: any, @Res() res: any) {
    const poll = await this.pollService.getPoll(id);
    const requestOrigin = this.getRequestOrigin(req);
    const appOrigin = this.getPublicAppOrigin(req);
    const shareUrl = `${appOrigin}/share/${encodeURIComponent(poll.id)}`;
    const pollUrl = this.resolveSafePollRedirectUrl(
      req,
      `${appOrigin}/poll/${encodeURIComponent(poll.id)}`,
    );
    const shareImage = this.resolvePollShareImage(poll, requestOrigin, appOrigin);
    const safeShareUrl = this.escapeHtml(shareUrl);
    const safePollUrl = this.escapeHtml(pollUrl);
    const safeImageUrl = this.escapeHtml(shareImage.url);
    const imageType = this.escapeHtml(shareImage.mimeType);
    const titleText = `${poll.question} | pickflow`;
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
        name: 'pickflow',
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
          upvoteCount: option.voteCount,
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
    <meta name="application-name" content="pickflow" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#061411" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="pickflow" />
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
    <meta name="twitter:site" content="@pickflow_io" />
    <meta name="twitter:creator" content="@pickflow_io" />
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
      <small>pickflow poll</small>
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
    const poll = await this.pollService.getPoll(id);
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
  getPoll(@Param('id') id: string) {
    return this.pollService.getPoll(id);
  }

  @Post(':id/vote')
  vote(@Param('id') id: string, @Body() dto: VoteDto) {
    return this.pollService.vote(id, dto);
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
    const raw = String(value || '')
      .trim()
      .replace(/\/+$/, '');
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
    const match = value.match(/^data:(image\/(?:png|jpe?g|webp));base64,/);
    if (!match) {
      return null;
    }

    return match[1] === 'image/jpg' ? 'image/jpeg' : (match[1] ?? null);
  }

  private parseDataImage(value: string): { mimeType: string; buffer: Buffer } | null {
    const match = value.match(/^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/);
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
      .replace(/&/g, '\\u0026')
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
