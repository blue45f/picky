import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@toss/tds-mobile';
import { CreatePollSchema, type CreatePollInput, type PollResultsVisibility } from '../shared';
import { usePollStore } from '../store/usePollStore';
import { theme } from '../theme';

const MAX_OPTIONS = 10;
const MIN_OPTIONS = 2;

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 12,
  color: theme.text,
  padding: '12px 14px',
  fontSize: 15,
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: theme.textMuted,
  margin: '20px 0 8px',
};

export function CreatePollPage() {
  const navigate = useNavigate();
  const { createPoll, isLoading } = usePollStore();

  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [resultsVisibility, setResultsVisibility] = useState<PollResultsVisibility>('afterVote');
  const [error, setError] = useState<string | null>(null);

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  };
  const addOption = () => setOptions((prev) => (prev.length < MAX_OPTIONS ? [...prev, ''] : prev));
  const removeOption = (index: number) =>
    setOptions((prev) => (prev.length > MIN_OPTIONS ? prev.filter((_, i) => i !== index) : prev));

  const handleSubmit = async () => {
    setError(null);
    const candidate = {
      question: question.trim(),
      description: description.trim() || null,
      resultsVisibility,
      options: options
        .map((text) => text.trim())
        .filter((text) => text.length > 0)
        .map((text) => ({ text })),
    };

    const parsed = CreatePollSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요.');
      return;
    }

    const created = await createPoll(parsed.data as CreatePollInput);
    if (created) {
      navigate(`/poll/${created.id}`, { replace: true });
    } else {
      setError('고민을 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <div style={{ background: theme.bg, minHeight: '100dvh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          paddingTop: 'calc(14px + env(safe-area-inset-top))',
        }}
      >
        <button
          type="button"
          aria-label="뒤로"
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: theme.text,
            fontSize: 22,
            cursor: 'pointer',
          }}
        >
          ←
        </button>
        <strong style={{ fontSize: 18 }}>새 고민 만들기</strong>
      </header>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px 120px' }}>
        <label style={labelStyle} htmlFor="poll-question">
          질문 *
        </label>
        <input
          id="poll-question"
          style={fieldStyle}
          value={question}
          maxLength={100}
          placeholder="어떤 고민을 투표로 만들까요?"
          onChange={(e) => setQuestion(e.target.value)}
        />

        <label style={labelStyle} htmlFor="poll-desc">
          설명 (선택)
        </label>
        <textarea
          id="poll-desc"
          style={{ ...fieldStyle, minHeight: 80, resize: 'vertical' }}
          value={description}
          maxLength={500}
          placeholder="배경이나 맥락을 덧붙여 주세요."
          onChange={(e) => setDescription(e.target.value)}
        />

        <label style={labelStyle}>선택지 * (최소 2개)</label>
        {options.map((opt, index) => (
          <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              style={fieldStyle}
              value={opt}
              maxLength={60}
              placeholder={`선택지 ${index + 1}`}
              onChange={(e) => updateOption(index, e.target.value)}
            />
            {options.length > MIN_OPTIONS ? (
              <button
                type="button"
                aria-label={`선택지 ${index + 1} 삭제`}
                onClick={() => removeOption(index)}
                style={{
                  flexShrink: 0,
                  width: 44,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 12,
                  background: theme.surface,
                  color: theme.textMuted,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            ) : null}
          </div>
        ))}
        {options.length < MAX_OPTIONS ? (
          <button
            type="button"
            onClick={addOption}
            style={{
              width: '100%',
              padding: '10px',
              border: `1px dashed ${theme.border}`,
              borderRadius: 12,
              background: 'transparent',
              color: theme.accent,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + 선택지 추가
          </button>
        ) : null}

        <label style={labelStyle}>결과 공개 시점</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(
            [
              ['afterVote', '투표 후 공개'],
              ['always', '항상 공개'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setResultsVisibility(value)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 12,
                border: `1px solid ${resultsVisibility === value ? theme.accent : theme.border}`,
                background: resultsVisibility === value ? theme.accentSoft : theme.surface,
                color: resultsVisibility === value ? theme.accent : theme.textMuted,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {error ? <p style={{ color: theme.danger, fontSize: 13, marginTop: 16 }}>{error}</p> : null}
      </div>

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '12px 20px calc(12px + env(safe-area-inset-bottom))',
          background: `linear-gradient(to top, ${theme.bg} 70%, transparent)`,
        }}
      >
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <Button style={{ width: '100%' }} loading={isLoading} onClick={handleSubmit}>
            고민 등록하기
          </Button>
        </div>
      </div>
    </div>
  );
}
