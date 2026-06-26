// 스크롤 진입 연출은 packages/client(lib/motion)로 단일화했어요(웹↔토스 동일 임계값·prefers-reduced-motion).
// 클래스명/루트마진/threshold 기본값(reveal·is-visible·0px 0px -8% 0px·0.12)이 web index.css 와 동일하다.
export { useScrollReveal } from '../../../../packages/client/src/lib/motion';
