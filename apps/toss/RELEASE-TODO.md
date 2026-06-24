# 피키 앱인토스 — 남은 출시 작업 인계 문서

> 작성 2026-06-18. 코드/웹·API 배포는 완료(라이브). 아래는 **사람/토스 심사가 필요한 잔여 단계**예요.
> 관련: [README.md](./README.md), 콘솔 https://apps-in-toss.toss.im (workspace 51995 / mini-app 47428 / appName `picky`)

## ✅ 이미 완료된 것 (참고)

- 코드 머지: `feat/apps-in-toss-port` → `main` (`ab3bd80`)
- 웹/API 프로덕션 배포 **LIVE**: `https://picky-olive.vercel.app` (Vercel Git 연동 자동배포)
  - `/api/auth/toss`(201), `/api/polls`(200) 운영 동작 확인
- 운영용 미니앱 번들 빌드: `apps/toss/picky.ait` (3.9MB, 운영 API origin 박힘)

---

## ⏳ 남은 작업

### 1. 미니앱 콘솔 출시 (필수, 실기기 + 토스 심사 필요)

순서가 정해져 있고 중간에 **실기기 테스트**가 끼어 자동화가 불가능해요.

1. **번들 업로드**: 콘솔 → `앱인토스` → `앱 출시` → 새 번들로 `apps/toss/picky.ait` 업로드
   - 번들 재생성이 필요하면(코드 변경 시):
     ```sh
     # 레포 루트에서
     VITE_API_BASE_URL=https://picky-olive.vercel.app pnpm build:toss
     # → apps/toss/picky.ait 갱신
     ```
2. **실기기 테스트(1회 이상 필수)**: 토스앱이 설치된 폰에서 테스트해야 `검토 요청` 버튼이 활성화돼요.
   - 샌드박스/QR로 `intoss://picky` 진입 → 둘러보기·작성·투표·공유 동작 확인
3. **검토 요청**: 콘솔에서 `검토 요청하기` → 토스 심사 **영업일 최대 3일**(비동기). 결과는 이메일 통보.
4. **출시**: 승인되면 콘솔 `출시하기` → 3000만 사용자에게 공개 (즉시 반영이므로 신중히)

> 검수 체크리스트(비게임)는 이미 충족: iframe 미사용 · 핀치줌 비활성 · TDS 사용 · 번들 ≤100MB(3.9MB) · `webViewProps: partner`. 콘솔 CORS는 API가 `origin: '*'`라 `picky.apps.tossmini.com`·`picky.private-apps.tossmini.com` 자동 허용.

### 2. 토스 로그인(실계정) mTLS 인증서 (선택)

현재 `getAnonymousKey` 식별 로그인으로 충분히 동작하므로 **출시 필수 아님**. 실명/실계정 연동이 필요할 때만.

1. 콘솔에서 **mTLS 인증서 발급** (이메일 승인 절차)
2. picky API 서버(Vercel) 환경변수에 설정:
   ```sh
   APPS_IN_TOSS_MTLS_CERT_PATH=/path/to/client-cert.pem
   APPS_IN_TOSS_MTLS_KEY_PATH=/path/to/client-key.pem
   ```
   - 미설정 시 `POST /api/auth/toss/login`은 503 + 안내 메시지 반환(앱은 식별 로그인으로 계속 동작)
   - 서버리스(Vercel)에서는 인증서를 파일이 아닌 시크릿/번들로 주입하도록 `loginWithTossAuthCode`의 `createMtlsAgent` 조정이 필요할 수 있음(현재는 파일 경로 기반)

### 3. 콘솔 앱 아이콘 URL (소소)

`apps/toss/granite.config.ts`의 `brand.icon`이 현재 placeholder(`picky-olive.vercel.app/og-default.png`).
콘솔 `앱 정보`에 업로드한 로고 이미지를 우클릭 → 링크 복사 → 해당 URL로 교체 권장.

---

## 참고

- 운영 도메인: `https://picky-olive.vercel.app` (웹 + API, 동일 오리진 `/api`)
- 미니앱 코드: `apps/toss/` (Vite + React 18 + `@apps-in-toss/web-framework` + TDS)
- 벤더링 주의: `apps/toss/src/shared.ts`는 `packages/shared`의 복사본(ait가 `workspace:*` 미지원). 원본 변경 시 동기화.
- 로컬 검증: `pnpm dev:api` + `pnpm dev:toss`(샌드박스), 또는 `pnpm --filter @picky/toss exec vite preview`
