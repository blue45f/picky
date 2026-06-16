import { Controller, Get, Post, Body, Param, UsePipes, UseGuards, Request } from '@nestjs/common';
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

  @Get(':id')
  getPoll(@Param('id') id: string) {
    return this.pollService.getPoll(id);
  }

  @Post(':id/vote')
  vote(@Param('id') id: string, @Body() dto: VoteDto) {
    return this.pollService.vote(id, dto);
  }
}
