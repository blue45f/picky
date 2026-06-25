import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, ForbiddenException } from '@nestjs/common';
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
  const verifyAccessCode = vi.fn(async () => true);
  const savePollContent = vi.fn(async () => undefined);
  const db = {
    getPolls,
    getPollById,
    castVote,
    appendComment,
    verifyAccessCode,
    savePollContent,
  } as unknown as DatabaseService;
  return { db, getPolls, getPollById, castVote, appendComment, verifyAccessCode, savePollContent };
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

describe('PollService.updatePoll (visibility / access-code transitions)', () => {
  let mocks: ReturnType<typeof createDbMock>;
  let service: PollService;

  beforeEach(() => {
    mocks = createDbMock();
    service = new PollService(mocks.db);
  });

  it('persists a new access code when switching public → private', async () => {
    mocks.getPollById.mockResolvedValue(makePoll({ creatorId: 'u1', visibility: 'public' }));
    const result = await service.updatePoll(
      'abc123',
      { visibility: 'private', accessCode: 'secret1' },
      'u1',
      false,
    );
    expect(result.visibility).toBe('private');
    expect(result.requiresCode).toBe(true);
    // accessCode 원문은 응답에 실리지 않는다.
    expect((result as { accessCode?: string }).accessCode).toBeUndefined();
    // db 에는 새 코드가 전달된다.
    expect(mocks.savePollContent).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: 'private' }),
      expect.objectContaining({ accessCode: 'secret1' }),
    );
  });

  it('rejects public → private without an access code', async () => {
    mocks.getPollById.mockResolvedValue(makePoll({ creatorId: 'u1', visibility: 'public' }));
    await expect(
      service.updatePoll('abc123', { visibility: 'private' }, 'u1', false),
    ).rejects.toThrow();
    expect(mocks.savePollContent).not.toHaveBeenCalled();
  });

  it('clears the access code when switching private → public', async () => {
    mocks.getPollById.mockResolvedValue(makePoll({ creatorId: 'u1', visibility: 'private' }));
    const result = await service.updatePoll('abc123', { visibility: 'public' }, 'u1', false);
    expect(result.visibility).toBe('public');
    expect(result.requiresCode).toBe(false);
    expect(mocks.savePollContent).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: 'public' }),
      expect.objectContaining({ accessCode: null }),
    );
  });

  it('keeps the existing code when staying private without sending a new one', async () => {
    mocks.getPollById.mockResolvedValue(makePoll({ creatorId: 'u1', visibility: 'private' }));
    await service.updatePoll('abc123', { question: '새 질문이에요' }, 'u1', false);
    // visibility 미전송 + accessCode 미전송이면 db 옵션에 accessCode 키가 없어 기존 코드를 보존한다.
    expect(mocks.savePollContent).toHaveBeenCalledWith(
      expect.objectContaining({ question: '새 질문이에요' }),
      expect.not.objectContaining({ accessCode: expect.anything() }),
    );
  });
});

describe('PollService.addComment (closed-poll guard)', () => {
  let mocks: ReturnType<typeof createDbMock>;
  let service: PollService;

  beforeEach(() => {
    mocks = createDbMock();
    service = new PollService(mocks.db);
  });

  it('appends a comment to an open poll', async () => {
    mocks.getPollById.mockResolvedValue(makePoll());
    await service.addComment('abc123', { comment: '나도 김밥!' });
    expect(mocks.appendComment).toHaveBeenCalledTimes(1);
  });

  it('blocks comments on a closed poll (no append)', async () => {
    mocks.getPollById.mockResolvedValue(makePoll({ endsAt: '2000-01-01T00:00:00.000Z' }));
    await expect(service.addComment('abc123', { comment: '늦었지만…' })).rejects.toThrow();
    expect(mocks.appendComment).not.toHaveBeenCalled();
  });

  // 멱등 안전망 — 연타·재시도가 만든 "직전과 똑같은 한마디"는 새로 만들지 않고 기존을 돌려준다.
  it('is idempotent: a duplicate of a just-posted comment does NOT append again', async () => {
    mocks.getPollById.mockResolvedValue(
      makePoll({
        comments: [
          {
            id: 1,
            voterName: '익명',
            comment: '나도 김밥!',
            createdAt: new Date().toISOString(),
            parentId: null,
          },
        ],
      }),
    );
    await service.addComment('abc123', { comment: '나도 김밥!' });
    // 거부가 아니라 멱등 — append 는 호출되지 않고 정상 응답을 돌려준다.
    expect(mocks.appendComment).not.toHaveBeenCalled();
  });

  it('treats whitespace/case variants of the same author+text as a duplicate', async () => {
    mocks.getPollById.mockResolvedValue(
      makePoll({
        comments: [
          {
            id: 1,
            voterName: '민지',
            comment: 'Hello World',
            createdAt: new Date().toISOString(),
            parentId: null,
          },
        ],
      }),
    );
    await service.addComment('abc123', { comment: '  hello   world ', voterName: '민지' });
    expect(mocks.appendComment).not.toHaveBeenCalled();
  });

  it('allows the same text from a DIFFERENT author (not a duplicate)', async () => {
    mocks.getPollById.mockResolvedValue(
      makePoll({
        comments: [
          {
            id: 1,
            voterName: '민지',
            comment: '동의해요',
            createdAt: new Date().toISOString(),
            parentId: null,
          },
        ],
      }),
    );
    await service.addComment('abc123', { comment: '동의해요', voterName: '현우' });
    expect(mocks.appendComment).toHaveBeenCalledTimes(1);
  });

  it('allows the same comment again after the dedupe window has passed', async () => {
    mocks.getPollById.mockResolvedValue(
      makePoll({
        comments: [
          {
            id: 1,
            voterName: '익명',
            comment: '같은 말',
            // 창(10s)을 한참 넘긴 과거 → 정상적으로 다시 남길 수 있어야 한다.
            createdAt: new Date(Date.now() - 60_000).toISOString(),
            parentId: null,
          },
        ],
      }),
    );
    await service.addComment('abc123', { comment: '같은 말' });
    expect(mocks.appendComment).toHaveBeenCalledTimes(1);
  });

  it('does not treat a top-level comment as a duplicate of a reply with the same text', async () => {
    mocks.getPollById.mockResolvedValue(
      makePoll({
        comments: [
          { id: 1, voterName: '익명', comment: '루트', createdAt: new Date().toISOString() },
          {
            id: 2,
            voterName: '익명',
            comment: '같은 텍스트',
            createdAt: new Date().toISOString(),
            parentId: 1,
          },
        ],
      }),
    );
    // 부모가 다르면(최상위 vs 답글) 중복이 아니다 → append 된다.
    await service.addComment('abc123', { comment: '같은 텍스트' });
    expect(mocks.appendComment).toHaveBeenCalledTimes(1);
  });
});

describe('PollService private-poll write gate (vote/comment access-code enforcement)', () => {
  let mocks: ReturnType<typeof createDbMock>;
  let service: PollService;
  const privatePoll = () => makePoll({ visibility: 'private' });

  beforeEach(() => {
    mocks = createDbMock();
    service = new PollService(mocks.db);
  });

  it('blocks voting on a private poll when the access code is missing/wrong (403, no cast)', async () => {
    mocks.getPollById.mockResolvedValue(privatePoll());
    mocks.verifyAccessCode.mockResolvedValue(false);

    await expect(service.vote('abc123', { optionId: 1 }, undefined)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    // 게이트에서 막혔으니 표는 절대 기록되지 않는다.
    expect(mocks.castVote).not.toHaveBeenCalled();
  });

  it('blocks commenting on a private poll when the access code is wrong (403, no append)', async () => {
    mocks.getPollById.mockResolvedValue(privatePoll());
    mocks.verifyAccessCode.mockResolvedValue(false);

    await expect(
      service.addComment('abc123', { comment: '안녕' }, 'wrong-code'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mocks.appendComment).not.toHaveBeenCalled();
  });

  it('redacts the vote response for a private poll (no options/results leak) even after a valid cast', async () => {
    // 코드 검증은 통과하지만, 응답 단계의 getPollForViewer는 redaction을 위해 다시 코드를 확인한다.
    // 응답 redaction에서 코드가 비면 options=[] 게이트 응답이 나가야 데이터 노출이 없다.
    mocks.getPollById.mockResolvedValue(privatePoll());
    mocks.verifyAccessCode.mockResolvedValueOnce(true).mockResolvedValue(false);
    mocks.castVote.mockResolvedValue({ recorded: true });

    const result = await service.vote('abc123', { optionId: 1, voterKey: 'k' }, 'ok-code');

    expect(mocks.castVote).toHaveBeenCalledWith('abc123', 'k', 1);
    // 응답은 열람용 redaction을 거쳐 옵션/결과가 비노출(requiresCode=true)이어야 한다.
    expect(result.requiresCode).toBe(true);
    expect(result.options).toEqual([]);
    expect(result.totalVotes).toBe(0);
  });

  it('returns the full poll in the response when the access code stays valid through redaction', async () => {
    mocks.getPollById.mockResolvedValue(privatePoll());
    mocks.verifyAccessCode.mockResolvedValue(true);
    mocks.castVote.mockResolvedValue({ recorded: true });

    const result = await service.vote('abc123', { optionId: 1, voterKey: 'k' }, 'ok-code');

    expect(result.requiresCode).toBe(false);
    expect(result.options.length).toBeGreaterThan(0);
  });

  it('does not require a code for public polls (verifyAccessCode untouched)', async () => {
    mocks.getPollById.mockResolvedValue(makePoll({ visibility: 'public' }));
    mocks.castVote.mockResolvedValue({ recorded: true });

    await expect(service.vote('abc123', { optionId: 1, voterKey: 'k' })).resolves.toBeDefined();
    expect(mocks.verifyAccessCode).not.toHaveBeenCalled();
    expect(mocks.castVote).toHaveBeenCalledWith('abc123', 'k', 1);
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
