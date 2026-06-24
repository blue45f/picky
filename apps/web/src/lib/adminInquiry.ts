import { parseApiPayload, requestApi } from './api';

/**
 * 운영자용 문의 관리 — picky 자체 API(`/admin/inquiries`)를 어드민 JWT로 호출한다.
 * desk-platform 어드민 토큰은 picky 서버에만 있고, 브라우저는 picky API만 호출한다.
 */
export type InquiryStatus = 'new' | 'in_progress' | 'resolved' | 'closed';

export interface AdminInquiry {
  id: string;
  appId: string;
  category: string;
  status: InquiryStatus;
  title: string;
  body: string;
  authorName: string | null;
  contactEmail: string | null;
  originUrl: string | null;
  originHost: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminInquiryList {
  appId: string;
  items: AdminInquiry[];
}

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('picky_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchAdminInquiries = async (status?: string): Promise<AdminInquiryList> => {
  const path = status
    ? `/admin/inquiries?status=${encodeURIComponent(status)}`
    : '/admin/inquiries';
  const res = await requestApi(path, { headers: { ...authHeaders() } });
  const data = await parseApiPayload(res);
  if (!res.ok) {
    throw new Error(data?.message || '문의를 불러오지 못했어요.');
  }
  return data as AdminInquiryList;
};

export const updateInquiryStatus = async (
  id: string,
  status: InquiryStatus,
): Promise<AdminInquiry> => {
  const res = await requestApi(`/admin/inquiries/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status }),
  });
  const data = await parseApiPayload(res);
  if (!res.ok) {
    throw new Error(data?.message || '상태 변경에 실패했어요.');
  }
  return data as AdminInquiry;
};
