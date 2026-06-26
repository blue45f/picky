/**
 * 공유 템플릿 — 상황별 공유 문구(카톡/회의/SNS/리마인더)를 한 번에 복사해요.
 * 문구 조립은 @picky/shared(buildSharePresets) 단일 소스에서 가져와요 — web/toss가 같은 4종·같은
 * 문구를 쓰도록 단일화했어요(과거엔 web 3종·toss 3종이 서로 달랐음). 여기선 복사 UI만 렌더해요.
 *
 * 기존 공유 시트(ShareSection) 아래에 덧붙여요 — 링크 공유 흐름은 그대로 보존돼요.
 */
import { useMemo, useState } from 'react';
import type { Poll, SharePresetId } from '../shared';
import { buildSharePresets } from '../shared';
import { theme, FONT } from '../theme';

type ShareTemplatesProps = Readonly<{
  poll: Poll;
  shareUrl: string;
  /** 템플릿 복사(상위가 토스트·햅틱). 미전달 시 카드 자체를 숨겨요(호출부 가드). */
  onCopyText: (text: string) => void;
}>;

/** 프리셋 id 별 강조색(콘텐츠는 shared, 색만 토스 테마). */
const ACCENT: Record<SharePresetId, string> = {
  kakao: theme.gold,
  meeting: theme.accent,
  social: theme.accentStrong,
  reminder: theme.warning,
};

export function ShareTemplates({ poll, shareUrl, onCopyText }: ShareTemplatesProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const templates = useMemo(() => buildSharePresets(poll, shareUrl), [poll, shareUrl]);

  const handleCopy = (id: string, body: string) => {
    onCopyText(body);
    setCopiedId(id);
    globalThis.setTimeout(() => setCopiedId(null), 2200);
  };

  return (
    <section
      aria-label="상황별 공유 문구"
      style={{
        marginTop: 12,
        paddingTop: 14,
        borderTop: `1px solid ${theme.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontSize: FONT.body,
            fontWeight: 800,
            color: theme.text,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span aria-hidden>✍️</span>
          상황별 공유 문구
        </span>
        <span style={{ fontSize: FONT.caption, color: theme.textMuted, lineHeight: 1.5 }}>
          복사해서 카톡·회의·SNS·리마인더에 그대로 붙여 넣으세요.
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {templates.map((template) => {
          const copied = copiedId === template.id;
          const accent = ACCENT[template.id];
          return (
            <div
              key={template.id}
              style={{
                borderRadius: theme.radiusSm,
                border: `1px solid ${copied ? accent : theme.border}`,
                background: copied ? theme.accentSoft : 'rgba(255,255,255,0.03)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span aria-hidden style={{ fontSize: 22, flexShrink: 0 }}>
                {template.emoji}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: FONT.small, fontWeight: 800, color: theme.text }}>
                  {template.label}
                </div>
                <div style={{ fontSize: FONT.caption, color: theme.textMuted, marginTop: 1 }}>
                  {template.hint}
                </div>
              </div>
              <button
                type="button"
                className="pressable"
                aria-label={`${template.label} 공유 문구 복사`}
                onClick={() => handleCopy(template.id, template.body)}
                style={{
                  flexShrink: 0,
                  minHeight: 44,
                  padding: '8px 14px',
                  borderRadius: theme.radiusPill,
                  border: `1px solid ${copied ? accent : theme.borderStrong}`,
                  background: copied ? theme.accentSoft : 'rgba(255,255,255,0.04)',
                  color: copied ? accent : theme.text,
                  fontSize: FONT.small,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {copied ? '복사됨 ✓' : '복사'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
