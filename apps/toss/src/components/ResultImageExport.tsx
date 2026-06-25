/**
 * 결과 이미지 내보내기 — 웹 PollDetail(ResultImagePreviewModal)의 토스 포팅.
 * 1200x630 결과 카드 PNG 생성은 packages/client(buildPollResultImageDataUrl, 순수 Canvas)에서
 * 소비해요(의존성 추가 없음). 여기선 테마/콘텐츠 토글과 미리보기·저장 버튼만 토스 카드로 렌더해요.
 *
 * 저장은 a[download] 앵커(토스 WebView/브라우저 공통)로 PNG를 내려받아요.
 */
import { useMemo, useState } from 'react';
import type { Poll } from '../shared';
import {
  buildPollResultImageDataUrl,
  DEFAULT_RESULT_IMAGE_CONTENT,
  RESULT_IMAGE_THEMES,
  type ResultImageContentKey,
  type ResultImageContentOptions,
  type ResultImageTheme,
} from '../lib/resultImage';
import { theme, FONT } from '../theme';
import { SegmentedControl } from './ui';

type ResultImageExportProps = Readonly<{
  poll: Poll;
  shareUrl: string;
  /** 저장 성공/실패 알림(상위가 토스트·햅틱). */
  onNotify?: (ok: boolean) => void;
}>;

const THEME_OPTIONS: ReadonlyArray<{ value: ResultImageTheme; label: string }> = [
  { value: 'classic', label: '다크' },
  { value: 'light', label: '라이트' },
  { value: 'presentation', label: '발표용' },
];

const CONTENT_OPTIONS: ReadonlyArray<{ value: ResultImageContentKey; label: string }> = [
  { value: 'comment', label: '대표 의견' },
  { value: 'joinCode', label: '참여 코드' },
  { value: 'shareUrl', label: '공유 링크' },
];

/** data URL → 앵커 다운로드(토스 WebView/브라우저 공통). 성공 여부 반환. */
const downloadDataUrl = (dataUrl: string, filename: string): boolean => {
  try {
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return true;
  } catch {
    return false;
  }
};

export function ResultImageExport({ poll, shareUrl, onNotify }: ResultImageExportProps) {
  const [imageTheme, setImageTheme] = useState<ResultImageTheme>('classic');
  const [content, setContent] = useState<ResultImageContentOptions>(DEFAULT_RESULT_IMAGE_CONTENT);

  // 미리보기 data URL — 테마/콘텐츠 토글이 바뀔 때만 다시 그려요(순수 Canvas, DOM 1회).
  const previewUrl = useMemo(() => {
    try {
      return buildPollResultImageDataUrl(poll, shareUrl, imageTheme, content);
    } catch {
      return null;
    }
  }, [poll, shareUrl, imageTheme, content]);

  const toggleContent = (key: ResultImageContentKey) => {
    setContent((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    if (!previewUrl) {
      onNotify?.(false);
      return;
    }
    const ok = downloadDataUrl(previewUrl, `picky-${poll.id}-result.png`);
    onNotify?.(ok);
  };

  return (
    <section
      className="rise"
      aria-label="결과 이미지 내보내기"
      style={{
        marginTop: 16,
        padding: 18,
        borderRadius: theme.radius,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h2
          style={{
            margin: 0,
            fontSize: FONT.subtitle,
            fontWeight: 800,
            color: theme.text,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <span aria-hidden>🖼️</span>
          결과 이미지로 저장
        </h2>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: FONT.small,
            color: theme.textMuted,
            lineHeight: 1.5,
          }}
        >
          한 장으로 정리된 결과 카드를 만들어 카톡·인스타에 바로 공유해요.
        </p>
      </div>

      {/* 미리보기 — 1200x630 비율 */}
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={`${poll.question} 결과 이미지 미리보기`}
          style={{
            width: '100%',
            borderRadius: theme.radiusSm,
            border: `1px solid ${theme.border}`,
            display: 'block',
          }}
        />
      ) : (
        <div
          role="note"
          style={{
            padding: '20px 16px',
            borderRadius: theme.radiusSm,
            border: `1px dashed ${theme.borderStrong}`,
            color: theme.textMuted,
            fontSize: FONT.small,
            textAlign: 'center',
          }}
        >
          이 환경에서는 이미지 미리보기를 만들 수 없어요. 텍스트 공유를 이용해 주세요.
        </div>
      )}

      {/* 테마 선택 */}
      <SegmentedControl
        options={THEME_OPTIONS}
        value={imageTheme}
        onChange={setImageTheme}
        ariaLabel="결과 이미지 테마"
      />

      {/* 콘텐츠 토글 칩 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {CONTENT_OPTIONS.map((option) => {
          const active = content[option.value];
          return (
            <button
              key={option.value}
              type="button"
              className="pressable"
              role="switch"
              aria-checked={active}
              onClick={() => toggleContent(option.value)}
              style={{
                minHeight: 40,
                padding: '8px 14px',
                borderRadius: theme.radiusPill,
                border: `1px solid ${active ? 'rgba(19,194,163,0.4)' : theme.border}`,
                background: active ? theme.accentSoft : 'rgba(255,255,255,0.04)',
                color: active ? theme.accent : theme.textMuted,
                fontSize: FONT.small,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {active ? '✓ ' : ''}
              {option.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="pressable"
        onClick={handleSave}
        disabled={!previewUrl}
        style={{
          minHeight: 48,
          borderRadius: 14,
          border: 'none',
          background: theme.accent,
          color: theme.accentInk,
          fontSize: FONT.bodyLg,
          fontWeight: 800,
          cursor: previewUrl ? 'pointer' : 'default',
          opacity: previewUrl ? 1 : 0.6,
          boxShadow: '0 8px 24px rgba(19, 194, 163, 0.22)',
        }}
      >
        📥 이미지로 저장하기
      </button>
    </section>
  );
}

/** 테마 팔레트 일관성 확인용 — 테스트/디버그에서 사용. */
export const RESULT_IMAGE_THEME_KEYS = Object.keys(RESULT_IMAGE_THEMES) as ResultImageTheme[];
