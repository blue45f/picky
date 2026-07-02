import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { LEGAL_BUSINESS, LEGAL_DOCS } from '@picky/shared';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

/**
 * 이용약관 / 개인정보처리방침 — 본문 콘텐츠는 @picky/shared(legal)로 단일화했어요.
 * (토스 미니앱과 동일한 법적 고지·사업자 정보를 렌더링 — 갱신은 packages/shared/src/legal.ts 에서)
 */
export const LegalPage: React.FC = () => {
  const { doc } = useParams<{ doc: string }>();
  const isPrivacy = doc === 'privacy';
  const { title, sections } = LEGAL_DOCS[isPrivacy ? 'privacy' : 'terms'];
  useDocumentTitle(title);

  return (
    <div className="page-shell" style={{ display: 'grid', gap: '1.2rem', maxWidth: '760px' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link
          to="/legal/terms"
          className={isPrivacy ? 'ghost-btn' : 'btn-primary'}
          style={{ padding: '8px 14px', textDecoration: 'none', fontSize: '0.85rem' }}
        >
          이용약관
        </Link>
        <Link
          to="/legal/privacy"
          className={isPrivacy ? 'btn-primary' : 'ghost-btn'}
          style={{ padding: '8px 14px', textDecoration: 'none', fontSize: '0.85rem' }}
        >
          개인정보처리방침
        </Link>
      </div>

      <header style={{ display: 'grid', gap: '0.4rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900 }}>🥑 {title}</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          시행일: {LEGAL_BUSINESS.startDate} · {LEGAL_BUSINESS.service}
        </p>
      </header>

      <section style={{ display: 'grid', gap: '1rem' }}>
        {sections.map((section) => (
          <article
            key={section.heading}
            className="content-card"
            style={{ padding: '1rem', display: 'grid', gap: '0.4rem' }}
          >
            <h2 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800 }}>{section.heading}</h2>
            {section.body.map((line) => (
              <p
                key={`${section.heading}::${line}`}
                style={{
                  margin: 0,
                  fontSize: '0.86rem',
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)',
                }}
              >
                {line}
              </p>
            ))}
          </article>
        ))}
      </section>

      <section
        className="content-card"
        style={{
          padding: '1rem',
          display: 'grid',
          gap: '0.3rem',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
        }}
        aria-label="사업자 정보"
      >
        <h2 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800 }}>사업자 정보</h2>
        <p style={{ margin: 0 }}>상호: {LEGAL_BUSINESS.name}</p>
        <p style={{ margin: 0 }}>대표자: {LEGAL_BUSINESS.owner}</p>
        <p style={{ margin: 0 }}>사업자등록번호: {LEGAL_BUSINESS.regNo}</p>
        <p style={{ margin: 0 }}>사업장 소재지: {LEGAL_BUSINESS.address}</p>
        <p style={{ margin: 0 }}>업태/종목: {LEGAL_BUSINESS.category}</p>
      </section>

      <Link
        to="/"
        className="ghost-btn"
        style={{
          padding: '10px 16px',
          textDecoration: 'none',
          width: 'fit-content',
          fontSize: '0.85rem',
        }}
      >
        ← 홈으로
      </Link>
    </div>
  );
};

export default LegalPage;
