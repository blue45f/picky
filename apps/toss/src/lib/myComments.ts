// "내 댓글" 추적·권한 판정은 packages/client 로 단일화했어요(web/toss 공통).
// 토스 .ait 번들러가 workspace 패키지를 못 다뤄 소스 파일을 상대경로로 직접 재수출해요.
export {
  getMyCommentIds,
  isMyComment,
  rememberMyComment,
  forgetMyComment,
  rememberNewCommentsFromSnapshot,
  canManageComment,
  resolveCommentManageAffordance,
} from '../../../../packages/client/src/lib/myComments';
