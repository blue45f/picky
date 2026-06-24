import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

/**
 * 이용약관 / 개인정보처리방침 — 에이치준랩스 사업자 정보 + pickflow 실제 운영 기준으로 작성.
 * (수집 항목·localStorage 사용·Vercel/Neon 처리위탁·토스 익명 식별키 등 실제 데이터 흐름 반영)
 * 법령·서비스 변경 시 갱신한다.
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
    heading: '제7조 (회원·비회원 이용 및 탈퇴)',
    body: [
      '서비스는 비회원으로도 투표 생성·참여가 가능하며, 회원은 작성한 고민을 모아볼 수 있습니다.',
      '이용자는 언제든지 이용을 중단할 수 있고, 회원은 탈퇴를 요청할 수 있습니다. 탈퇴 시 관련 법령이 정한 경우를 제외하고 개인정보를 지체 없이 파기합니다.',
    ],
  },
  {
    heading: '제8조 (준거법 및 분쟁해결)',
    body: ['본 약관은 대한민국 법령에 따라 해석되며, 분쟁은 관할 법원에 제소합니다.'],
  },
  {
    heading: '부칙',
    body: [`본 약관은 ${BUSINESS.startDate}부터 시행합니다.`],
  },
];

const PRIVACY: Section[] = [
  {
    heading: '1. 수집하는 개인정보 항목 및 목적',
    body: [
      '회원: 이메일, 비밀번호(단방향 암호화 저장), 닉네임 — 계정 식별·로그인·서비스 제공.',
      '비회원: 닉네임 — 투표·의견 작성자 표시. (이메일·비밀번호 없이 이용 가능)',
      '투표·의견 작성 시: 선택한 옵션, 작성자 표시명(선택), 한마디 코멘트(선택).',
      '토스 미니앱 이용 시: 토스가 제공하는 익명 식별키(해시값) — 서버 인증서 없이 동일 사용자 식별 목적. 실명·연락처는 수집하지 않습니다.',
      '자동 수집: 서비스 동작을 위해 브라우저 로컬 저장소(localStorage)에 로그인 토큰, 투표 기록, 최근 본 고민, 고정 목록, 화면 테마, 작성 임시저장이 저장됩니다.',
    ],
  },
  {
    heading: '2. 개인정보의 보유 및 이용기간',
    body: [
      '회원 탈퇴 또는 수집·이용 목적 달성 시 지체 없이 파기합니다.',
      '관련 법령에서 보존을 요구하는 경우 해당 기간 동안 보관합니다.',
      '로컬 저장소에 저장된 항목은 이용자가 브라우저에서 직접 삭제할 수 있습니다.',
    ],
  },
  {
    heading: '3. 처리위탁 및 제3자 제공',
    body: [
      '회사는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다.',
      '안정적 서비스 운영을 위해 다음에 처리를 위탁합니다 — 호스팅·배포: Vercel, 데이터베이스: Neon(아시아·태평양 리전). 토스 미니앱 환경에서는 비바리퍼블리카(토스)의 인증/공유 기능을 이용합니다.',
    ],
  },
  {
    heading: '4. 정보주체의 권리 및 행사 방법',
    body: [
      '이용자는 언제든지 개인정보 열람·정정·삭제·처리정지를 요구할 수 있습니다.',
      '요청은 아래 사업자 정보의 사업장 소재지를 통해 접수하며, 회사는 지체 없이 조치합니다.',
    ],
  },
  {
    heading: '5. 안전성 확보 조치',
    body: [
      '전송 구간 암호화(HTTPS), 비밀번호 단방향 암호화 저장, 데이터베이스 접근 권한 관리 등 합리적인 보호조치를 시행합니다.',
    ],
  },
  {
    heading: '6. 개인정보 보호책임자 및 개정',
    body: [
      `개인정보 보호책임자: ${BUSINESS.owner} (${BUSINESS.name}).`,
      '본 방침은 법령·서비스 변경에 따라 개정될 수 있으며, 변경 시 시행일과 함께 서비스 화면에 공지합니다.',
    ],
  },
];

export const LegalPage: React.FC = () => {
  const { doc } = useParams<{ doc: string }>();
  const isPrivacy = doc === 'privacy';
  const title = isPrivacy ? '개인정보처리방침' : '이용약관';
  const sections = isPrivacy ? PRIVACY : TERMS;
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
    </div>
  );
};

export default LegalPage;
