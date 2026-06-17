/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KAKAO_JAVASCRIPT_KEY?: string;
  readonly VITE_PUBLIC_APP_URL?: string;
  readonly VITE_SHARE_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  Kakao?: {
    init: (key: string) => void;
    isInitialized: () => boolean;
    Share?: {
      sendScrap?: (settings: { requestUrl: string }) => void;
      sendDefault: (settings: {
        objectType: 'feed';
        content: {
          title: string;
          description: string;
          imageUrl: string;
          link: {
            mobileWebUrl: string;
            webUrl: string;
          };
        };
        buttons?: Array<{
          title: string;
          link: {
            mobileWebUrl: string;
            webUrl: string;
          };
        }>;
      }) => void;
    };
    Link?: {
      sendDefault: (settings: {
        objectType: 'feed';
        content: {
          title: string;
          description: string;
          imageUrl: string;
          link: {
            mobileWebUrl: string;
            webUrl: string;
          };
        };
        buttons?: Array<{
          title: string;
          link: {
            mobileWebUrl: string;
            webUrl: string;
          };
        }>;
      }) => void;
    };
  };
}
