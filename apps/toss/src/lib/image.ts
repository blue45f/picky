/** 선택지 이미지 처리: 업로드 파일을 스키마 한도(160KB data URL) 이하로 다운스케일. */

// CreatePollSchema의 option.imageUrl 한도와 동일.
const DATA_URL_MAX = 160_000;

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
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

const drawToJpeg = (img: HTMLImageElement, maxDim: number, quality: number): string => {
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
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
};

/**
 * 이미지 파일 → 한도 이하 JPEG data URL. 치수·품질을 단계적으로 낮춰 맞춰요.
 * 끝까지 한도를 못 맞추면 에러를 던져요(호출부에서 안내).
 */
export async function fileToDownscaledDataUrl(file: File, maxLen = DATA_URL_MAX): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 올릴 수 있어요.');
  }
  const img = await loadImage(await readFileAsDataUrl(file));

  const dims = [1080, 860, 680, 540, 440, 360];
  const qualities = [0.82, 0.72, 0.62, 0.5, 0.42];
  for (const maxDim of dims) {
    for (const quality of qualities) {
      const out = drawToJpeg(img, maxDim, quality);
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
