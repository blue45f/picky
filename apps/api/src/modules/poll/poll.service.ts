import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreatePollInput,
  UpdatePollInput,
  VoteInput,
  CreateCommentInput,
  Poll,
  PollOption,
  PollComment,
} from '@picky/shared';

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

  async getPolls(): Promise<Poll[]> {
    return this.db.getPolls();
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

    await this.db.savePollContent(next, { optionsStructurallyChanged });
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

  async vote(id: string, input: VoteInput): Promise<Poll> {
    const poll = await this.db.getPollById(id);
    if (!poll) {
      throw new NotFoundException(`고민(투표) ID ${id}를 찾을 수 없습니다.`);
    }

    if (this.isPollClosed(poll)) {
      throw new BadRequestException('마감된 투표에는 더 이상 참여할 수 없습니다.');
    }

    const option = poll.options.find((o) => o.id === input.optionId);
    if (!option) {
      throw new BadRequestException(`올바르지 않은 선택지 ID(${input.optionId})입니다.`);
    }

    // Increment vote count
    option.voteCount += 1;
    poll.totalVotes += 1;

    // Add comment if present
    if (input.comment?.trim()) {
      // length+1은 삭제 갭에서 기존 serial id와 충돌해 SQL 경로에서 조용히 누락될 수 있다 → max+1 사용.
      const commentId = poll.comments.reduce((max, c) => Math.max(max, c.id), 0) + 1;
      const newComment: PollComment = {
        id: commentId,
        voterName: input.voterName?.trim() ? input.voterName.trim() : '익명',
        comment: input.comment.trim(),
        createdAt: new Date().toISOString(),
        selectedOptionId: input.optionId,
        selectedOptionText: option.text,
      };
      poll.comments.push(newComment);
    }

    await this.db.updatePoll(poll);
    // 새 댓글이 DB serial id를 갖도록 재조회(직후 답글 parentId 정합성).
    return (await this.db.getPollById(id)) ?? poll;
  }

  /** 한마디(댓글)·답글 작성 — 투표와 무관. parentId가 있으면 해당 댓글의 답글. */
  async addComment(id: string, input: CreateCommentInput): Promise<Poll> {
    const poll = await this.db.getPollById(id);
    if (!poll) {
      throw new NotFoundException(`고민(투표) ID ${id}를 찾을 수 없습니다.`);
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

    const commentId = poll.comments.reduce((max, c) => Math.max(max, c.id), 0) + 1;
    const newComment: PollComment = {
      id: commentId,
      voterName: input.voterName?.trim() ? input.voterName.trim() : '익명',
      comment: input.comment.trim(),
      createdAt: new Date().toISOString(),
      parentId,
    };
    poll.comments.push(newComment);

    await this.db.updatePoll(poll);
    // 새 댓글이 DB serial id를 갖도록 재조회(직후 답글 parentId 정합성).
    return (await this.db.getPollById(id)) ?? poll;
  }
}
