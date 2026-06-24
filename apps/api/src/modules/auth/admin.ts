/**
 * 운영자(어드민) 계정 판별 유틸.
 *
 * 어드민은 코드가 아니라 `ADMIN_EMAILS` 환경변수(콤마 구분)로 지정한다.
 * 미설정 시 포트폴리오 소유자 계정을 기본 어드민으로 둔다.
 * 이메일 비교는 소문자 trim 정규화 후 정확히 일치하는지로만 판단한다.
 */
const DEFAULT_ADMIN_EMAILS = ['blue45f@gmail.com'];

const normalizeEmail = (value: unknown): string =>
  (typeof value === 'string' ? value : '').trim().toLowerCase();

export const getAdminEmails = (): string[] => {
  const raw = process.env.ADMIN_EMAILS?.trim();
  if (!raw) {
    return DEFAULT_ADMIN_EMAILS;
  }

  const parsed = raw
    .split(',')
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);

  return parsed.length > 0 ? parsed : DEFAULT_ADMIN_EMAILS;
};

export const isAdminEmail = (email: unknown): boolean => {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return false;
  }
  return getAdminEmails().includes(normalized);
};
