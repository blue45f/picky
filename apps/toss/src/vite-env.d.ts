/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 배포된 picky API 오리진 (예: https://picky-xxx.vercel.app). WebView는 자체 오리진이 API가 아니므로 필수. */
  readonly VITE_API_BASE_URL?: string;
  /** 외부 공유 링크의 공개 웹 오리진 (예: https://picky-olive.vercel.app). */
  readonly VITE_PUBLIC_APP_URL?: string;
  /** OG/공유 페이지 오리진 (미설정 시 VITE_PUBLIC_APP_URL 사용). */
  readonly VITE_SHARE_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
