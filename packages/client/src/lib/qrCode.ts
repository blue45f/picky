import QRCode from 'qrcode';

/**
 * 투표 공유용 QR을 SVG data URI로 생성한다.
 *
 * 이전엔 자체 QR 인코더를 썼는데, 파인더 패턴은 맞아 시각적으론 정상으로 보였지만
 * 데이터/EC 인코딩 버그로 **카메라 디코드가 불가능**했다(2026-06-25 발견).
 * 검증된 표준 `qrcode` 라이브러리로 매트릭스를 생성하도록 교체했다.
 * SVG 출력 형식(quiet zone 4, 다크 #061411)은 동일하게 유지한다.
 */
export const buildQrSvgDataUri = (text: string): string | null => {
  if (!text) {
    return null;
  }

  let modules: { size: number; data: Uint8Array };
  try {
    // 버전은 데이터 길이에 맞춰 라이브러리가 자동 선택. EC level M(15% 복원)으로 스캔 견고성 확보.
    modules = QRCode.create(text, { errorCorrectionLevel: 'M' }).modules;
  } catch {
    return null;
  }

  const size = modules.size;
  const data = modules.data;
  const quiet = 4;
  const dimension = size + quiet * 2;
  const pathParts: string[] = [];

  for (let y = 0; y < size; y += 1) {
    let x = 0;
    while (x < size) {
      if (!data[y * size + x]) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < size && data[y * size + x]) {
        x += 1;
      }
      pathParts.push(`M${start + quiet} ${y + quiet}h${x - start}v1H${start + quiet}z`);
    }
  }

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" shape-rendering="crispEdges">`,
    '<rect width="100%" height="100%" fill="#ffffff"/>',
    `<path fill="#061411" d="${pathParts.join(' ')}"/>`,
    '</svg>',
  ].join('');

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
