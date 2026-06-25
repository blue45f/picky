import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  CreatePollInput,
  UpdatePollInput,
  VoteInput,
  CreateCommentInput,
  EditCommentInput,
  PaginatedPolls,
  Poll,
  PollOption,
  PollListSort,
  PollListStatus,
  PollListSortSchema,
  PollListStatusSchema,
  POLLS_PAGE_DEFAULT_LIMIT,
  POLLS_PAGE_MAX_LIMIT,
} from '@picky/shared';
import type { PollCommentWithAuthor } from '../database/database.service';

/** GET /polls 서버측 검색/정렬/필터 파라미터(전부 선택값). */
export interface GetPollsParams {
  page?: number;
  limit?: number;
  q?: string;
  sort?: string;
  status?: string;
  category?: string;
}

/**
 * 고민 카테고리(@picky/shared POLL_CATEGORIES id)를 함께 보관·응답하기 위한 확장.
 * 공유 Poll 타입은 비파괴 유지하고, 카테고리는 nullable 필드로만 더한다.
 */
type PollWithCategory = Poll & { categoryId?: string | null };

@Injectable()
export class PollService {
  constructor(private readonly db: DatabaseService) {}

  private isPollClosed(poll: Poll): boolean {
    if (!poll.endsAt) {
      return false;
    }

    const endsAtTime = new Date(poll.endsAt).getTime();
    return Number.isFinite(endsAtTime) && Date.now() >= endsAtTime;
  }

  /**
   * 명백한 댓글 중복(멱등 안전망) 판정 — 연타·StrictMode·네트워크 재시도가 만든 같은 한마디를 막는다.
   * "같은 폴 + 같은 부모(답글 위치) + 같은 작성자 + 같은 내용"이 짧은 시간 안에 이미 있으면 중복으로 본다.
   * 정상적으로 한참 뒤에 같은 말을 또 남기는 건 허용 범위 — 그래서 시간 창(window)으로 좁힌다.
   * (거부가 아니라 기존 댓글을 그대로 돌려주는 멱등 처리라 사용자 경험은 정상 단일 제출과 같다.)
   */
  private static readonly DUPLICATE_COMMENT_WINDOW_MS = 10_000;

  private isDuplicateComment(
    poll: Poll,
    input: { comment: string; voterName?: string | null; parentId?: number | null },
  ): boolean {
    const normalize = (value: string | null | undefined): string =>
      (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
    const targetText = normalize(input.comment);
    if (!targetText) {
      return false;
    }
    const targetAuthor = normalize(input.voterName) || '익명';
    const targetParent = input.parentId ?? null;
    const now = Date.now();

    return poll.comments.some((existing) => {
      if ((existing.parentId ?? null) !== targetParent) {
        return false;
      }
      if (normalize(existing.comment) !== targetText) {
        return false;
      }
      if ((normalize(existing.voterName) || '익명') !== targetAuthor) {
        return false;
      }
      const createdAtMs = new Date(existing.createdAt).getTime();
      if (!Number.isFinite(createdAtMs)) {
        // 시각을 못 읽으면(드문 경우) 안전하게 중복으로 간주하지 않는다 — 정상 제출을 막지 않기 위함.
        return false;
      }
      return now - createdAtMs <= PollService.DUPLICATE_COMMENT_WINDOW_MS;
    });
  }

  // Generate 6 character unique short ID
  private async generateShortId(): Promise<string> {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Prevent collision
    const existed = await this.db.getPollById(id);
    if (existed) {
      return this.generateShortId();
    }
    return id;
  }

  /**
   * 게스트 댓글 관리 비밀번호 해시 — auth.service 의 회원 비번 패턴(pbkdf2-sha512)을 재사용한다.
   * salt 를 매번 새로 만들어 `salt:hash` 형태로 한 컬럼(password_hash)에 보관한다(bcrypt 의존성 불필요).
   * 비번 원문은 절대 저장/응답하지 않는다 — 이 해시만 DB 에 남는다.
   */
  private hashCommentPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * 입력 비번이 저장된 해시(`salt:hash`)와 일치하는지 상수 시간 비교로 검증한다.
   * 형식이 깨졌거나 입력이 비면 false. 타이밍 사이드채널을 막기 위해 timingSafeEqual 을 쓴다.
   */
  private verifyCommentPassword(
    password: string | null | undefined,
    storedHash: string | null | undefined,
  ): boolean {
    const candidate = (password ?? '').trim();
    const stored = (storedHash ?? '').trim();
    if (!candidate || !stored) {
      return false;
    }
    const separator = stored.indexOf(':');
    if (separator <= 0) {
      return false;
    }
    const salt = stored.slice(0, separator);
    const expectedHex = stored.slice(separator + 1);
    if (!salt || !expectedHex) {
      return false;
    }
    const actualHex = crypto.pbkdf2Sync(candidate, salt, 1000, 64, 'sha512').toString('hex');
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = Buffer.from(actualHex, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }

  /**
   * 공개 투표 목록을 서버측 페이지네이션 + 검색/정렬/필터로 반환한다(#10·#W2).
   * page는 1-base(기본 1), limit는 기본 20·최대 50으로 클램프한다.
   * q/sort/status/category 는 서버 WHERE/ORDER BY로 처리해 현재 페이지 누락을 없앤다.
   */
  async getPolls(params: GetPollsParams = {}): Promise<PaginatedPolls> {
    const { page, limit, q, sort, status, category } = params;
    const safePage =
      Number.isFinite(page) && (page as number) >= 1 ? Math.floor(page as number) : 1;
    const rawLimit =
      Number.isFinite(limit) && (limit as number) >= 1
        ? Math.floor(limit as number)
        : POLLS_PAGE_DEFAULT_LIMIT;
    const safeLimit = Math.min(rawLimit, POLLS_PAGE_MAX_LIMIT);
    const safeSort: PollListSort = PollListSortSchema.catch('latest').parse(sort);
    const safeStatus: PollListStatus = PollListStatusSchema.catch('all').parse(status);
    const safeCategory = (category ?? '').trim() || null;
    const safeQuery = (q ?? '').trim().slice(0, 100);
    return this.db.getPolls({
      page: safePage,
      limit: safeLimit,
      q: safeQuery,
      sort: safeSort,
      status: safeStatus,
      category: safeCategory,
    });
  }

  async getPoll(id: string): Promise<Poll> {
    const poll = await this.db.getPollById(id);
    if (!poll) {
      throw new NotFoundException(`고민(투표) ID ${id}를 찾을 수 없습니다.`);
    }
    return poll;
  }

  async createPoll(
    input: CreatePollInput,
    creatorId: string | null = null,
    creatorIsGuest = true,
  ): Promise<Poll> {
    const pollId = await this.generateShortId();
    const normalizedEndsAt = input.endsAt || null;

    if (normalizedEndsAt) {
      const endsAtTime = new Date(normalizedEndsAt).getTime();
      if (!Number.isFinite(endsAtTime) || endsAtTime <= Date.now() + 60 * 1000) {
        throw new BadRequestException('마감 시간은 현재보다 최소 1분 이후로 설정해야 합니다.');
      }
    }

    const options: PollOption[] = input.options.map((opt, index) => ({
      id: index + 1,
      text: opt.text,
      voteCount: 0,
      imageUrl: opt.imageUrl || null,
    }));

    const visibility = input.visibility ?? 'public';
    if (visibility === 'private' && !input.accessCode) {
      throw new BadRequestException('비공개(private) 투표는 접근 코드가 필요합니다.');
    }

    const newPoll: PollWithCategory = {
      id: pollId,
      question: input.question,
      description: input.description || null,
      options,
      comments: [],
      attachments: input.attachments || [],
      createdAt: new Date().toISOString(),
      endsAt: normalizedEndsAt,
      totalVotes: 0,
      resultsVisibility: input.resultsVisibility || 'afterVote',
      visibility,
      requiresCode: visibility === 'private',
      creatorId,
      creatorIsGuest,
      categoryId: input.categoryId || null,
    };

    await this.db.createPoll({
      ...newPoll,
      accessCode: visibility === 'private' ? (input.accessCode ?? null) : null,
    });
    return newPoll;
  }

  /**
   * 열람용 조회 — 비공개(private) 투표는 올바른 접근 코드가 있어야 전체를 반환한다.
   * 코드 미입력/오류 시 질문만 노출하고 선택지·결과·댓글은 가린다(requiresCode=true).
   */
  async getPollForViewer(id: string, code?: string | null): Promise<Poll> {
    const poll = await this.getPoll(id);
    if (poll.visibility !== 'private') {
      return poll;
    }
    const ok = await this.db.verifyAccessCode(id, code ?? null);
    if (ok) {
      // 코드 검증 통과 — 열람자에겐 더 이상 코드 게이트가 필요 없음.
      return { ...poll, requiresCode: false };
    }
    return {
      id: poll.id,
      question: poll.question,
      description: null,
      options: [],
      comments: [],
      attachments: [],
      createdAt: poll.createdAt,
      endsAt: poll.endsAt ?? null,
      totalVotes: 0,
      resultsVisibility: poll.resultsVisibility ?? 'afterVote',
      visibility: 'private',
      requiresCode: true,
      creatorId: poll.creatorId ?? null,
      categoryId: poll.categoryId ?? null,
    };
  }

  private assertCanManage(poll: Poll, userId: string | null, isAdmin: boolean, action: string) {
    if (isAdmin) {
      return;
    }
    if (!userId || !poll.creatorId || poll.creatorId !== userId) {
      throw new ForbiddenException(`내가 만든 고민만 ${action}할 수 있습니다.`);
    }
  }

  private validateEndsAt(rawEndsAt: string | null): string | null {
    if (!rawEndsAt) {
      return null;
    }
    const endsAtTime = new Date(rawEndsAt).getTime();
    if (!Number.isFinite(endsAtTime) || endsAtTime <= Date.now() + 60 * 1000) {
      throw new BadRequestException('마감 시간은 현재보다 최소 1분 이후로 설정해야 합니다.');
    }
    return rawEndsAt;
  }

  async deletePoll(
    id: string,
    userId: string | null,
    isAdmin = false,
  ): Promise<{ id: string; deleted: true }> {
    const poll = await this.db.getPollById(id);
    if (!poll) {
      throw new NotFoundException(`고민(투표) ID ${id}를 찾을 수 없습니다.`);
    }
    this.assertCanManage(poll, userId, isAdmin, '삭제');
    await this.db.deletePoll(id);
    return { id, deleted: true };
  }

  /**
   * 등록한 고민(투표)을 수정한다. 본인 또는 운영자만 가능.
   * 이미 투표가 시작(totalVotes>0)된 경우 선택지 개수 변경은 막고 글/이미지 수정만 허용한다.
   * 아직 표가 없으면 선택지 전체 교체(추가/삭제/순서변경)를 허용한다.
   */
  async updatePoll(
    id: string,
    input: UpdatePollInput,
    userId: string | null,
    isAdmin = false,
  ): Promise<Poll> {
    const poll = (await this.db.getPollById(id)) as PollWithCategory | undefined;
    if (!poll) {
      throw new NotFoundException(`고민(투표) ID ${id}를 찾을 수 없습니다.`);
    }
    this.assertCanManage(poll, userId, isAdmin, '수정');

    const next: PollWithCategory = { ...poll };

    if (input.question !== undefined) {
      next.question = input.question;
    }
    if (input.description !== undefined) {
      next.description = input.description || null;
    }
    if (input.resultsVisibility !== undefined) {
      next.resultsVisibility = input.resultsVisibility || 'afterVote';
    }
    if (input.categoryId !== undefined) {
      next.categoryId = input.categoryId || null;
    }
    if (input.endsAt !== undefined) {
      next.endsAt = this.validateEndsAt(input.endsAt || null);
    }
    if (input.attachments !== undefined) {
      next.attachments = input.attachments || [];
    }

    // 공개 범위(visibility)·접근 코드(accessCode) 변경. 생성 규칙과 동일하게 private면 코드가 있어야 한다.
    // accessCode === undefined 면 "변경 안 함"(기존 코드 유지), '' 또는 값이면 명시적 변경으로 본다.
    const visibilityChanged = input.visibility !== undefined;
    let nextAccessCode: string | null | undefined;
    if (visibilityChanged) {
      next.visibility = input.visibility ?? 'public';
    }
    const resolvedVisibility = next.visibility ?? 'public';
    if (resolvedVisibility === 'private') {
      if (input.accessCode !== undefined) {
        // 명시적으로 코드를 보냈으면 그 값으로 교체.
        if (!input.accessCode) {
          throw new BadRequestException('비공개(private) 투표는 접근 코드가 필요합니다.');
        }
        nextAccessCode = input.accessCode;
      } else if (visibilityChanged && poll.visibility !== 'private') {
        // public/unlisted → private 전환인데 코드가 없으면 거부(기존 코드가 없음).
        throw new BadRequestException('비공개(private) 투표는 접근 코드가 필요합니다.');
      }
      // 그 외(이미 private였고 코드 미전송)는 기존 코드 유지(nextAccessCode=undefined).
      next.requiresCode = true;
    } else if (visibilityChanged) {
      // private → public/unlisted 전환: 더 이상 코드가 필요 없으니 비운다.
      next.requiresCode = false;
      nextAccessCode = null;
    }

    let optionsStructurallyChanged = false;
    if (input.options !== undefined) {
      const incoming = input.options;
      const hasVotes = poll.totalVotes > 0;
      const sameCount = incoming.length === poll.options.length;

      if (hasVotes) {
        if (!sameCount) {
          throw new BadRequestException(
            '이미 투표가 시작돼 선택지 개수는 바꿀 수 없어요. 선택지 글·이미지만 수정할 수 있어요.',
          );
        }
        next.options = incoming.map((option, index) => {
          const existing = poll.options[index];
          return {
            id: existing?.id ?? index + 1,
            text: option.text,
            voteCount: existing?.voteCount ?? 0,
            imageUrl: option.imageUrl || null,
          };
        });
      } else {
        next.options = incoming.map((option, index) => ({
          id: index + 1,
          text: option.text,
          voteCount: 0,
          imageUrl: option.imageUrl || null,
        }));
        optionsStructurallyChanged = true;
      }
    }

    await this.db.savePollContent(next, { optionsStructurallyChanged, accessCode: nextAccessCode });
    // accessCode 원문은 응답에 절대 싣지 않는다(next 에는 애초에 없음). requiresCode 만 노출.
    return next;
  }

  /**
   * 댓글 관리(수정/삭제) 권한을 강제한다 — 다음 중 하나면 허용:
   * - 작성자 본인: 회원(authorId===userId) 또는 비회원(authorKey===요청 voterKey)
   * - 비번 일치: 댓글에 관리 비번이 설정돼 있고 입력 password 가 저장 해시와 일치(어느 기기서든 본인 인정)
   * - 폴 소유자(모더레이션): poll.creatorId===userId
   * - 어드민
   * 레거시 댓글(authorId/authorKey 둘 다 null)은 본인 판정이 불가하지만 폴 소유자/어드민은 여전히 관리할 수 있다.
   * 권한 검사용으로 댓글 작성자 식별값·비번 해시를 들고 있는 comment(PollCommentWithAuthor)를 받지만,
   * 이 값들은 응답으로 절대 나가지 않는다(비밀).
   */
  private assertCanManageComment(
    poll: Poll,
    comment: PollCommentWithAuthor,
    userId: string | null,
    voterKey: string | null,
    isAdmin: boolean,
    action: string,
    password?: string | null,
  ): void {
    if (isAdmin) {
      return;
    }
    // 폴 소유자(모더레이션)
    if (userId && poll.creatorId && poll.creatorId === userId) {
      return;
    }
    // 작성자 본인 — 회원(authorId) 또는 비회원(authorKey)
    const trimmedKey = (voterKey ?? '').trim();
    const authorIdMatch = Boolean(userId && comment.authorId && comment.authorId === userId);
    const authorKeyMatch = Boolean(
      trimmedKey && comment.authorKey && comment.authorKey === trimmedKey,
    );
    if (authorIdMatch || authorKeyMatch) {
      return;
    }
    // 비번 일치도 본인으로 인정(다른 기기) — 댓글에 비번이 설정돼 있고 입력 비번이 해시와 맞을 때만.
    if (this.verifyCommentPassword(password, comment.passwordHash)) {
      return;
    }
    throw new ForbiddenException(`내가 쓴 한마디만 ${action}할 수 있어요.`);
  }

  /**
   * 댓글(의견)을 삭제한다. 작성자 본인(회원 authorId / 비회원 authorKey / 비번 일치)·폴 소유자·어드민이 삭제할 수 있다.
   * 비회원 본인 확인용 voterKey·관리 비번 password 는 GET 쿼리가 아니라 요청 바디로 받는다(로그 누출 방지).
   */
  async deleteComment(
    id: string,
    commentId: number,
    userId: string | null,
    voterKey: string | null,
    isAdmin = false,
    password?: string | null,
  ): Promise<{ id: string; commentId: number; deleted: true }> {
    const poll = await this.db.getPollWithCommentAuthors(id);
    if (!poll) {
      throw new NotFoundException(`고민(투표) ID ${id}를 찾을 수 없습니다.`);
    }
    const comment = poll.comments.find((item) => item.id === commentId);
    if (!comment) {
      throw new NotFoundException(`댓글 ID ${commentId}를 찾을 수 없습니다.`);
    }
    // 비번 일치도 본인으로 인정한다(다른 기기서 관리). voterKey/userId 미일치여도 비번이 맞으면 통과.
    this.assertCanManageComment(poll, comment, userId, voterKey, isAdmin, '삭제', password);

    await this.db.deleteComment(id, commentId);
    return { id, commentId, deleted: true };
  }

  /**
   * 댓글 텍스트를 수정한다 — 작성자 본인만(회원 authorId / 비회원 authorKey / 비번 일치). 폴 소유자/어드민은
   * 모더레이션 삭제만 하고 남의 글 내용 변조는 어드민만 허용한다(작성자 신뢰 보존). 작성자/원시각은 불변, editedAt 만 갱신된다.
   * 비번(input.password) 원문은 바디로만 받고 응답엔 작성자 식별값·해시를 모두 제거한 최신 폴(getPollForViewer)로 돌려준다.
   */
  async editComment(
    id: string,
    commentId: number,
    input: EditCommentInput,
    userId: string | null,
    isAdmin = false,
    code?: string | null,
  ): Promise<Poll> {
    const poll = await this.db.getPollWithCommentAuthors(id);
    if (!poll) {
      throw new NotFoundException(`고민(투표) ID ${id}를 찾을 수 없습니다.`);
    }
    const comment = poll.comments.find((item) => item.id === commentId);
    if (!comment) {
      throw new NotFoundException(`댓글 ID ${commentId}를 찾을 수 없습니다.`);
    }
    // 수정은 작성자 본인(또는 어드민)만 — 폴 소유자라도 남의 한마디 내용은 바꿀 수 없다.
    // 본인 판정: 회원(authorId) OR 비회원(authorKey) OR 비번 일치(다른 기기서도 본인 인정).
    if (!isAdmin) {
      const trimmedKey = (input.voterKey ?? '').trim();
      const authorIdMatch = Boolean(userId && comment.authorId && comment.authorId === userId);
      const authorKeyMatch = Boolean(
        trimmedKey && comment.authorKey && comment.authorKey === trimmedKey,
      );
      const passwordMatch = this.verifyCommentPassword(input.password, comment.passwordHash);
      if (!authorIdMatch && !authorKeyMatch && !passwordMatch) {
        throw new ForbiddenException('내가 쓴 한마디만 수정할 수 있어요.');
      }
    }

    await this.db.updateComment(id, commentId, input.comment.trim());
    // 비공개 폴이면 응답 redaction을 위해 코드를 함께 넘긴다(작성자 식별값은 어차피 strip됨).
    return this.getPollForViewer(id, code);
  }

  /**
   * 비공개(private) 투표의 쓰기 경로(vote/comment) 접근 코드 게이트.
   * 공개/unlisted 투표는 코드 없이 그대로 통과시키고, private 투표만 verifyAccessCode로 강제 검증한다.
   * 코드가 없거나 틀리면 ForbiddenException으로 차단해 게이트 데이터(질문/옵션/결과/댓글) 작성·노출을 막는다.
   */
  private async assertWriteAccess(poll: Poll, code?: string | null): Promise<void> {
    if (poll.visibility !== 'private') {
      return;
    }
    const ok = await this.db.verifyAccessCode(poll.id, code ?? null);
    if (!ok) {
      throw new ForbiddenException('비공개 투표예요. 올바른 접근 코드가 필요합니다.');
    }
  }

  async vote(
    id: string,
    input: VoteInput,
    code?: string | null,
    userId: string | null = null,
  ): Promise<Poll> {
    const poll = await this.db.getPollById(id);
    if (!poll) {
      throw new NotFoundException(`고민(투표) ID ${id}를 찾을 수 없습니다.`);
    }

    // 비공개 투표는 접근 코드 검증을 통과해야 한다(코드 없거나 틀리면 403, 폴 내용 미노출).
    await this.assertWriteAccess(poll, code);

    if (this.isPollClosed(poll)) {
      throw new BadRequestException('마감된 투표에는 더 이상 참여할 수 없습니다.');
    }

    const option = poll.options.find((o) => o.id === input.optionId);
    if (!option) {
      throw new BadRequestException(`올바르지 않은 선택지 ID(${input.optionId})입니다.`);
    }

    // 서버측 1인1표(#12) + 원자적 카운트(#B1): dedup 기록과 vote_count/total_votes 상대 증가를
    // 하나의 트랜잭션(SQL)/단일 commit(Blob)으로 묶는다. 중복이면 recorded=false → 409로 차단.
    const { recorded } = await this.db.castVote(id, input.voterKey, input.optionId);
    if (!recorded) {
      throw new ConflictException('이미 참여한 투표예요');
    }

    // 한마디(댓글)는 카운트와 분리해 추가한다(카운트는 castVote가 이미 원자적으로 반영).
    // 투표 시 남긴 한마디도 작성자 식별값(회원 userId / 비회원 voterKey)을 저장해 본인 관리가 가능하게 한다.
    // 선택적 관리 비번을 함께 보냈으면 해시로만 저장해 어느 기기서든 본인 수정/삭제가 가능하게 한다.
    if (input.comment?.trim()) {
      await this.db.appendComment(id, {
        voterName: input.voterName?.trim() ? input.voterName.trim() : '익명',
        comment: input.comment.trim(),
        createdAt: new Date().toISOString(),
        selectedOptionId: input.optionId,
        selectedOptionText: option.text,
        authorId: userId,
        authorKey: input.voterKey?.trim() ? input.voterKey.trim() : null,
        passwordHash: input.password?.trim()
          ? this.hashCommentPassword(input.password.trim())
          : null,
      });
    }

    // 응답은 열람용 redaction을 거쳐 비공개 폴의 게이트 데이터가 새지 않게 한다(코드 통과 시 전체 반환).
    return this.getPollForViewer(id, code);
  }

  /**
   * 한마디(댓글)·답글 작성 — 투표와 무관. parentId가 있으면 해당 댓글의 답글.
   * 작성자 식별값을 저장한다: 회원=JWT userId→authorId, 비회원=요청 voterKey→authorKey.
   * 이 식별값으로 나중에 작성자 본인의 수정/삭제를 허용한다(응답엔 노출하지 않음).
   */
  async addComment(
    id: string,
    input: CreateCommentInput,
    userId: string | null = null,
    code?: string | null,
  ): Promise<Poll> {
    const poll = await this.db.getPollById(id);
    if (!poll) {
      throw new NotFoundException(`고민(투표) ID ${id}를 찾을 수 없습니다.`);
    }

    // 비공개 투표는 접근 코드 검증을 통과해야 한마디를 남길 수 있다.
    await this.assertWriteAccess(poll, code);

    // 마감(종료)된 고민은 투표와 동일하게 한마디·답글도 더 받지 않는다(마감=대화 종료 정합).
    if (this.isPollClosed(poll)) {
      throw new BadRequestException('마감된 고민이에요. 더 이상 한마디를 남길 수 없어요.');
    }

    let parentId: number | null = input.parentId ?? null;
    if (parentId != null) {
      const parent = poll.comments.find((c) => c.id === parentId);
      if (!parent) {
        throw new BadRequestException('답글을 달 한마디를 찾을 수 없습니다.');
      }
      // 2단 초과 중첩 방지 — 답글의 답글은 최상위 부모로 승격(1-depth 트리 유지).
      if (parent.parentId != null) {
        parentId = parent.parentId;
      }
    }

    // 멱등 안전망 — 같은 작성자가 같은 위치에 같은 내용을 짧은 시간 안에 또 보내면(연타·재시도)
    // 새 댓글을 만들지 않고 기존 상태를 그대로 반환한다(거부 아님 → 사용자 경험은 단일 제출과 동일).
    // SQL/Blob/in-memory 어떤 백엔드든 getPollById가 정규화한 comments를 보므로 한 곳에서 세 경로를 덮는다.
    if (this.isDuplicateComment(poll, { ...input, parentId })) {
      return this.getPollForViewer(id, code);
    }

    // 선택적 게스트 비번 — 설정했으면 해시로만 저장한다(원문 미저장). 회원/토스는 굳이 안 보내도 된다.
    // 비번을 설정하면 voterKey(기기 고정)와 무관하게 어느 기기서든 본인 수정/삭제가 가능해진다.
    const passwordHash = input.password?.trim()
      ? this.hashCommentPassword(input.password.trim())
      : null;

    await this.db.appendComment(id, {
      voterName: input.voterName?.trim() ? input.voterName.trim() : '익명',
      comment: input.comment.trim(),
      createdAt: new Date().toISOString(),
      parentId,
      // 회원=authorId 우선, 비회원=요청 voterKey→authorKey(vote와 동일한 안정 키).
      authorId: userId,
      authorKey: input.voterKey?.trim() ? input.voterKey.trim() : null,
      passwordHash,
    });
    // 응답은 열람용 redaction을 거쳐 비공개 폴의 게이트 데이터가 새지 않게 한다(코드 통과 시 전체 반환).
    return this.getPollForViewer(id, code);
  }
}
