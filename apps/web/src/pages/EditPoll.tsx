import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  GripVertical,
  ImageIcon,
  Lock,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { usePollStore } from '../store/usePollStore';
import { useAuthStore } from '../store/useAuthStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { VISIBILITY_OPTIONS } from '@picky/shared';
import type { Poll, PollResultsVisibility, PollVisibility, UpdatePollInput } from '@picky/shared';

// CreatePoll.tsx 와 동일한 datetime-local <-> ISO 변환 규약을 그대로 따른다.
const toDateTimeLocalValue = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '';
  }
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const resolveIsoEndAt = (value: string): string | null => {
  if (!value.trim()) {
    return null;
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

const RESULT_VISIBILITY_OPTIONS: Array<{
  value: PollResultsVisibility;
  label: string;
  description: string;
}> = [
  {
    value: 'afterVote',
    label: '투표 후 공개',
    description: '참여자는 선택을 마친 뒤 결과를 봅니다.',
  },
  {
    value: 'always',
    label: '항상 공개',
    description: '공유 전부터 실시간 흐름을 보여줍니다.',
  },
];

// 공개 범위 옵션은 @picky/shared VISIBILITY_OPTIONS 단일 소스를 쓴다(라벨/설명 동일).
// 비공개 선택 시 접근 코드 입력을 노출한다.

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

interface OptionDraft {
  // 안정적인 React key — 기존 선택지 id 또는 신규 임시 키.
  key: string;
  text: string;
  imageUrl: string;
}

const createOptionKey = () =>
  `opt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const errorCardStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.78rem',
  color: 'var(--brand-accent-coral)',
  padding: '7px 10px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  background: 'rgba(239, 68, 68, 0.12)',
};

const labelTextStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const GuardNotice: React.FC<{ id?: string; title: string; message: string }> = ({
  id,
  title,
  message,
}) => (
  <div
    className="content-card"
    style={{ display: 'grid', gap: '0.85rem', padding: '1.5rem', maxWidth: '640px' }}
  >
    <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
      {title}
    </h1>
    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
      {message}
    </p>
    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
      <Link to="/" className="btn-secondary" style={{ textDecoration: 'none' }}>
        고민 목록으로
      </Link>
      {id ? (
        <Link
          to={`/poll/${encodeURIComponent(id)}`}
          className="btn-secondary"
          style={{ textDecoration: 'none' }}
        >
          고민 상세로
        </Link>
      ) : null}
    </div>
  </div>
);

export const EditPoll: React.FC = () => {
  useDocumentTitle('고민 수정');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const fetchPoll = usePollStore((state) => state.fetchPoll);
  const updatePoll = usePollStore((state) => state.updatePoll);
  const isLoading = usePollStore((state) => state.isLoading);
  const error = usePollStore((state) => state.error);
  const clearError = usePollStore((state) => state.clearError);
  const user = useAuthStore((state) => state.user);

  const [loadedPoll, setLoadedPoll] = useState<Poll | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [endsAtLocal, setEndsAtLocal] = useState('');
  const [resultsVisibility, setResultsVisibility] = useState<PollResultsVisibility>('afterVote');
  const [visibility, setVisibility] = useState<PollVisibility>('public');
  // 서버는 접근 코드를 돌려주지 않으므로 항상 빈 값으로 시작한다. 사용자가 입력할 때만 전송한다.
  const [accessCode, setAccessCode] = useState('');
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 마운트 시 한 번 로드 — 폼 초기값으로 채운다.
  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    clearError();
    fetchPoll(id).then((poll) => {
      if (cancelled) {
        return;
      }
      if (!poll) {
        setLoadFailed(true);
        return;
      }
      setLoadedPoll(poll);
      setQuestion(poll.question ?? '');
      setDescription(poll.description ?? '');
      setEndsAtLocal(toDateTimeLocalValue(poll.endsAt));
      setResultsVisibility(poll.resultsVisibility ?? 'afterVote');
      setVisibility(poll.visibility ?? 'public');
      // 코드는 서버가 반환하지 않으므로 빈 칸으로 시작한다(미입력 시 기존 코드를 유지).
      setAccessCode('');
      setOptions(
        poll.options.map((option) => ({
          key: `existing-${option.id}`,
          text: option.text,
          imageUrl: option.imageUrl ?? '',
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [id, fetchPoll, clearError]);

  const isOwner = !!(user?.id && loadedPoll?.creatorId === user.id);
  const isAdmin = !!user?.isAdmin;
  const canManage = isOwner || isAdmin;
  // 이미 표가 있으면 선택지 개수 변경 불가(글/이미지만 수정).
  const optionsLocked = !!loadedPoll && loadedPoll.totalVotes > 0;

  const trimmedOptions = useMemo(
    () =>
      options.map((option) => ({
        text: option.text.trim(),
        imageUrl: option.imageUrl.trim() || null,
      })),
    [options],
  );
  const filledOptionCount = trimmedOptions.filter((option) => option.text.length > 0).length;

  const updateOption = (key: string, patch: Partial<Pick<OptionDraft, 'text' | 'imageUrl'>>) => {
    setFormError('');
    clearError();
    setOptions((prev) =>
      prev.map((option) => (option.key === key ? { ...option, ...patch } : option)),
    );
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) {
      return;
    }
    setFormError('');
    setOptions((prev) => [...prev, { key: createOptionKey(), text: '', imageUrl: '' }]);
  };

  const removeOption = (key: string) => {
    if (options.length <= MIN_OPTIONS) {
      return;
    }
    setFormError('');
    setOptions((prev) => prev.filter((option) => option.key !== key));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !loadedPoll) {
      return;
    }
    setFormError('');
    clearError();

    const normalizedQuestion = question.trim();
    if (normalizedQuestion.length < 2) {
      setFormError('질문은 최소 2글자 이상이어야 합니다.');
      return;
    }

    const normalizedOptions = trimmedOptions.filter((option) => option.text.length > 0);
    if (normalizedOptions.length < MIN_OPTIONS) {
      setFormError('선택지는 최소 2개 이상 입력해 주세요.');
      return;
    }

    const isoEndsAt = resolveIsoEndAt(endsAtLocal);
    if (endsAtLocal.trim() && !isoEndsAt) {
      setFormError('마감 시간 형식이 올바르지 않습니다.');
      return;
    }

    const trimmedAccessCode = accessCode.trim();
    // 이미 비공개였던 폴은 코드를 갖고 있으므로 빈 칸이면 서버가 기존 코드를 유지한다.
    // 공개/링크전용 -> 비공개로 처음 전환할 때는 새 코드(4~20자)가 반드시 있어야 한다.
    const wasAlreadyPrivate = loadedPoll.visibility === 'private';
    if (visibility === 'private') {
      const needsNewCode = !wasAlreadyPrivate || trimmedAccessCode.length > 0;
      if (needsNewCode && (trimmedAccessCode.length < 4 || trimmedAccessCode.length > 20)) {
        setFormError(
          wasAlreadyPrivate
            ? '접근 코드는 최소 4자 이상이어야 합니다. (4~20자) 비워두면 기존 코드가 유지됩니다.'
            : '비공개로 바꾸려면 접근 코드(4~20자)를 입력해 주세요.',
        );
        return;
      }
    }

    const patch: UpdatePollInput = {
      question: normalizedQuestion,
      description: description.trim() ? description.trim() : null,
      endsAt: isoEndsAt,
      resultsVisibility,
      visibility,
      // 비공개이면서 새 코드를 입력했을 때만 코드를 전송한다(빈 칸이면 서버가 기존 코드 유지).
      ...(visibility === 'private' && trimmedAccessCode ? { accessCode: trimmedAccessCode } : {}),
      options: normalizedOptions.map((option) => ({
        text: option.text,
        imageUrl: option.imageUrl,
      })),
    };

    setIsSaving(true);
    const result = await updatePoll(id, patch);
    setIsSaving(false);
    if (result) {
      navigate(`/poll/${encodeURIComponent(id)}`);
    }
  };

  if (!id) {
    return (
      <GuardNotice
        title="잘못된 접근이에요"
        message="수정할 고민을 찾을 수 없어요. 고민 목록에서 다시 시도해 주세요."
      />
    );
  }

  if (isLoading && !loadedPoll && !loadFailed) {
    return (
      <div aria-busy="true" aria-live="polite" style={{ display: 'grid', gap: '1rem' }}>
        <span className="sr-only">고민 정보를 불러오는 중…</span>
        <div className="skeleton" style={{ height: 34, width: '62%' }} />
        <div className="skeleton" style={{ height: 200 }} />
        <div className="skeleton" style={{ height: 120 }} />
      </div>
    );
  }

  if (loadFailed || (!loadedPoll && !isLoading)) {
    return (
      <GuardNotice
        id={id}
        title="고민을 불러오지 못했어요"
        message={error || '고민 정보를 찾을 수 없어요. 잠시 후 다시 시도해 주세요.'}
      />
    );
  }

  if (loadedPoll && !canManage) {
    return (
      <GuardNotice
        id={id}
        title="이 고민을 수정할 권한이 없어요"
        message="작성자 또는 운영자만 고민을 수정할 수 있어요."
      />
    );
  }

  if (!loadedPoll) {
    return null;
  }

  return (
    <div
      className="animate-slide-up"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '720px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => navigate(`/poll/${encodeURIComponent(id)}`)}
          className="ghost-btn"
          aria-label="고민 상세로 돌아가기"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={14} />
          돌아가기
        </button>
        <h1
          style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)' }}
        >
          고민 수정
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="content-card"
        style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', padding: '1.4rem' }}
      >
        {formError ? <p style={errorCardStyle}>{formError}</p> : null}
        {error ? <p style={errorCardStyle}>{error}</p> : null}

        {/* 질문 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="edit-poll-question" style={labelTextStyle}>
            고민 주제 (질문)
          </label>
          <input
            id="edit-poll-question"
            type="text"
            aria-label="고민 주제 (질문)"
            placeholder="예: 이번 주말 모임, 어디서 만날까요?"
            value={question}
            onChange={(event) => {
              clearError();
              setFormError('');
              setQuestion(event.target.value);
            }}
            required
            maxLength={100}
            className="form-input"
          />
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            {question.trim().length} / 100
          </span>
        </div>

        {/* 설명 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="edit-poll-description" style={labelTextStyle}>
            상세 내용 / 고민 배경 (선택)
          </label>
          <textarea
            id="edit-poll-description"
            aria-label="상세 내용 / 고민 배경 (선택)"
            placeholder="결정을 내리기 힘든 이유나 배경을 적어주세요."
            value={description}
            onChange={(event) => {
              clearError();
              setFormError('');
              setDescription(event.target.value);
            }}
            rows={4}
            maxLength={500}
            className="form-input"
            style={{ resize: 'none' }}
          />
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            {description.trim().length} / 500
          </span>
        </div>

        {/* 마감 시간 */}
        <label style={{ display: 'grid', gap: '0.45rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: 'var(--text-secondary)',
              fontSize: '0.76rem',
              fontWeight: 800,
            }}
          >
            <AlertTriangle size={13} style={{ color: 'var(--brand-accent-gold)' }} />
            마감 시간
          </span>
          <input
            type="datetime-local"
            value={endsAtLocal}
            onChange={(event) => {
              clearError();
              setFormError('');
              setEndsAtLocal(event.target.value);
            }}
            aria-label="마감 시간"
            className="form-input"
            style={{ fontSize: '0.82rem' }}
          />
          <small style={{ color: 'var(--text-muted)', fontSize: '0.66rem', lineHeight: 1.4 }}>
            비워두면 상시 진행됩니다.
          </small>
        </label>

        {/* 결과 공개 */}
        <div style={{ display: 'grid', gap: '0.45rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: 'var(--text-secondary)',
              fontSize: '0.76rem',
              fontWeight: 800,
            }}
          >
            <Eye size={13} style={{ color: 'var(--brand-accent-teal)' }} />
            결과 공개
          </span>
          <div className="result-mode-grid">
            {RESULT_VISIBILITY_OPTIONS.map((option) => {
              const active = resultsVisibility === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    clearError();
                    setFormError('');
                    setResultsVisibility(option.value);
                  }}
                  className="result-mode-button"
                  aria-pressed={active}
                  style={{
                    borderColor: active ? 'rgba(45, 212, 191, 0.42)' : 'var(--bg-card-border)',
                    background: active ? 'rgba(45, 212, 191, 0.08)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <strong
                    style={{ color: active ? 'var(--brand-accent-teal)' : 'var(--text-primary)' }}
                  >
                    {option.label}
                  </strong>
                  <span>{option.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 공개 범위 */}
        <div style={{ display: 'grid', gap: '0.45rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: 'var(--text-secondary)',
              fontSize: '0.76rem',
              fontWeight: 800,
            }}
          >
            <Lock size={13} style={{ color: 'var(--brand-accent-teal)' }} />
            공개 범위
          </span>
          <div className="result-mode-grid">
            {VISIBILITY_OPTIONS.map((option) => {
              const active = visibility === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    clearError();
                    setFormError('');
                    setVisibility(option.value);
                  }}
                  className="result-mode-button"
                  aria-pressed={active}
                  style={{
                    borderColor: active ? 'rgba(45, 212, 191, 0.42)' : 'var(--bg-card-border)',
                    background: active ? 'rgba(45, 212, 191, 0.08)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <strong
                    style={{ color: active ? 'var(--brand-accent-teal)' : 'var(--text-primary)' }}
                  >
                    {option.label}
                  </strong>
                  <span>{option.description}</span>
                </button>
              );
            })}
          </div>
          {visibility === 'private' ? (
            <label style={{ display: 'grid', gap: '0.35rem', marginTop: '0.2rem' }}>
              <span
                style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700 }}
              >
                접근 코드 (4~20자)
              </span>
              <input
                type="text"
                value={accessCode}
                onChange={(event) => {
                  clearError();
                  setFormError('');
                  setAccessCode(event.target.value);
                }}
                placeholder={
                  loadedPoll.visibility === 'private'
                    ? '바꿀 코드를 입력하세요 (비우면 기존 코드 유지)'
                    : '참여자에게 따로 알려줄 코드를 정해주세요'
                }
                maxLength={20}
                minLength={4}
                className="form-input"
                aria-label="비공개 투표 접근 코드"
                style={{ fontSize: '0.82rem' }}
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.66rem', lineHeight: 1.4 }}>
                {loadedPoll.visibility === 'private'
                  ? '이 코드를 아는 사람만 참여할 수 있어요. 비워두면 기존 코드가 그대로 유지됩니다.'
                  : '비공개로 바꾸려면 코드(4~20자)가 필요해요. 이 코드를 아는 사람만 참여할 수 있어요.'}
              </small>
            </label>
          ) : null}
        </div>

        {/* 선택지 */}
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.6rem',
              flexWrap: 'wrap',
            }}
          >
            <span style={labelTextStyle}>선택지 ({filledOptionCount}개)</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              최소 {MIN_OPTIONS}개 · 최대 {MAX_OPTIONS}개
            </span>
          </div>
          {optionsLocked ? (
            <p
              style={{
                margin: 0,
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                padding: '7px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(250, 204, 21, 0.28)',
                background: 'rgba(250, 204, 21, 0.08)',
              }}
            >
              이미 투표가 진행돼 선택지 개수는 바꿀 수 없어요. 글자·이미지만 수정할 수 있어요.
            </p>
          ) : null}

          <div style={{ display: 'grid', gap: '0.55rem' }}>
            {options.map((option, index) => (
              <div
                key={option.key}
                style={{
                  display: 'grid',
                  gap: '0.4rem',
                  padding: '0.7rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-card-border)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span aria-hidden style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>
                    <GripVertical size={14} />
                  </span>
                  <input
                    type="text"
                    aria-label={`선택지 ${index + 1} 내용`}
                    placeholder={`선택지 ${index + 1}`}
                    value={option.text}
                    onChange={(event) => updateOption(option.key, { text: event.target.value })}
                    className="form-input"
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  {!optionsLocked && options.length > MIN_OPTIONS ? (
                    <button
                      type="button"
                      onClick={() => removeOption(option.key)}
                      className="ghost-btn"
                      aria-label={`선택지 ${index + 1} 삭제`}
                      style={{ display: 'inline-flex', padding: '8px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span aria-hidden style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>
                    <ImageIcon size={13} />
                  </span>
                  <input
                    type="text"
                    aria-label={`선택지 ${index + 1} 이미지 URL`}
                    placeholder="이미지 URL (선택)"
                    value={option.imageUrl}
                    onChange={(event) => updateOption(option.key, { imageUrl: event.target.value })}
                    className="form-input"
                    style={{ flex: 1, minWidth: 0, fontSize: '0.78rem' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {!optionsLocked && options.length < MAX_OPTIONS ? (
            <button
              type="button"
              onClick={addOption}
              className="btn-secondary"
              aria-label="선택지 추가"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                justifySelf: 'start',
              }}
            >
              <Plus size={14} />
              선택지 추가
            </button>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSaving}
            aria-label="수정 내용 저장"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Save size={15} />
            {isSaving ? '저장 중…' : '수정 내용 저장'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/poll/${encodeURIComponent(id)}`)}
            className="btn-secondary"
            aria-label="수정 취소"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
};
