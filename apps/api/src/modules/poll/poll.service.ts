import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreatePollInput, VoteInput, Poll, PollOption, PollComment } from '@picky/shared';

@Injectable()
export class PollService {
  constructor(private readonly db: DatabaseService) {}

  // Generate 6 character unique short ID
  private generateShortId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Prevent collision
    if (this.db.getPollById(id)) {
      return this.generateShortId();
    }
    return id;
  }

  getPolls(): Poll[] {
    return this.db.getPolls();
  }

  getPoll(id: string): Poll {
    const poll = this.db.getPollById(id);
    if (!poll) {
      throw new NotFoundException(`고민(투표) ID ${id}를 찾을 수 없습니다.`);
    }
    return poll;
  }

  createPoll(input: CreatePollInput, creatorId: string | null = null, creatorIsGuest = true): Poll {
    const pollId = this.generateShortId();

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
      createdAt: new Date().toISOString(),
      totalVotes: 0,
      creatorId,
      creatorIsGuest,
    };

    this.db.createPoll(newPoll);
    return newPoll;
  }

  vote(id: string, input: VoteInput): Poll {
    const poll = this.db.getPollById(id);
    if (!poll) {
      throw new NotFoundException(`고민(투표) ID ${id}를 찾을 수 없습니다.`);
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

    this.db.updatePoll(poll);
    return poll;
  }
}
