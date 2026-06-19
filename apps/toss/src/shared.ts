// 앱인토스 .ait 번들러가 workspace:* 패키지를 처리하지 못해 패키지명을 쓰지 않고
// 모노레포 소스 파일을 상대 경로로 직접 재수출해요.
export * from '../../../packages/shared/src/index';
