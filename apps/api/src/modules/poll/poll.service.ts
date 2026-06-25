import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreatePollInput,
  UpdatePollInput,
  VoteInput,
  CreateCommentInput,
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
   * 댓글(의견)을 삭제한다. 댓글 작성자는 비회원/익명일 수 있어 식별이 어려우므로,
   * 고민(투표) 작성자 또는 운영자만 모더레이션 차원에서 삭제할 수 있다.
   */
  async deleteComment(
    id: string,
    commentId: number,
    userId: string | null,
    isAdmin = false,
  ): Promise<{ id: string; commentId: number; deleted: true }> {
    const poll = await this.db.getPollById(id);
    if (!poll) {
      throw new NotFoundException(`고민(투표) ID ${id}를 찾을 수 없습니다.`);
    }
    this.assertCanManage(poll, userId, isAdmin, '관리');

    const exists = poll.comments.some((comment) => comment.id === commentId);
    if (!exists) {
      throw new NotFoundException(`댓글 ID ${commentId}를 찾을 수 없습니다.`);
    }

    await this.db.deleteComment(id, commentId);
    return { id, commentId, deleted: true };
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

  async vote(id: string, input: VoteInput, code?: string | null): Promise<Poll> {
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
    if (input.comment?.trim()) {
      await this.db.appendComment(id, {
        voterName: input.voterName?.trim() ? input.voterName.trim() : '익명',
        comment: input.comment.trim(),
        createdAt: new Date().toISOString(),
        selectedOptionId: input.optionId,
        selectedOptionText: option.text,
      });
    }

    // 응답은 열람용 redaction을 거쳐 비공개 폴의 게이트 데이터가 새지 않게 한다(코드 통과 시 전체 반환).
    return this.getPollForViewer(id, code);
  }

  /** 한마디(댓글)·답글 작성 — 투표와 무관. parentId가 있으면 해당 댓글의 답글. */
  async addComment(id: string, input: CreateCommentInput, code?: string | null): Promise<Poll> {
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

    await this.db.appendComment(id, {
      voterName: input.voterName?.trim() ? input.voterName.trim() : '익명',
      comment: input.comment.trim(),
      createdAt: new Date().toISOString(),
      parentId,
    });
    // 응답은 열람용 redaction을 거쳐 비공개 폴의 게이트 데이터가 새지 않게 한다(코드 통과 시 전체 반환).
    return this.getPollForViewer(id, code);
  }
}
