import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import {
  COMMENT_PASSWORD_MAX,
  COMMENT_PASSWORD_VERIFY_MIN,
  RESULTS_VISIBILITY_LABELS,
  UpdatePollSchema,
  VISIBILITY_OPTIONS,
  type PollResultsVisibility,
  type PollVisibility,
  type UpdatePollInput,
} from '../shared';
import { usePollStore } from '../store/usePollStore';
import { useAuthStore } from '../store/useAuthStore';
import { theme, stickyActionBar, FONT } from '../theme';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../lib/format';
import { fileToDownscaledDataUrl, isUsableImageUrl } from '../lib/image';
import { hapticFeedback } from '../lib/toss';
import { AppBar, Chip, PageLoader, SegmentedControl } from '../components/ui';

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

// 라벨·공개 범위 옵션은 web/toss 공통 상수(@picky/shared)에서 가져와 양 앱이 같은 문구를 쓴다.
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
              minHeight: 48,
              padding: '0 16px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              color: theme.textMuted,
              fontWeight: 700,
              fontSize: FONT.small,
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
  const [searchParams] = useSearchParams();
  const { currentPoll, isLoading, error, fetchPoll, updatePoll } = usePollStore();
  const myId = useAuthStore((state) => state.user?.id ?? null);

  const [loaded, setLoaded] = useState(false);
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [resultsVisibility, setResultsVisibility] = useState<PollResultsVisibility>('afterVote');
  const [visibility, setVisibility] = useState<PollVisibility>('public');
  // 새 접근 코드(비우면 기존 코드 유지). 서버는 코드 원문을 돌려주지 않으므로 항상 빈 값에서 시작.
  const [accessCode, setAccessCode] = useState('');
  const [options, setOptions] = useState<OptionDraft[]>(() => [emptyOption(), emptyOption()]);
  const [openImageIndex, setOpenImageIndex] = useState<number | null>(null);
  const [linkDrafts, setLinkDrafts] = useState<Record<number, string>>({});
  const [customDeadline, setCustomDeadline] = useState('');
  const [endsAtIso, setEndsAtIso] = useState<string | null>(null);
  const [totalVotes, setTotalVotes] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 비공개 폴은 코드 없이 받으면 선택지/설명이 비어 온다(서버 redaction, 소유자 우회 없음).
  // 상세에서 잠금 해제 후 넘어오면 ?code= 로 코드가 실려 있고, 없으면 게이트로 코드를 받아 전체 폴을 로드한다.
  const urlCode = searchParams.get('code') ?? undefined;
  // 폼 전송(updatePoll) 때도 게이트를 통과하려면 활성 코드를 함께 보내야 하므로 별도 상태로 보관한다.
  const [activeCode, setActiveCode] = useState<string | undefined>(urlCode);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const minCustom = useMemo(() => toDateTimeLocalValue(new Date(Date.now() + 5 * 60_000)), []);

  // 활성 코드(activeCode)를 함께 보내 전체 폴을 로드한다. 코드가 바뀌면(게이트 통과) 다시 로드한다.
  useEffect(() => {
    if (!id) return;
    fetchPoll(id, activeCode).catch(() => {});
  }, [id, activeCode, fetchPoll]);

  const poll = currentPoll && currentPoll.id === id ? currentPoll : null;
  const isAdmin = Boolean(useAuthStore.getState().user?.isAdmin);
  const isOwner = Boolean(poll && myId && poll.creatorId === myId);
  // 게스트(비회원) 폴 — 작성 회원이 따로 없으니(또는 guest- 접두 id) 작성 시 정한 관리 비번으로 수정한다.
  // 웹에서 비회원으로 만든 고민이 토스에 공유돼 수정되는 경우가 여기 해당한다(web과 동일 모델).
  const isGuestPoll = Boolean(
    poll && (poll.creatorIsGuest || poll.creatorId?.startsWith('guest-')),
  );
  // 회원 소유자/어드민이면 직접 수정, 게스트 폴이면 비번 게이트를 통과해 수정한다.
  // 최종 권한(비번 일치)은 서버 assertCanManage 가 강제하므로 여기선 게이트·전송 비번 유무만 결정한다.
  const canManage = isOwner || isAdmin || isGuestPoll;
  // 게스트 폴을 회원 소유자/어드민이 아닌 사람이 수정하려면 관리 비번을 통과해야 한다.
  const needsManagePassword = isGuestPoll && !isOwner && !isAdmin;
  // 게스트 폴 수정 게이트에서 받은(통과한) 관리 비번 — updatePoll 바디로 함께 보내 서버 게이트를 통과한다.
  const [managePassword, setManagePassword] = useState<string | null>(null);
  // 게이트 입력값(통과 전 임시 보관)과 게이트 에러.
  const [managePasswordInput, setManagePasswordInput] = useState('');
  const [managePasswordError, setManagePasswordError] = useState<string | null>(null);

  // 비공개 폴 코드 게이트 — 코드로 재조회해 통과하면 activeCode 를 갱신해 위 effect 가 전체 폴을 다시 로드한다.
  const handleUnlockCode = async () => {
    const trimmed = codeInput.trim();
    if (trimmed.length < 4) {
      setCodeError('코드는 4자 이상이에요');
      hapticFeedback('error');
      return;
    }
    setCodeError(null);
    const result = await fetchPoll(id, trimmed);
    if (!result || result.requiresCode) {
      setCodeError('코드가 맞지 않아요 🔒');
      hapticFeedback('error');
      return;
    }
    hapticFeedback('success');
    setActiveCode(trimmed);
  };

  // 폴이 처음 로드됐을 때 한 번만 폼을 채운다(편집 중 사용자 입력을 덮어쓰지 않게).
  // 단, 코드 게이트에 막혀(requiresCode) 선택지가 비어 오면 폼을 채우지 않고 코드 입력을 기다린다.
  useEffect(() => {
    if (!poll || loaded || poll.requiresCode) {
      return;
    }
    setQuestion(poll.question);
    setDescription(poll.description ?? '');
    setResultsVisibility(poll.resultsVisibility === 'always' ? 'always' : 'afterVote');
    setVisibility(poll.visibility ?? 'public');
    setAccessCode('');
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

    // 접근 코드 검증 — web EditPoll과 동일 규칙.
    // 이미 비공개였던 폴은 코드를 갖고 있으므로 빈 칸이면 서버가 기존 코드를 유지한다.
    // 공개/링크전용 -> 비공개로 처음 전환할 때는 새 코드(4~20자)가 반드시 있어야 한다.
    const trimmedAccessCode = accessCode.trim();
    const wasAlreadyPrivate = poll.visibility === 'private';
    if (visibility === 'private') {
      const needsNewCode = !wasAlreadyPrivate || trimmedAccessCode.length > 0;
      if (needsNewCode && (trimmedAccessCode.length < 4 || trimmedAccessCode.length > 20)) {
        hapticFeedback('error');
        setFormError(
          wasAlreadyPrivate
            ? '접근 코드는 4~20자예요. 비워두면 기존 코드가 그대로 유지돼요 🔒'
            : '비공개로 바꾸려면 접근 코드(4~20자)를 입력해 주세요 🔒',
        );
        return;
      }
    }

    const candidate: UpdatePollInput = {
      question: question.trim(),
      description: description.trim() || null,
      endsAt: endsAtIso,
      resultsVisibility,
      visibility,
      // 비공개이면서 새 코드를 입력했을 때만 코드를 전송(빈 칸이면 서버가 기존 코드 유지).
      ...(visibility === 'private' && trimmedAccessCode ? { accessCode: trimmedAccessCode } : {}),
      // 게스트 폴 수정 — 게이트에서 통과한 관리 비번을 바디로 함께 보내 서버 게이트를 통과한다(회원/어드민은 미전송).
      ...(needsManagePassword && managePassword ? { password: managePassword } : {}),
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
      // 비공개로 남는 폴은 상세에서 다시 코드 게이트에 막히지 않게, 새/활성 코드를 ?code= 로 넘긴다.
      const codeForReturn = visibility === 'private' ? trimmedAccessCode || activeCode : undefined;
      const codeQuery = codeForReturn ? `?code=${encodeURIComponent(codeForReturn)}` : '';
      navigate(`/poll/${id}${codeQuery}`, { replace: true });
    } else {
      hapticFeedback('error');
      // 게스트 폴 — 비번 불일치(서버 403)면 통과 비번을 비워 게이트로 되돌리고 다시 입력받는다.
      if (needsManagePassword) {
        setManagePassword(null);
        setManagePasswordInput('');
        setManagePasswordError('비번이 맞지 않아요. 다시 입력해 주세요 🔒');
      }
      setFormError(
        usePollStore.getState().error ?? '고민을 수정하지 못했어요. 잠시 후 다시 시도해 주세요 😢',
      );
    }
  };

  // 게스트 폴 수정 게이트 — 통과 전에는 관리 비번을 받고, 통과(managePassword 설정) 후 폼을 보여준다.
  // 비번 일치 여부는 서버가 최종 강제하므로 여기선 길이만 확인하고 통과시킨다(틀리면 제출 시 게이트로 복귀).
  const handleUnlockManage = () => {
    const trimmed = managePasswordInput.trim();
    if (trimmed.length < COMMENT_PASSWORD_VERIFY_MIN) {
      setManagePasswordError(`비번은 ${COMMENT_PASSWORD_VERIFY_MIN}자 이상이에요`);
      hapticFeedback('error');
      return;
    }
    setManagePasswordError(null);
    setManagePassword(trimmed);
    hapticFeedback('success');
  };

  if (isLoading && !poll) {
    return (
      <CenterMessage>
        <PageLoader message="고민을 불러오는 중이에요" />
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

  // 비공개 폴인데 코드가 없어 선택지가 가려진 상태(requiresCode) — 권한자(소유자/운영자)에게 코드 입력을 받는다.
  // 코드가 맞으면 위 effect 가 전체 폴(선택지 포함)을 다시 로드해 정상 편집 화면으로 전환된다.
  if (poll.requiresCode) {
    return (
      <CenterMessage>
        <span style={{ fontSize: 48 }}>🔒</span>
        <span style={{ fontSize: 17, fontWeight: 800, color: theme.text, marginTop: 12 }}>
          비공개 고민을 수정하려면 코드가 필요해요
        </span>
        <span style={{ fontSize: 13, color: theme.textFaint, marginTop: 6, maxWidth: 280 }}>
          내가 만든 비공개 고민이라도, 선택지를 안전하게 불러오려면 접근 코드를 한 번 입력해 주세요.
        </span>
        <input
          type="text"
          value={codeInput}
          onChange={(e) => {
            setCodeError(null);
            setCodeInput(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleUnlockCode();
          }}
          placeholder="접근 코드"
          maxLength={20}
          aria-label="비공개 투표 접근 코드"
          style={{
            marginTop: 18,
            width: '100%',
            maxWidth: 280,
            padding: '14px 16px',
            borderRadius: theme.radiusSm,
            border: `1px solid ${theme.borderStrong}`,
            background: theme.surface,
            color: theme.text,
            fontSize: 16,
            textAlign: 'center',
          }}
        />
        {codeError ? (
          <span role="alert" style={{ fontSize: 13, color: theme.danger, marginTop: 8 }}>
            {codeError}
          </span>
        ) : null}
        <Button
          style={{ marginTop: 16 }}
          disabled={isLoading}
          onClick={() => void handleUnlockCode()}
        >
          코드 확인하고 수정하기 🔓
        </Button>
        <Button style={{ marginTop: 8 }} variant="weak" onClick={() => navigate(`/poll/${id}`)}>
          고민으로 돌아가기 🔙
        </Button>
      </CenterMessage>
    );
  }

  // 게스트(비회원) 폴 수정 게이트 — 회원 소유자/어드민이 아니면 작성 시 정한 관리 비번을 받는다.
  // 통과(managePassword 설정) 후 폼을 보여주고, 제출 시 비번을 함께 보내 서버가 최종 검증한다.
  if (needsManagePassword && !managePassword) {
    return (
      <CenterMessage>
        <span style={{ fontSize: 48 }}>🔒</span>
        <span style={{ fontSize: 17, fontWeight: 800, color: theme.text, marginTop: 12 }}>
          비회원 고민을 수정하려면 관리 비번이 필요해요
        </span>
        <span style={{ fontSize: 13, color: theme.textFaint, marginTop: 6, maxWidth: 280 }}>
          이 고민을 만들 때 정한 관리 비번을 입력하면 다른 기기서도 수정할 수 있어요.
        </span>
        <input
          type="password"
          value={managePasswordInput}
          onChange={(e) => {
            setManagePasswordError(null);
            setManagePasswordInput(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleUnlockManage();
          }}
          placeholder="작성 시 정한 관리 비번"
          maxLength={COMMENT_PASSWORD_MAX}
          aria-label="고민 관리 비밀번호"
          autoComplete="off"
          style={{
            marginTop: 18,
            width: '100%',
            maxWidth: 280,
            padding: '14px 16px',
            borderRadius: theme.radiusSm,
            border: `1px solid ${theme.borderStrong}`,
            background: theme.surface,
            color: theme.text,
            fontSize: 16,
            textAlign: 'center',
          }}
        />
        {managePasswordError ? (
          <span role="alert" style={{ fontSize: 13, color: theme.danger, marginTop: 8 }}>
            {managePasswordError}
          </span>
        ) : null}
        <Button style={{ marginTop: 16 }} onClick={handleUnlockManage}>
          비번 확인하고 수정하기 🔓
        </Button>
        <Button style={{ marginTop: 8 }} variant="weak" onClick={() => navigate(`/poll/${id}`)}>
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

        <span style={{ ...labelStyle, display: 'block', margin: '24px 0 8px' }}>
          누가 참여할 수 있나요? 🔐
        </span>
        <SegmentedControl
          ariaLabel="공개 범위"
          options={VISIBILITY_OPTIONS}
          value={visibility}
          onChange={(value) => {
            setFormError(null);
            setVisibility(value);
          }}
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
            onChange={(e) => {
              setFormError(null);
              setAccessCode(e.target.value);
            }}
            placeholder={
              poll.visibility === 'private'
                ? '바꿀 코드 입력 (비우면 기존 코드 유지)'
                : '접근 코드 (4~20자)'
            }
            maxLength={20}
            style={{ ...fieldStyle, marginTop: 10 }}
            aria-label="비공개 투표 접근 코드"
          />
        ) : null}

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
        {/* 외곽 stickyActionBar는 pointerEvents:none(투명 페이드가 뒤 콘텐츠 탭/스크롤을 막지 않게).
            버튼이 실제로 눌리려면 내부 래퍼에서 pointerEvents:auto로 복원해야 해요(목록/상세와 동일 패턴). */}
        <div
          style={{
            maxWidth: 520,
            margin: '0 auto',
            display: 'flex',
            gap: 10,
            pointerEvents: 'auto',
          }}
        >
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
