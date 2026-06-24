import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LifeBuoy, MessageSquarePlus, RefreshCw, Send } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
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

const CATEGORY_TONES: Record<InquiryCategory, string> = {
  feedback: 'var(--brand-accent-teal)',
  bug: 'var(--brand-accent-gold)',
  usage: 'var(--brand-primary-light)',
  partnership: 'var(--brand-accent-teal)',
};

const STATUS_LABELS: Record<string, string> = {
  new: '접수',
  in_progress: '처리 중',
  resolved: '해결',
  closed: '종료',
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString([], { year: '2-digit', month: '2-digit', day: '2-digit' });
};

const cardStyle: React.CSSProperties = {
  display: 'grid',
  gap: '0.75rem',
  padding: '1.1rem 1.2rem',
  borderRadius: 'var(--radius-md, 16px)',
  border: '1px solid var(--bg-card-border)',
  background: 'var(--bg-card, rgba(255,255,255,0.02))',
};

export const Support: React.FC = () => {
  useDocumentTitle('고객센터 · 문의');

  const [category, setCategory] = useState<InquiryCategory>('feedback');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState(''); // 허니팟 — 봇만 채움

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const [items, setItems] = useState<Inquiry[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => title.trim().length > 0 && body.trim().length > 0 && !submitting,
    [title, body, submitting],
  );

  const loadList = async () => {
    setListLoading(true);
    setListError(null);
    try {
      const result = await listInquiries(20, 0);
      setItems(result.items);
    } catch (err) {
      setListError(err instanceof Error ? err.message : '문의 목록을 불러오지 못했어요.');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    void loadList();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setDoneMessage(null);

    if (website.trim()) {
      // 허니팟에 값이 있으면 봇 — 조용히 성공 처리(실제 전송 안 함)
      setDoneMessage('문의가 접수되었어요. 감사합니다!');
      return;
    }
    if (!canSubmit) {
      setFormError('제목과 내용을 입력해 주세요.');
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
      setDoneMessage('문의가 접수되었어요. 소중한 의견 감사합니다! 🥑');
      setTitle('');
      setBody('');
      void loadList();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '문의 등록에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={{ display: 'grid', gap: '1.5rem' }}>
      <header style={{ display: 'grid', gap: '0.4rem' }}>
        <h1
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '1.5rem',
            fontWeight: 800,
          }}
        >
          <LifeBuoy size={22} aria-hidden="true" /> 고객센터
        </h1>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          버그 제보·기능 제안·사용 문의를 남겨주세요. 남겨주신 의견은 공개 게시판에 등록되며,
          연락처는 운영자에게만 전달돼요.
        </p>
      </header>

      <form onSubmit={handleSubmit} style={cardStyle} aria-label="문의 등록">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
          <MessageSquarePlus size={18} aria-hidden="true" /> 문의 남기기
        </h2>

        <label style={{ display: 'grid', gap: '0.3rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>분류</span>
          <select
            className="form-input"
            value={category}
            onChange={(event) => setCategory(event.target.value as InquiryCategory)}
          >
            {INQUIRY_CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: '0.3rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>제목</span>
          <input
            className="form-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="무엇을 도와드릴까요?"
            required
          />
        </label>

        <label style={{ display: 'grid', gap: '0.3rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>내용</span>
          <textarea
            className="form-input"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={4000}
            rows={5}
            placeholder="상황을 자세히 적어주시면 더 빠르게 도와드릴 수 있어요."
            required
          />
        </label>

        <div
          style={{
            display: 'grid',
            gap: '0.75rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          }}
        >
          <label style={{ display: 'grid', gap: '0.3rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>이름 (선택)</span>
            <input
              className="form-input"
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
              maxLength={80}
              placeholder="닉네임"
            />
          </label>
          <label style={{ display: 'grid', gap: '0.3rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              연락 이메일 (선택, 비공개)
            </span>
            <input
              className="form-input"
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              placeholder="회신 받을 이메일"
            />
          </label>
        </div>

        {/* 허니팟: 사람에겐 숨김, 봇만 채움 */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        />

        {formError && (
          <p role="alert" style={{ color: 'var(--brand-accent-gold)', fontSize: '0.9rem' }}>
            {formError}
          </p>
        )}
        {doneMessage && (
          <p role="status" style={{ color: 'var(--brand-accent-teal)', fontSize: '0.9rem' }}>
            {doneMessage}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          <Send size={16} aria-hidden="true" /> {submitting ? '보내는 중…' : '문의 보내기'}
        </button>
      </form>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontWeight: 700 }}>최근 문의</h2>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => void loadList()}
            aria-label="문의 목록 새로고침"
          >
            <RefreshCw size={15} aria-hidden="true" /> 새로고침
          </button>
        </div>

        {listLoading && <div className="skeleton" style={{ height: 80 }} />}
        {listError && (
          <p role="alert" style={{ color: 'var(--brand-accent-gold)' }}>
            {listError}
          </p>
        )}
        {!listLoading && !listError && items.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>
            아직 등록된 문의가 없어요. 첫 문의를 남겨보세요!
          </p>
        )}

        {items.map((inquiry) => (
          <article key={inquiry.id} style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: 999,
                  color: CATEGORY_TONES[inquiry.category],
                  border: `1px solid ${CATEGORY_TONES[inquiry.category]}`,
                }}
              >
                {CATEGORY_LABELS[inquiry.category] ?? inquiry.category}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {STATUS_LABELS[inquiry.status] ?? inquiry.status}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {formatDate(inquiry.createdAt)}
              </span>
            </div>
            <h3 style={{ fontWeight: 700 }}>{inquiry.title}</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {inquiry.body}
            </p>
            {inquiry.authorName && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                — {inquiry.authorName}
              </span>
            )}
          </article>
        ))}
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <Link to="/" style={{ color: 'var(--brand-primary-light)' }}>
          ← 홈으로
        </Link>
      </p>
    </section>
  );
};
