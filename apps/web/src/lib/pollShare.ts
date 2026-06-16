import { Poll } from '@picky/shared';

const SHARE_PREFIX = '[픽플로우 투표] ';

const safeEncode = (value: string): string => encodeURIComponent(value);

export const buildShareablePollSnapshot = (poll: Poll): string | null => {
  try {
    const encoded = safeEncode(
      btoa(
        safeEncode(
          JSON.stringify({
            version: 1,
            poll,
          }),
        ),
      ),
    );

    return encoded;
  } catch {
    return null;
  }
};

export const resolvePollShareUrl = (poll: Poll | null | undefined): string => {
  if (!poll) {
    if (typeof window === 'undefined') {
      return '/';
    }

    return `${window.location.origin}/`;
  }

  const snapshot = buildShareablePollSnapshot(poll);
  if (!snapshot) {
    return `${window.location.origin}/poll/${poll.id}`;
  }

  return `${window.location.origin}/poll/${poll.id}?snapshot=${snapshot}`;
};

export const resolveShareText = (poll: Poll): string => {
  return `${SHARE_PREFIX}${poll.question}\n\n결정에 참여하고 의견을 남겨주세요.`;
};

export const copyText = async (text: string): Promise<void> => {
  await navigator.clipboard.writeText(text);
};
