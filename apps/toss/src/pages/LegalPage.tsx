import { useNavigate, useParams } from 'react-router-dom';
import { LEGAL_BUSINESS, LEGAL_DOCS, type LegalDocKind } from '../shared';
import { theme, pageShell, FONT } from '../theme';
import { AppBar, SegmentedControl } from '../components/ui';

const cardStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  padding: '14px 16px',
  borderRadius: theme.radiusSm,
  border: `1px solid ${theme.border}`,
  background: theme.surface,
};

/**
 * 이용약관 / 개인정보처리방침 — 웹(/legal/:doc)과 동일한 공유 콘텐츠(@picky/shared legal)를
 * 토스 셸(AppBar + 다크 테마)로 렌더링해요. 갱신은 packages/shared/src/legal.ts 단일 소스에서.
 */
export function LegalPage() {
  const navigate = useNavigate();
  const { doc } = useParams<{ doc: string }>();
  const kind: LegalDocKind = doc === 'privacy' ? 'privacy' : 'terms';
  const { title, sections } = LEGAL_DOCS[kind];

  return (
    <div>
      <AppBar title={title} onBack={() => navigate(-1)} />
      <div style={{ ...pageShell, display: 'grid', gap: 14, paddingBottom: 48 }}>
        <SegmentedControl
          ariaLabel="문서 선택"
          value={kind}
          onChange={(next) => navigate(`/legal/${next}`, { replace: true })}
          options={[
            { value: 'terms', label: '이용약관' },
            { value: 'privacy', label: '개인정보처리방침' },
          ]}
        />

        <p style={{ margin: 0, color: theme.textMuted, fontSize: FONT.small }}>
          시행일: {LEGAL_BUSINESS.startDate} · {LEGAL_BUSINESS.service}
        </p>

        {sections.map((section) => (
          <article key={section.heading} style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: FONT.bodyLg, fontWeight: 800, color: theme.text }}>
              {section.heading}
            </h2>
            {section.body.map((line) => (
              <p
                key={`${section.heading}::${line}`}
                style={{
                  margin: 0,
                  fontSize: FONT.body,
                  lineHeight: 1.6,
                  color: theme.textMuted,
                }}
              >
                {line}
              </p>
            ))}
          </article>
        ))}

        <section style={cardStyle} aria-label="사업자 정보">
          <h2 style={{ margin: 0, fontSize: FONT.bodyLg, fontWeight: 800, color: theme.text }}>
            사업자 정보
          </h2>
          {[
            `상호: ${LEGAL_BUSINESS.name}`,
            `대표자: ${LEGAL_BUSINESS.owner}`,
            `사업자등록번호: ${LEGAL_BUSINESS.regNo}`,
            `사업장 소재지: ${LEGAL_BUSINESS.address}`,
            `업태/종목: ${LEGAL_BUSINESS.category}`,
          ].map((line) => (
            <p key={line} style={{ margin: 0, fontSize: FONT.body, color: theme.textMuted }}>
              {line}
            </p>
          ))}
        </section>
      </div>
    </div>
  );
}
