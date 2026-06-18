import type { Poll } from '../shared';
import { shareMessage } from './toss';

const SHARE_PREFIX = '[픽플로우 투표] ';

const normalizeOrigin = (value: string | null | undefined): string | null => {
  const trimmed = value ? value.trim().replace(/\/+$/, '') : '';
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
const getShareOrigin = (): string | null => {
  return (
    normalizeOrigin(import.meta.env.VITE_SHARE_BASE_URL) ||
    normalizeOrigin(import.meta.env.VITE_PUBLIC_APP_URL) ||
    (typeof window !== 'undefined' ? window.location.origin : null)
  );
};

/** 공유용 절대 URL. 저장된 투표는 서버 OG 페이지(/share/:id), 로컬 투표는 /poll/:id. */
export const resolvePollShareUrl = (poll: Poll | null | undefined): string => {
  const origin = getShareOrigin();
  if (!poll) {
    return origin ?? '/';
  }
  const path = poll.id.startsWith('local-')
    ? `/poll/${encodeURIComponent(poll.id)}`
    : `/share/${encodeURIComponent(poll.id)}`;
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

export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
