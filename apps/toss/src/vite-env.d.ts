/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 배포된 picky API 오리진 (예: https://picky-xxx.vercel.app). WebView는 자체 오리진이 API가 아니므로 필수. */
  readonly VITE_API_BASE_URL?: string;
  /** 외부 공유 링크의 공개 웹 오리진 (예: https://picky-olive.vercel.app). */
  readonly VITE_PUBLIC_APP_URL?: string;
  /** OG/공유 페이지 오리진 (미설정 시 VITE_PUBLIC_APP_URL 사용). */
  readonly VITE_SHARE_BASE_URL?: string;
  /**
   * 토스 동의 기반 프로필(getConsentedUserData) 연동 키(콘솔 등록 `cud_*`).
   * 비어 있으면 옵트인 '토스 프로필 불러오기' 버튼이 숨겨지고 기능이 꺼져요.
   */
  readonly VITE_TOSS_CUD_PROFILE_KEY?: string;
  /** 콘솔 '배너' 광고 그룹 ID(일반 배너 배치). 미설정 시 운영 빌드는 광고 미노출. */
  readonly VITE_TOSS_AD_GROUP_ID?: string;
  /** 콘솔 '배너(피드형)' 광고 그룹 ID(피드형 배치, 별도 광고 타입 아님). 미설정 시 위 배너 ID로 폴백. */
  readonly VITE_TOSS_FEED_AD_GROUP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
