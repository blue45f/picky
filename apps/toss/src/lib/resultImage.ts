// 결과 카드 이미지(순수 Canvas) 드로잉/테마는 packages/client 로 단일화했어요(웹과 동일 코어).
// 토스 .ait 번들러가 workspace 패키지를 못 다뤄 소스 파일을 상대경로로 직접 재수출해요.
export {
  buildPollResultImageDataUrl,
  RESULT_IMAGE_THEMES,
  DEFAULT_RESULT_IMAGE_CONTENT,
} from '../../../../packages/client/src/lib/resultImageCanvas';
export type {
  CanvasFactory,
  ResultImageTheme,
  ResultImageThemeConfig,
  ResultImageContentKey,
  ResultImageContentOptions,
} from '../../../../packages/client/src/lib/resultImageCanvas';
