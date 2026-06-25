/**
 * 공유 템플릿 — 사전 작성된 공유 문구(카카오/회의/리마인더)를 한 번에 복사해요.
 * 카드 콘텐츠(제목/요약/노출 선택지/메타/예상시간)는 @picky/shared(buildSnsPreviewContent)에서
 * 소비하고(로직 중복 0), 여기선 그 콘텐츠로 상황별 템플릿 텍스트를 조립해 복사 UI만 렌더해요.
 *
 * 기존 공유 시트(ShareSection) 아래에 덧붙여요 — 링크 공유 흐름은 그대로 보존돼요.
 */
import { useMemo, useState } from 'react';
import type { Poll } from '../shared';
import { buildSnsPreviewContent } from '../shared';
import { theme, FONT } from '../theme';

type ShareTemplatesProps = Readonly<{
  poll: Poll;
  shareUrl: string;
  /** 템플릿 복사(상위가 토스트·햅틱). 미전달 시 카드 자체를 숨겨요(호출부 가드). */
  onCopyText: (text: string) => void;
}>;

type ShareTemplate = {
  id: 'kakao' | 'meeting' | 'reminder';
  emoji: string;
  label: string;
  hint: string;
  body: string;
};

export function ShareTemplates({ poll, shareUrl, onCopyText }: ShareTemplatesProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const templates = useMemo<ShareTemplate[]>(() => {
    const content = buildSnsPreviewContent({
      question: poll.question,
      description: poll.description,
      options: poll.options.map((option) => option.text),
      imageUrl: poll.options.find((option) => option.imageUrl)?.imageUrl,
    });
    const optionList = content.visibleOptions
      .map((option, index) => `${index + 1}. ${option}`)
      .join('\n');
    const extraLine =
      content.hiddenOptionCount > 0 ? `\n…외 ${content.hiddenOptionCount}개 선택지 더 있어요` : '';

    return [
      {
        id: 'kakao',
        emoji: '💛',
        label: '카카오톡',
        hint: '친구·단톡방에 가볍게',
        body: [
          `${content.title} 🤔`,
          content.summary,
          '',
          optionList + extraLine,
          '',
          `👉 ${content.estimatedSeconds}초면 골라줄 수 있어요: ${shareUrl}`,
        ].join('\n'),
      },
      {
        id: 'meeting',
        emoji: '🧑‍💼',
        label: '회의·업무',
        hint: '동료 의견 모으기',
        body: [
          `[의견 요청] ${content.title}`,
          '',
          '아래 선택지 중 의견 부탁드립니다.',
          optionList + extraLine,
          '',
          `결정 전에 빠르게 표만 모으려 합니다. 참여 링크: ${shareUrl}`,
        ].join('\n'),
      },
      {
        id: 'reminder',
        emoji: '⏰',
        label: '리마인더',
        hint: '마감 전 한 번 더',
        body: [
          `⏰ 아직 안 고르셨다면!`,
          `"${content.title}"`,
          '',
          '한 번만 더 부탁드려요. 금방 끝나요.',
          `${shareUrl}`,
        ].join('\n'),
      },
    ];
  }, [poll, shareUrl]);

  const handleCopy = (template: ShareTemplate) => {
    onCopyText(template.body);
    setCopiedId(template.id);
    globalThis.setTimeout(() => setCopiedId(null), 2200);
  };

  return (
    <section
      aria-label="공유 템플릿"
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
          복사해서 카톡·회의·리마인더에 그대로 붙여 넣으세요.
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {templates.map((template) => (
          <div
            key={template.id}
            style={{
              borderRadius: theme.radiusSm,
              border: `1px solid ${theme.border}`,
              background: 'rgba(255,255,255,0.03)',
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
              onClick={() => handleCopy(template)}
              style={{
                flexShrink: 0,
                minHeight: 40,
                padding: '8px 14px',
                borderRadius: theme.radiusPill,
                border: `1px solid ${theme.borderStrong}`,
                background: copiedId === template.id ? theme.accentSoft : 'rgba(255,255,255,0.04)',
                color: copiedId === template.id ? theme.accent : theme.text,
                fontSize: FONT.small,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {copiedId === template.id ? '복사됨 ✓' : '복사'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
