import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import {
  CreatePollSchema,
  POLL_CATEGORIES,
  type CreatePollInput,
  type PollResultsVisibility,
  type PollVisibility,
} from '../shared';
import { usePollStore } from '../store/usePollStore';
import { theme, stickyActionBar } from '../theme';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../lib/format';
import { fileToDownscaledDataUrl, isUsableImageUrl } from '../lib/image';
import { hapticFeedback } from '../lib/toss';
import { evaluatePollReadiness } from '../lib/pollReadiness';
import { AppBar, Chip, SegmentedControl } from '../components/ui';

const MAX_OPTIONS = 10;
const MIN_OPTIONS = 2;
const QUESTION_MAX = 100;
const DESC_MAX = 500;
const OPTION_MAX = 60;
const DEADLINE_BUFFER_MS = 60_000;

type DeadlinePreset = 'none' | '6h' | '1d' | '3d' | '1w' | 'custom';

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

const DEADLINE_PRESETS = [
  { value: 'none', label: '마감 없음 🌈', ms: 0 },
  { value: '6h', label: '6시간 ⏰', ms: 6 * 3_600_000 },
  { value: '1d', label: '1일 📅', ms: 24 * 3_600_000 },
  { value: '3d', label: '3일 ⌛️', ms: 3 * 24 * 3_600_000 },
  { value: '1w', label: '1주 🗓️', ms: 7 * 24 * 3_600_000 },
  { value: 'custom', label: '직접 선택 ✏️', ms: -1 },
] as const satisfies ReadonlyArray<{ value: DeadlinePreset; label: string; ms: number }>;

const RESULT_OPTIONS = [
  { value: 'afterVote', label: '투표하고 보기 🗳️' },
  { value: 'always', label: '항상 공개 👀' },
] as const satisfies ReadonlyArray<{ value: PollResultsVisibility; label: string }>;

const VISIBILITY_OPTIONS = [
  { value: 'public', label: '공개 🌍' },
  { value: 'unlisted', label: '링크전용 🔗' },
  { value: 'private', label: '비공개 🔒' },
] as const satisfies ReadonlyArray<{ value: PollVisibility; label: string }>;

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.02)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: `1px solid ${theme.border}`,
  borderRadius: 12,
  color: theme.text,
  padding: '12px 14px',
  fontSize: 15,
  outline: 'none',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
};

const squareBtnStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 44,
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
                minHeight: 40,
                padding: '8px 16px',
                borderRadius: theme.radiusPill,
                border: `1px solid ${active ? 'rgba(19,194,163,0.3)' : 'rgba(255,255,255,0.04)'}`,
                background: active ? theme.accentSoft : 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                color: active ? theme.accent : theme.textMuted,
                fontSize: 13.5,
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
                minHeight: 40,
                padding: '8px 16px',
                borderRadius: theme.radiusPill,
                border: `1px solid ${active ? category.color : 'rgba(255,255,255,0.04)'}`,
                background: active ? `${category.color}26` : 'rgba(255,255,255,0.02)',
                color: active ? category.color : theme.textMuted,
                fontSize: 13.5,
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
          <span style={{ fontSize: 12.5, fontWeight: 600, color: theme.textFaint }}>
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
          <span style={{ flex: 1, fontSize: 13, color: theme.textMuted }}>사진 추가됨 🖼️</span>
          <button
            type="button"
            className="pressable"
            onClick={() => onClearImage(index)}
            style={{
              background: 'none',
              border: 'none',
              color: theme.danger,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
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
              padding: '10px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.05)',
              color: theme.text,
              fontWeight: 700,
              fontSize: 13,
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
                fontSize: 13,
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
                padding: '0 14px',
                borderRadius: 10,
                background: theme.accentSoft,
                color: theme.accent,
                fontWeight: 700,
                fontSize: 13,
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
        <span style={{ fontSize: 13.5, fontWeight: 800, color: theme.text }}>📋 참가 준비도</span>
        <span style={{ fontSize: 18, fontWeight: 900, color: scoreColor }}>{readiness.score}%</span>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: theme.textFaint, lineHeight: 1.5 }}>
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
              <span style={{ fontSize: 12.5, color: theme.textMuted, lineHeight: 1.45 }}>
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
          fontSize: 13.5,
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
    isLoading: boolean;
    onNext: () => void;
    onPrev: () => void;
    onSubmit: () => void;
  }>,
) {
  const { step, question, canSubmit, isLoading, onNext, onPrev, onSubmit } = props;
  return (
    <div style={stickyActionBar}>
      <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', gap: 10 }}>
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
              disabled={!canSubmit}
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

export function CreatePollPage() {
  const navigate = useNavigate();
  const { createPoll, isLoading } = usePollStore();

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

  const minCustom = useMemo(() => toDateTimeLocalValue(new Date(Date.now() + 5 * 60_000)), []);

  const filledOptions = options.filter((opt) => opt.text.trim().length > 0);
  const canSubmit = question.trim().length >= 2 && filledOptions.length >= MIN_OPTIONS;

  const selectDeadlinePreset = (value: DeadlinePreset) => {
    setDeadlinePreset(value);
    if (value === 'none') {
      setEndsAtIso(null);
    } else if (value === 'custom') {
      setEndsAtIso(fromDateTimeLocalValue(customDeadline));
    } else {
      const preset = DEADLINE_PRESETS.find((item) => item.value === value);
      setEndsAtIso(preset && preset.ms > 0 ? new Date(Date.now() + preset.ms).toISOString() : null);
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
    setError(null);

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

    const candidate = {
      question: question.trim(),
      description: description.trim() || null,
      categoryId,
      resultsVisibility,
      visibility,
      accessCode: visibility === 'private' ? accessCode.trim() : null,
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
      hapticFeedback('success');
      navigate(`/poll/${created.id}`, { replace: true });
    } else {
      hapticFeedback('error');
      setError('고민을 만들지 못했어요. 잠시 후 다시 시도해 주세요 😢');
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      navigate(-1);
    }
  };

  const resultVisibilityLabel = resultsVisibility === 'always' ? '항상 공개' : '투표하고 보기';
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
        isLoading={isLoading}
        onNext={goNext}
        onPrev={goPrev}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
