// desk-platform(DeskCloud) 공개 모듈 연동 클라이언트는 packages/client 로 단일화했어요.
// web/toss 두 앱이 동일 구현(앱 식별 슬러그 'picky' 공통)을 상대 경로로 재수출해요.
export * from '../../../../packages/client/src/lib/deskPlatform';
