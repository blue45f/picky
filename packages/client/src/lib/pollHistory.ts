// 토스 `.ait` 번들러(collect-package-version)가 @picky/shared 패키지명 해석을 못해
// 번들러 무관 상대 경로(공유 소스)로 타입을 가져와요. 웹(vite)도 동일하게 해석돼요.
import type { Poll } from '../../../shared/src/index';

const RECENT_POLL_HISTORY_KEY = 'picky_recent_poll_history_v1';
const MAX_RECENT_POLLS = 8;

export interface RecentPollHistoryItem {
  id: string;
  question: string;
  description?: string | null;
  totalVotes: number;
  commentCount: number;
  viewedAt: string;
  votedAt?: string | null;
  hasVoted?: boolean;
}

const isRecentPollHistoryItem = (value: unknown): value is RecentPollHistoryItem => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Partial<RecentPollHistoryItem>;
  return (
    typeof item.id === 'string' &&
    typeof item.question === 'string' &&
    typeof item.viewedAt === 'string'
  );
};

const readRecentPollHistory = (): RecentPollHistoryItem[] => {
  if (!('window' in globalThis)) {
    return [];
  }

  try {
    const raw = globalThis.localStorage.getItem(RECENT_POLL_HISTORY_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isRecentPollHistoryItem).slice(0, MAX_RECENT_POLLS);
  } catch {
    return [];
  }
};

const writeRecentPollHistory = (items: RecentPollHistoryItem[]) => {
  if (!('window' in globalThis)) {
    return;
  }

  globalThis.localStorage.setItem(
    RECENT_POLL_HISTORY_KEY,
    JSON.stringify(items.slice(0, MAX_RECENT_POLLS)),
  );
};

export const getRecentPollHistory = (): RecentPollHistoryItem[] => readRecentPollHistory();

export const rememberRecentPoll = (poll: Poll, options: { hasVoted?: boolean } = {}) => {
  const now = new Date().toISOString();
  const existingItems = readRecentPollHistory();
  const previous = existingItems.find((item) => item.id === poll.id);
  const nextItem: RecentPollHistoryItem = {
    id: poll.id,
    question: poll.question,
    description: poll.description,
    totalVotes: poll.totalVotes,
    commentCount: poll.comments.length,
    viewedAt: now,
    votedAt: options.hasVoted ? now : previous?.votedAt || null,
    hasVoted: options.hasVoted || previous?.hasVoted || false,
  };

  writeRecentPollHistory([nextItem, ...existingItems.filter((item) => item.id !== poll.id)]);

  return nextItem;
};

export const removeRecentPollHistoryItem = (pollId: string): RecentPollHistoryItem[] => {
  const next = readRecentPollHistory().filter((item) => item.id !== pollId);
  writeRecentPollHistory(next);
  return next;
};

export const clearRecentPollHistory = () => {
  writeRecentPollHistory([]);
};
