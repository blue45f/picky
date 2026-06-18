import type { Poll, PollOption } from '../shared';

/** 마감 시간이 지났는지. */
export const isPollClosed = (poll: Poll | null | undefined): boolean =>
  Boolean(poll?.endsAt) && Date.now() >= new Date(poll!.endsAt as string).getTime();

/** 옵션 득표율(%) 정수 반올림. */
export const optionPercent = (voteCount: number, totalVotes: number): number =>
  totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

/** 최다 득표 옵션. 옵션이 없으면 null. */
export const leadingOption = (poll: Poll): PollOption | null =>
  poll.options.length > 0 ? [...poll.options].sort((a, b) => b.voteCount - a.voteCount)[0]! : null;

/** 득표순 정렬 옵션 사본 (원본 순서를 보존하며 동률은 안정 정렬). */
export const optionsByVotes = (poll: Poll): PollOption[] =>
  poll.options
    .map((option, index) => ({ option, index }))
    .sort((a, b) => b.option.voteCount - a.option.voteCount || a.index - b.index)
    .map((entry) => entry.option);
