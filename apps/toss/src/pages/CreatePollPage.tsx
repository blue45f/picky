import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import { CreatePollSchema, type CreatePollInput, type PollResultsVisibility } from '../shared';
import { usePollStore } from '../store/usePollStore';
import { theme, stickyActionBar } from '../theme';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../lib/format';
import { fileToDownscaledDataUrl, isUsableImageUrl } from '../lib/image';
import { hapticFeedback } from '../lib/toss';
import { AppBar, Chip, SegmentedControl } from '../components/ui';

const MAX_OPTIONS = 10;
const MIN_OPTIONS = 2;
const QUESTION_MAX = 100;
const DESC_MAX = 500;
const OPTION_MAX = 60;
// 서버는 마감 시각이 현재보다 최소 1분 이후일 것을 요구해요.
const DEADLINE_BUFFER_MS = 60_000;

type DeadlinePreset = 'none' | '6h' | '1d' | '3d' | '1w' | 'custom';

interface OptionDraft {
  text: string;
  imageUrl: string | null;
}

const emptyOption = (): OptionDraft => ({ text: '', imageUrl: null });

const DEADLINE_PRESETS = [
  { value: 'none', label: '없음', ms: 0 },
  { value: '6h', label: '6시간', ms: 6 * 3600_000 },
  { value: '1d', label: '1일', ms: 24 * 3600_000 },
  { value: '3d', label: '3일', ms: 3 * 24 * 3600_000 },
  { value: '1w', label: '1주', ms: 7 * 24 * 3600_000 },
  { value: 'custom', label: '직접 선택', ms: -1 },
] as const satisfies ReadonlyArray<{ value: DeadlinePreset; label: string; ms: number }>;

const RESULT_OPTIONS = [
  { value: 'afterVote', label: '투표 후 공개' },
  { value: 'always', label: '항상 공개' },
] as const satisfies ReadonlyArray<{ value: PollResultsVisibility; label: string }>;

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: theme.radiusSm,
  color: theme.text,
  padding: '12px 14px',
  fontSize: 15,
  outline: 'none',
};

const squareBtnStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 44,
  border: `1px solid ${theme.border}`,
  borderRadius: theme.radiusSm,
  background: theme.surface,
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
  fontSize: 12,
  color: theme.textFaint,
};

export function CreatePollPage() {
  const navigate = useNavigate();
  const { createPoll, isLoading } = usePollStore();

  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<OptionDraft[]>(() => [emptyOption(), emptyOption()]);
  const [openImageIndex, setOpenImageIndex] = useState<number | null>(null);
  const [linkDrafts, setLinkDrafts] = useState<Record<number, string>>({});
  const [resultsVisibility, setResultsVisibility] = useState<PollResultsVisibility>('afterVote');
  const [deadlinePreset, setDeadlinePreset] = useState<DeadlinePreset>('none');
  const [customDeadline, setCustomDeadline] = useState('');
  // 선택 시점에 마감 시각(ISO)을 확정해, 미리보기와 실제 저장값이 어긋나지 않게 해요.
  const [endsAtIso, setEndsAtIso] = useState<string | null>(null);
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
      setError(err instanceof Error ? err.message : '이미지를 처리하지 못했어요.');
    }
  };

  const applyImageLink = (index: number) => {
    const draft = (linkDrafts[index] ?? '').trim();
    if (!draft) {
      return;
    }
    if (!isUsableImageUrl(draft)) {
      hapticFeedback('error');
      setError('올바른 이미지 링크(URL)가 아니에요.');
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
        setError('마감 시간을 선택하거나 "없음"으로 바꿔 주세요.');
        return;
      }
      if (new Date(endsAtIso).getTime() <= Date.now() + DEADLINE_BUFFER_MS) {
        hapticFeedback('error');
        setError('마감 시간은 현재보다 최소 1분 이후로 선택해 주세요.');
        return;
      }
    }

    const candidate = {
      question: question.trim(),
      description: description.trim() || null,
      resultsVisibility,
      endsAt: endsAtIso,
      options: filledOptions.map((opt) => ({
        text: opt.text.trim(),
        imageUrl: opt.imageUrl || null,
      })),
    };

    const parsed = CreatePollSchema.safeParse(candidate);
    if (!parsed.success) {
      hapticFeedback('error');
      setError(parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요.');
      return;
    }

    const created = await createPoll(parsed.data as CreatePollInput);
    if (created) {
      hapticFeedback('success');
      navigate(`/poll/${created.id}`, { replace: true });
    } else {
      hapticFeedback('error');
      setError('고민을 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <div style={{ background: theme.bg, minHeight: '100dvh' }}>
      <AppBar title="새 고민 만들기" onBack={() => navigate(-1)} />

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px 132px' }}>
        <div style={labelRowStyle}>
          <label style={labelStyle} htmlFor="poll-question">
            질문 *
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
          placeholder="어떤 고민을 투표로 만들까요?"
          onChange={(e) => setQuestion(e.target.value)}
        />

        <div style={labelRowStyle}>
          <label style={labelStyle} htmlFor="poll-desc">
            설명 (선택)
          </label>
          <span style={counterStyle}>
            {description.length}/{DESC_MAX}
          </span>
        </div>
        <textarea
          id="poll-desc"
          style={{ ...fieldStyle, minHeight: 80, resize: 'vertical' }}
          value={description}
          maxLength={DESC_MAX}
          placeholder="배경이나 맥락을 덧붙여 주세요."
          onChange={(e) => setDescription(e.target.value)}
        />

        <div style={labelRowStyle}>
          <label style={labelStyle}>선택지 * (최소 2개 · 사진 선택)</label>
          <span style={counterStyle}>
            {filledOptions.length} / 최소 {MIN_OPTIONS}개
          </span>
        </div>
        {options.map((opt, index) => {
          const editorOpen = openImageIndex === index || Boolean(opt.imageUrl);
          return (
            <div key={index} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={fieldStyle}
                  value={opt.text}
                  maxLength={OPTION_MAX}
                  placeholder={`선택지 ${index + 1}`}
                  aria-label={`선택지 ${index + 1}`}
                  onChange={(e) => updateOptionText(index, e.target.value)}
                />
                <button
                  type="button"
                  className="pressable"
                  aria-label={`선택지 ${index + 1} 사진`}
                  aria-pressed={editorOpen}
                  onClick={() => setOpenImageIndex((prev) => (prev === index ? null : index))}
                  style={{
                    ...squareBtnStyle,
                    color: opt.imageUrl ? theme.accent : theme.textMuted,
                  }}
                >
                  📷
                </button>
                {options.length > MIN_OPTIONS ? (
                  <button
                    type="button"
                    className="pressable"
                    aria-label={`선택지 ${index + 1} 삭제`}
                    onClick={() => removeOption(index)}
                    style={{ ...squareBtnStyle, color: theme.textMuted }}
                  >
                    ✕
                  </button>
                ) : null}
              </div>

              {editorOpen ? (
                <div
                  style={{
                    marginTop: 8,
                    padding: 10,
                    border: `1px dashed ${theme.border}`,
                    borderRadius: theme.radiusSm,
                  }}
                >
                  {opt.imageUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img
                        src={opt.imageUrl}
                        alt=""
                        style={{
                          width: 56,
                          height: 56,
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: `1px solid ${theme.border}`,
                        }}
                      />
                      <span style={{ flex: 1, fontSize: 13, color: theme.textMuted }}>
                        사진이 추가됐어요
                      </span>
                      <button
                        type="button"
                        className="pressable"
                        onClick={() => setOptionImage(index, null)}
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
                          border: `1px solid ${theme.border}`,
                          borderRadius: theme.radiusSm,
                          background: theme.surface,
                          color: theme.text,
                          fontWeight: 700,
                          fontSize: 14,
                          cursor: 'pointer',
                        }}
                      >
                        📷 이미지 업로드
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              void handleImageFile(index, file);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          style={{ ...fieldStyle, fontSize: 13 }}
                          value={linkDrafts[index] ?? ''}
                          placeholder="또는 이미지 링크(URL)"
                          inputMode="url"
                          aria-label={`선택지 ${index + 1} 이미지 링크`}
                          onChange={(e) =>
                            setLinkDrafts((prev) => ({ ...prev, [index]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              applyImageLink(index);
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="pressable"
                          onClick={() => applyImageLink(index)}
                          style={{
                            flexShrink: 0,
                            padding: '0 16px',
                            border: `1px solid ${theme.accent}`,
                            borderRadius: theme.radiusSm,
                            background: theme.accentSoft,
                            color: theme.accent,
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: 'pointer',
                          }}
                        >
                          추가
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
        {options.length < MAX_OPTIONS ? (
          <button
            type="button"
            className="pressable"
            onClick={addOption}
            style={{
              width: '100%',
              padding: '10px',
              border: `1px dashed ${theme.border}`,
              borderRadius: theme.radiusSm,
              background: 'transparent',
              color: theme.accent,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + 선택지 추가
          </button>
        ) : null}

        <div style={labelRowStyle}>
          <label style={labelStyle}>마감 시간</label>
          {deadlinePreview ? (
            <Chip tone={isDeadlinePast ? 'danger' : 'gold'}>
              {isDeadlinePast ? '⚠ 지난 시각' : `~ ${deadlinePreview}`}
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
                onClick={() => selectDeadlinePreset(preset.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: theme.radiusPill,
                  border: `1px solid ${active ? theme.accent : theme.border}`,
                  background: active ? theme.accentSoft : 'transparent',
                  color: active ? theme.accent : theme.textMuted,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
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
            onChange={(e) => handleCustomDeadlineChange(e.target.value)}
            style={{ ...fieldStyle, marginTop: 8, colorScheme: 'dark' }}
            aria-label="마감 시간 직접 선택"
          />
        ) : null}

        <label style={{ ...labelStyle, margin: '20px 0 8px' }}>결과 공개 시점</label>
        <SegmentedControl
          ariaLabel="결과 공개 시점"
          options={RESULT_OPTIONS}
          value={resultsVisibility}
          onChange={setResultsVisibility}
        />

        {error ? (
          <p style={{ color: theme.danger, fontSize: 13, marginTop: 16 }} role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div style={stickyActionBar}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <Button
            style={{ width: '100%' }}
            loading={isLoading}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            고민 등록하기
          </Button>
        </div>
      </div>
    </div>
  );
}
