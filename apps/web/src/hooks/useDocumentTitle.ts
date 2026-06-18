import { useEffect } from 'react';

const BASE = 'pickflow';
const DEFAULT_TITLE = `${BASE} - 고민 투표 공유 플랫폼`;

/**
 * 페이지별 document.title 설정 — SPA 에서 탭·북마크·공유·SEO 타이틀을 페이지 내용에 맞춘다.
 * title 이 비면 기본(마케팅) 타이틀로 둔다. 언마운트 시 기본값 복원(타이틀 미설정 페이지의 잔존 방지).
 */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE}` : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}
