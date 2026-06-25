// 결과 카드 이미지(순수 Canvas) 드로잉은 packages/client 로 단일화했어요(토스 인앱과 동일 코어).
// 테마/콘텐츠 토글 타입과 빌더를 그대로 재수출해 웹은 기존처럼 가져다 써요.
export * from '../../../../packages/client/src/lib/resultImageCanvas';
