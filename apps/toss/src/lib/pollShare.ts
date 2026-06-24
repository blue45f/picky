import type { Poll } from '../shared';
import { optionPercent, optionsByVotes } from './poll';
import { shareMessage } from './toss';

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

/** 투표를 토스 네이티브 공유(→웹공유→클립보드)로 공유. */
export const sharePoll = async (poll: Poll): Promise<'toss' | 'web-share' | 'clipboard' | null> => {
  const message = `${resolveShareText(poll)}\n${resolvePollShareUrl(poll)}`;
  return shareMessage(message);
};

/** 득표순 결과를 사람이 읽기 좋은 텍스트로. 공유 링크 포함. */
export const buildPollResultText = (poll: Poll): string => {
  const lines = optionsByVotes(poll).map((option, index) => {
    const percent = optionPercent(option.voteCount, poll.totalVotes);
    const crown = index === 0 && option.voteCount > 0 ? '👑 ' : '';
    return `${crown}${option.text} — ${percent}% (${option.voteCount}표)`;
  });
  return [
    `${SHARE_PREFIX}${poll.question}`,
    `총 ${poll.totalVotes}표`,
    '',
    ...lines,
    '',
    resolvePollShareUrl(poll),
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
