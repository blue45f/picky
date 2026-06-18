# @picky/toss — 픽플로우 앱인토스 미니앱

picky(PickFlow) 웹 서비스를 [앱인토스](https://apps-in-toss.toss.im/) WebView 미니앱으로 포팅한 앱이에요.
`@apps-in-toss/web-framework` + TDS(`@toss/tds-mobile`) 기반 Vite + React 19.

- 콘솔 appName: `pickflow` (딥링크 `intoss://pickflow`)
- 데스크톱 웹(`apps/web`)과 동일 백엔드(`apps/api`)를 사용하고, 화면은 모바일 인앱 UX로 재구현했어요.

## 화면

- `/` 둘러보기(PollList) — 검색·상태 필터(전체/진행중/마감)·정렬(최신/인기/마감임박)·최근 본 고민·스켈레톤 로딩
- `/create` 고민 작성 — 마감 시간 프리셋/직접 선택·글자수 카운터·결과 공개 시점
- `/poll/:id` 투표·결과(득표순 정렬 + 승자 하이라이트)·실시간 마감 카운트다운·댓글·공유 (HashRouter)

## 네이티브(토스) 인터랙션

- `lib/toss.ts` 브릿지 래퍼는 토스 밖(브라우저/개발)에서 모두 안전 폴백해요.
- 선택/투표/오류에 `generateHapticFeedback` 햅틱, 첫 투표 후 `requestReview` 리뷰 요청 시트,
  공유는 토스 네이티브 → `navigator.share` → 클립보드 순 폴백.

## 개발

```sh
# 1) 백엔드(API)를 먼저 띄워요 (별도 터미널, 루트에서)
pnpm dev:api                # http://localhost:3000

# 2) 미니앱 개발 서버 (샌드박스앱에서 intoss://pickflow 로 접근)
pnpm --filter @picky/toss dev
```

`.env.local`에 API 오리진을 지정하세요(미설정 시 WebView 자체 오리진을 API로 오인함):

```sh
cp apps/toss/.env.example apps/toss/.env.local
# VITE_API_BASE_URL=https://<배포된 picky API 오리진>
```

## 빌드 & 배포

```sh
# 운영용 환경변수로 .ait 번들 생성
VITE_API_BASE_URL=https://<prod-api> pnpm --filter @picky/toss build
# → apps/toss/pickflow.ait (콘솔 '앱 출시'에서 업로드 → 검토 요청)
```

검토 전 체크리스트(공식 비게임 가이드 기준):

- ✅ iframe 미사용 / 핀치줌 비활성(`index.html` viewport) / TDS 사용 / 번들 ≤100MB
- ⏳ 콘솔 `granite.config.ts`의 `brand.icon`을 업로드한 로고의 static URL로 교체
- ⏳ picky API CORS 허용 오리진에 `https://pickflow.apps.tossmini.com`(실서비스)와
  `https://pickflow.private-apps.tossmini.com`(QR 테스트) 추가 — 현재 API는 `origin: '*'`라 충족
- ⏳ 실기기 샌드박스 테스트(`intoss://pickflow`) 후 토스앱 최종 테스트 → 검토 요청

## 인증

- **기본(서버 불필요)**: 진입 시 `getAnonymousKey()`로 비게임 식별키를 받아 `POST /auth/toss`로
  안정적 사용자 세션(JWT)을 발급받아요. 작성/투표가 같은 사용자에 귀속돼요.
- **토스 로그인(선택, 실계정)**: `appLogin()` 인가 코드 → `POST /auth/toss/login` 서버 mTLS
  토큰 교환. 콘솔에서 mTLS 인증서를 발급해 API 서버 환경변수에 설정해야 동작해요:

  ```sh
  APPS_IN_TOSS_MTLS_CERT_PATH=/path/to/client-cert.pem
  APPS_IN_TOSS_MTLS_KEY_PATH=/path/to/client-key.pem
  ```

  미설정 시 `/auth/toss/login`은 503과 안내 메시지를 반환해요(앱은 식별 로그인으로 계속 동작).

## 참고

- `src/shared.ts`는 `packages/shared`의 복사본이에요(ait 번들러가 `workspace:*`를 처리하지
  못해 벤더링). `packages/shared/src/index.ts` 변경 시 함께 갱신하세요.
