import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as crypto from 'node:crypto';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Poll, PaginatedPolls } from '@picky/shared';
import { POLLS_PAGE_MAX_LIMIT } from '@picky/shared';
import { PollService } from './poll.service';

/**
 * 게스트 댓글 관리 비번 해시 픽스처 — 의도적으로 레거시 형식(salt:hash, 반복 1000)을 만든다.
 * 서비스 verifyCommentPassword 가 신규(iterations:salt:hash)뿐 아니라 옛 2-파트 해시도
 * 그대로 검증함을 함께 검증하기 위함이다(하위 호환). 원문은 절대 저장하지 않는다.
 */
const hashCommentPasswordForTest = (password: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};
import type {
  DatabaseService,
  PollWithCommentAuthors,
  PollCommentWithAuthor,
} from '../database/database.service';

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
  const getPollWithCommentAuthors = vi.fn(
    async (_id: string): Promise<PollWithCommentAuthors | undefined> =>
      makePoll() as PollWithCommentAuthors,
  );
  const castVote = vi.fn(async () => ({ recorded: true }));
  const appendComment = vi.fn(async () => undefined);
  const verifyAccessCode = vi.fn(async () => true);
  const savePollContent = vi.fn(async () => undefined);
  const deleteComment = vi.fn(async () => true);
  const updateComment = vi.fn(async () => true);
  const db = {
    getPolls,
    getPollById,
    getPollWithCommentAuthors,
    castVote,
    appendComment,
    verifyAccessCode,
    savePollContent,
    deleteComment,
    updateComment,
  } as unknown as DatabaseService;
  return {
    db,
    getPolls,
    getPollById,
    getPollWithCommentAuthors,
    castVote,
    appendComment,
    verifyAccessCode,
    savePollContent,
    deleteComment,
    updateComment,
  };
};

/** authorId/authorKey 를 들고 있는 댓글이 달린 폴 픽스처(권한 판정 경로용). */
const makePollWithComment = (
  comment: Partial<PollCommentWithAuthor>,
  pollOverrides: Partial<Poll> = {},
): PollWithCommentAuthors =>
  ({
    ...makePoll(pollOverrides),
    comments: [
      {
        id: 1,
        voterName: '익명',
        comment: '원래 한마디',
        createdAt: new Date().toISOString(),
        parentId: null,
        authorId: null,
        authorKey: null,
        ...comment,
      },
    ],
  }) as PollWithCommentAuthors;

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

describe('PollService.deleteComment (author-self + moderation permissions)', () => {
  let mocks: ReturnType<typeof createDbMock>;
  let service: PollService;

  beforeEach(() => {
    mocks = createDbMock();
    service = new PollService(mocks.db);
  });

  it('lets the GUEST author delete their own comment via matching voterKey→authorKey', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment({ authorKey: 'guest-key-1' }, { creatorId: 'owner-x' }),
    );
    await expect(
      // 비회원 본인: userId 없음, voterKey 일치
      service.deleteComment('abc123', 1, null, 'guest-key-1', false),
    ).resolves.toEqual({ id: 'abc123', commentId: 1, deleted: true });
    expect(mocks.deleteComment).toHaveBeenCalledWith('abc123', 1);
  });

  it('lets the MEMBER author delete their own comment via matching userId→authorId', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment({ authorId: 'u-author' }, { creatorId: 'owner-x' }),
    );
    await expect(
      service.deleteComment('abc123', 1, 'u-author', null, false),
    ).resolves.toMatchObject({ deleted: true });
    expect(mocks.deleteComment).toHaveBeenCalledWith('abc123', 1);
  });

  it('rejects a different guest (voterKey mismatch) who is neither owner nor admin', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment({ authorKey: 'guest-key-1' }, { creatorId: 'owner-x' }),
    );
    await expect(
      service.deleteComment('abc123', 1, null, 'someone-else-key', false),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mocks.deleteComment).not.toHaveBeenCalled();
  });

  it('rejects a different member (userId mismatch) who is neither owner nor admin', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment({ authorId: 'u-author' }, { creatorId: 'owner-x' }),
    );
    await expect(
      service.deleteComment('abc123', 1, 'u-stranger', null, false),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mocks.deleteComment).not.toHaveBeenCalled();
  });

  it('lets the POLL OWNER moderate (delete) someone else’s comment', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment({ authorKey: 'guest-key-1' }, { creatorId: 'owner-x' }),
    );
    // 폴 소유자(owner-x)는 남의 댓글도 모더레이션 삭제 가능.
    await expect(service.deleteComment('abc123', 1, 'owner-x', null, false)).resolves.toMatchObject(
      { deleted: true },
    );
    expect(mocks.deleteComment).toHaveBeenCalledWith('abc123', 1);
  });

  it('lets an ADMIN moderate (delete) any comment', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment({ authorKey: 'guest-key-1' }, { creatorId: 'owner-x' }),
    );
    await expect(
      service.deleteComment('abc123', 1, 'rando-admin', null, true),
    ).resolves.toMatchObject({ deleted: true });
    expect(mocks.deleteComment).toHaveBeenCalledWith('abc123', 1);
  });

  it('keeps owner/admin moderation for LEGACY comments (authorId/authorKey both null)', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment({ authorId: null, authorKey: null }, { creatorId: 'owner-x' }),
    );
    // 레거시 댓글이라 본인 판정은 불가하지만 폴 소유자는 여전히 관리할 수 있다.
    await expect(service.deleteComment('abc123', 1, 'owner-x', null, false)).resolves.toMatchObject(
      { deleted: true },
    );
    // 일반인은 레거시 댓글을 못 지운다(본인 판정 불가).
    mocks.deleteComment.mockClear();
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment({ authorId: null, authorKey: null }, { creatorId: 'owner-x' }),
    );
    await expect(service.deleteComment('abc123', 1, null, 'any-key', false)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(mocks.deleteComment).not.toHaveBeenCalled();
  });

  it('throws 404 when the comment id does not exist', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment({ authorKey: 'guest-key-1' }),
    );
    await expect(
      service.deleteComment('abc123', 999, null, 'guest-key-1', false),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mocks.deleteComment).not.toHaveBeenCalled();
  });
});

describe('PollService.editComment (author-self only, moderation cannot rewrite)', () => {
  let mocks: ReturnType<typeof createDbMock>;
  let service: PollService;

  beforeEach(() => {
    mocks = createDbMock();
    service = new PollService(mocks.db);
  });

  it('lets the GUEST author edit their own comment via matching voterKey', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment({ authorKey: 'guest-key-1' }, { creatorId: 'owner-x' }),
    );
    // 비회원 본인: userId 없음, 바디 voterKey 가 authorKey 와 일치해야 한다.
    await service.editComment(
      'abc123',
      1,
      { comment: '  고친 한마디 ', voterKey: 'guest-key-1' },
      null,
      false,
    );
    // 텍스트는 trim 되어 저장된다.
    expect(mocks.updateComment).toHaveBeenCalledWith('abc123', 1, '고친 한마디');
  });

  it('lets the MEMBER author edit their own comment via matching userId', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment({ authorId: 'u-author' }, { creatorId: 'owner-x' }),
    );
    await service.editComment('abc123', 1, { comment: '회원이 고침' }, 'u-author', false);
    expect(mocks.updateComment).toHaveBeenCalledWith('abc123', 1, '회원이 고침');
  });

  it('rejects a non-author (different voterKey) from editing', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment({ authorKey: 'guest-key-1' }, { creatorId: 'owner-x' }),
    );
    await expect(
      service.editComment(
        'abc123',
        1,
        { comment: '몰래 수정', voterKey: 'other-key' },
        null,
        false,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mocks.updateComment).not.toHaveBeenCalled();
  });

  it('does NOT let the poll OWNER rewrite someone else’s comment (only admin may)', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment({ authorKey: 'guest-key-1' }, { creatorId: 'owner-x' }),
    );
    // 폴 소유자라도 남의 한마디 내용은 변조할 수 없다(작성자 신뢰 보존).
    await expect(
      service.editComment('abc123', 1, { comment: '소유자 변조' }, 'owner-x', false),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mocks.updateComment).not.toHaveBeenCalled();
  });

  it('lets an ADMIN edit any comment', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment({ authorKey: 'guest-key-1' }, { creatorId: 'owner-x' }),
    );
    await service.editComment('abc123', 1, { comment: '운영자 정정' }, 'rando-admin', true);
    expect(mocks.updateComment).toHaveBeenCalledWith('abc123', 1, '운영자 정정');
  });

  it('throws 404 when editing a missing comment', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment({ authorKey: 'guest-key-1' }),
    );
    await expect(
      service.editComment('abc123', 42, { comment: '없음', voterKey: 'guest-key-1' }, null, false),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mocks.updateComment).not.toHaveBeenCalled();
  });
});

describe('PollService.addComment (author identity persistence)', () => {
  let mocks: ReturnType<typeof createDbMock>;
  let service: PollService;

  beforeEach(() => {
    mocks = createDbMock();
    service = new PollService(mocks.db);
  });

  it('stores the MEMBER userId as authorId when authenticated', async () => {
    mocks.getPollById.mockResolvedValue(makePoll());
    await service.addComment('abc123', { comment: '회원 한마디' }, 'u-member');
    expect(mocks.appendComment).toHaveBeenCalledWith(
      'abc123',
      expect.objectContaining({ authorId: 'u-member', authorKey: null }),
    );
  });

  it('stores the GUEST voterKey as authorKey when no userId', async () => {
    mocks.getPollById.mockResolvedValue(makePoll());
    await service.addComment('abc123', { comment: '비회원 한마디', voterKey: 'guest-key-9' }, null);
    expect(mocks.appendComment).toHaveBeenCalledWith(
      'abc123',
      expect.objectContaining({ authorId: null, authorKey: 'guest-key-9' }),
    );
  });
});

describe('PollService.addComment (optional guest password — set + hash-only storage)', () => {
  let mocks: ReturnType<typeof createDbMock>;
  let service: PollService;

  beforeEach(() => {
    mocks = createDbMock();
    service = new PollService(mocks.db);
  });

  it('hashes and stores the optional password as passwordHash (never the raw value)', async () => {
    mocks.getPollById.mockResolvedValue(makePoll());
    await service.addComment(
      'abc123',
      { comment: '비번 단 한마디', voterKey: 'guest-key-1', password: 'pw1234' },
      null,
    );
    const call = mocks.appendComment.mock.calls[0] as unknown as [
      string,
      { passwordHash?: string },
    ];
    const arg = call[1];
    // 해시는 iterations:salt:hash 형식(반복 횟수를 함께 저장)이고, 원문(pw1234)은 어디에도 담기지 않는다.
    expect(arg.passwordHash).toMatch(/^[0-9]+:[0-9a-f]+:[0-9a-f]+$/);
    expect(arg.passwordHash).not.toContain('pw1234');
  });

  it('keeps the legacy path (passwordHash=null) when no password is supplied — zero friction', async () => {
    mocks.getPollById.mockResolvedValue(makePoll());
    await service.addComment(
      'abc123',
      { comment: '비번 없는 한마디', voterKey: 'guest-key-2' },
      null,
    );
    expect(mocks.appendComment).toHaveBeenCalledWith(
      'abc123',
      expect.objectContaining({ passwordHash: null }),
    );
  });
});

describe('PollService comment management via optional password (any device)', () => {
  let mocks: ReturnType<typeof createDbMock>;
  let service: PollService;

  beforeEach(() => {
    mocks = createDbMock();
    service = new PollService(mocks.db);
  });

  it('lets a DIFFERENT device delete a comment when the correct password is supplied', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment(
        { authorKey: 'guest-key-1', passwordHash: hashCommentPasswordForTest('pw1234') },
        { creatorId: 'owner-x' },
      ),
    );
    // voterKey 불일치(다른 기기)지만 비번이 맞으면 본인으로 인정해 삭제 통과.
    await expect(
      service.deleteComment('abc123', 1, null, 'a-different-device-key', false, 'pw1234'),
    ).resolves.toMatchObject({ deleted: true });
    expect(mocks.deleteComment).toHaveBeenCalledWith('abc123', 1);
  });

  it('lets a DIFFERENT device edit a comment when the correct password is supplied', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment(
        { authorKey: 'guest-key-1', passwordHash: hashCommentPasswordForTest('pw1234') },
        { creatorId: 'owner-x' },
      ),
    );
    await service.editComment(
      'abc123',
      1,
      { comment: '다른 기기서 고침', voterKey: 'a-different-device-key', password: 'pw1234' },
      null,
      false,
    );
    expect(mocks.updateComment).toHaveBeenCalledWith('abc123', 1, '다른 기기서 고침');
  });

  it('rejects deletion when the password is WRONG (no voterKey/userId match either)', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment(
        { authorKey: 'guest-key-1', passwordHash: hashCommentPasswordForTest('pw1234') },
        { creatorId: 'owner-x' },
      ),
    );
    await expect(
      service.deleteComment('abc123', 1, null, 'stranger-key', false, 'wrong-pw'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mocks.deleteComment).not.toHaveBeenCalled();
  });

  it('rejects edit when the password is WRONG', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment(
        { authorKey: 'guest-key-1', passwordHash: hashCommentPasswordForTest('pw1234') },
        { creatorId: 'owner-x' },
      ),
    );
    await expect(
      service.editComment(
        'abc123',
        1,
        { comment: '몰래 수정', voterKey: 'stranger-key', password: 'wrong-pw' },
        null,
        false,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mocks.updateComment).not.toHaveBeenCalled();
  });

  it('rejects a password attempt on a comment that has NO password set (passwordHash null)', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment(
        { authorKey: 'guest-key-1', passwordHash: null },
        { creatorId: 'owner-x' },
      ),
    );
    // 비번 미설정 댓글엔 어떤 비번을 보내도 본인으로 인정하지 않는다(voterKey/userId 경로만 유효).
    await expect(
      service.deleteComment('abc123', 1, null, 'stranger-key', false, 'any-pw'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mocks.deleteComment).not.toHaveBeenCalled();
  });

  it('keeps the voterKey path working unchanged when no password is involved', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment(
        { authorKey: 'guest-key-1', passwordHash: hashCommentPasswordForTest('pw1234') },
        { creatorId: 'owner-x' },
      ),
    );
    // 같은 기기(voterKey 일치)면 비번을 안 보내도 기존 경로 그대로 통과한다.
    await expect(
      service.deleteComment('abc123', 1, null, 'guest-key-1', false),
    ).resolves.toMatchObject({ deleted: true });
    expect(mocks.deleteComment).toHaveBeenCalledWith('abc123', 1);
  });

  it('locks out brute-force password guessing after repeated failures (429)', async () => {
    mocks.getPollWithCommentAuthors.mockResolvedValue(
      makePollWithComment(
        { authorKey: 'guest-key-1', passwordHash: hashCommentPasswordForTest('correct-pw') },
        { creatorId: 'owner-x' },
      ),
    );
    // 임계치(5회)까지는 틀린 비번이 권한 거부(Forbidden)로 떨어진다.
    for (let i = 0; i < 5; i++) {
      await expect(
        service.deleteComment('abc123', 1, null, 'stranger-key', false, `guess-${i}`),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
    // 임계 초과 시도는 검증 전에 429(TooManyRequests)로 막힌다 — 더 이상 추측을 못 한다.
    await expect(
      service.deleteComment('abc123', 1, null, 'stranger-key', false, 'guess-6'),
    ).rejects.toMatchObject({ status: 429 });
    expect(mocks.deleteComment).not.toHaveBeenCalled();
  });

  it('verifies a LEGACY salt:hash (2-part) password and a NEW iterations:salt:hash both', async () => {
    // 레거시 2-파트 해시
    mocks.getPollWithCommentAuthors.mockResolvedValueOnce(
      makePollWithComment(
        { authorKey: 'k1', passwordHash: hashCommentPasswordForTest('legacypw') },
        { creatorId: 'owner-x' },
      ),
    );
    await expect(
      service.deleteComment('abc123', 1, null, 'other-device', false, 'legacypw'),
    ).resolves.toMatchObject({ deleted: true });

    // 신규 3-파트 해시(서비스가 직접 만든 포맷)도 동일하게 검증된다.
    const freshService = new PollService(mocks.db);
    const newHash = (
      freshService as unknown as { hashCommentPassword: (p: string) => string }
    ).hashCommentPassword('newpw123');
    expect(newHash).toMatch(/^[0-9]+:[0-9a-f]+:[0-9a-f]+$/);
    mocks.getPollWithCommentAuthors.mockResolvedValueOnce(
      makePollWithComment({ authorKey: 'k2', passwordHash: newHash }, { creatorId: 'owner-x' }),
    );
    await expect(
      freshService.deleteComment('abc123', 1, null, 'other-device', false, 'newpw123'),
    ).resolves.toMatchObject({ deleted: true });
  });
});
