import { Button, Top } from '@toss/tds-mobile';

// 스캐폴드 검증용 임시 화면. 다음 단계에서 라우터 + 포팅된 페이지로 교체돼요.
export function App() {
  return (
    <>
      <Top
        title={<Top.TitleParagraph size={22}>픽플로우</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={17}>고민을 투표로 빠르게 결정</Top.SubtitleParagraph>
        }
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24 }}>
        <Button style={{ width: '100%' }}>앱인토스 포팅 준비 완료</Button>
      </div>
    </>
  );
}
