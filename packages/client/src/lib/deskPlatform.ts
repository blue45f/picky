/**
 * desk-platform(DeskCloud) 공개 모듈 연동 클라이언트.
 *
 * picky는 자체 인증/투표 백엔드를 유지하면서, desk-platform이 제공하는
 * **공개(키 불필요·CORS 오픈) 모듈**만 골라 활용한다.
 * - 문의(Inquiry): 고객센터 게시판 — POST/GET /api/v1/apps/:appId/inquiries
 * - 방문 집계(Visits): 방문자 통계 — POST ping / GET stats
 *
 * 멀티테넌트 키는 **경로의 appId**(서버에서 소문자 정규화). 형제 앱과 동일한 패턴.
 * 로그인/인증 모듈은 라이브 desk-platform에 배포돼 있지 않아(404) picky 자체 인증을 쓴다.
 */
const DEFAULT_DESK_BASE = 'https://desk-platform.vercel.app';

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export const DESK_BASE: string = trimTrailingSlash(
  (import.meta.env.VITE_DESK_PLATFORM_URL as string | undefined)?.trim() || DEFAULT_DESK_BASE,
);

/** picky 앱 식별 슬러그(앱별 게시판/집계 구분 키). 서버에서 소문자 정규화됨. */
export const DESK_APP_ID = 'picky';

export type InquiryCategory = 'partnership' | 'bug' | 'feedback' | 'usage';
export type InquiryStatus = 'new' | 'in_progress' | 'resolved' | 'closed';

export const INQUIRY_CATEGORIES: ReadonlyArray<{ value: InquiryCategory; label: string }> = [
  { value: 'feedback', label: '의견·제안' },
  { value: 'bug', label: '버그·오류' },
  { value: 'usage', label: '사용 문의' },
  { value: 'partnership', label: '제휴·협업' },
];

export interface Inquiry {
  id: string;
  appId: string;
  category: InquiryCategory;
  status: InquiryStatus;
  title: string;
  body: string;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InquiryList {
  appId: string;
  items: Inquiry[];
  limit: number;
  offset: number;
}

export interface VisitStats {
  appId: string;
  day: string;
  todayVisits: number;
  todayUniques: number;
  totalVisits: number;
  totalUniques: number;
}

const readErrorMessage = async (res: Response, fallback: string): Promise<string> => {
  try {
    const data = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) {
      return data.message.join(', ');
    }
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }
  } catch {
    // ignore parse failure, fall through to fallback
  }
  return fallback;
};

export interface SubmitInquiryInput {
  category: InquiryCategory;
  title: string;
  body: string;
  authorName?: string;
  contactEmail?: string;
}

/** 문의 등록(공개, 10/min/IP). 허니팟 website는 항상 빈 값으로 보낸다. */
export const submitInquiry = async (input: SubmitInquiryInput): Promise<Inquiry> => {
  const res = await fetch(`${DESK_BASE}/api/v1/apps/${DESK_APP_ID}/inquiries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      category: input.category,
      title: input.title.trim(),
      body: input.body.trim(),
      authorName: input.authorName?.trim() || undefined,
      contactEmail: input.contactEmail?.trim() || undefined,
      originUrl: typeof location !== 'undefined' ? location.href : undefined,
      website: '',
    }),
  });
  if (!res.ok) {
    throw new Error(
      await readErrorMessage(res, '문의 등록에 실패했어요. 잠시 후 다시 시도해 주세요.'),
    );
  }
  return (await res.json()) as Inquiry;
};

/** 공개 문의 목록(최신순, 60/min/IP). limit 1~50로 클램프. */
export const listInquiries = async (limit = 20, offset = 0): Promise<InquiryList> => {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  const safeOffset = Math.max(Math.trunc(offset), 0);
  const res = await fetch(
    `${DESK_BASE}/api/v1/apps/${DESK_APP_ID}/inquiries?limit=${safeLimit}&offset=${safeOffset}`,
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, '문의 목록을 불러오지 못했어요.'));
  }
  return (await res.json()) as InquiryList;
};

const VISIT_FLAG_KEY = 'picky_desk_visited';

/** 방문 핑(공개). 브라우저당 1회만 newVisitor=true로 고유 방문자 집계. */
export const pingVisit = async (): Promise<void> => {
  let newVisitor = false;
  try {
    if (typeof localStorage !== 'undefined' && !localStorage.getItem(VISIT_FLAG_KEY)) {
      newVisitor = true;
      localStorage.setItem(VISIT_FLAG_KEY, new Date().toISOString());
    }
  } catch {
    // localStorage 접근 불가(시크릿 등) — 일반 방문으로만 집계
  }
  try {
    await fetch(`${DESK_BASE}/api/v1/apps/${DESK_APP_ID}/visits/ping`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ newVisitor }),
      keepalive: true,
    });
  } catch {
    // 집계 실패는 조용히 무시(핵심 기능 아님)
  }
};

/** 방문 집계 조회(공개). */
export const getVisitStats = async (): Promise<VisitStats> => {
  const res = await fetch(`${DESK_BASE}/api/v1/apps/${DESK_APP_ID}/visits/stats`);
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, '방문 통계를 불러오지 못했어요.'));
  }
  return (await res.json()) as VisitStats;
};
