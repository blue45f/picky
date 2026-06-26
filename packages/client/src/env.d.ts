/**
 * 번들러(Vite) 가 주입하는 `import.meta.env` 의 최소 앰비언트 선언.
 *
 * 이 패키지는 vite 를 직접 의존하지 않으므로(`vite/client` 미해결) 소비 앱이 쓰는 키만
 * 좁게 선언해, tsconfig include 를 src 전체로 넓혀도 lib/api·lib/deskPlatform 의
 * `import.meta.env.*` 가 타입 에러 없이 typecheck 되도록 한다. 런타임 동작에는 영향 없음.
 *
 * 키 추가 시: 실제 코드에서 `import.meta.env.VITE_…` 를 새로 읽는 곳이 생기면 여기 함께 추가.
 */
interface ImportMetaEnv {
  /** 개발 빌드 여부(Vite DEV 플래그). */
  readonly DEV?: boolean;
  /** API 베이스 URL override(미지정 시 동일 출처/기본값). */
  readonly VITE_API_BASE_URL?: string;
  /** desk-platform(공용 인증) 베이스 URL override. */
  readonly VITE_DESK_PLATFORM_URL?: string;
  /** 로컬 폴백 강제 허용 플래그('true' 문자열). */
  readonly VITE_ALLOW_LOCAL_POLL_FALLBACK?: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
