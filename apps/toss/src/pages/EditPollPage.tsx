import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import {
  RESULTS_VISIBILITY_LABELS,
  UpdatePollSchema,
  type PollResultsVisibility,
  type UpdatePollInput,
} from '../shared';
import { usePollStore } from '../store/usePollStore';
import { useAuthStore } from '../store/useAuthStore';
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

// 라벨은 web/toss 공통 상수에서 가져와 양 앱이 같은 문구를 쓰도록 한다.
const RESULT_OPTIONS = [
  { value: 'afterVote', label: RESULTS_VISIBILITY_LABELS.afterVote.short },
  { value: 'always', label: RESULTS_VISIBILITY_LABELS.always.short },
] as const satisfies ReadonlyArray<{ value: PollResultsVisibility; label: string }>;

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

function CenterMessage({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
        gap: 8,
        color: theme.textMuted,
        background: theme.bg,
      }}
    >
      {children}
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

function EditDeadlineField(
  props: Readonly<{
    endsAtIso: string | null;
    customDeadline: string;
    minCustom: string;
    deadlinePreview: string | null;
    isDeadlinePast: boolean;
    onDeadlineChange: (value: string) => void;
    onClearDeadline: () => void;
  }>,
) {
  const {
    endsAtIso,
    customDeadline,
    minCustom,
    deadlinePreview,
    isDeadlinePast,
    onDeadlineChange,
    onClearDeadline,
  } = props;
  return (
    <>
      <div style={{ ...labelRowStyle }}>
        <span style={labelStyle}>언제 마감할까요? ⏰</span>
        {deadlinePreview ? (
          <Chip tone={isDeadlinePast ? 'danger' : 'gold'}>
            {isDeadlinePast ? '⚠ 지난 시각이에요' : `~ ${deadlinePreview}`}
          </Chip>
        ) : (
          <Chip tone="muted">마감 없음 🌈</Chip>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="datetime-local"
          value={customDeadline}
          min={minCustom}
          onChange={(e) => onDeadlineChange(e.target.value)}
          style={{ ...fieldStyle, colorScheme: 'dark' }}
          aria-label="마감 시간 선택"
        />
        {endsAtIso ? (
          <button
            type="button"
            className="pressable"
            onClick={onClearDeadline}
            style={{
              flexShrink: 0,
              padding: '0 14px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              color: theme.textMuted,
              fontWeight: 700,
              fontSize: 13,
              border: `1px solid rgba(255,255,255,0.05)`,
              cursor: 'pointer',
            }}
          >
            마감 해제
          </button>
        ) : null}
      </div>
    </>
  );
}

function toCustomDeadline(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }
  const time = new Date(iso).getTime();
  return Number.isFinite(time) ? toDateTimeLocalValue(new Date(time)) : '';
}

export function EditPollPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { currentPoll, isLoading, error, fetchPoll, updatePoll } = usePollStore();
  const myId = useAuthStore((state) => state.user?.id ?? null);

  const [loaded, setLoaded] = useState(false);
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [resultsVisibility, setResultsVisibility] = useState<PollResultsVisibility>('afterVote');
  const [options, setOptions] = useState<OptionDraft[]>(() => [emptyOption(), emptyOption()]);
  const [openImageIndex, setOpenImageIndex] = useState<number | null>(null);
  const [linkDrafts, setLinkDrafts] = useState<Record<number, string>>({});
  const [customDeadline, setCustomDeadline] = useState('');
  const [endsAtIso, setEndsAtIso] = useState<string | null>(null);
  const [totalVotes, setTotalVotes] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const minCustom = useMemo(() => toDateTimeLocalValue(new Date(Date.now() + 5 * 60_000)), []);

  useEffect(() => {
    fetchPoll(id).catch(() => {});
  }, [id, fetchPoll]);

  const poll = currentPoll && currentPoll.id === id ? currentPoll : null;
  const isAdmin = Boolean(useAuthStore.getState().user?.isAdmin);
  const isOwner = Boolean(poll && myId && poll.creatorId === myId);
  const canManage = isOwner || isAdmin;

  // 폴이 처음 로드됐을 때 한 번만 폼을 채운다(편집 중 사용자 입력을 덮어쓰지 않게).
  useEffect(() => {
    if (!poll || loaded) {
      return;
    }
    setQuestion(poll.question);
    setDescription(poll.description ?? '');
    setResultsVisibility(poll.resultsVisibility === 'always' ? 'always' : 'afterVote');
    setOptions(
      poll.options.map((option) => ({
        id: `opt-${globalThis.crypto.randomUUID()}`,
        text: option.text,
        imageUrl: option.imageUrl ?? null,
      })),
    );
    setEndsAtIso(poll.endsAt ?? null);
    setCustomDeadline(toCustomDeadline(poll.endsAt));
    setTotalVotes(poll.totalVotes);
    setLoaded(true);
  }, [poll, loaded]);

  // 투표가 시작된 뒤에는 서버 규칙상 선택지 개수를 바꿀 수 없어요(글/이미지만 수정).
  const optionsLocked = totalVotes > 0;

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
    if (optionsLocked) {
      return;
    }
    setOptions((prev) => (prev.length < MAX_OPTIONS ? [...prev, emptyOption()] : prev));
    hapticFeedback('tickWeak');
  };
  const removeOption = (index: number) => {
    if (optionsLocked) {
      return;
    }
    setOptions((prev) => (prev.length > MIN_OPTIONS ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleImageFile = async (index: number, file: File) => {
    setFormError(null);
    try {
      const dataUrl = await fileToDownscaledDataUrl(file);
      setOptionImage(index, dataUrl);
      hapticFeedback('tickWeak');
    } catch (err) {
      hapticFeedback('error');
      setFormError(err instanceof Error ? err.message : '이미지를 처리하지 못했어요 😢');
    }
  };

  const applyImageLink = (index: number) => {
    const draft = (linkDrafts[index] ?? '').trim();
    if (!draft) {
      return;
    }
    if (!isUsableImageUrl(draft)) {
      hapticFeedback('error');
      setFormError('올바른 이미지 링크(URL)가 아니에요 😢');
      return;
    }
    setFormError(null);
    setOptionImage(index, draft);
    setLinkDrafts((prev) => ({ ...prev, [index]: '' }));
    hapticFeedback('tickWeak');
  };

  const handleDeadlineChange = (value: string) => {
    setCustomDeadline(value);
    setEndsAtIso(fromDateTimeLocalValue(value));
  };
  const clearDeadline = () => {
    hapticFeedback('tickWeak');
    setCustomDeadline('');
    setEndsAtIso(null);
  };

  const toggleImageEditor = (index: number) =>
    setOpenImageIndex((prev) => (prev === index ? null : index));
  const changeLinkDraft = (index: number, value: string) =>
    setLinkDrafts((prev) => ({ ...prev, [index]: value }));

  const filledOptions = options.filter((opt) => opt.text.trim().length > 0);
  const canSubmit = question.trim().length >= 2 && filledOptions.length >= MIN_OPTIONS;

  const handleSubmit = async () => {
    if (!poll) {
      return;
    }
    setFormError(null);

    if (endsAtIso && new Date(endsAtIso).getTime() <= Date.now() + DEADLINE_BUFFER_MS) {
      hapticFeedback('error');
      setFormError('마감 시간은 현재보다 최소 1분 이후로 선택하거나 해제해 주세요 ⏰');
      return;
    }

    // 투표 시작 후에는 선택지 개수가 그대로여야 한다(텍스트·이미지만 변경 허용).
    const optionPayload = filledOptions.map((opt) => ({
      text: opt.text.trim(),
      imageUrl: opt.imageUrl || null,
    }));
    if (optionsLocked && optionPayload.length !== poll.options.length) {
      hapticFeedback('error');
      setFormError('이미 투표가 시작돼 선택지 개수는 바꿀 수 없어요. 글·이미지만 수정해 주세요 🗳️');
      return;
    }

    const candidate: UpdatePollInput = {
      question: question.trim(),
      description: description.trim() || null,
      endsAt: endsAtIso,
      resultsVisibility,
      options: optionPayload,
    };

    const parsed = UpdatePollSchema.safeParse(candidate);
    if (!parsed.success) {
      hapticFeedback('error');
      setFormError(parsed.error.issues[0]?.message ?? '입력값을 다시 한 번 확인해 주세요 🧐');
      return;
    }

    setSubmitting(true);
    const updated = await updatePoll(id, parsed.data as UpdatePollInput);
    setSubmitting(false);
    if (updated) {
      hapticFeedback('success');
      navigate(`/poll/${id}`, { replace: true });
    } else {
      hapticFeedback('error');
      setFormError(
        usePollStore.getState().error ?? '고민을 수정하지 못했어요. 잠시 후 다시 시도해 주세요 😢',
      );
    }
  };

  if (isLoading && !poll) {
    return (
      <CenterMessage>
        <span style={{ fontSize: 48 }}>🥑</span>
        <span style={{ fontSize: 15 }}>고민을 불러오는 중이에요…</span>
      </CenterMessage>
    );
  }

  if (!poll) {
    return (
      <CenterMessage>
        <span style={{ fontSize: 48 }}>🥺</span>
        <span style={{ fontSize: 15 }}>{error ?? '앗, 고민을 찾을 수 없어요'}</span>
        <Button style={{ marginTop: 16 }} variant="weak" onClick={() => navigate('/')}>
          목록으로 돌아가기 🔙
        </Button>
      </CenterMessage>
    );
  }

  if (!canManage) {
    return (
      <CenterMessage>
        <span style={{ fontSize: 48 }}>🔒</span>
        <span style={{ fontSize: 15 }}>이 고민을 수정할 권한이 없어요</span>
        <Button style={{ marginTop: 16 }} variant="weak" onClick={() => navigate(`/poll/${id}`)}>
          고민으로 돌아가기 🔙
        </Button>
      </CenterMessage>
    );
  }

  return (
    <div style={{ minHeight: '100dvh' }}>
      <AppBar title="고민 수정하기 ✏️" onBack={() => navigate(`/poll/${id}`)} />

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px 140px' }}>
        <div style={labelRowStyle}>
          <label style={labelStyle} htmlFor="edit-question">
            풀고 싶은 고민 💬
          </label>
          <span style={counterStyle}>
            {question.length}/{QUESTION_MAX}
          </span>
        </div>
        <input
          id="edit-question"
          style={fieldStyle}
          value={question}
          maxLength={QUESTION_MAX}
          placeholder="어떤 까다로운 고민이 있으신가요? 🤔"
          onChange={(e) => setQuestion(e.target.value)}
        />

        <div style={labelRowStyle}>
          <label style={labelStyle} htmlFor="edit-desc">
            상세 설명 💡
          </label>
          <span style={counterStyle}>
            {description.length}/{DESC_MAX}
          </span>
        </div>
        <textarea
          id="edit-desc"
          style={{ ...fieldStyle, minHeight: 120, resize: 'vertical' }}
          value={description}
          maxLength={DESC_MAX}
          placeholder="친구들이 더 잘 고를 수 있게 힌트를 주세요! (선택) 💡"
          onChange={(e) => setDescription(e.target.value)}
        />

        <EditDeadlineField
          endsAtIso={endsAtIso}
          customDeadline={customDeadline}
          minCustom={minCustom}
          deadlinePreview={deadlinePreview}
          isDeadlinePast={isDeadlinePast}
          onDeadlineChange={handleDeadlineChange}
          onClearDeadline={clearDeadline}
        />

        <span style={{ ...labelStyle, display: 'block', margin: '24px 0 8px' }}>
          결과는 언제 보여줄까요? 👀
        </span>
        <SegmentedControl
          ariaLabel="결과 공개 시점"
          options={RESULT_OPTIONS}
          value={resultsVisibility}
          onChange={setResultsVisibility}
        />

        <div style={labelRowStyle}>
          <span style={labelStyle}>선택지 다듬기 🎨</span>
          <span style={counterStyle}>
            {filledOptions.length} / 최소 {MIN_OPTIONS}개
          </span>
        </div>
        {optionsLocked ? (
          <p style={{ fontSize: 13, color: theme.textFaint, margin: '0 0 12px', lineHeight: 1.5 }}>
            이미 {totalVotes}명이 투표해 선택지 개수는 고정돼요. 글·이미지만 바꿀 수 있어요 🗳️
          </p>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {options.map((opt, index) => (
            <OptionCard
              key={opt.id}
              option={opt}
              index={index}
              editorOpen={openImageIndex === index || Boolean(opt.imageUrl)}
              canRemove={!optionsLocked && options.length > MIN_OPTIONS}
              linkDraft={linkDrafts[index] ?? ''}
              onTextChange={updateOptionText}
              onToggleEditor={toggleImageEditor}
              onRemove={removeOption}
              onImageFile={(idx, file) => void handleImageFile(idx, file)}
              onLinkDraftChange={changeLinkDraft}
              onApplyLink={applyImageLink}
              onClearImage={(idx) => setOptionImage(idx, null)}
            />
          ))}
        </div>

        {!optionsLocked && options.length < MAX_OPTIONS ? (
          <button
            type="button"
            className="pressable"
            onClick={addOption}
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

        {formError ? (
          <p style={{ color: theme.danger, fontSize: 13, marginTop: 16 }} role="alert">
            {formError}
          </p>
        ) : null}
      </div>

      <div style={stickyActionBar}>
        <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', gap: 10 }}>
          <Button
            variant="weak"
            style={{ flex: 1, borderRadius: 16 }}
            onClick={() => navigate(`/poll/${id}`)}
          >
            취소
          </Button>
          <Button
            style={{
              flex: 2,
              borderRadius: 16,
              boxShadow: '0 8px 24px rgba(19, 194, 163, 0.25)',
            }}
            loading={submitting}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            수정 저장하기 💾
          </Button>
        </div>
      </div>
    </div>
  );
}
