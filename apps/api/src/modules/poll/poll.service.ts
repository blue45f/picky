import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreatePollInput, VoteInput, Poll, PollOption, PollComment } from '@picky/shared';

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

    const newPoll: Poll = {
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
      creatorId,
      creatorIsGuest,
    };

    await this.db.createPoll(newPoll);
    return newPoll;
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
    if (input.comment && input.comment.trim()) {
      const commentId = poll.comments.length + 1;
      const newComment: PollComment = {
        id: commentId,
        voterName: input.voterName && input.voterName.trim() ? input.voterName.trim() : '익명',
        comment: input.comment.trim(),
        createdAt: new Date().toISOString(),
        selectedOptionId: input.optionId,
        selectedOptionText: option.text,
      };
      poll.comments.push(newComment);
    }

    await this.db.updatePoll(poll);
    return poll;
  }
}
