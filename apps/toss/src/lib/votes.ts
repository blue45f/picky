// 기기 로컬 투표 기록(중복 방지·참여 표시)은 packages/client 로 단일화했어요(web/toss 공통).
// 토스 .ait 번들러가 workspace 패키지를 못 다뤄 소스 파일을 상대경로로 직접 재수출해요.
export {
  getVotedOptionId,
  hasVotedLocally,
  rememberVote,
} from '../../../../packages/client/src/lib/votes';
