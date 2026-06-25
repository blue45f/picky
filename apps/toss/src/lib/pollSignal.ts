import type { Poll } from '../shared';
import { isPollClosed, optionsByVotes } from './poll';

/**
 * 발견성 신호(signal) — 서버 q/sort/status 쿼리와 별개로, 현재 페이지(polls)에 덧입히는
 * **클라이언트 파생 필터**. 웹(apps/web/PollList)의 분류 로직을 순수 함수로 떼어 이식했어요.
 * 비대화 방지를 위해 핵심 5종으로 한정해요: 전체 · 접전 · 신규 · 마감임박 · 한마디많은.
 */
export type PollSignal = 'all' | 'closeRace' | 'fresh' | 'closingSoon' | 'feedbackRich';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CLOSING_SOON_MS = 24 * 60 * 60 * 1000;
const FRESH_MAX_DAYS = 3;

/** 생성 후 경과 일수. 파싱 실패면 +Infinity(신규 아님). */
const getPollAgeDays = (createdAt: string): number => {
  const createdTime = new Date(createdAt).getTime();
  if (!Number.isFinite(createdTime)) {
    return Number.POSITIVE_INFINITY;
  }
  return (Date.now() - createdTime) / MS_PER_DAY;
};

/** 마감 임박(24시간 이내, 아직 진행 중). 마감/마감없음은 false. */
export const isClosingSoonPoll = (poll: Poll): boolean => {
  if (!poll.endsAt || isPollClosed(poll)) {
    return false;
  }
  const endsAtTime = new Date(poll.endsAt).getTime();
  if (!Number.isFinite(endsAtTime)) {
    return false;
  }
  const remainingMs = endsAtTime - Date.now();
  return remainingMs > 0 && remainingMs <= CLOSING_SOON_MS;
};

/** 접전: 상위 2개 격차가 총표의 12%(최소 1표) 이내. 표/선택지 2개 미만이면 false. */
export const isCloseRacePoll = (poll: Poll): boolean => {
  if (poll.totalVotes < 2 || poll.options.length < 2) {
    return false;
  }
  const [leader, runnerUp] = optionsByVotes(poll);
  const voteGap = (leader?.voteCount ?? 0) - (runnerUp?.voteCount ?? 0);
  return voteGap <= Math.max(1, Math.floor(poll.totalVotes * 0.12));
};

/** 신규: 생성 3일 이내. */
export const isFreshPoll = (poll: Poll): boolean =>
  getPollAgeDays(poll.createdAt) <= FRESH_MAX_DAYS;

/** 한마디 활발: 댓글 2개 이상이거나, 표 대비 댓글 비율 50% 이상. */
export const isFeedbackRichPoll = (poll: Poll): boolean => {
  if (poll.comments.length >= 2) {
    return true;
  }
  return poll.totalVotes > 0 && poll.comments.length / poll.totalVotes >= 0.5;
};

/** 한 투표가 주어진 signal에 해당하는지. 'all'은 항상 true. */
export const matchesPollSignal = (poll: Poll, signal: PollSignal): boolean => {
  switch (signal) {
    case 'closeRace':
      return isCloseRacePoll(poll);
    case 'fresh':
      return isFreshPoll(poll);
    case 'closingSoon':
      return isClosingSoonPoll(poll);
    case 'feedbackRich':
      return isFeedbackRichPoll(poll);
    default:
      return true;
  }
};

/** 현재 페이지에 signal 필터를 적용한 결과. */
export const filterPollsBySignal = (polls: Poll[], signal: PollSignal): Poll[] => {
  if (signal === 'all') {
    return polls;
  }
  return polls.filter((poll) => matchesPollSignal(poll, signal));
};

/** 주어진 polls 중 각 signal에 해당하는 개수(칩 카운트/비활성 판단용). */
export const countPollsBySignal = (polls: Poll[], signal: PollSignal): number => {
  if (signal === 'all') {
    return polls.length;
  }
  return polls.reduce((count, poll) => (matchesPollSignal(poll, signal) ? count + 1 : count), 0);
};
