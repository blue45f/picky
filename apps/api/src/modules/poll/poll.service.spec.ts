import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import type { Poll, PaginatedPolls } from '@picky/shared';
import { POLLS_PAGE_MAX_LIMIT } from '@picky/shared';
import { PollService } from './poll.service';
import type { DatabaseService } from '../database/database.service';

/** 최소 폴 픽스처 — 옵션 2개, 마감 없음, 공개. */
const makePoll = (overrides: Partial<Poll> = {}): Poll => ({
  id: 'abc123',
  question: '점심 뭐 먹지?',
  description: null,
  options: [
    { id: 1, text: '김밥', voteCount: 0 },
    { id: 2, text: '라면', voteCount: 0 },
  ],
  comments: [],
  attachments: [],
  createdAt: new Date().toISOString(),
  endsAt: null,
  totalVotes: 0,
  resultsVisibility: 'afterVote',
  visibility: 'public',
  creatorId: null,
  creatorIsGuest: true,
  creatorNickname: null,
  categoryId: null,
  ...overrides,
});

/** getPolls 가 호출 인자를 검사할 수 있도록 DatabaseService 를 부분 모킹한다. */
const createDbMock = () => {
  const getPolls = vi.fn(
    async (opts: any): Promise<PaginatedPolls> => ({
      items: [],
      total: 0,
      page: opts.page,
      limit: opts.limit,
      hasMore: false,
    }),
  );
  const getPollById = vi.fn(async (_id: string): Promise<Poll | undefined> => makePoll());
  const castVote = vi.fn(async () => ({ recorded: true }));
  const appendComment = vi.fn(async () => undefined);
  const db = { getPolls, getPollById, castVote, appendComment } as unknown as DatabaseService;
  return { db, getPolls, getPollById, castVote, appendComment };
};

describe('PollService.getPolls (pagination clamp + server filters)', () => {
  it('clamps page/limit and defaults sort/status', async () => {
    const { db, getPolls } = createDbMock();
    const service = new PollService(db);

    await service.getPolls({ page: 0, limit: 0 });
    expect(getPolls).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20, sort: 'latest', status: 'all' }),
    );
  });

  it('caps limit at POLLS_PAGE_MAX_LIMIT', async () => {
    const { db, getPolls } = createDbMock();
    const service = new PollService(db);

    await service.getPolls({ page: 3, limit: 9999 });
    const arg = getPolls.mock.calls[0]![0];
    expect(arg.limit).toBe(POLLS_PAGE_MAX_LIMIT);
    expect(arg.page).toBe(3);
  });

  it('forwards q/sort/status/category to the database layer', async () => {
    const { db, getPolls } = createDbMock();
    const service = new PollService(db);

    await service.getPolls({
      page: 1,
      limit: 20,
      q: '  점심 ',
      sort: 'popular',
      status: 'open',
      category: 'life',
    });
    expect(getPolls).toHaveBeenCalledWith(
      expect.objectContaining({
        q: '점심',
        sort: 'popular',
        status: 'open',
        category: 'life',
      }),
    );
  });

  it('falls back to safe defaults for unknown sort/status', async () => {
    const { db, getPolls } = createDbMock();
    const service = new PollService(db);

    await service.getPolls({ sort: 'bogus', status: 'nope' });
    const arg = getPolls.mock.calls[0]![0];
    expect(arg.sort).toBe('latest');
    expect(arg.status).toBe('all');
  });
});

describe('PollService.vote (atomic cast + dedup gate)', () => {
  let mocks: ReturnType<typeof createDbMock>;
  let service: PollService;

  beforeEach(() => {
    mocks = createDbMock();
    service = new PollService(mocks.db);
  });

  it('records a first vote and does not throw', async () => {
    mocks.getPollById.mockResolvedValue(makePoll());
    mocks.castVote.mockResolvedValue({ recorded: true });

    await expect(service.vote('abc123', { optionId: 1, voterKey: 'key-1' })).resolves.toBeDefined();
    expect(mocks.castVote).toHaveBeenCalledWith('abc123', 'key-1', 1);
  });

  it('throws 409 when castVote reports a duplicate (recorded=false)', async () => {
    mocks.getPollById.mockResolvedValue(makePoll());
    mocks.castVote.mockResolvedValue({ recorded: false });

    await expect(
      service.vote('abc123', { optionId: 1, voterKey: 'dup-key' }),
    ).rejects.toBeInstanceOf(ConflictException);
    // 중복이면 댓글도 추가하지 않는다.
    expect(mocks.appendComment).not.toHaveBeenCalled();
  });

  it('allows the legacy path when no voterKey is supplied (db returns recorded=true)', async () => {
    mocks.getPollById.mockResolvedValue(makePoll());
    mocks.castVote.mockResolvedValue({ recorded: true });

    await expect(service.vote('abc123', { optionId: 2 })).resolves.toBeDefined();
    expect(mocks.castVote).toHaveBeenCalledWith('abc123', undefined, 2);
  });

  it('rejects an invalid option id before touching the vote count', async () => {
    mocks.getPollById.mockResolvedValue(makePoll());
    await expect(service.vote('abc123', { optionId: 99 })).rejects.toThrow();
    expect(mocks.castVote).not.toHaveBeenCalled();
  });

  it('appends a comment via appendComment only when a comment is present', async () => {
    mocks.getPollById.mockResolvedValue(makePoll());
    mocks.castVote.mockResolvedValue({ recorded: true });

    await service.vote('abc123', { optionId: 1, voterKey: 'k', comment: '좋아요' });
    expect(mocks.appendComment).toHaveBeenCalledTimes(1);
  });
});

describe('PollService.getPoll (creatorNickname passthrough)', () => {
  it('returns the creatorNickname resolved by the database layer', async () => {
    const { db, getPollById } = createDbMock();
    getPollById.mockResolvedValue(makePoll({ creatorId: 'u1', creatorNickname: '희준' }));
    const service = new PollService(db);

    const poll = await service.getPoll('abc123');
    expect(poll.creatorNickname).toBe('희준');
  });
});
