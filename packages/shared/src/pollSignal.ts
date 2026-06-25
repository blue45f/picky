import type { Poll } from './index';
import { canRevealResults, isPollClosed, optionsByVotes } from './poll';

/**
 * 발견성 신호(signal) — 서버 q/sort/status 쿼리와 별개로, 현재 페이지(polls)에 덧입히는
 * **클라이언트 파생 필터**. web/toss 두 앱이 공유하는 순수 분류 로직이에요.
 * 비대화 방지를 위해 핵심 5종으로 한정해요: 전체 · 접전 · 신규 · 마감임박 · 한마디많은.
 */
export type PollSignal = 'all' | 'closeRace' | 'fresh' | 'closingSoon' | 'feedbackRich';

/**
 * 시그널 칩 라벨 — web/toss 두 앱이 동일 문구를 쓰도록 단일화한 상수(이모지 포함).
 * (feedbackRich 라벨이 '피드백 활발'/'한마디 많은' 으로 갈리던 드리프트 해소.)
 */
export const SIGNAL_CHIP_LABELS: Record<PollSignal, string> = {
  all: '전체',
  closeRace: '접전 ⚔️',
  fresh: '신규 ✨',
  closingSoon: '마감임박 ⌛️',
  feedbackRich: '한마디 많은 💬',
};

/** 칩 렌더 순서대로의 시그널 옵션(value+label). web/toss 공통. */
export const SIGNAL_OPTIONS: ReadonlyArray<{ value: PollSignal; label: string }> = (
  ['all', 'closeRace', 'fresh', 'closingSoon', 'feedbackRich'] as const
).map((value) => ({ value, label: SIGNAL_CHIP_LABELS[value] }));

/**
 * 결과(득표 분포)에 의존하는 시그널인지 — true면 결과를 드러낼 수 있는(canRevealResults)
 * 폴에만 매칭해야 미투표·미공개자에게 접전/한마디 같은 결과 신호가 새지 않는다.
 */
export const isResultDerivedSignal = (signal: PollSignal): boolean =>
  signal === 'closeRace' || signal === 'feedbackRich';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CLOSING_SOON_MS = 24 * 60 * 60 * 1000;
const FRESH_MAX_DAYS = 3;

/** 생성 후 경과 일수. 파싱 실패면 +Infinity(신규 아님). */
export const getPollAgeDays = (createdAt: string): number => {
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

/**
 * 결과 누출 방지 버전 — 결과 파생 시그널(접전·한마디많은)은 이 뷰어에게 결과를 드러낼 수
 * 있는(canRevealResults) 폴에만 매칭한다. hasVoted 는 "이 기기/뷰어가 그 폴에 투표했는지"를
 * 폴 단위로 돌려주는 콜백(목록 카드/칩이 같은 기준으로 세도록). 비결과 시그널(신규·마감임박)은
 * 결과와 무관하므로 게이트하지 않는다.
 */
export const matchesPollSignalForViewer = (
  poll: Poll,
  signal: PollSignal,
  hasVoted: (poll: Poll) => boolean,
): boolean => {
  if (!matchesPollSignal(poll, signal)) {
    return false;
  }
  if (isResultDerivedSignal(signal) && !canRevealResults(poll, hasVoted(poll))) {
    return false;
  }
  return true;
};

/** matchesPollSignalForViewer 기준으로 현재 페이지를 거른 결과. */
export const filterPollsBySignalForViewer = (
  polls: Poll[],
  signal: PollSignal,
  hasVoted: (poll: Poll) => boolean,
): Poll[] => {
  if (signal === 'all') {
    return polls;
  }
  return polls.filter((poll) => matchesPollSignalForViewer(poll, signal, hasVoted));
};

/** matchesPollSignalForViewer 기준 칩 카운트(미공개 결과 신호는 미투표 폴을 제외). */
export const countPollsBySignalForViewer = (
  polls: Poll[],
  signal: PollSignal,
  hasVoted: (poll: Poll) => boolean,
): number => {
  if (signal === 'all') {
    return polls.length;
  }
  return polls.reduce(
    (count, poll) => (matchesPollSignalForViewer(poll, signal, hasVoted) ? count + 1 : count),
    0,
  );
};

/** 참여 활발도 점수(표 + 한마디×3). 홈 '지금 뜨는' 추천 정렬용. */
export const pollEngagementScore = (poll: Poll): number =>
  poll.totalVotes + poll.comments.length * 3;

/**
 * 진행 중(마감 전) 투표 중 참여 활발도가 가장 높은 1개. 진행 중인 게 없으면 null.
 * 동점이면 먼저 나온(목록 순서상 앞선) 투표를 유지한다(`>` 비교라 안정적).
 */
export const hottestActivePoll = (polls: Poll[]): Poll | null => {
  const activePolls = polls.filter((poll) => !isPollClosed(poll));
  if (activePolls.length === 0) {
    return null;
  }
  return activePolls.reduce((prev, current) =>
    pollEngagementScore(current) > pollEngagementScore(prev) ? current : prev,
  );
};
