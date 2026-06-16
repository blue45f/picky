import { Controller, Get, Post, Body, Param, UsePipes } from '@nestjs/common';
import { ZodValidationPipe, createZodDto } from 'nestjs-zod';
import { CreatePollSchema, VoteSchema } from '@picky/shared';
import { PollService } from './poll.service';

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
  createPoll(@Body() dto: CreatePollDto) {
    return this.pollService.createPoll(dto);
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
