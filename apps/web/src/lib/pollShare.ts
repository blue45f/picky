import type { Poll } from '@picky/shared';

const SHARE_PREFIX = '[픽플로우 투표] ';
const DEFAULT_SHARE_TITLE = 'pickflow - 고민 투표 공유 플랫폼';
const DEFAULT_SHARE_DESCRIPTION =
  '고민을 선택지 투표로 만들고 링크로 공유해 빠르게 의견을 모아보세요.';
const KAKAO_SDK_WAIT_TIMEOUT_MS = 2200;
const DEFAULT_OG_IMAGE_PATH = '/og-default.png';
const DEFAULT_TWITTER_SITE = '@pickflow_io';

const safeEncode = (value: string): string => encodeURIComponent(value);

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const trimTrailingSlashes = (value: string): string => {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) {
    end -= 1;
  }
  return end === value.length ? value : value.slice(0, end);
};

const isDataUrl = (value: string | null | undefined): boolean =>
  Boolean(value?.startsWith('data:'));

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

const getRuntimeOrigin = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.location.origin;
};

const parseUrl = (value: string | null | undefined): URL | null => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const isLocalHostname = (hostname: string): boolean => {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local')
  );
};

const isPublicHttpsUrl = (url: string): boolean => {
  const parsed = parseUrl(url);

  return Boolean(parsed && parsed.protocol === 'https:' && !isLocalHostname(parsed.hostname));
};

const getConfiguredAppOrigin = (): string | null =>
  normalizeOrigin(import.meta.env.VITE_PUBLIC_APP_URL);

const getConfiguredShareOrigin = (): string | null =>
  normalizeOrigin(import.meta.env.VITE_SHARE_BASE_URL);

const getAbsoluteUrl = (path: string, preferredOrigin?: string | null): string => {
  const origin = preferredOrigin || getConfiguredAppOrigin() || getRuntimeOrigin();
  if (!origin) {
    return path;
  }

  return `${origin}${path}`;
};

const getShareAbsoluteUrl = (path: string): string => {
  return getAbsoluteUrl(path, getConfiguredShareOrigin() || getConfiguredAppOrigin());
};

const getDefaultOgImageUrl = (): string => {
  return getAbsoluteUrl(DEFAULT_OG_IMAGE_PATH);
};

const resolvePollImageUrl = (poll: Poll | null | undefined): string => {
  const optionWithImage = poll?.options.find((option) => Boolean(option.imageUrl));
  const imageUrl = optionWithImage?.imageUrl;

  if (imageUrl?.startsWith('http://') || imageUrl?.startsWith('https://')) {
    return imageUrl;
  }

  if (poll && optionWithImage && isDataUrl(imageUrl) && !poll.id.startsWith('local-')) {
    return getAbsoluteUrl(
      `/api/polls/${encodeURIComponent(poll.id)}/options/${encodeURIComponent(
        String(optionWithImage.id),
      )}/image`,
    );
  }

  return getDefaultOgImageUrl();
};

const sanitizePollForSnapshot = (poll: Poll): Poll => ({
  ...poll,
  attachments: [],
  options: poll.options.map((option) => ({
    ...option,
    imageUrl: isDataUrl(option.imageUrl) ? null : option.imageUrl,
  })),
});

const setMetaContent = (selector: string, content: string) => {
  if (typeof document === 'undefined') {
    return;
  }

  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    const match = selector.match(/^meta\[(name|property)="([^"]+)"\]$/);
    const attributeName = match?.[1];
    const attributeValue = match?.[2];
    if (!attributeName || attributeValue === undefined) {
      return;
    }

    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }

  element.content = content;
};

const setLinkHref = (selector: string, href: string) => {
  if (typeof document === 'undefined') {
    return;
  }

  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element && selector === 'link[rel="canonical"]') {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }

  if (!element) {
    return;
  }

  element.href = href;
};

const waitForKakaoSdk = async () => {
  const startedAt = Date.now();

  while (
    typeof window !== 'undefined' &&
    !window.Kakao &&
    Date.now() - startedAt < KAKAO_SDK_WAIT_TIMEOUT_MS
  ) {
    await wait(80);
  }

  return window.Kakao;
};

export const buildShareablePollSnapshot = (poll: Poll): string | null => {
  try {
    const pollForSnapshot = sanitizePollForSnapshot(poll);
    const encoded = safeEncode(
      btoa(
        safeEncode(
          JSON.stringify({
            version: 1,
            poll: pollForSnapshot,
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
    return getAbsoluteUrl('/');
  }

  const pollPath = `/poll/${encodeURIComponent(poll.id)}`;
  if (!poll.id.startsWith('local-')) {
    return getShareAbsoluteUrl(pollPath);
  }

  const snapshot = buildShareablePollSnapshot(poll);
  if (!snapshot) {
    return getShareAbsoluteUrl(pollPath);
  }

  return getShareAbsoluteUrl(`${pollPath}?snapshot=${snapshot}`);
};

export const resolvePollEmbedUrl = (poll: Poll | null | undefined): string => {
  if (!poll) {
    return getAbsoluteUrl('/');
  }

  if (!poll.id.startsWith('local-')) {
    return getAbsoluteUrl(`/embed/${encodeURIComponent(poll.id)}`);
  }

  const snapshot = buildShareablePollSnapshot(poll);
  if (!snapshot) {
    return getAbsoluteUrl(`/embed/${encodeURIComponent(poll.id)}`);
  }

  return getAbsoluteUrl(`/embed/${encodeURIComponent(poll.id)}?snapshot=${snapshot}`);
};

const replaceEvery = (value: string, search: string, replacement: string): string =>
  value.split(search).join(replacement);

const escapeHtmlAttribute = (value: string): string => {
  return replaceEvery(
    replaceEvery(replaceEvery(replaceEvery(value, '&', '&amp;'), '"', '&quot;'), '<', '&lt;'),
    '>',
    '&gt;',
  );
};

const escapeScriptString = (value: string): string => {
  return replaceEvery(replaceEvery(value, '\\', '\\\\'), "'", "\\'");
};

export type PollEmbedMode = 'standard' | 'compact' | 'popup';

const EMBED_MODE_CONFIG: Record<
  Exclude<PollEmbedMode, 'popup'>,
  { height: number; minHeight: number; maxHeight: number; radius: number }
> = {
  standard: {
    height: 720,
    minHeight: 420,
    maxHeight: 1200,
    radius: 12,
  },
  compact: {
    height: 520,
    minHeight: 360,
    maxHeight: 820,
    radius: 10,
  },
};

export const buildPollEmbedCode = (poll: Poll, mode: PollEmbedMode = 'standard'): string => {
  const embedUrl = resolvePollEmbedUrl(poll);
  const frameId = `pickflow-poll-${mode}-${poll.id.replace(/[^a-zA-Z0-9_-]/g, '') || 'embed'}`;
  const safeFrameId = escapeHtmlAttribute(frameId);
  const safeEmbedUrl = escapeHtmlAttribute(embedUrl);
  const scriptFrameId = escapeScriptString(frameId);

  if (mode === 'popup') {
    const launcherId = `${frameId}-launcher`;
    const overlayId = `${frameId}-overlay`;
    const closeId = `${frameId}-close`;
    const safeLauncherId = escapeHtmlAttribute(launcherId);
    const safeOverlayId = escapeHtmlAttribute(overlayId);
    const safeCloseId = escapeHtmlAttribute(closeId);
    const scriptLauncherId = escapeScriptString(launcherId);
    const scriptOverlayId = escapeScriptString(overlayId);
    const scriptCloseId = escapeScriptString(closeId);

    return `<button id="${safeLauncherId}" type="button" style="display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;border:0;border-radius:999px;background:#13c2a3;color:#041412;font-weight:800;cursor:pointer">투표 참여하기</button>
<div id="${safeOverlayId}" hidden style="position:fixed;inset:0;z-index:9999;background:rgba(4,12,10,.72);backdrop-filter:blur(10px);padding:20px;box-sizing:border-box">
  <div style="width:min(960px,100%);height:min(760px,100%);margin:0 auto;background:#061411;border-radius:16px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.35);position:relative">
    <button id="${safeCloseId}" type="button" aria-label="투표 닫기" style="position:absolute;top:12px;right:12px;z-index:2;width:34px;height:34px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(0,0,0,.34);color:white;cursor:pointer">x</button>
    <iframe id="${safeFrameId}" src="${safeEmbedUrl}" title="pickflow poll" width="100%" height="720" style="border:0;width:100%;height:100%;overflow:hidden" loading="lazy"></iframe>
  </div>
</div>
<script>
(function () {
  var launcher = document.getElementById('${scriptLauncherId}');
  var overlay = document.getElementById('${scriptOverlayId}');
  var close = document.getElementById('${scriptCloseId}');
  var frame = document.getElementById('${scriptFrameId}');
  if (!launcher || !overlay || !close || !frame) return;
  function openPoll() {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closePoll() {
    overlay.hidden = true;
    document.body.style.overflow = '';
  }
  launcher.addEventListener('click', openPoll);
  close.addEventListener('click', closePoll);
  overlay.addEventListener('click', function (event) {
    if (event.target === overlay) closePoll();
  });
  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !overlay.hidden) closePoll();
  });
})();
</script>`;
  }

  const config = EMBED_MODE_CONFIG[mode];

  return `<iframe id="${safeFrameId}" src="${safeEmbedUrl}" title="pickflow poll" width="100%" height="${config.height}" style="border:0;border-radius:${config.radius}px;overflow:hidden" loading="lazy"></iframe>
<script>
(function () {
  var frame = document.getElementById('${scriptFrameId}');
  if (!frame) return;
  window.addEventListener('message', function (event) {
    if (event.source !== frame.contentWindow) return;
    if (!event.data || event.data.type !== 'pickflow:embed-resize') return;
    if (typeof event.data.height !== 'number') return;
    frame.style.height = Math.max(${config.minHeight}, Math.min(${config.maxHeight}, event.data.height)) + 'px';
  });
})();
</script>`;
};

export const resolveShareText = (poll: Poll): string => {
  return `${SHARE_PREFIX}${poll.question}\n\n결정에 참여하고 의견을 남겨주세요.`;
};

export const buildPollShareMessage = (poll: Poll): string => {
  return `${resolveShareText(poll)}\n${resolvePollShareUrl(poll)}`;
};

export const copyText = async (text: string): Promise<void> => {
  await navigator.clipboard.writeText(text);
};

export const updatePollMetaTags = (poll: Poll | null | undefined) => {
  if (typeof document === 'undefined') {
    return;
  }

  const title = poll ? `${poll.question} | pickflow` : DEFAULT_SHARE_TITLE;
  const description = poll?.description || DEFAULT_SHARE_DESCRIPTION;
  const url = poll ? resolvePollShareUrl(poll) : window.location.href;
  const imageUrl = resolvePollImageUrl(poll);
  const imageAlt = poll ? `${poll.question} 투표 미리보기` : 'pickflow 고민 투표 공유 미리보기';
  const publishedTime = poll?.createdAt || new Date().toISOString();
  const updatedTime =
    (poll as (Poll & { updatedAt?: string }) | null | undefined)?.updatedAt || publishedTime;
  const imageType = imageUrl.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';

  document.title = title;
  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[name="robots"]', 'index, follow');
  setMetaContent('meta[property="og:type"]', 'website');
  setMetaContent('meta[property="og:site_name"]', 'pickflow');
  setMetaContent('meta[property="og:locale"]', 'ko_KR');
  setMetaContent('meta[property="og:title"]', title);
  setMetaContent('meta[property="og:description"]', description);
  setMetaContent('meta[property="og:url"]', url);
  setMetaContent('meta[property="og:image"]', imageUrl);
  setMetaContent('meta[property="og:image:secure_url"]', imageUrl);
  setMetaContent('meta[property="og:image:width"]', '1200');
  setMetaContent('meta[property="og:image:height"]', '630');
  setMetaContent('meta[property="og:image:type"]', imageType);
  setMetaContent('meta[property="og:image:alt"]', imageAlt);
  setMetaContent('meta[property="og:updated_time"]', updatedTime);
  setMetaContent('meta[property="article:published_time"]', publishedTime);
  setMetaContent('meta[name="twitter:card"]', 'summary_large_image');
  setMetaContent('meta[name="twitter:url"]', url);
  setMetaContent('meta[name="twitter:title"]', title);
  setMetaContent('meta[name="twitter:description"]', description);
  setMetaContent('meta[name="twitter:image"]', imageUrl);
  setMetaContent('meta[name="twitter:image:alt"]', imageAlt);
  setMetaContent('meta[name="twitter:site"]', DEFAULT_TWITTER_SITE);
  setLinkHref('link[rel="canonical"]', url);
};

export type KakaoShareDiagnosticStatus = 'passed' | 'warning' | 'manual';

export type KakaoShareReadinessItem = {
  id: string;
  label: string;
  status: KakaoShareDiagnosticStatus;
  passed: boolean;
  blocking: boolean;
  help: string;
  action?: string;
};

export type KakaoShareDiagnostics = {
  shareUrl: string;
  shareHostname: string;
  imageUrl: string;
  imageHostname: string;
  readyCount: number;
  totalBlockingCount: number;
  manualCount: number;
  canUseKakaoSdk: boolean;
  canUseScrap: boolean;
  isReadyForKakao: boolean;
  items: KakaoShareReadinessItem[];
};

export const getKakaoShareDiagnostics = (poll: Poll): KakaoShareDiagnostics => {
  const shareUrl = resolvePollShareUrl(poll);
  const imageUrl = resolvePollImageUrl(poll);
  const shareUrlInfo = parseUrl(shareUrl);
  const imageUrlInfo = parseUrl(imageUrl);
  const shareHostname = shareUrlInfo?.hostname || '';
  const imageHostname = imageUrlInfo?.hostname || '';
  const hasKakaoJavascriptKey = Boolean(import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY?.trim());
  const hasPublicHttpsShareUrl = isPublicHttpsUrl(shareUrl);
  const hasPollPageShareUrl = Boolean(shareUrlInfo?.pathname.startsWith('/poll/'));
  const hasPublicHttpsImageUrl = isPublicHttpsUrl(imageUrl);
  const hasUploadedImage = poll.options.some((option) => Boolean(option.imageUrl));
  const hasDataUrlImage = poll.options.some((option) => isDataUrl(option.imageUrl));
  const canUseScrap = false;
  const items: KakaoShareReadinessItem[] = [
    {
      id: 'javascript-key',
      label: 'JavaScript 키',
      status: hasKakaoJavascriptKey ? 'passed' : 'warning',
      passed: hasKakaoJavascriptKey,
      blocking: true,
      help: hasKakaoJavascriptKey
        ? 'Kakao SDK 초기화에 필요한 키가 설정되어 있습니다.'
        : '키가 없으면 카카오 SDK 호출 대신 OS 공유 또는 링크 복사로 대체됩니다.',
      action: hasKakaoJavascriptKey
        ? undefined
        : 'VITE_KAKAO_JAVASCRIPT_KEY를 배포 환경 변수에 추가하세요.',
    },
    {
      id: 'share-url',
      label: '공개 HTTPS URL',
      status: hasPublicHttpsShareUrl ? 'passed' : 'warning',
      passed: hasPublicHttpsShareUrl,
      blocking: true,
      help: hasPublicHttpsShareUrl
        ? `${shareHostname} 도메인의 HTTPS 공유 URL을 사용합니다.`
        : 'localhost, 사설 도메인, http URL은 카카오 크롤러가 OG 태그를 안정적으로 읽기 어렵습니다.',
      action: hasPublicHttpsShareUrl
        ? undefined
        : 'VITE_SHARE_BASE_URL 또는 VITE_PUBLIC_APP_URL을 실제 HTTPS 배포 도메인으로 맞추세요.',
    },
    {
      id: 'poll-page-url',
      label: '투표 페이지 URL',
      status: hasPollPageShareUrl ? 'passed' : 'warning',
      passed: hasPollPageShareUrl,
      blocking: true,
      help: hasPollPageShareUrl
        ? '/poll/:id 실제 투표 페이지 링크를 공유합니다.'
        : '공유 링크는 실제 참여 화면인 /poll/:id 주소여야 합니다.',
      action: hasPollPageShareUrl ? undefined : '저장된 투표의 /poll/:id 링크를 공유하세요.',
    },
    {
      id: 'og-image',
      label: 'OG 이미지 공개 접근',
      status: hasPublicHttpsImageUrl ? 'passed' : 'warning',
      passed: hasPublicHttpsImageUrl,
      blocking: true,
      help: hasPublicHttpsImageUrl
        ? `${imageHostname} 이미지 URL을 카카오가 크롤링할 수 있습니다.`
        : hasUploadedImage && hasDataUrlImage
          ? '업로드 이미지는 data URL 그대로 공유하지 않고 서버 이미지 엔드포인트 또는 기본 OG 이미지로 변환되어야 합니다.'
          : '기본 OG 이미지도 HTTPS 공개 URL이어야 카카오 미리보기에 안정적으로 표시됩니다.',
      action: hasPublicHttpsImageUrl
        ? undefined
        : '업로드 이미지 엔드포인트와 /og-default.png가 공개 HTTPS 도메인에서 열리는지 확인하세요.',
    },
    {
      id: 'kakao-domain',
      label: '카카오 도메인 등록',
      status: 'manual',
      passed: true,
      blocking: false,
      help: shareHostname
        ? `${shareHostname} 도메인이 Kakao Developers 앱의 Web 플랫폼 도메인에 등록되어 있어야 합니다.`
        : '공유 도메인을 만든 뒤 Kakao Developers 앱 설정에서 Web 플랫폼 도메인을 등록해야 합니다.',
      action:
        '이 항목은 브라우저에서 검증할 수 없어 Kakao Developers 콘솔에서 직접 확인해야 합니다.',
    },
  ];
  const blockingItems = items.filter((item) => item.blocking);
  const readyCount = blockingItems.filter((item) => item.passed).length;
  const totalBlockingCount = blockingItems.length;

  return {
    shareUrl,
    shareHostname,
    imageUrl,
    imageHostname,
    readyCount,
    totalBlockingCount,
    manualCount: items.filter((item) => item.status === 'manual').length,
    canUseKakaoSdk: hasKakaoJavascriptKey,
    canUseScrap,
    isReadyForKakao: readyCount === totalBlockingCount,
    items,
  };
};

const isKakaoScrapableUrl = (url: string): boolean => {
  return isPublicHttpsUrl(url);
};

export const sharePollToKakao = async (
  poll: Poll,
): Promise<'kakao' | 'web-share' | 'clipboard'> => {
  const kakaoDiagnostics = getKakaoShareDiagnostics(poll);
  const shareUrl = kakaoDiagnostics.shareUrl;
  const shareMessageText = buildPollShareMessage(poll);
  const kakaoKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY?.trim();

  if (kakaoKey && typeof window !== 'undefined') {
    const kakao = await waitForKakaoSdk();
    if (kakao?.Share) {
      if (!kakao.isInitialized()) {
        kakao.init(kakaoKey);
      }

      if (kakaoDiagnostics.canUseScrap && isKakaoScrapableUrl(shareUrl) && kakao.Share.sendScrap) {
        kakao.Share.sendScrap({
          requestUrl: shareUrl,
        });
      } else {
        kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: poll.question,
            description: poll.description || '결정에 참여하고 의견을 남겨주세요.',
            imageUrl: resolvePollImageUrl(poll),
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
          buttons: [
            {
              title: '투표하러 가기',
              link: {
                mobileWebUrl: shareUrl,
                webUrl: shareUrl,
              },
            },
          ],
        });
      }
      return 'kakao';
    }

    if (kakao?.Link) {
      if (!kakao.isInitialized()) {
        kakao.init(kakaoKey);
      }

      kakao.Link.sendDefault({
        objectType: 'feed',
        content: {
          title: poll.question,
          description: poll.description || '결정에 참여하고 의견을 남겨주세요.',
          imageUrl: resolvePollImageUrl(poll),
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        buttons: [
          {
            title: '투표하러 가기',
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
        ],
      });
      return 'kakao';
    }
  }

  if (navigator.share) {
    await navigator.share({ text: shareMessageText });
    return 'web-share';
  }

  await copyText(shareMessageText);
  return 'clipboard';
};
