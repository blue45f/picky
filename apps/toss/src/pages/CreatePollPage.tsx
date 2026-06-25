import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import {
  CreatePollSchema,
  DEADLINE_PRESETS,
  POLL_CATEGORIES,
  POLL_LIMITS,
  RESULTS_VISIBILITY_LABELS,
  resolveDeadlinePresetEndsAt,
  VISIBILITY_OPTIONS,
  type CreatePollInput,
  type DeadlinePreset,
  type Poll,
  type PollResultsVisibility,
  type PollVisibility,
} from '../shared';
import { usePollStore } from '../store/usePollStore';
import { useAuthStore } from '../store/useAuthStore';
import { useIdentity } from '../store/useIdentity';
import { theme, stickyActionBar, FONT } from '../theme';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../lib/format';
import { fileToDownscaledDataUrl, isUsableImageUrl } from '../lib/image';
import { getStableUserKey, hapticFeedback } from '../lib/toss';
import { trackCreatePoll } from '../lib/analytics';
import { copyText } from '../lib/pollShare';
import { evaluatePollReadiness } from '../lib/pollReadiness';
import { AppBar, Chip, SegmentedControl } from '../components/ui';
import { BannerAd } from '../components/BannerAd';

// 입력 한도는 @picky/shared POLL_LIMITS 단일 소스를 쓴다(CreatePollSchema 와 동일 수치).
const MAX_OPTIONS = POLL_LIMITS.OPTIONS_MAX;
const MIN_OPTIONS = POLL_LIMITS.OPTIONS_MIN;
const QUESTION_MAX = POLL_LIMITS.QUESTION_MAX;
const DESC_MAX = POLL_LIMITS.DESC_MAX;
const OPTION_MAX = POLL_LIMITS.OPTION_TEXT_MAX;
const DEADLINE_BUFFER_MS = 60_000;

interface OptionDraft {
  id: string;
  text: string;
  imageUrl: string | null;
}

const emptyOption = (): OptionDraft => ({
  id: `opt-${globalThis.crypto.randomUUID()}`,
  text: '',
  imageUrl: null,
});

// 마감 프리셋·공개 범위 옵션은 web/toss 공통 상수(@picky/shared)에서 가져와 양 앱이 같은 문구를 쓴다.
// 라벨은 web/toss 공통 상수에서 가져와 양 앱이 같은 문구를 쓰도록 한다.
const RESULT_OPTIONS = [
  { value: 'afterVote', label: RESULTS_VISIBILITY_LABELS.afterVote.short },
  { value: 'always', label: RESULTS_VISIBILITY_LABELS.always.short },
] as const satisfies ReadonlyArray<{ value: PollResultsVisibility; label: string }>;

const fieldStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 48,
  background: 'rgba(255,255,255,0.02)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: `1px solid ${theme.border}`,
  borderRadius: 12,
  color: theme.text,
  padding: '12px 14px',
  // iOS는 16px 미만 입력 포커스 시 화면을 강제 확대해요 → 16px 플로어로 줌 방지.
  fontSize: 16,
  outline: 'none',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
};

const squareBtnStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 48,
  minHeight: 48,
  border: 'none',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.04)',
  cursor: 'pointer',
  fontSize: 16,
};

const labelRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  margin: '20px 0 8px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: theme.textMuted,
};

const counterStyle: React.CSSProperties = {
  fontSize: 13,
  color: theme.textFaint,
};

function AdvancedSettings(
  props: Readonly<{
    deadlinePreset: DeadlinePreset;
    deadlinePreview: string | null;
    isDeadlinePast: boolean;
    customDeadline: string;
    minCustom: string;
    resultsVisibility: PollResultsVisibility;
    visibility: PollVisibility;
    accessCode: string;
    onSelectPreset: (value: DeadlinePreset) => void;
    onCustomDeadlineChange: (value: string) => void;
    onResultsVisibilityChange: (value: PollResultsVisibility) => void;
    onVisibilityChange: (value: PollVisibility) => void;
    onAccessCodeChange: (value: string) => void;
  }>,
) {
  const {
    deadlinePreset,
    deadlinePreview,
    isDeadlinePast,
    customDeadline,
    minCustom,
    resultsVisibility,
    visibility,
    accessCode,
    onSelectPreset,
    onCustomDeadlineChange,
    onResultsVisibilityChange,
    onVisibilityChange,
    onAccessCodeChange,
  } = props;
  return (
    <>
      <div style={{ ...labelRowStyle, marginTop: 0 }}>
        <span style={labelStyle}>언제 마감할까요? ⏰</span>
        {deadlinePreview ? (
          <Chip tone={isDeadlinePast ? 'danger' : 'gold'}>
            {isDeadlinePast ? '⚠ 지난 시각이에요' : `~ ${deadlinePreview}`}
          </Chip>
        ) : null}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {DEADLINE_PRESETS.map((preset) => {
          const active = preset.value === deadlinePreset;
          return (
            <button
              key={preset.value}
              type="button"
              className="pressable"
              aria-pressed={active}
              onClick={() => onSelectPreset(preset.value)}
              style={{
                minHeight: 44,
                padding: '8px 16px',
                borderRadius: theme.radiusPill,
                border: `1px solid ${active ? 'rgba(19,194,163,0.3)' : 'rgba(255,255,255,0.04)'}`,
                background: active ? theme.accentSoft : 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                color: active ? theme.accent : theme.textMuted,
                fontSize: FONT.small,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.01)',
              }}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      {deadlinePreset === 'custom' ? (
        <input
          type="datetime-local"
          value={customDeadline}
          min={minCustom}
          onChange={(e) => onCustomDeadlineChange(e.target.value)}
          style={{ ...fieldStyle, marginTop: 10, colorScheme: 'dark' }}
          aria-label="마감 시간 직접 선택"
        />
      ) : null}

      <span style={{ ...labelStyle, display: 'block', margin: '24px 0 8px' }}>
        결과는 언제 보여줄까요? 👀
      </span>
      <SegmentedControl
        ariaLabel="결과 공개 시점"
        options={RESULT_OPTIONS}
        value={resultsVisibility}
        onChange={onResultsVisibilityChange}
      />
      <p style={{ fontSize: 13, color: theme.textFaint, marginTop: 8, marginLeft: 2 }}>
        투표 후 바로 확인하거나 언제든 공개할 수 있어요
      </p>

      <span style={{ ...labelStyle, display: 'block', margin: '24px 0 8px' }}>
        누가 참여할 수 있나요? 🔐
      </span>
      <SegmentedControl
        ariaLabel="공개 범위"
        options={VISIBILITY_OPTIONS}
        value={visibility}
        onChange={onVisibilityChange}
      />
      <p style={{ fontSize: 13, color: theme.textFaint, marginTop: 8, marginLeft: 2 }}>
        {visibility === 'public'
          ? '목록에 노출되고 누구나 참여할 수 있어요'
          : visibility === 'unlisted'
            ? '목록엔 안 보이고, 링크를 받은 사람만 참여해요'
            : '접근 코드를 아는 사람만 참여할 수 있어요'}
      </p>
      {visibility === 'private' ? (
        <input
          type="text"
          value={accessCode}
          onChange={(e) => onAccessCodeChange(e.target.value)}
          placeholder="접근 코드 (4~20자)"
          maxLength={20}
          style={{ ...fieldStyle, marginTop: 10 }}
          aria-label="비공개 투표 접근 코드"
        />
      ) : null}
    </>
  );
}

function Step1Form(
  props: Readonly<{
    question: string;
    description: string;
    categoryId: string | null;
    advancedOpen: boolean;
    advancedSettings: React.ReactNode;
    onQuestionChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onToggleCategory: (id: string) => void;
    onToggleAdvanced: () => void;
  }>,
) {
  const {
    question,
    description,
    categoryId,
    advancedOpen,
    advancedSettings,
    onQuestionChange,
    onDescriptionChange,
    onToggleCategory,
    onToggleAdvanced,
  } = props;
  return (
    <div className="rise" key="step1">
      <p
        style={{
          fontSize: 14,
          color: theme.textMuted,
          lineHeight: 1.5,
          margin: '16px 0 4px',
        }}
      >
        먼저 <strong style={{ color: theme.text }}>고민거리</strong>만 적어주세요. 선택지는 다음
        단계에서 채워요 🥑
      </p>
      <div style={labelRowStyle}>
        <label style={labelStyle} htmlFor="poll-question">
          풀고 싶은 고민 💬
        </label>
        <span style={counterStyle}>
          {question.length}/{QUESTION_MAX}
        </span>
      </div>
      <input
        id="poll-question"
        style={fieldStyle}
        value={question}
        maxLength={QUESTION_MAX}
        placeholder="어떤 까다로운 고민이 있으신가요? 🤔"
        onChange={(e) => onQuestionChange(e.target.value)}
      />

      <div style={labelRowStyle}>
        <label style={labelStyle} htmlFor="poll-desc">
          상세 설명 💡
        </label>
        <span style={counterStyle}>
          {description.length}/{DESC_MAX}
        </span>
      </div>
      <textarea
        id="poll-desc"
        style={{ ...fieldStyle, minHeight: 120, resize: 'vertical' }}
        value={description}
        maxLength={DESC_MAX}
        placeholder="친구들이 더 잘 고를 수 있게 힌트를 주세요! (선택) 💡"
        onChange={(e) => onDescriptionChange(e.target.value)}
      />

      <span style={{ ...labelStyle, margin: '20px 0 8px' }}>어떤 고민인가요? 🏷️ (선택)</span>
      <fieldset
        aria-label="고민 카테고리 선택"
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          padding: 0,
          paddingBottom: 4,
          margin: 0,
          minWidth: 0,
          border: 0,
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {POLL_CATEGORIES.map((category) => {
          const active = categoryId === category.id;
          return (
            <button
              key={category.id}
              type="button"
              className="pressable"
              aria-pressed={active}
              onClick={() => onToggleCategory(category.id)}
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                minHeight: 44,
                padding: '8px 16px',
                borderRadius: theme.radiusPill,
                border: `1px solid ${active ? category.color : 'rgba(255,255,255,0.04)'}`,
                background: active ? `${category.color}26` : 'rgba(255,255,255,0.02)',
                color: active ? category.color : theme.textMuted,
                fontSize: FONT.small,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <span aria-hidden>{category.emoji}</span>
              {category.label}
            </button>
          );
        })}
      </fieldset>

      {/* 접이식 고급 옵션 — 마감/결과공개를 1단계에서 미리 정해 단계 왕복을 줄여요 */}
      <button
        type="button"
        className="pressable"
        aria-expanded={advancedOpen}
        onClick={onToggleAdvanced}
        style={{
          width: '100%',
          marginTop: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '14px 16px',
          borderRadius: theme.radiusSm,
          border: `1px solid ${theme.border}`,
          background: 'rgba(255,255,255,0.02)',
          color: theme.text,
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span>⚙️ 마감·결과 공개 설정</span>
          <span style={{ fontSize: FONT.small, fontWeight: 600, color: theme.textFaint }}>
            {advancedOpen ? '' : '(선택)'}
          </span>
        </span>
        <span
          aria-hidden
          style={{
            fontSize: 13,
            color: theme.textMuted,
            transition: 'transform 0.25s ease',
            transform: advancedOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▾
        </span>
      </button>
      <div
        className="disclosure-enter"
        style={{
          maxHeight: advancedOpen ? 520 : 0,
          opacity: advancedOpen ? 1 : 0,
          overflow: 'hidden',
          marginTop: advancedOpen ? 16 : 0,
        }}
      >
        {advancedSettings}
      </div>
    </div>
  );
}

function OptionImageEditor(
  props: Readonly<{
    index: number;
    imageUrl: string | null;
    linkDraft: string;
    onImageFile: (index: number, file: File) => void;
    onLinkDraftChange: (index: number, value: string) => void;
    onApplyLink: (index: number) => void;
    onClearImage: (index: number) => void;
  }>,
) {
  const { index, imageUrl, linkDraft, onImageFile, onLinkDraftChange, onApplyLink, onClearImage } =
    props;
  return (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        background: theme.surfaceAlt,
        borderRadius: 12,
        border: `1px solid rgba(255,255,255,0.04)`,
      }}
    >
      {imageUrl ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src={imageUrl}
            alt=""
            style={{
              width: 52,
              height: 52,
              objectFit: 'cover',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
          <span style={{ flex: 1, fontSize: FONT.small, color: theme.textMuted }}>
            사진 추가됨 🖼️
          </span>
          <button
            type="button"
            className="pressable"
            aria-label="추가한 사진 삭제"
            onClick={() => onClearImage(index)}
            style={{
              minHeight: 44,
              background: 'none',
              border: 'none',
              color: theme.danger,
              fontSize: FONT.small,
              fontWeight: 700,
              cursor: 'pointer',
              padding: '0 8px',
            }}
          >
            삭제
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          <label
            className="pressable"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              minHeight: 44,
              padding: '10px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.05)',
              color: theme.text,
              fontWeight: 700,
              fontSize: FONT.body,
              cursor: 'pointer',
            }}
          >
            <span>📷 사진 올리기</span>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onImageFile(index, file);
                }
                e.target.value = '';
              }}
            />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{
                ...fieldStyle,
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid rgba(255,255,255,0.04)`,
              }}
              value={linkDraft}
              placeholder="또는 이미지 인터넷 주소(URL)"
              inputMode="url"
              aria-label={`선택지 ${index + 1} 이미지 링크`}
              onChange={(e) => onLinkDraftChange(index, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onApplyLink(index);
                }
              }}
            />
            <button
              type="button"
              className="pressable"
              onClick={() => onApplyLink(index)}
              style={{
                flexShrink: 0,
                minHeight: 48,
                padding: '0 16px',
                borderRadius: 10,
                background: theme.accentSoft,
                color: theme.accent,
                fontWeight: 700,
                fontSize: FONT.body,
                border: `1px solid rgba(19,194,163,0.2)`,
                cursor: 'pointer',
              }}
            >
              추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OptionCard(
  props: Readonly<{
    option: OptionDraft;
    index: number;
    editorOpen: boolean;
    canRemove: boolean;
    linkDraft: string;
    onTextChange: (index: number, value: string) => void;
    onToggleEditor: (index: number) => void;
    onRemove: (index: number) => void;
    onImageFile: (index: number, file: File) => void;
    onLinkDraftChange: (index: number, value: string) => void;
    onApplyLink: (index: number) => void;
    onClearImage: (index: number) => void;
  }>,
) {
  const {
    option,
    index,
    editorOpen,
    canRemove,
    linkDraft,
    onTextChange,
    onToggleEditor,
    onRemove,
    onImageFile,
    onLinkDraftChange,
    onApplyLink,
    onClearImage,
  } = props;
  return (
    <div
      style={{
        background: theme.surface,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: `1px solid ${theme.border}`,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)',
        padding: 14,
        borderRadius: theme.radiusSm,
      }}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{
            ...fieldStyle,
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid rgba(255,255,255,0.04)`,
          }}
          value={option.text}
          maxLength={OPTION_MAX}
          placeholder={`선택지 ${index + 1} ✏️`}
          aria-label={`선택지 ${index + 1}`}
          onChange={(e) => onTextChange(index, e.target.value)}
        />
        <button
          type="button"
          className="pressable"
          aria-label={`선택지 ${index + 1} 사진`}
          aria-pressed={editorOpen}
          onClick={() => onToggleEditor(index)}
          style={{
            ...squareBtnStyle,
            color: option.imageUrl ? theme.accent : theme.textMuted,
            border: `1px solid rgba(255,255,255,0.05)`,
          }}
        >
          📷
        </button>
        {canRemove ? (
          <button
            type="button"
            className="pressable"
            aria-label={`선택지 ${index + 1} 삭제`}
            onClick={() => onRemove(index)}
            style={{
              ...squareBtnStyle,
              color: theme.textMuted,
              border: `1px solid rgba(255,255,255,0.05)`,
            }}
          >
            ✕
          </button>
        ) : null}
      </div>

      {editorOpen && (
        <OptionImageEditor
          index={index}
          imageUrl={option.imageUrl}
          linkDraft={linkDraft}
          onImageFile={onImageFile}
          onLinkDraftChange={onLinkDraftChange}
          onApplyLink={onApplyLink}
          onClearImage={onClearImage}
        />
      )}
    </div>
  );
}

/**
 * 참가 준비도 카드 — 질문/선택지/배경설명을 점검해 안내만 해요(제출은 막지 않음).
 * 점수에 따라 색만 바뀌고, 항목별 통과 여부와 짧은 도움말을 보여줘요.
 */
function ReadinessCard(
  props: Readonly<{ question: string; description: string; options: OptionDraft[] }>,
) {
  const { question, description, options } = props;
  const readiness = useMemo(
    () =>
      evaluatePollReadiness({
        question,
        description,
        optionTexts: options.map((option) => option.text),
      }),
    [question, description, options],
  );

  let scoreColor: string = theme.success;
  if (readiness.score < 60) {
    scoreColor = theme.danger;
  } else if (readiness.score < 80) {
    scoreColor = theme.gold;
  }

  return (
    <section
      aria-label="참가 준비도"
      style={{
        marginTop: 22,
        padding: 16,
        borderRadius: theme.radiusSm,
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${theme.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <span style={{ fontSize: FONT.small, fontWeight: 800, color: theme.text }}>
          📋 참가 준비도
        </span>
        <span style={{ fontSize: 18, fontWeight: 900, color: scoreColor }}>{readiness.score}%</span>
      </div>
      <p style={{ margin: 0, fontSize: FONT.small, color: theme.textFaint, lineHeight: 1.5 }}>
        공유 전 응답 부담을 낮추는 점검이에요. 통과하지 않아도 그대로 올릴 수 있어요 🙂
      </p>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {readiness.items.map((item) => (
          <li
            key={item.label}
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              padding: '10px 12px',
              borderRadius: 12,
              background: item.passed ? theme.accentSoft : theme.goldSoft,
            }}
          >
            <span aria-hidden style={{ flexShrink: 0, fontSize: 14, lineHeight: 1.4 }}>
              {item.passed ? '✅' : '💡'}
            </span>
            <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: item.passed ? theme.accent : theme.gold,
                }}
              >
                {item.label}
              </span>
              <span style={{ fontSize: FONT.small, color: theme.textMuted, lineHeight: 1.45 }}>
                {item.help}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Step2Form(
  props: Readonly<{
    question: string;
    description: string;
    options: OptionDraft[];
    filledOptionCount: number;
    openImageIndex: number | null;
    linkDrafts: Record<number, string>;
    deadlineSummary: string;
    onQuestionChange: (value: string) => void;
    onTextChange: (index: number, value: string) => void;
    onToggleEditor: (index: number) => void;
    onRemove: (index: number) => void;
    onImageFile: (index: number, file: File) => void;
    onLinkDraftChange: (index: number, value: string) => void;
    onApplyLink: (index: number) => void;
    onClearImage: (index: number) => void;
    onAddOption: () => void;
    onEditAdvanced: () => void;
  }>,
) {
  const {
    question,
    description,
    options,
    filledOptionCount,
    openImageIndex,
    linkDrafts,
    deadlineSummary,
    onQuestionChange,
    onTextChange,
    onToggleEditor,
    onRemove,
    onImageFile,
    onLinkDraftChange,
    onApplyLink,
    onClearImage,
    onAddOption,
    onEditAdvanced,
  } = props;
  return (
    <div className="rise" key="step2">
      <p
        style={{
          fontSize: 14,
          color: theme.textMuted,
          lineHeight: 1.5,
          margin: '16px 0 12px',
        }}
      >
        친구들이 고를 <strong style={{ color: theme.text }}>선택지</strong>를 채워주세요. 사진을
        곁들이면 더 즐거워요 📷
      </p>

      <div style={labelRowStyle}>
        <label style={labelStyle} htmlFor="poll-question-2">
          고민 다시 보기 💬
        </label>
        <span style={counterStyle}>
          {question.length}/{QUESTION_MAX}
        </span>
      </div>
      <input
        id="poll-question-2"
        style={fieldStyle}
        value={question}
        maxLength={QUESTION_MAX}
        placeholder="어떤 까다로운 고민이 있으신가요? 🤔"
        aria-label="고민 질문 수정"
        onChange={(e) => onQuestionChange(e.target.value)}
      />

      <div style={labelRowStyle}>
        <span style={labelStyle}>투표지 만들기 🎨</span>
        <span style={counterStyle}>
          {filledOptionCount} / 최소 {MIN_OPTIONS}개
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {options.map((opt, index) => (
          <OptionCard
            key={opt.id}
            option={opt}
            index={index}
            editorOpen={openImageIndex === index || Boolean(opt.imageUrl)}
            canRemove={options.length > MIN_OPTIONS}
            linkDraft={linkDrafts[index] ?? ''}
            onTextChange={onTextChange}
            onToggleEditor={onToggleEditor}
            onRemove={onRemove}
            onImageFile={onImageFile}
            onLinkDraftChange={onLinkDraftChange}
            onApplyLink={onApplyLink}
            onClearImage={onClearImage}
          />
        ))}
      </div>

      {options.length < MAX_OPTIONS ? (
        <button
          type="button"
          className="pressable"
          onClick={onAddOption}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 16,
            border: `1.5px dashed ${theme.border}`,
            background: 'rgba(255,255,255,0.01)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: theme.accent,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            marginTop: 10,
          }}
        >
          + 선택지 추가하기 ✏️
        </button>
      ) : null}

      <ReadinessCard question={question} description={description} options={options} />

      {/* 1단계에서 고급 옵션을 건드리지 않았을 때만, 2단계에서도 빠르게 펼칠 수 있게 안내 */}
      <button
        type="button"
        className="pressable"
        onClick={onEditAdvanced}
        style={{
          width: '100%',
          marginTop: 18,
          padding: '12px 16px',
          borderRadius: theme.radiusSm,
          border: `1px solid ${theme.border}`,
          background: 'rgba(255,255,255,0.02)',
          color: theme.textMuted,
          fontSize: FONT.small,
          fontWeight: 700,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        ⚙️ 마감·결과 공개 <span style={{ color: theme.accent }}>{deadlineSummary}</span>{' '}
        <span style={{ color: theme.textFaint, fontWeight: 600 }}>· 바꾸기</span>
      </button>
    </div>
  );
}

function SubmitBar(
  props: Readonly<{
    step: 1 | 2;
    question: string;
    canSubmit: boolean;
    canCreate: boolean;
    isLoading: boolean;
    onNext: () => void;
    onPrev: () => void;
    onSubmit: () => void;
  }>,
) {
  const { step, question, canSubmit, canCreate, isLoading, onNext, onPrev, onSubmit } = props;
  return (
    <div style={stickyActionBar}>
      {/* 외곽 stickyActionBar는 pointerEvents:none(투명 페이드가 뒤 콘텐츠 탭/스크롤을 막지 않게).
          버튼이 실제로 눌리려면 내부 래퍼에서 pointerEvents:auto로 복원해야 해요(목록/상세와 동일 패턴). */}
      <div
        style={{ maxWidth: 520, margin: '0 auto', display: 'flex', gap: 10, pointerEvents: 'auto' }}
      >
        {step === 1 ? (
          <Button
            style={{
              width: '100%',
              borderRadius: 16,
              boxShadow: '0 8px 24px rgba(19, 194, 163, 0.25)',
            }}
            disabled={question.trim().length < 2}
            onClick={onNext}
          >
            다음 단계로 ➔
          </Button>
        ) : (
          <>
            <Button variant="weak" style={{ flex: 1, borderRadius: 16 }} onClick={onPrev}>
              이전 단계 👈
            </Button>
            <Button
              style={{
                flex: 2,
                borderRadius: 16,
                boxShadow: '0 8px 24px rgba(19, 194, 163, 0.25)',
              }}
              loading={isLoading}
              disabled={!canSubmit || !canCreate || isLoading}
              onClick={onSubmit}
            >
              친구들에게 물어보기! 🚀
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * 비공개 고민 생성 직후 화면 — 작성자가 방금 정한 접근 코드를 공유 전에 확인/복사하게 한다.
 * 서버는 접근 코드를 돌려주지 않으므로 화면을 떠나기 전에 한 번 노출해야 한다(web과 동일 동선).
 */
function CreatedPrivateScreen(
  props: Readonly<{
    accessCode: string;
    copied: boolean;
    onCopy: () => void;
    onGoToPoll: () => void;
    onGoToList: () => void;
  }>,
) {
  const { accessCode, copied, onCopy, onGoToPoll, onGoToList } = props;
  return (
    <div style={{ minHeight: '100dvh' }}>
      <AppBar title="비공개 고민 완성! 🔒" onBack={onGoToList} />
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '8px 20px 40px' }}>
        <div className="rise" style={{ textAlign: 'center', padding: '20px 0 8px' }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>🔒</div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: theme.text, margin: '0 0 8px' }}>
            비공개 고민이 만들어졌어요
          </h1>
          <p style={{ fontSize: FONT.small, color: theme.textMuted, lineHeight: 1.55, margin: 0 }}>
            아래 <strong style={{ color: theme.text }}>접근 코드</strong>를 아는 사람만 참여할 수
            있어요. 링크와 함께 코드를 꼭 전달해 주세요. 코드는 다시 표시되지 않으니 지금 복사해
            두는 게 좋아요.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            marginTop: 18,
            padding: '14px 16px',
            borderRadius: theme.radiusSm,
            border: `1px solid ${theme.accent}`,
            background: theme.accentSoft,
          }}
        >
          <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: theme.textMuted }}>접근 코드</span>
            <strong
              style={{
                fontSize: 20,
                fontWeight: 900,
                letterSpacing: '0.12em',
                color: theme.accent,
                wordBreak: 'break-all',
              }}
            >
              {accessCode}
            </strong>
          </div>
          <Button variant="weak" onClick={onCopy} aria-label="접근 코드 복사">
            {copied ? '복사됨 ✅' : '복사 📋'}
          </Button>
        </div>
        {copied ? (
          <p
            role="status"
            style={{ margin: '10px 2px 0', fontSize: FONT.small, color: theme.accent }}
          >
            접근 코드를 복사했어요. 참여자에게 링크와 함께 전달해 주세요.
          </p>
        ) : null}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <Button variant="weak" style={{ flex: 1, borderRadius: 16 }} onClick={onGoToList}>
            목록으로
          </Button>
          <Button style={{ flex: 2, borderRadius: 16 }} onClick={onGoToPoll}>
            공유하러 가기 🚀
          </Button>
        </div>

        {/*
          작성 완료 화면 하단 배너 — 핵심 액션(코드 복사·공유·이동) 아래의 자연스러운
          마무리 지점이라 흐름을 가리지 않아요(정책: ATF·핵심 액션 가림 금지).
        */}
        <BannerAd format="banner" gap={4} />
      </div>
    </div>
  );
}

/**
 * 작성 로그인 게이트 화면 — 토스 SSO(식별 로그인)가 아직 안 잡혔거나 게스트 세션일 때만 보여요.
 * 토스는 보통 진입 시 자동 SSO라 거의 안 뜨지만, 식별 실패(네트워크 등) 시 '고아 고민'·작성 401을
 * 막기 위한 방어 화면이에요. 웹 CreatePoll 게이트와 같은 정책(로그인 회원만 작성)을 토스 톤으로 맞춰요.
 * 토스엔 별도 로그인 페이지가 없어 SSO 재시도 버튼으로 식별을 다시 잡아요(투표·댓글은 게이트와 무관).
 */
function CreateLoginGate(
  props: Readonly<{
    isGuest: boolean;
    retrying: boolean;
    onRetry: () => void;
    onBack: () => void;
  }>,
) {
  const { isGuest, retrying, onRetry, onBack } = props;
  return (
    <div style={{ minHeight: '100dvh' }}>
      <AppBar title="로그인이 필요해요 🔒" onBack={onBack} />
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '8px 20px 40px' }}>
        <div className="rise" style={{ textAlign: 'center', padding: '24px 0 8px' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }} aria-hidden>
            🔒
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: theme.text, margin: '0 0 10px' }}>
            로그인하고 고민을 올려보세요 🥑
          </h2>
          <p style={{ fontSize: FONT.body, color: theme.textMuted, lineHeight: 1.6, margin: 0 }}>
            고민(투표) <strong style={{ color: theme.text }}>작성·수정·삭제</strong>는 토스로
            로그인한 뒤에 할 수 있어요. 내가 올린 고민을 계정에 모아 안전하게 관리할 수 있어요.
            {isGuest ? ' 지금은 임시(게스트) 상태라, 토스 로그인 후 작성할 수 있어요.' : ''}
          </p>
          <p
            style={{
              fontSize: FONT.small,
              color: theme.textFaint,
              lineHeight: 1.55,
              marginTop: 12,
            }}
          >
            투표와 한마디(댓글)는 로그인 없이도 자유롭게 참여할 수 있어요.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
          <Button
            style={{
              width: '100%',
              borderRadius: 16,
              boxShadow: '0 8px 24px rgba(19, 194, 163, 0.25)',
            }}
            loading={retrying}
            disabled={retrying}
            onClick={onRetry}
          >
            토스로 로그인하고 작성하기 🚀
          </Button>
          <Button variant="weak" style={{ width: '100%', borderRadius: 16 }} onClick={onBack}>
            목록으로 돌아가기 🔙
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CreatePollPage() {
  const navigate = useNavigate();
  const { createPoll, isLoading } = usePollStore();
  // 하이브리드 정체성 정책(웹 CreatePoll 게이트와 정렬): 작성은 실로그인(토스 SSO) 회원만 통과.
  // 토스는 진입 시 자동 SSO라 보통 user+token 이 있지만, 식별 실패/게스트면 방어적으로 작성을 막아요.
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setDisplayName = useIdentity((state) => state.setDisplayName);
  const displayName = useIdentity((state) => state.displayName);
  const canCreate = Boolean(user) && Boolean(token) && !user?.isGuest;
  const [retryingLogin, setRetryingLogin] = useState(false);

  // 토스 SSO 식별 재시도 — useIdentity.init 은 1회 가드라, 여기선 같은 SSO 경로(loginWithToss)를
  // 직접 다시 태워 토큰을 잡아요. 실패 시 토스 로그인(appLogin) 교환을 보조로 시도해요.
  const retryLogin = async () => {
    if (retryingLogin) {
      return;
    }
    setRetryingLogin(true);
    try {
      const userKey = await getStableUserKey();
      let ok = false;
      if (userKey) {
        ok = await useAuthStore.getState().loginWithToss(userKey, displayName || undefined);
      }
      if (!ok) {
        const result = await useAuthStore.getState().loginWithTossAccount();
        ok = result.ok;
      }
      if (ok) {
        const profile = useAuthStore.getState().user;
        if (profile?.nickname && !displayName) {
          setDisplayName(profile.nickname);
        }
        hapticFeedback('success');
      } else {
        hapticFeedback('error');
      }
    } catch {
      hapticFeedback('error');
    } finally {
      setRetryingLogin(false);
    }
  };

  const [step, setStep] = useState<1 | 2>(1);
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [options, setOptions] = useState<OptionDraft[]>(() => [emptyOption(), emptyOption()]);
  const [openImageIndex, setOpenImageIndex] = useState<number | null>(null);
  const [linkDrafts, setLinkDrafts] = useState<Record<number, string>>({});
  const [resultsVisibility, setResultsVisibility] = useState<PollResultsVisibility>('afterVote');
  const [visibility, setVisibility] = useState<PollVisibility>('public');
  const [accessCode, setAccessCode] = useState('');
  const [deadlinePreset, setDeadlinePreset] = useState<DeadlinePreset>('none');
  const [customDeadline, setCustomDeadline] = useState('');
  const [endsAtIso, setEndsAtIso] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 비공개 생성 직후 접근 코드 노출용(서버는 코드를 돌려주지 않으므로 화면에서 한 번 보여준다).
  const [createdPrivatePoll, setCreatedPrivatePoll] = useState<{
    poll: Poll;
    accessCode: string;
  } | null>(null);
  const [accessCodeCopied, setAccessCodeCopied] = useState(false);

  const minCustom = useMemo(() => toDateTimeLocalValue(new Date(Date.now() + 5 * 60_000)), []);

  const filledOptions = options.filter((opt) => opt.text.trim().length > 0);
  const canSubmit = question.trim().length >= 2 && filledOptions.length >= MIN_OPTIONS;

  const selectDeadlinePreset = (value: DeadlinePreset) => {
    setDeadlinePreset(value);
    if (value === 'custom') {
      setEndsAtIso(fromDateTimeLocalValue(customDeadline));
    } else {
      // none → null, 그 외 → 지금 + ms 의 ISO. ms→ISO 환산은 @picky/shared 단일 소스를 쓴다.
      setEndsAtIso(resolveDeadlinePresetEndsAt(value));
    }
  };

  const handleCustomDeadlineChange = (value: string) => {
    setCustomDeadline(value);
    setEndsAtIso(fromDateTimeLocalValue(value));
  };

  const isDeadlinePast =
    endsAtIso != null && new Date(endsAtIso).getTime() <= Date.now() + DEADLINE_BUFFER_MS;

  const deadlinePreview = useMemo(() => {
    if (!endsAtIso) return null;
    return new Date(endsAtIso).toLocaleString('ko-KR', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [endsAtIso]);

  const updateOptionText = (index: number, value: string) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? { ...opt, text: value } : opt)));
  };
  const setOptionImage = (index: number, imageUrl: string | null) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? { ...opt, imageUrl } : opt)));
  };
  const addOption = () => {
    setOptions((prev) => (prev.length < MAX_OPTIONS ? [...prev, emptyOption()] : prev));
    hapticFeedback('tickWeak');
  };
  const removeOption = (index: number) =>
    setOptions((prev) => (prev.length > MIN_OPTIONS ? prev.filter((_, i) => i !== index) : prev));

  const handleImageFile = async (index: number, file: File) => {
    setError(null);
    try {
      const dataUrl = await fileToDownscaledDataUrl(file);
      setOptionImage(index, dataUrl);
      hapticFeedback('tickWeak');
    } catch (err) {
      hapticFeedback('error');
      setError(err instanceof Error ? err.message : '이미지를 처리하지 못했어요 😢');
    }
  };

  const applyImageLink = (index: number) => {
    const draft = (linkDrafts[index] ?? '').trim();
    if (!draft) {
      return;
    }
    if (!isUsableImageUrl(draft)) {
      hapticFeedback('error');
      setError('올바른 이미지 링크(URL)가 아니에요 😢');
      return;
    }
    setError(null);
    setOptionImage(index, draft);
    setLinkDrafts((prev) => ({ ...prev, [index]: '' }));
    hapticFeedback('tickWeak');
  };

  const handleSubmit = async () => {
    // 진행 중이면 재진입 차단(폼 더블 제출 방지). 스토어에도 중복 가드가 있어 이중 안전망.
    if (isLoading) return;
    setError(null);

    // 방어적 인증 가드 — 버튼은 비활성이지만, 제출 직전 세션이 풀렸을 수도 있어 한 번 더 확인해요.
    if (!canCreate) {
      hapticFeedback('error');
      setError('작성하려면 토스 로그인이 필요해요. 잠시 후 다시 시도해 주세요 🔒');
      return;
    }

    if (deadlinePreset !== 'none') {
      if (!endsAtIso) {
        hapticFeedback('error');
        setError('마감 시간을 선택하거나 "없음"으로 바꿔 주세요 ⏰');
        return;
      }
      if (new Date(endsAtIso).getTime() <= Date.now() + DEADLINE_BUFFER_MS) {
        hapticFeedback('error');
        setError('마감 시간은 현재보다 최소 1분 이후로 선택해 주세요 ⏰');
        return;
      }
    }

    const trimmedAccessCode = visibility === 'private' ? accessCode.trim() : '';

    const candidate = {
      question: question.trim(),
      description: description.trim() || null,
      categoryId,
      resultsVisibility,
      visibility,
      accessCode: visibility === 'private' ? trimmedAccessCode : null,
      endsAt: endsAtIso,
      options: filledOptions.map((opt) => ({
        text: opt.text.trim(),
        imageUrl: opt.imageUrl || null,
      })),
    };

    const parsed = CreatePollSchema.safeParse(candidate);
    if (!parsed.success) {
      hapticFeedback('error');
      setError(parsed.error.issues[0]?.message ?? '입력값을 다시 한 번 확인해 주세요 🧐');
      return;
    }

    const created = await createPoll(parsed.data as CreatePollInput);
    if (created) {
      // 토스 Analytics: 고민 작성 완료. 식별값 없이 공개 범위만(public/unlisted/private).
      trackCreatePoll(visibility);
      hapticFeedback('success');
      // 비공개 폴은 곧장 이동하지 않고 접근 코드를 한 번 노출해 작성자가 복사·전달하게 한다(web과 동일).
      if (visibility === 'private' && trimmedAccessCode) {
        setAccessCodeCopied(false);
        setCreatedPrivatePoll({ poll: created, accessCode: trimmedAccessCode });
        return;
      }
      navigate(`/poll/${created.id}`, { replace: true });
    } else {
      hapticFeedback('error');
      // 작성 실패가 인증 문제(401 → 세션 만료/재인증 필요, 또는 403 → 게스트 거부)면 그 메시지를
      // 그대로 보여줘 원인을 분명히 해요. needsReauth 가 켜지면 canCreate=false 가 되어 다음 렌더에서
      // 로그인 게이트로 자연히 돌아가요(스토어 invalidateSession 가 토큰/유저를 비워요).
      const authState = useAuthStore.getState();
      const storeError = usePollStore.getState().error;
      if (authState.needsReauth) {
        setError(
          storeError ?? '로그인 세션이 만료됐어요. 토스 로그인을 다시 진행한 뒤 작성해 주세요 🔒',
        );
      } else {
        setError(storeError ?? '고민을 만들지 못했어요. 잠시 후 다시 시도해 주세요 😢');
      }
    }
  };

  const handleCopyAccessCode = async () => {
    if (!createdPrivatePoll) {
      return;
    }
    const ok = await copyText(createdPrivatePoll.accessCode);
    setAccessCodeCopied(ok);
    hapticFeedback(ok ? 'success' : 'error');
  };

  const goToCreatedPoll = () => {
    if (!createdPrivatePoll) {
      return;
    }
    const pollId = createdPrivatePoll.poll.id;
    setCreatedPrivatePoll(null);
    navigate(`/poll/${pollId}`, { replace: true });
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      navigate(-1);
    }
  };

  // 양 앱 공통 상수에서 라벨을 가져온다(작성 셀렉터와 동일 문구).
  const resultVisibilityLabel =
    resultsVisibility === 'always'
      ? RESULTS_VISIBILITY_LABELS.always.short
      : RESULTS_VISIBILITY_LABELS.afterVote.short;
  const deadlineSummary = endsAtIso ? `~ ${deadlinePreview}` : resultVisibilityLabel;

  const toggleCategory = (id: string) => {
    hapticFeedback('tickWeak');
    setCategoryId((prev) => (prev === id ? null : id));
  };
  const toggleAdvanced = () => {
    hapticFeedback('tickWeak');
    setAdvancedOpen((prev) => !prev);
  };
  const toggleImageEditor = (index: number) =>
    setOpenImageIndex((prev) => (prev === index ? null : index));
  const changeLinkDraft = (index: number, value: string) =>
    setLinkDrafts((prev) => ({ ...prev, [index]: value }));
  const editAdvancedFromStep2 = () => {
    hapticFeedback('tickWeak');
    setStep(1);
    setAdvancedOpen(true);
  };
  const goNext = () => {
    hapticFeedback('tap');
    setStep(2);
  };
  const goPrev = () => {
    hapticFeedback('tap');
    setStep(1);
  };

  // 작성 로그인 게이트 — 미인증/게스트면 폼 대신 로그인 유도 화면을 보여줘요(작성만 막고 둘러보긴 가능).
  if (!canCreate) {
    return (
      <CreateLoginGate
        isGuest={Boolean(user?.isGuest)}
        retrying={retryingLogin}
        onRetry={() => void retryLogin()}
        onBack={() => navigate('/')}
      />
    );
  }

  if (createdPrivatePoll) {
    return (
      <CreatedPrivateScreen
        accessCode={createdPrivatePoll.accessCode}
        copied={accessCodeCopied}
        onCopy={() => void handleCopyAccessCode()}
        onGoToPoll={goToCreatedPoll}
        onGoToList={() => {
          setCreatedPrivatePoll(null);
          navigate('/', { replace: true });
        }}
      />
    );
  }

  const advancedSettings = (
    <AdvancedSettings
      deadlinePreset={deadlinePreset}
      deadlinePreview={deadlinePreview}
      isDeadlinePast={isDeadlinePast}
      customDeadline={customDeadline}
      minCustom={minCustom}
      resultsVisibility={resultsVisibility}
      visibility={visibility}
      accessCode={accessCode}
      onSelectPreset={selectDeadlinePreset}
      onCustomDeadlineChange={handleCustomDeadlineChange}
      onResultsVisibilityChange={setResultsVisibility}
      onVisibilityChange={setVisibility}
      onAccessCodeChange={setAccessCode}
    />
  );

  return (
    <div style={{ minHeight: '100dvh' }}>
      <AppBar
        title={step === 1 ? '무엇이 고민이에요? 💬 (1/2)' : '선택지를 채워요 🎨 (2/2)'}
        onBack={handleBack}
      />

      {/* 슬림 게이지 라인 */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
        <div
          style={{
            height: '100%',
            width: step === 1 ? '50%' : '100%',
            background: theme.accent,
            transition: 'width 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px 140px' }}>
        {step === 1 ? (
          <Step1Form
            question={question}
            description={description}
            categoryId={categoryId}
            advancedOpen={advancedOpen}
            advancedSettings={advancedSettings}
            onQuestionChange={setQuestion}
            onDescriptionChange={setDescription}
            onToggleCategory={toggleCategory}
            onToggleAdvanced={toggleAdvanced}
          />
        ) : (
          <Step2Form
            question={question}
            description={description}
            options={options}
            filledOptionCount={filledOptions.length}
            openImageIndex={openImageIndex}
            linkDrafts={linkDrafts}
            deadlineSummary={deadlineSummary}
            onQuestionChange={setQuestion}
            onTextChange={updateOptionText}
            onToggleEditor={toggleImageEditor}
            onRemove={removeOption}
            onImageFile={(index, file) => void handleImageFile(index, file)}
            onLinkDraftChange={changeLinkDraft}
            onApplyLink={applyImageLink}
            onClearImage={(index) => setOptionImage(index, null)}
            onAddOption={addOption}
            onEditAdvanced={editAdvancedFromStep2}
          />
        )}

        {error ? (
          <p style={{ color: theme.danger, fontSize: 13, marginTop: 16 }} role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <SubmitBar
        step={step}
        question={question}
        canSubmit={canSubmit}
        canCreate={canCreate}
        isLoading={isLoading}
        onNext={goNext}
        onPrev={goPrev}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
