import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { usePollStore } from '../store/usePollStore';
import { Poll } from '@picky/shared';

interface PresetOption {
  text: string;
  imageUrl?: string;
}

interface PresetTemplate {
  name: string;
  icon: string;
  question: string;
  description: string;
  options: PresetOption[];
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    name: '포트폴리오 상용화',
    icon: '🚀',
    question: 'WebstormProjects 개인 프로젝트 중 어떤 것을 가장 먼저 상용 서비스화 시킬까요?',
    description:
      '이력서에 등록된 대표 프로젝트 4종 중, 시장 경쟁력과 사업화 잠재력이 가장 뛰어난 서비스를 골라주세요!',
    options: [
      {
        text: 'PromptMarket (프롬프트·스킬 마켓플레이스)',
        imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=400&q=80',
      },
      {
        text: 'proto-live (바이브코딩 실시간 동시 코딩 공유 플랫폼)',
        imageUrl: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400&q=80',
      },
      {
        text: 'family-care-platform (실버 케어 매칭 서비스 플랫폼)',
        imageUrl: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=400&q=80',
      },
      {
        text: 'orbit-ui (유려한 글라스모피즘 리액트 컴포넌트 라이브러리)',
        imageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=400&q=80',
      },
    ],
  },
  {
    name: '오늘 점심 메뉴 결정',
    icon: '🍔',
    question: '오늘 팀원들과 같이 먹을 점심 메뉴를 골라주세요!',
    description: '매번 오는 결장(결정장애)의 순간... 다수결로 깔끔하게 결정하고 가겠습니다.',
    options: [
      {
        text: '매콤하고 깔끔한 마라탕',
        imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80',
      },
      {
        text: '겉바속촉 수제 돈카츠',
        imageUrl: 'https://images.unsplash.com/photo-1582293427712-40a2a4b89643?w=400&q=80',
      },
      {
        text: '신선한 모듬 초밥 정식',
        imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&q=80',
      },
      {
        text: '든든한 부대찌개와 라면사리',
        imageUrl: 'https://images.unsplash.com/photo-1590577976322-3d231871f9eb?w=400&q=80',
      },
    ],
  },
  {
    name: '개발 생산성 도구',
    icon: '💻',
    question: '백엔드 API 개발 시 런타임 데이터 검증을 위해 무엇을 선호하시나요?',
    description:
      '새로운 마이크로서비스 설계 중인데, 개발 가이드 표준 제정을 위해 개발자분들의 의견을 듣고 싶습니다.',
    options: [
      {
        text: 'Zod (nestjs-zod 사용으로 스키마-DTO 일치화)',
        imageUrl: 'https://images.unsplash.com/photo-1516116211223-5c359a36298a?w=400&q=80',
      },
      {
        text: 'Class-Validator (기존 데코레이터 기반 검증)',
        imageUrl: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&q=80',
      },
      {
        text: 'Joi (객체 스키마 언어 검증)',
        imageUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400&q=80',
      },
      {
        text: 'JSON Schema (선언적 JSON 형태 검증)',
        imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80',
      },
    ],
  },
];

interface OptionInput {
  text: string;
  imageUrl: string;
}

export const CreatePoll: React.FC = () => {
  const { createPoll, isLoading, error, clearError } = usePollStore();
  const navigate = useNavigate();

  const [formError, setFormError] = useState('');

  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<OptionInput[]>([
    { text: '', imageUrl: '' },
    { text: '', imageUrl: '' },
  ]);
  const [activePresetIndex, setActivePresetIndex] = useState<number | null>(null);

  const buildShareablePollSnapshot = (poll: Poll): string | null => {
    try {
      const encoded = encodeURIComponent(
        btoa(
          encodeURIComponent(
            JSON.stringify({
              version: 1,
              poll,
            }),
          ),
        ),
      );
      return encoded;
    } catch {
      return null;
    }
  };

  const applyPreset = (index: number) => {
    setActivePresetIndex(index);
    const template = PRESET_TEMPLATES[index];
    clearError();
    setFormError('');
    setQuestion(template.question);
    setDescription(template.description);
    setOptions(
      template.options.map((opt) => ({
        text: opt.text,
        imageUrl: opt.imageUrl || '',
      })),
    );
    setTimeout(() => setActivePresetIndex(null), 500);
  };

  const handleAddOptionInput = () => {
    if (options.length < 10) {
      setOptions([...options, { text: '', imageUrl: '' }]);
    }
  };

  const handleRemoveOptionInput = (index: number) => {
    if (options.length > 2) {
      const nextOptions = [...options];
      nextOptions.splice(index, 1);
      setOptions(nextOptions);
    }
  };

  const handleOptionTextChange = (index: number, text: string) => {
    const nextOptions = [...options];
    nextOptions[index] = { ...nextOptions[index], text };
    setOptions(nextOptions);
  };

  const handleOptionImageChange = (index: number, imageUrl: string) => {
    const nextOptions = [...options];
    nextOptions[index] = { ...nextOptions[index], imageUrl };
    setOptions(nextOptions);
  };

  const handleCreatePollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    clearError();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setFormError('고민 제목은 필수로 입력해야 합니다.');
      return;
    }

    if (trimmedQuestion.length < 2) {
      setFormError('고민 제목은 최소 2글자 이상 입력해야 합니다.');
      return;
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length > 500) {
      setFormError('상세 내용은 최대 500자까지만 허용됩니다.');
      return;
    }

    const filtered = options
      .map((o) => ({ text: o.text.trim(), imageUrl: o.imageUrl.trim() || null }))
      .filter((o) => o.text !== '');

    if (filtered.length < 2) {
      setFormError('최소 2개 이상의 선택지 내용을 입력해 주세요.');
      return;
    }

    const result = await createPoll({
      question: trimmedQuestion,
      description: trimmedDescription || null,
      options: filtered,
    });

    if (result) {
      const snapshot = buildShareablePollSnapshot(result);
      if (snapshot) {
        navigate(`/poll/${result.id}?showShare=true&snapshot=${snapshot}`);
        return;
      }

      navigate(`/poll/${result.id}?showShare=true`);
    }
  };

  return (
    <div
      className="animate-slide-up"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          새로운 고민 올리기
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          질문과 선택지들을 등록해보세요. SNS 공유에 최적화된 단축 링크가 발급됩니다.
        </p>
      </div>

      {/* Template Selector pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Sparkles size={13} style={{ color: 'var(--brand-accent-gold)' }} />
          <span>빠른 작성을 위한 템플릿 프리셋:</span>
        </span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {PRESET_TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(idx)}
              className="btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor:
                  activePresetIndex === idx ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                borderColor:
                  activePresetIndex === idx ? 'var(--brand-primary)' : 'var(--bg-card-border)',
              }}
            >
              <span>{tmpl.icon}</span>
              <span>{tmpl.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Form */}
      <form
        onSubmit={handleCreatePollSubmit}
        className="content-card"
        style={{
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          cursor: 'default',
        }}
      >
        {/* Question */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            고민 주제 (질문)
          </label>
          {formError ? (
            <p
              style={{
                margin: 0,
                fontSize: '0.78rem',
                color: 'var(--brand-accent-coral)',
                padding: '7px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                background: 'rgba(239, 68, 68, 0.12)',
              }}
            >
              {formError}
            </p>
          ) : null}
          {error ? (
            <p
              style={{
                margin: 0,
                fontSize: '0.78rem',
                color: 'var(--brand-accent-coral)',
                padding: '7px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                background: 'rgba(239, 68, 68, 0.12)',
              }}
            >
              {error}
            </p>
          ) : null}
          <input
            type="text"
            placeholder="예: 어떤 사이드 프로젝트를 가장 먼저 상용화할까요?"
            value={question}
            onChange={(e) => {
              clearError();
              setFormError('');
              setQuestion(e.target.value);
            }}
            required
            maxLength={100}
            className="form-input"
          />
        </div>

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            상세 내용 / 고민 배경 (선택)
          </label>
          <textarea
            placeholder="결정을 내리기 힘든 맥락이나 프로젝트의 간략한 소개 등을 작성해주세요."
            value={description}
            onChange={(e) => {
              clearError();
              setFormError('');
              setDescription(e.target.value);
            }}
            rows={4}
            maxLength={500}
            className="form-input"
            style={{ resize: 'none' }}
          />
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              투표 선택지 목록 (2~10개)
            </label>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {options.length} / 10
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {options.map((option, index) => (
              <div
                key={index}
                className="content-card"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  backgroundColor: 'oklch(16% 0.015 260)',
                  border: '1px solid var(--bg-card-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontWeight: 700 }}
                  >
                    선택지 {index + 1}
                  </span>
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOptionInput(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2
                        size={15}
                        style={{ transition: 'color 0.2s' }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = 'var(--brand-accent-coral)')
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                      />
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="내용 입력 (필수)"
                    value={option.text}
                    onChange={(e) => {
                      clearError();
                      setFormError('');
                      handleOptionTextChange(index, e.target.value);
                    }}
                    required
                    maxLength={80}
                    className="form-input"
                    style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                  />
                  <input
                    type="url"
                    placeholder="이미지 주소 (선택)"
                    value={option.imageUrl}
                    onChange={(e) => {
                      clearError();
                      setFormError('');
                      handleOptionImageChange(index, e.target.value);
                    }}
                    maxLength={200}
                    className="form-input"
                    style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {options.length < 10 && (
            <button
              type="button"
              onClick={handleAddOptionInput}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(255, 255, 255, 0.015)',
                border: '1px dashed var(--bg-card-border)',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                marginTop: '4px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'var(--brand-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.015)';
                e.currentTarget.style.borderColor = 'var(--bg-card-border)';
              }}
            >
              <Plus size={14} />
              <span>선택지 추가</span>
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-secondary"
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '0.85rem',
            }}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{
              flex: 2,
              padding: '12px',
              fontSize: '0.85rem',
            }}
          >
            {isLoading ? '고민 등록 중...' : '고민 등록 및 링크 생성'}
          </button>
        </div>
      </form>
    </div>
  );
};
