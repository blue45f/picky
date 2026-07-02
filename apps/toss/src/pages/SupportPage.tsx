import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import { theme, pageShell, FONT } from '../theme';
import { hapticFeedback } from '../lib/toss';
import { AppBar, SegmentedControl, Skeleton } from '../components/ui';
import { BannerAd } from '../components/BannerAd';
import {
  INQUIRY_CATEGORIES,
  listInquiries,
  submitInquiry,
  type Inquiry,
  type InquiryCategory,
} from '../lib/deskPlatform';

const CATEGORY_LABELS: Record<InquiryCategory, string> = {
  feedback: '의견·제안',
  bug: '버그·오류',
  usage: '사용 문의',
  partnership: '제휴·협업',
};

const STATUS_LABELS: Record<string, string> = {
  new: '접수',
  in_progress: '처리 중',
  resolved: '해결',
  closed: '종료',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 48,
  padding: '12px 14px',
  borderRadius: theme.radiusSm,
  border: `1px solid ${theme.borderStrong}`,
  background: theme.surface,
  color: theme.text,
  // iOS는 16px 미만 입력 포커스 시 화면을 강제 확대해요 → 16px 플로어로 줌 방지.
  fontSize: 16,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  fontSize: FONT.small,
  fontWeight: 700,
  color: theme.textMuted,
};

const cardStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
  padding: '14px 16px',
  borderRadius: theme.radiusSm,
  border: `1px solid ${theme.border}`,
  background: theme.surface,
};

const categoryOptions = INQUIRY_CATEGORIES.map((entry) => ({
  value: entry.value,
  label: entry.label,
}));

export function SupportPage() {
  const navigate = useNavigate();

  const [category, setCategory] = useState<InquiryCategory>('feedback');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState(''); // 허니팟

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const [items, setItems] = useState<Inquiry[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const canSubmit = useMemo(
    () => title.trim().length > 0 && body.trim().length > 0 && !submitting,
    [title, body, submitting],
  );

  const loadList = async () => {
    setListLoading(true);
    try {
      const result = await listInquiries(20, 0);
      setItems(result.items);
    } catch {
      // 목록 로드 실패는 조용히 무시(폼은 계속 사용 가능)
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    void loadList();
  }, []);

  const handleSubmit = async () => {
    setMessage(null);
    if (website.trim()) {
      setMessage({ tone: 'ok', text: '문의가 접수되었어요. 감사합니다!' });
      return;
    }
    if (!canSubmit) {
      setMessage({ tone: 'err', text: '제목과 내용을 입력해 주세요.' });
      return;
    }
    setSubmitting(true);
    try {
      await submitInquiry({
        category,
        title,
        body,
        authorName: authorName || undefined,
        contactEmail: contactEmail || undefined,
      });
      hapticFeedback('success');
      setMessage({ tone: 'ok', text: '문의가 접수되었어요. 소중한 의견 감사합니다! 🥑' });
      setTitle('');
      setBody('');
      void loadList();
    } catch (err) {
      hapticFeedback('error');
      setMessage({
        tone: 'err',
        text: err instanceof Error ? err.message : '문의 등록에 실패했어요.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <AppBar title="고객센터" onBack={() => navigate(-1)} />
      <div style={{ ...pageShell, display: 'grid', gap: 16 }}>
        <p style={{ margin: 0, color: theme.textMuted, fontSize: FONT.body, lineHeight: 1.6 }}>
          버그 제보·기능 제안·문의를 남겨주세요. 공개 게시판에 등록되며, 연락처는 운영자에게만
          전달돼요.
        </p>

        <section style={{ ...cardStyle, gap: 12 }} aria-label="문의 남기기">
          <label style={labelStyle}>
            <span>분류</span>
            <SegmentedControl
              value={category}
              onChange={(value) => setCategory(value as InquiryCategory)}
              options={categoryOptions}
            />
          </label>
          <label style={labelStyle}>
            <span>제목</span>
            <input
              style={inputStyle}
              value={title}
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="무엇을 도와드릴까요?"
            />
          </label>
          <label style={labelStyle}>
            <span>내용</span>
            <textarea
              style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }}
              value={body}
              maxLength={4000}
              onChange={(event) => setBody(event.target.value)}
              placeholder="상황을 자세히 적어주시면 더 빠르게 도와드릴 수 있어요."
            />
          </label>
          <label style={labelStyle}>
            <span>이름 (선택)</span>
            <input
              style={inputStyle}
              value={authorName}
              maxLength={80}
              onChange={(event) => setAuthorName(event.target.value)}
              placeholder="닉네임"
            />
          </label>
          <label style={labelStyle}>
            <span>연락 이메일 (선택, 비공개)</span>
            <input
              style={inputStyle}
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              placeholder="회신 받을 이메일"
            />
          </label>
          <input
            type="text"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
          />

          {message ? (
            <p
              role={message.tone === 'err' ? 'alert' : 'status'}
              style={{
                margin: 0,
                fontSize: FONT.small,
                lineHeight: 1.5,
                color: message.tone === 'err' ? theme.danger : theme.accentStrong,
              }}
            >
              {message.text}
            </p>
          ) : null}

          <Button
            style={{ width: '100%', borderRadius: 16 }}
            loading={submitting}
            onClick={() => void handleSubmit()}
          >
            문의 보내기
          </Button>
        </section>

        <section style={{ display: 'grid', gap: 10 }} aria-label="최근 문의">
          <h2 style={{ margin: 0, fontSize: FONT.subtitle, fontWeight: 800, color: theme.text }}>
            최근 문의
          </h2>
          {listLoading ? (
            <div aria-hidden="true" style={{ display: 'grid', gap: 10 }}>
              {[0, 1].map((key) => (
                <div key={key} style={cardStyle}>
                  <Skeleton width={64} height={18} radius={999} />
                  <Skeleton height={16} radius={6} style={{ marginTop: 6 }} />
                  <Skeleton width="80%" height={14} radius={6} style={{ marginTop: 4 }} />
                </div>
              ))}
            </div>
          ) : null}
          {!listLoading && items.length === 0 ? (
            <p
              style={{
                margin: 0,
                color: theme.textMuted,
                fontSize: FONT.body,
                lineHeight: 1.5,
                padding: '8px 0',
              }}
            >
              아직 등록된 문의가 없어요. 첫 문의를 남겨보세요!
            </p>
          ) : null}
          {items.map((inquiry) => (
            <article key={inquiry.id} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: FONT.caption,
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: theme.radiusPill,
                    color: theme.accentStrong,
                    background: theme.accentSoft,
                  }}
                >
                  {CATEGORY_LABELS[inquiry.category] ?? inquiry.category}
                </span>
                <span style={{ fontSize: FONT.caption, color: theme.textFaint }}>
                  {STATUS_LABELS[inquiry.status] ?? inquiry.status}
                </span>
              </div>
              <strong style={{ fontSize: FONT.bodyLg, fontWeight: 800, color: theme.text }}>
                {inquiry.title}
              </strong>
              <p
                style={{
                  margin: 0,
                  fontSize: FONT.body,
                  color: theme.textMuted,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {inquiry.body}
              </p>
              {inquiry.authorName ? (
                <span style={{ fontSize: FONT.caption, color: theme.textFaint }}>
                  — {inquiry.authorName}
                </span>
              ) : null}
            </article>
          ))}
        </section>

        {/*
          고객센터 하단 배너 — 문의 폼·목록이 끝나는 자연스러운 지점(스크롤 말단)이라
          핵심 액션(문의 보내기)을 가리지 않아요. 이 화면의 유일한 광고 구좌(정책: 화면당 1개).
        */}
        <BannerAd format="banner" gap={4} />
      </div>
    </div>
  );
}
