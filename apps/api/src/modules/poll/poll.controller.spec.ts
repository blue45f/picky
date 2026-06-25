import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { PollController } from './poll.controller';
import type { PollService } from './poll.service';

/**
 * 하이브리드 정체성 정책(폴 작성 로그인 게이트)의 컨트롤러 레벨 게이트를 검증한다.
 * - 폴 작성/수정/삭제: 자동 발급된 비회원 토큰(isGuest=true)은 403 으로 거부.
 * - 실로그인 회원(isGuest=false)·토스 SSO(isGuest 미설정/false)는 통과.
 * - 투표/한마디(vote/addComment)는 게스트(req.user 없음·voterKey)라도 그대로 허용(저마찰 보존).
 *
 * 가드(AuthGuard/OptionalAuthGuard)는 라우팅 미들웨어라 직접 인스턴스화한 컨트롤러 단위
 * 테스트에서는 동작하지 않으므로, 여기서는 컨트롤러 메서드의 assertNotGuest 게이트만 검사한다.
 */
const makeServiceMock = () => {
  const createPoll = vi.fn(async () => ({ id: 'p1' }));
  const updatePoll = vi.fn(async () => ({ id: 'p1' }));
  const deletePoll = vi.fn(async () => ({ id: 'p1', deleted: true }));
  const vote = vi.fn(async () => ({ id: 'p1' }));
  const addComment = vi.fn(async () => ({ id: 'p1' }));
  const service = {
    createPoll,
    updatePoll,
    deletePoll,
    vote,
    addComment,
  } as unknown as PollService;
  return { service, createPoll, updatePoll, deletePoll, vote, addComment };
};

const dto: any = {
  question: '점심 뭐 먹지?',
  options: [{ text: '김밥' }, { text: '라면' }],
};

const memberReq = { user: { sub: 'u-member', isGuest: false } };
const tossReq = { user: { sub: 'toss-abc' } }; // isGuest 미설정 → 회원 취급
const guestReq = { user: { sub: 'guest-uuid', isGuest: true } };

describe('PollController — 폴 작성 로그인 게이트(자동 게스트 토큰 거부)', () => {
  let mocks: ReturnType<typeof makeServiceMock>;
  let controller: PollController;

  beforeEach(() => {
    mocks = makeServiceMock();
    controller = new PollController(mocks.service);
  });

  it('회원 토큰(isGuest=false)이면 폴 작성을 허용하고 creatorIsGuest=false 로 저장한다', () => {
    controller.createPoll(memberReq as any, dto);
    expect(mocks.createPoll).toHaveBeenCalledWith(dto, 'u-member', false);
  });

  it('토스 SSO 토큰(isGuest 미설정)도 폴 작성을 허용한다', () => {
    controller.createPoll(tossReq as any, dto);
    expect(mocks.createPoll).toHaveBeenCalledWith(dto, 'toss-abc', false);
  });

  it('자동 게스트 토큰(isGuest=true)이면 폴 작성을 403 으로 거부한다(서비스 미호출)', () => {
    expect(() => controller.createPoll(guestReq as any, dto)).toThrow(ForbiddenException);
    expect(mocks.createPoll).not.toHaveBeenCalled();
  });

  it('게스트 토큰이면 폴 수정을 403 으로 거부한다', () => {
    expect(() => controller.updatePoll('p1', guestReq as any, {} as any)).toThrow(
      ForbiddenException,
    );
    expect(mocks.updatePoll).not.toHaveBeenCalled();
  });

  it('게스트 토큰이면 폴 삭제를 403 으로 거부한다', () => {
    expect(() => controller.deletePoll('p1', guestReq as any)).toThrow(ForbiddenException);
    expect(mocks.deletePoll).not.toHaveBeenCalled();
  });

  it('회원은 폴 수정·삭제를 통과한다', () => {
    controller.updatePoll('p1', memberReq as any, {} as any);
    controller.deletePoll('p1', memberReq as any);
    expect(mocks.updatePoll).toHaveBeenCalledTimes(1);
    expect(mocks.deletePoll).toHaveBeenCalledTimes(1);
  });
});

describe('PollController — 투표·한마디는 게스트 저마찰 그대로(게이트 미적용)', () => {
  let mocks: ReturnType<typeof makeServiceMock>;
  let controller: PollController;

  beforeEach(() => {
    mocks = makeServiceMock();
    controller = new PollController(mocks.service);
  });

  it('비로그인(req.user 없음)이라도 투표는 허용한다(voterKey 기반)', () => {
    const anonReq = { user: undefined };
    controller.vote('p1', anonReq as any, { optionId: 1, voterKey: 'k' } as any, undefined);
    expect(mocks.vote).toHaveBeenCalledWith('p1', { optionId: 1, voterKey: 'k' }, undefined, null);
  });

  it('비로그인(req.user 없음)이라도 한마디는 허용한다(voterKey 기반)', () => {
    const anonReq = { user: undefined };
    controller.addComment(
      'p1',
      anonReq as any,
      { comment: '좋아요', voterKey: 'k' } as any,
      undefined,
    );
    expect(mocks.addComment).toHaveBeenCalledWith(
      'p1',
      { comment: '좋아요', voterKey: 'k' },
      null,
      undefined,
    );
  });

  it('게스트 토큰(isGuest=true)이어도 투표/한마디는 막지 않는다', () => {
    controller.vote('p1', guestReq as any, { optionId: 1 } as any, undefined);
    controller.addComment('p1', guestReq as any, { comment: 'hi' } as any, undefined);
    expect(mocks.vote).toHaveBeenCalledTimes(1);
    expect(mocks.addComment).toHaveBeenCalledTimes(1);
  });
});
