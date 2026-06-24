import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

/**
 * 이용약관 / 개인정보처리방침 — 사업자등록증(에이치준랩스) 정보를 반영한 기본 문서.
 * ⚠️ 표준 보일러플레이트라 실제 운영 정책(보유기간·제3자 제공·위탁 등)에 맞게 검토·보완이 필요해요.
 */

const BUSINESS = {
  name: '에이치준랩스',
  owner: '김희준',
  regNo: '355-07-03473',
  address: '서울특별시 송파구 가락로34길 13, 101호',
  category: '정보통신업 · 응용 소프트웨어 개발 및 공급업',
  startDate: '2026년 6월 22일',
  service: 'pickflow(픽플로우)',
};

type Section = { heading: string; body: string[] };

const TERMS: Section[] = [
  {
    heading: '제1조 (목적)',
    body: [
      `본 약관은 ${BUSINESS.name}(이하 "회사")가 제공하는 ${BUSINESS.service} 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.`,
    ],
  },
  {
    heading: '제2조 (약관의 효력 및 변경)',
    body: [
      '본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.',
      '회사는 관련 법령을 위배하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 적용일자와 사유를 명시하여 사전 공지합니다.',
    ],
  },
  {
    heading: '제3조 (서비스의 제공 및 변경)',
    body: [
      '회사는 고민을 선택지 투표로 만들고 링크·코드·QR로 공유해 의견을 모으는 기능을 제공합니다.',
      '운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.',
    ],
  },
  {
    heading: '제4조 (이용자의 의무)',
    body: [
      '이용자는 타인의 권리를 침해하거나 법령·공서양속에 반하는 게시물을 등록해서는 안 됩니다.',
      '서비스의 정상적인 운영을 방해하는 행위를 해서는 안 됩니다.',
    ],
  },
  {
    heading: '제5조 (게시물의 관리)',
    body: [
      '회사는 이용자가 등록한 게시물이 관련 법령 또는 본 약관에 위반된다고 판단되는 경우 사전 통지 없이 삭제·이동할 수 있습니다.',
    ],
  },
  {
    heading: '제6조 (책임의 제한)',
    body: [
      '회사는 무료로 제공되는 서비스 이용과 관련하여 관련 법령에 특별한 규정이 없는 한 책임을 지지 않습니다.',
      '이용자가 게시한 정보·자료의 신뢰성·정확성에 대한 책임은 해당 이용자에게 있습니다.',
    ],
  },
  {
    heading: '제7조 (준거법 및 분쟁해결)',
    body: ['본 약관은 대한민국 법령에 따라 해석되며, 분쟁은 관할 법원에 제소합니다.'],
  },
];

const PRIVACY: Section[] = [
  {
    heading: '1. 수집하는 개인정보 항목 및 목적',
    body: [
      '회원가입·서비스 이용 시: 이메일, 닉네임(회원), 비회원 닉네임 — 본인 식별, 투표·의견 작성 표시, 서비스 제공 목적.',
      '서비스 이용 과정에서 기기·브라우저의 로컬 저장소에 투표 기록·임시 작성 내용이 저장될 수 있습니다.',
    ],
  },
  {
    heading: '2. 개인정보의 보유 및 이용기간',
    body: [
      '회원 탈퇴 시 또는 수집·이용 목적 달성 시 지체 없이 파기합니다.',
      '관련 법령에서 보존을 요구하는 경우 해당 기간 동안 보관합니다.',
    ],
  },
  {
    heading: '3. 제3자 제공 및 처리위탁',
    body: [
      '회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.',
      '서비스 운영을 위한 인프라(호스팅·데이터베이스) 이용 시 관련 법령에 따라 안전하게 관리합니다.',
    ],
  },
  {
    heading: '4. 이용자의 권리',
    body: [
      '이용자는 언제든지 자신의 개인정보 열람·정정·삭제·처리정지를 요구할 수 있습니다.',
      '문의는 아래 사업자 정보의 연락 수단을 통해 접수합니다.',
    ],
  },
  {
    heading: '5. 개인정보 보호책임자',
    body: [`개인정보 보호책임자: ${BUSINESS.owner} (${BUSINESS.name})`],
  },
];

export const LegalPage: React.FC = () => {
  const { doc } = useParams<{ doc: string }>();
  const isPrivacy = doc === 'privacy';
  const title = isPrivacy ? '개인정보처리방침' : '이용약관';
  const sections = isPrivacy ? PRIVACY : TERMS;
  useDocumentTitle(title);

  return (
    <main className="page-shell" style={{ display: 'grid', gap: '1.2rem', maxWidth: '760px' }}>
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
          시행일: {BUSINESS.startDate} · {BUSINESS.service}
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
            {section.body.map((line, index) => (
              <p
                key={index}
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
        <p style={{ margin: 0 }}>상호: {BUSINESS.name}</p>
        <p style={{ margin: 0 }}>대표자: {BUSINESS.owner}</p>
        <p style={{ margin: 0 }}>사업자등록번호: {BUSINESS.regNo}</p>
        <p style={{ margin: 0 }}>사업장 소재지: {BUSINESS.address}</p>
        <p style={{ margin: 0 }}>업태/종목: {BUSINESS.category}</p>
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
    </main>
  );
};

export default LegalPage;
