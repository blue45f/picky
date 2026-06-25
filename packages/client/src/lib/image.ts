/**
 * 선택지 이미지 처리 — web/toss 공통. 업로드 파일을 스키마 한도(160KB data URL) 이하로 다운스케일.
 * 브라우저 DOM(Image/canvas/FileReader)에 의존하므로 packages/shared가 아닌 client에 둔다.
 */

// CreatePollSchema의 option.imageUrl 한도와 동일.
const DATA_URL_MAX = 160_000;

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      resolve(typeof result === 'string' ? result : '');
    };
    reader.onerror = () => reject(new Error('파일을 읽지 못했어요.'));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지를 불러오지 못했어요.'));
    img.src = src;
  });

const drawToJpeg = (
  img: HTMLImageElement,
  maxDim: number,
  quality: number,
  background?: string,
): string => {
  const ratio = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const width = Math.max(1, Math.round((img.naturalWidth || 1) * ratio));
  const height = Math.max(1, Math.round((img.naturalHeight || 1) * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('이미지를 처리하지 못했어요.');
  }
  // 투명 PNG가 JPEG로 변환될 때 검정 배경으로 깔리지 않도록, 지정 배경을 먼저 채운다.
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
};

/**
 * 이미지 파일 → 한도 이하 JPEG data URL. 치수·품질을 단계적으로 낮춰 맞춰요.
 * 끝까지 한도를 못 맞추면 에러를 던져요(호출부에서 안내).
 *
 * opts:
 * - maxLen: data URL 최대 길이(기본 160KB = 스키마 한도). 호출 호환을 위해 number 도 받는다.
 * - background: 캔버스 배경색. 투명 PNG를 흰 배경 등으로 평탄화하고 싶을 때 지정(web 작성 화면).
 */
export async function fileToDownscaledDataUrl(
  file: File,
  opts?: number | { maxLen?: number; background?: string },
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 올릴 수 있어요.');
  }
  const maxLen = typeof opts === 'number' ? opts : (opts?.maxLen ?? DATA_URL_MAX);
  const background = typeof opts === 'number' ? undefined : opts?.background;
  const img = await loadImage(await readFileAsDataUrl(file));

  const dims = [1080, 860, 680, 540, 440, 360];
  const qualities = [0.82, 0.72, 0.62, 0.5, 0.42];
  for (const maxDim of dims) {
    for (const quality of qualities) {
      const out = drawToJpeg(img, maxDim, quality, background);
      if (out.length <= maxLen) {
        return out;
      }
    }
  }
  throw new Error('이미지 용량이 너무 커요. 더 작은 이미지를 사용해 주세요.');
}

/** 이미지로 사용할 수 있는 링크인지(http/https/data:image). */
export function isUsableImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.startsWith('data:image/')) {
    return true;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
