import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { PollController } from './poll.controller';
import type { PollService } from './poll.service';

/**
 * 정체성 정책(댓글과 동일 모델)의 컨트롤러 레벨 게이트를 검증한다.
 * - 폴 작성: 회원은 creatorId=sub 로, 게스트(또는 익명)는 creatorId=null 로 위임한다(비번 필수성은 service 가 강제).
 * - 폴 수정/삭제: 회원/어드민은 JWT 로 통과, 게스트는 관리 비밀번호가 있어야 통과(없으면 403 1차 게이트).
 * - 투표/한마디(vote/addComment)는 게스트(req.user 없음·voterKey)라도 그대로 허용(저마찰 보존).
 *
 * 가드(OptionalAuthGuard)는 라우팅 미들웨어라 직접 인스턴스화한 컨트롤러 단위 테스트에서는 동작하지
 * 않으므로, 여기서는 컨트롤러 메서드의 creatorId 해석·관리 비번 게이트만 검사한다.
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
/** 게스트 작성용 — 관리 비밀번호를 포함한 dto. */
const guestDto: any = { ...dto, password: 'pw1234' };

const memberReq = { user: { sub: 'u-member', isGuest: false } };
const tossReq = { user: { sub: 'toss-abc' } }; // isGuest 미설정 → 회원 취급
const guestReq = { user: { sub: 'guest-uuid', isGuest: true } };
const anonReq = { user: undefined };

describe('PollController — 폴 작성 정체성(회원 creatorId / 게스트 null)', () => {
  let mocks: ReturnType<typeof makeServiceMock>;
  let controller: PollController;

  beforeEach(() => {
    mocks = makeServiceMock();
    controller = new PollController(mocks.service);
  });

  it('회원 토큰(isGuest=false)이면 creatorId=sub, creatorIsGuest=false 로 위임한다', () => {
    controller.createPoll(memberReq as any, dto);
    expect(mocks.createPoll).toHaveBeenCalledWith(dto, 'u-member', false);
  });

  it('토스 SSO 토큰(isGuest 미설정)도 회원으로 보고 creatorId=sub 로 위임한다', () => {
    controller.createPoll(tossReq as any, dto);
    expect(mocks.createPoll).toHaveBeenCalledWith(dto, 'toss-abc', false);
  });

  it('게스트 토큰(isGuest=true)은 creatorId=null, creatorIsGuest=true 로 위임한다(비번 필수성은 service가 강제)', () => {
    controller.createPoll(guestReq as any, guestDto);
    expect(mocks.createPoll).toHaveBeenCalledWith(guestDto, null, true);
  });

  it('익명(토큰 없음)도 creatorId=null 로 위임한다(비번이 있으면 service가 허용)', () => {
    controller.createPoll(anonReq as any, guestDto);
    expect(mocks.createPoll).toHaveBeenCalledWith(guestDto, null, true);
  });
});

describe('PollController — 폴 수정/삭제 관리 비번 게이트(게스트는 비번 필수)', () => {
  let mocks: ReturnType<typeof makeServiceMock>;
  let controller: PollController;

  beforeEach(() => {
    mocks = makeServiceMock();
    controller = new PollController(mocks.service);
  });

  it('게스트가 비번 없이 폴 수정을 시도하면 403 으로 막는다(서비스 미호출)', () => {
    expect(() => controller.updatePoll('p1', guestReq as any, {} as any)).toThrow(
      ForbiddenException,
    );
    expect(mocks.updatePoll).not.toHaveBeenCalled();
  });

  it('게스트가 비번을 보내면 폴 수정을 위임한다(userId=null, password 전달)', () => {
    controller.updatePoll('p1', guestReq as any, { password: 'pw1234' } as any);
    expect(mocks.updatePoll).toHaveBeenCalledWith(
      'p1',
      { password: 'pw1234' },
      null,
      false,
      'pw1234',
    );
  });

  it('게스트가 비번 없이 폴 삭제를 시도하면 403 으로 막는다(서비스 미호출)', () => {
    expect(() => controller.deletePoll('p1', guestReq as any, {} as any)).toThrow(
      ForbiddenException,
    );
    expect(mocks.deletePoll).not.toHaveBeenCalled();
  });

  it('게스트가 비번을 보내면 폴 삭제를 위임한다(userId=null, password 전달)', () => {
    controller.deletePoll('p1', guestReq as any, { password: 'pw1234' } as any);
    expect(mocks.deletePoll).toHaveBeenCalledWith('p1', null, false, 'pw1234');
  });

  it('회원은 비번 없이 폴 수정·삭제를 통과한다(userId=sub)', () => {
    controller.updatePoll('p1', memberReq as any, {} as any);
    controller.deletePoll('p1', memberReq as any, {} as any);
    expect(mocks.updatePoll).toHaveBeenCalledWith('p1', {}, 'u-member', false, undefined);
    expect(mocks.deletePoll).toHaveBeenCalledWith('p1', 'u-member', false, null);
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
