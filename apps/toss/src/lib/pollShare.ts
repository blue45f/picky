import type { Poll } from '../shared';
import { optionPercent, optionsByVotes } from './poll';
import { extractKeywords } from './keywords';
import { buildTossShareLink, shareMessage } from './toss';

const SHARE_PREFIX = '[피키 투표] ';

// 공유 링크가 외부(토스 밖)에서도 열려야 하므로, 공개 웹 오리진으로 폴백해요.
// 미니앱 WebView 호스트(*.tossmini.com)나 localhost는 공유 대상이 아니에요.
const DEFAULT_PUBLIC_ORIGIN = 'https://picky-olive.vercel.app';

const trimTrailingSlashes = (value: string): string => {
  let end = value.length;
  while (end > 0 && value.codePointAt(end - 1) === 47) {
    end -= 1;
  }
  return end === value.length ? value : value.slice(0, end);
};

const isPublicWebHost = (origin: string): boolean => {
  try {
    const { hostname } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return false;
    if (hostname.endsWith('.tossmini.com')) return false;
    return true;
  } catch {
    return false;
  }
};

const normalizeOrigin = (value: string | null | undefined): string | null => {
  const trimmed = value ? trimTrailingSlashes(value.trim()) : '';
  if (!trimmed) {
    return null;
  }
  const withProtocol =
    trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
};

/** 외부에서도 열리는 공개 웹 공유 오리진 (picky-olive 등). */
const getShareOrigin = (): string => {
  const configured =
    normalizeOrigin(import.meta.env.VITE_SHARE_BASE_URL) ||
    normalizeOrigin(import.meta.env.VITE_PUBLIC_APP_URL);
  if (configured) {
    return configured;
  }
  const runtime = globalThis.window === undefined ? null : globalThis.window.location.origin;
  if (runtime && isPublicWebHost(runtime)) {
    return runtime;
  }
  return DEFAULT_PUBLIC_ORIGIN;
};

/** 공유용 절대 URL. 모든 투표는 실제 참여 화면인 /poll/:id로 공유해요. */
export const resolvePollShareUrl = (poll: Poll | null | undefined): string => {
  const origin = getShareOrigin();
  if (!poll) {
    return origin ?? '/';
  }
  const path = `/poll/${encodeURIComponent(poll.id)}`;
  return origin ? `${origin}${path}` : path;
};

export const resolveShareText = (poll: Poll): string => {
  return `${SHARE_PREFIX}${poll.question}\n\n결정에 참여하고 의견을 남겨주세요.`;
};

/** 토스 미니앱 딥링크 경로. 출시 후 picky 미니앱의 해당 투표 화면으로 열려요. */
export const pollTossDeepLink = (pollId: string): string =>
  `intoss://picky/poll/${encodeURIComponent(pollId)}`;

/**
 * 투표를 토스 네이티브 공유(→웹공유→클립보드)로 공유.
 * 토스 안에선 **토스앱으로 열리는 공유 링크**(getTossShareLink)를, 밖에선 공개 웹 URL을 공유해요.
 * 이미 해석된 공유 URL이 있으면(shareUrlOverride) 재요청 없이 그대로 사용해요.
 */
export const sharePoll = async (
  poll: Poll,
  shareUrlOverride?: string | null,
): Promise<'toss' | 'web-share' | 'clipboard' | null> => {
  const url =
    shareUrlOverride ||
    (await buildTossShareLink(pollTossDeepLink(poll.id))) ||
    resolvePollShareUrl(poll);
  const message = `${resolveShareText(poll)}\n${url}`;
  return shareMessage(message);
};

/**
 * 선택지별 '대표 이유'(한마디에서 추출한 상위 키워드 3개) 블록.
 * 한글 토크나이저(keywords.ts)로 각 선택지에 달린 한마디만 모아 키워드를 뽑아요.
 * 키워드가 하나도 없으면(=관련 한마디 없음) 빈 배열을 반환해 결과 텍스트에 덧붙이지 않아요.
 */
const buildOptionKeywordLines = (poll: Poll): string[] => {
  const comments = poll.comments ?? [];
  if (comments.length === 0) {
    return [];
  }
  const lines = optionsByVotes(poll)
    .map((option) => {
      const texts = comments
        .filter((comment) => comment.selectedOptionId === option.id)
        .map((comment) => comment.comment)
        .filter(Boolean);
      const keywords = extractKeywords(texts, 3);
      if (keywords.length === 0) {
        return null;
      }
      return `- ${option.text}: ${keywords.map((keyword) => keyword.word).join(', ')}`;
    })
    .filter((line): line is string => line !== null);
  return lines;
};

/** 득표순 결과를 사람이 읽기 좋은 텍스트로. 공유 링크 포함(토스 안이면 토스 링크 전달 권장). */
export const buildPollResultText = (poll: Poll, shareUrlOverride?: string): string => {
  const lines = optionsByVotes(poll).map((option, index) => {
    const percent = optionPercent(option.voteCount, poll.totalVotes);
    const crown = index === 0 && option.voteCount > 0 ? '👑 ' : '';
    return `${crown}${option.text} — ${percent}% (${option.voteCount}표)`;
  });
  const keywordLines = buildOptionKeywordLines(poll);
  const reasonBlock = keywordLines.length > 0 ? ['', '[선택지별 대표 이유]', ...keywordLines] : [];
  return [
    `${SHARE_PREFIX}${poll.question}`,
    `총 ${poll.totalVotes}표`,
    '',
    ...lines,
    ...reasonBlock,
    '',
    shareUrlOverride || resolvePollShareUrl(poll),
  ].join('\n');
};

export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
