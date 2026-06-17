import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Code2,
  Eye,
  FileText,
  ImageIcon,
  Link2,
  Monitor,
  Plus,
  Search,
  Share2,
  Sparkles,
  Smartphone,
  TimerReset,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePollStore } from '../store/usePollStore';
import { SnsPreviewCard } from '../components/SnsPreviewCard';
import { ParticipantPreviewPanel } from '../components/ParticipantPreviewPanel';
import { buildShareablePollSnapshot } from '../lib/pollShare';
import type { PollResultsVisibility } from '@picky/shared';

interface PresetOption {
  text: string;
  imageUrl?: string;
}

type PresetCategory = 'work' | 'education' | 'event' | 'product' | 'life';
type PresetCategoryFilter = 'all' | PresetCategory;

interface PresetTemplate {
  name: string;
  icon: string;
  category: PresetCategory;
  question: string;
  description: string;
  options: PresetOption[];
}

const PRESET_CATEGORY_OPTIONS: Array<{ value: PresetCategoryFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'work', label: '업무' },
  { value: 'education', label: '수업' },
  { value: 'event', label: '모임' },
  { value: 'product', label: '제품' },
  { value: 'life', label: '일상' },
];

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    name: '포트폴리오 상용화',
    icon: '🚀',
    category: 'product',
    question: 'WebstormProjects 개인 프로젝트 중 어떤 것을 가장 먼저 상용 서비스화 시킬까요?',
    description:
      '이력서에 등록된 대표 프로젝트 4종 중, 시장 경쟁력과 사업화 잠재력이 가장 뛰어난 서비스를 골라주세요!',
    options: [
      { text: 'PromptMarket (프롬프트·스킬 마켓플레이스)' },
      { text: 'proto-live (바이브코딩 실시간 동시 코딩 공유 플랫폼)' },
      { text: 'family-care-platform (실버 케어 매칭 서비스 플랫폼)' },
      { text: 'orbit-ui (유려한 글라스모피즘 리액트 컴포넌트 라이브러리)' },
    ],
  },
  {
    name: '오늘 점심 메뉴 결정',
    icon: '🍔',
    category: 'life',
    question: '오늘 팀원들과 같이 먹을 점심 메뉴를 골라주세요!',
    description: '매번 오는 결장(결정장애)의 순간... 다수결로 깔끔하게 결정하고 가겠습니다.',
    options: [
      { text: '매콤하고 깔끔한 마라탕' },
      { text: '겉바속촉 수제 돈카츠' },
      { text: '신선한 모듬 초밥 정식' },
      { text: '든든한 부대찌개와 라면사리' },
    ],
  },
  {
    name: '개발 생산성 도구',
    icon: '💻',
    category: 'product',
    question: '백엔드 API 개발 시 런타임 데이터 검증을 위해 무엇을 선호하시나요?',
    description:
      '새로운 마이크로서비스 설계 중인데, 개발 가이드 표준 제정을 위해 개발자분들의 의견을 듣고 싶습니다.',
    options: [
      { text: 'Zod (nestjs-zod 사용으로 스키마-DTO 일치화)' },
      { text: 'Class-Validator (기존 데코레이터 기반 검증)' },
      { text: 'Joi (객체 스키마 언어 검증)' },
      { text: 'JSON Schema (선언적 JSON 형태 검증)' },
    ],
  },
  {
    name: '회의 우선순위 정리',
    icon: '🧭',
    category: 'work',
    question: '오늘 회의에서 가장 먼저 결정해야 할 안건은 무엇인가요?',
    description:
      '제한된 회의 시간 안에서 모두가 중요하다고 보는 안건을 먼저 정리해 논의 순서를 잡으려 합니다.',
    options: [
      { text: '이번 주 배포 범위 확정' },
      { text: '사용자 피드백 기반 우선순위 조정' },
      { text: '예상 리스크와 담당자 재정리' },
      { text: '다음 스프린트 목표 합의' },
    ],
  },
  {
    name: '수업 이해도 체크',
    icon: '🎓',
    category: 'education',
    question: '오늘 수업에서 가장 더 설명이 필요한 부분은 무엇인가요?',
    description: '다음 시간에 보강할 내용을 정하기 위해 익명에 가까운 빠른 피드백을 받고 싶습니다.',
    options: [
      { text: '핵심 개념 정의' },
      { text: '예제 풀이 과정' },
      { text: '실습 과제 진행 방법' },
      { text: '시험/평가 기준' },
    ],
  },
  {
    name: '행사/모임 일정 선택',
    icon: '📅',
    category: 'event',
    question: '이번 모임을 진행하기에 가장 좋은 시간대는 언제인가요?',
    description:
      '참석 가능한 사람이 가장 많은 시간대를 빠르게 찾고, 댓글로 불가 사유도 함께 모으려 합니다.',
    options: [
      { text: '평일 저녁 7시 이후' },
      { text: '토요일 오전' },
      { text: '토요일 오후' },
      { text: '일요일 오후' },
    ],
  },
  {
    name: '제품 기능 우선순위',
    icon: '🧪',
    category: 'product',
    question: '다음 릴리스에서 가장 먼저 개선해야 할 기능은 무엇인가요?',
    description: '사용자 만족도와 구현 난이도를 함께 고려해 다음 릴리스 범위를 결정하려 합니다.',
    options: [
      { text: '온보딩과 첫 사용 경험' },
      { text: '검색/필터 정확도' },
      { text: '공유와 초대 흐름' },
      { text: '모바일 반응형과 속도' },
    ],
  },
  {
    name: '팀 회고 액션 선택',
    icon: '🔁',
    category: 'work',
    question: '이번 회고 후 바로 실행할 개선 액션은 무엇인가요?',
    description: '좋았던 점보다 다음 주에 실제로 바꿀 행동을 정하는 데 초점을 둔 투표입니다.',
    options: [
      { text: '회의 시간을 30분으로 제한' },
      { text: '작업 완료 기준을 더 명확히 작성' },
      { text: '리뷰 요청 템플릿 통일' },
      { text: '긴급 이슈 대응 룰 재정의' },
    ],
  },
  {
    name: '고객 피드백 분류',
    icon: '💬',
    category: 'work',
    question: '최근 고객 피드백 중 가장 먼저 대응해야 할 유형은 무엇인가요?',
    description:
      '피드백을 단순 수집에서 끝내지 않고, 실제 개선 액션으로 이어질 우선순위를 정하려 합니다.',
    options: [
      { text: '버그와 사용 오류' },
      { text: '가격/플랜 문의' },
      { text: '기능 추가 요청' },
      { text: '사용 방법 안내 부족' },
    ],
  },
];

interface OptionInput {
  text: string;
  imageUrl: string;
}

interface AttachmentInput {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

type EmbedPreviewDevice = 'desktop' | 'mobile';
type DeadlinePreset = 'none' | 'tonight' | 'day' | 'threeDays' | 'week';

const MAX_OPTIONS = 10;
const POLL_DRAFT_STORAGE_KEY = 'picky_create_poll_draft_v1';
const AUTO_SAVE_INTERVAL_MS = 700;
const MAX_IMAGE_SOURCE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DATA_URL_BYTES = 140 * 1024;
const IMAGE_OUTPUT_MAX_SIDE = 720;
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_FILE_BYTES = 300 * 1024;
const MAX_ATTACHMENT_DATA_URL_BYTES = 420 * 1024;
const SUPPORTED_ATTACHMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
];

const DEADLINE_PRESETS: Array<{ value: DeadlinePreset; label: string }> = [
  { value: 'none', label: '마감 없음' },
  { value: 'tonight', label: '오늘 밤' },
  { value: 'day', label: '24시간' },
  { value: 'threeDays', label: '3일' },
  { value: 'week', label: '1주' },
];

interface PollDraft {
  question: string;
  description: string;
  endsAtLocal: string;
  resultsVisibility: PollResultsVisibility;
  options: OptionInput[];
  attachments: AttachmentInput[];
  savedAt: string;
}

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

const isResultsVisibility = (value: unknown): value is PollResultsVisibility => {
  return value === 'afterVote' || value === 'always';
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

const toDateTimeLocalValue = (date: Date): string => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const resolveDeadlinePresetValue = (preset: DeadlinePreset): string => {
  const now = new Date();

  switch (preset) {
    case 'tonight': {
      const tonight = new Date(now);
      tonight.setHours(23, 59, 0, 0);
      if (tonight.getTime() <= now.getTime() + 60 * 1000) {
        tonight.setDate(tonight.getDate() + 1);
      }
      return toDateTimeLocalValue(tonight);
    }
    case 'day':
      return toDateTimeLocalValue(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    case 'threeDays':
      return toDateTimeLocalValue(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000));
    case 'week':
      return toDateTimeLocalValue(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
    default:
      return '';
  }
};

const loadDraftFromStorage = (): PollDraft | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(POLL_DRAFT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const question = typeof parsed.question === 'string' ? parsed.question : '';
    const description = typeof parsed.description === 'string' ? parsed.description : '';
    const endsAtLocal = typeof parsed.endsAtLocal === 'string' ? parsed.endsAtLocal : '';
    const resultsVisibility = isResultsVisibility(parsed.resultsVisibility)
      ? parsed.resultsVisibility
      : 'afterVote';
    const options = Array.isArray(parsed.options)
      ? parsed.options
          .map((item: unknown) => {
            if (!item || typeof item !== 'object') {
              return null;
            }

            const next = item as { text?: unknown; imageUrl?: unknown };
            if (typeof next.text !== 'string' || typeof next.imageUrl !== 'string') {
              return null;
            }

            return {
              text: next.text,
              imageUrl: next.imageUrl,
            } satisfies OptionInput;
          })
          .filter((item: OptionInput | null): item is OptionInput => item !== null)
      : [];
    const attachments = Array.isArray(parsed.attachments)
      ? parsed.attachments
          .map((item: unknown) => {
            if (!item || typeof item !== 'object') {
              return null;
            }

            const next = item as {
              name?: unknown;
              type?: unknown;
              size?: unknown;
              dataUrl?: unknown;
            };

            if (
              typeof next.name !== 'string' ||
              typeof next.type !== 'string' ||
              typeof next.size !== 'number' ||
              typeof next.dataUrl !== 'string'
            ) {
              return null;
            }

            return {
              name: next.name,
              type: next.type,
              size: next.size,
              dataUrl: next.dataUrl,
            } satisfies AttachmentInput;
          })
          .filter((item: AttachmentInput | null): item is AttachmentInput => item !== null)
          .slice(0, MAX_ATTACHMENTS)
      : [];

    if (options.length === 0) {
      return null;
    }

    return {
      question,
      description,
      endsAtLocal,
      resultsVisibility,
      options,
      attachments,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

const clearDraftStorage = () => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(POLL_DRAFT_STORAGE_KEY);
};

const saveDraftToStorage = (draft: PollDraft) => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(POLL_DRAFT_STORAGE_KEY, JSON.stringify(draft));
};

const createDefaultOptions = (): OptionInput[] => [
  { text: '', imageUrl: '' },
  { text: '', imageUrl: '' },
];

const getDataUrlByteLength = (value: string) => {
  return new Blob([value]).size;
};

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('파일을 읽을 수 없습니다.'));
    };
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsDataURL(file);
  });
};

const loadImageElement = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'));
    image.src = src;
  });
};

const compressImageFile = async (file: File): Promise<string> => {
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('JPG, PNG, WebP 이미지만 업로드할 수 있습니다.');
  }

  if (file.size > MAX_IMAGE_SOURCE_BYTES) {
    throw new Error('이미지 파일은 5MB 이하만 업로드할 수 있습니다.');
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageElement(sourceDataUrl);
  const scale = Math.min(1, IMAGE_OUTPUT_MAX_SIDE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('이미지 변환을 지원하지 않는 브라우저입니다.');
  }

  context.fillStyle = '#f4fffc';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  const compressed = canvas.toDataURL('image/jpeg', 0.78);

  if (getDataUrlByteLength(compressed) > MAX_IMAGE_DATA_URL_BYTES) {
    throw new Error('이미지가 너무 큽니다. 더 작은 이미지로 다시 선택해 주세요.');
  }

  return compressed;
};

export const CreatePoll: React.FC = () => {
  const { createPoll, isLoading, error, clearError } = usePollStore();
  const navigate = useNavigate();
  const [cachedDraft, setCachedDraft] = useState<PollDraft | null>(() => loadDraftFromStorage());

  const [formError, setFormError] = useState('');

  const [question, setQuestion] = useState(cachedDraft?.question || '');
  const [description, setDescription] = useState(cachedDraft?.description || '');
  const [endsAtLocal, setEndsAtLocal] = useState(cachedDraft?.endsAtLocal || '');
  const [resultsVisibility, setResultsVisibility] = useState<PollResultsVisibility>(
    cachedDraft?.resultsVisibility || 'afterVote',
  );
  const [options, setOptions] = useState<OptionInput[]>(
    cachedDraft?.options && cachedDraft.options.length >= 2
      ? [...cachedDraft.options]
      : createDefaultOptions(),
  );
  const [activePresetIndex, setActivePresetIndex] = useState<number | null>(null);
  const [templateCategory, setTemplateCategory] = useState<PresetCategoryFilter>('all');
  const [templateSearchInput, setTemplateSearchInput] = useState('');
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(cachedDraft?.savedAt || null);
  const [showEmbedPreview, setShowEmbedPreview] = useState(false);
  const [embedPreviewDevice, setEmbedPreviewDevice] = useState<EmbedPreviewDevice>('desktop');
  const [bulkOptionsText, setBulkOptionsText] = useState('');
  const [draggingOptionIndex, setDraggingOptionIndex] = useState<number | null>(null);
  const [isAttachmentDragging, setIsAttachmentDragging] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentInput[]>(cachedDraft?.attachments || []);

  const normalizedQuestion = question.trim();
  const normalizedDescription = description.trim();
  const normalizedEndsAt = useMemo(() => resolveIsoEndAt(endsAtLocal), [endsAtLocal]);
  const isEndsAtInvalid = Boolean(
    endsAtLocal.trim() &&
    (!normalizedEndsAt || new Date(normalizedEndsAt).getTime() <= Date.now() + 60 * 1000),
  );
  const normalizedOptions = useMemo(
    () =>
      options.map((option) => ({
        text: option.text.trim(),
        imageUrl: option.imageUrl.trim() || null,
      })),
    [options],
  );
  const nonEmptyOptions = useMemo(
    () => normalizedOptions.filter((option) => option.text.length > 0),
    [normalizedOptions],
  );
  const hasDuplicateOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const option of nonEmptyOptions) {
      const token = option.text.toLowerCase();
      if (seen.has(token)) {
        return true;
      }
      seen.add(token);
    }
    return false;
  }, [nonEmptyOptions]);
  const presetCategoryCounts = useMemo(
    () =>
      PRESET_CATEGORY_OPTIONS.reduce<Record<PresetCategoryFilter, number>>(
        (counts, category) => {
          counts[category.value] =
            category.value === 'all'
              ? PRESET_TEMPLATES.length
              : PRESET_TEMPLATES.filter((template) => template.category === category.value).length;
          return counts;
        },
        {
          all: 0,
          work: 0,
          education: 0,
          event: 0,
          product: 0,
          life: 0,
        },
      ),
    [],
  );
  const visiblePresetTemplates = useMemo(() => {
    const normalizedSearch = templateSearchInput.trim().toLowerCase();

    return PRESET_TEMPLATES.map((template, index) => ({ template, index })).filter((item) => {
      const categoryMatched =
        templateCategory === 'all' || item.template.category === templateCategory;

      if (!categoryMatched) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        item.template.name,
        item.template.question,
        item.template.description,
        ...item.template.options.map((option) => option.text),
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [templateCategory, templateSearchInput]);

  const hasDraft = useMemo(() => {
    return Boolean(
      question.trim() ||
      description.trim() ||
      endsAtLocal.trim() ||
      resultsVisibility !== 'afterVote' ||
      nonEmptyOptions.length > 0 ||
      options.some((option) => option.imageUrl || option.text.trim()) ||
      attachments.length > 0,
    );
  }, [
    question,
    description,
    endsAtLocal,
    resultsVisibility,
    options,
    nonEmptyOptions.length,
    attachments.length,
  ]);

  useEffect(() => {
    if (!hasDraft) {
      return;
    }

    const timer = window.setTimeout(() => {
      const nextDraft: PollDraft = {
        question: question.trim(),
        description: description.trim(),
        endsAtLocal,
        resultsVisibility,
        options: options.map((option) => ({
          text: option.text.trim(),
          imageUrl: option.imageUrl.trim(),
        })),
        attachments,
        savedAt: new Date().toISOString(),
      };

      saveDraftToStorage(nextDraft);
      setCachedDraft(nextDraft);
      setDraftSavedAt(nextDraft.savedAt);
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [question, description, endsAtLocal, resultsVisibility, options, attachments, hasDraft]);

  const handleRestoreDraft = () => {
    if (!cachedDraft) {
      return;
    }

    const nextDraft = cachedDraft;
    setQuestion(nextDraft.question);
    setDescription(nextDraft.description);
    setEndsAtLocal(nextDraft.endsAtLocal || '');
    setResultsVisibility(nextDraft.resultsVisibility || 'afterVote');
    setOptions(nextDraft.options.length >= 2 ? [...nextDraft.options] : createDefaultOptions());
    setAttachments(nextDraft.attachments || []);
    setDraftSavedAt(nextDraft.savedAt);
    setFormError('');
    clearError();
  };

  const handleClearDraft = () => {
    clearDraftStorage();
    setCachedDraft(null);
    setDraftSavedAt(null);
  };

  const canSubmit =
    normalizedQuestion.length >= 2 &&
    normalizedQuestion.length <= 100 &&
    nonEmptyOptions.length >= 2 &&
    !hasDuplicateOptions &&
    normalizedDescription.length <= 500 &&
    !isEndsAtInvalid &&
    attachments.length <= MAX_ATTACHMENTS &&
    !isLoading;

  const qualityItems = useMemo(
    () => [
      {
        label: '질문 명확도',
        passed: normalizedQuestion.length >= 8 && normalizedQuestion.length <= 80,
        help: '8~80자 질문은 공유 카드와 모바일 화면에서 읽기 좋습니다.',
      },
      {
        label: '판단 맥락',
        passed: normalizedDescription.length >= 20,
        help: '투표자가 기준을 이해할 수 있도록 배경을 짧게 더해보세요.',
      },
      {
        label: '선택지 범위',
        passed: nonEmptyOptions.length >= 2 && nonEmptyOptions.length <= 6,
        help: '2~6개 선택지는 빠른 비교와 결정에 적합합니다.',
      },
      {
        label: '중복 제거',
        passed: !hasDuplicateOptions && nonEmptyOptions.length >= 2,
        help: '서로 다른 선택지일수록 결과 해석이 쉬워집니다.',
      },
      {
        label: '공유 준비',
        passed: normalizedQuestion.length > 0 && nonEmptyOptions.length >= 2,
        help: '질문과 선택지가 모두 있어야 링크 공유 후 바로 참여할 수 있습니다.',
      },
      {
        label: '운영 설정',
        passed: !isEndsAtInvalid,
        help: '마감 시간을 쓰는 경우 현재 시각보다 충분히 뒤로 설정해야 합니다.',
      },
    ],
    [
      hasDuplicateOptions,
      isEndsAtInvalid,
      nonEmptyOptions.length,
      normalizedDescription.length,
      normalizedQuestion.length,
    ],
  );

  const passedQualityCount = qualityItems.filter((item) => item.passed).length;
  const qualityScore = Math.round((passedQualityCount / qualityItems.length) * 100);
  const imageOptionCount = normalizedOptions.filter((option) => Boolean(option.imageUrl)).length;
  const qualityTone =
    qualityScore >= 80
      ? 'var(--brand-accent-teal)'
      : qualityScore >= 60
        ? 'var(--brand-accent-gold)'
        : 'var(--brand-accent-coral)';
  const longOptionCount = nonEmptyOptions.filter((option) => option.text.length > 36).length;
  const averageOptionLength =
    nonEmptyOptions.length > 0
      ? Math.round(
          nonEmptyOptions.reduce((total, option) => total + option.text.length, 0) /
            nonEmptyOptions.length,
        )
      : 0;
  const hasQuestionShape =
    normalizedQuestion.length >= 8 &&
    normalizedQuestion.length <= 80 &&
    /[?？]$/.test(normalizedQuestion);
  const hasLoadedWording = /(무조건|당연히|반드시|항상|절대|최고|최악)/.test(
    `${normalizedQuestion} ${normalizedDescription}`,
  );
  const responseEffort =
    nonEmptyOptions.length <= 4 && normalizedDescription.length <= 180 && longOptionCount === 0
      ? '낮음'
      : nonEmptyOptions.length <= 6 && normalizedDescription.length <= 320 && longOptionCount <= 1
        ? '보통'
        : '높음';
  const launchActionItems = [
    {
      label: '질문 형태',
      ready: hasQuestionShape,
      value: hasQuestionShape ? '질문형 문장' : '질문 끝을 ?로 마무리',
      action: hasQuestionShape
        ? '공유 카드에서 질문 의도가 명확하게 보입니다.'
        : '응답자가 바로 판단할 수 있도록 질문형 문장으로 다듬어 보세요.',
    },
    {
      label: '편향 표현',
      ready: !hasLoadedWording,
      value: hasLoadedWording ? '강한 유도어 감지' : '중립 문장',
      action: hasLoadedWording
        ? '무조건, 최고, 최악 같은 단어는 결과를 한쪽으로 유도할 수 있습니다.'
        : '응답자가 자기 기준으로 고르기 좋은 톤입니다.',
    },
    {
      label: '응답 부담',
      ready: responseEffort !== '높음',
      value: `부담 ${responseEffort}`,
      action:
        responseEffort === '높음'
          ? '설명이 길거나 선택지가 복잡합니다. 선택지 문장을 줄이면 모바일 참여율이 좋아집니다.'
          : '짧은 시간 안에 읽고 선택할 수 있는 구조입니다.',
    },
    {
      label: '판단 근거',
      ready: normalizedDescription.length >= 20 || imageOptionCount > 0 || attachments.length > 0,
      value:
        attachments.length > 0
          ? `첨부 ${attachments.length}개`
          : imageOptionCount > 0
            ? `이미지 ${imageOptionCount}개`
            : normalizedDescription.length >= 20
              ? '배경 설명 있음'
              : '맥락 보강 필요',
      action:
        normalizedDescription.length >= 20 || imageOptionCount > 0 || attachments.length > 0
          ? '투표자가 선택 기준을 이해할 수 있는 자료가 있습니다.'
          : '짧은 배경 설명이나 참고 파일을 추가하면 선택 이유가 더 잘 모입니다.',
    },
  ];
  const launchActionReadyCount = launchActionItems.filter((item) => item.ready).length;
  const surveyCoachItems = [
    {
      label: '한 질문 한 결정',
      passed: hasQuestionShape,
      value: hasQuestionShape ? '명확함' : '질문형으로 다듬기',
      help: '응답자는 질문이 짧고 끝이 분명할수록 바로 선택합니다.',
    },
    {
      label: '편향 표현',
      passed: !hasLoadedWording,
      value: hasLoadedWording ? '강한 표현 감지' : '중립적',
      help: '무조건, 당연히, 최고 같은 표현은 선택을 유도할 수 있습니다.',
    },
    {
      label: '모바일 선택 부담',
      passed: nonEmptyOptions.length >= 2 && nonEmptyOptions.length <= 6 && longOptionCount === 0,
      value:
        nonEmptyOptions.length > 0
          ? `평균 ${averageOptionLength}자 · 긴 선택지 ${longOptionCount}개`
          : '선택지 대기',
      help: '짧은 선택지 2~6개가 모바일 단톡방 응답에 가장 안정적입니다.',
    },
    {
      label: '응답 부담',
      passed: responseEffort !== '높음',
      value: responseEffort,
      help: '설명이 길거나 선택지가 많으면 공유 후 이탈 가능성이 커집니다.',
    },
  ];
  const sharePreviewTitle = normalizedQuestion || '공유될 고민 제목이 여기에 표시됩니다';
  const sharePreviewDescription =
    normalizedDescription ||
    '상세 내용을 작성하면 카카오톡/링크 미리보기에서 투표 맥락을 더 명확하게 보여줄 수 있습니다.';
  const sharePreviewOptions = nonEmptyOptions.slice(0, 3).map((option) => option.text);
  const sharePreviewImageUrl =
    normalizedOptions.find((option) => option.imageUrl)?.imageUrl || null;
  const deadlineLabel = normalizedEndsAt
    ? new Date(normalizedEndsAt).toLocaleString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '상시 진행';
  const resultsVisibilityLabel =
    resultsVisibility === 'always' ? '실시간 결과 공개' : '투표 후 결과 공개';
  const shareReady = normalizedQuestion.length > 0 && nonEmptyOptions.length >= 2;
  const readableCharacterCount =
    normalizedQuestion.length +
    normalizedDescription.length +
    nonEmptyOptions.reduce((total, option) => total + option.text.length, 0);
  const estimatedReadSeconds =
    readableCharacterCount > 0 ? Math.max(6, Math.ceil(readableCharacterCount / 14)) : 0;
  const participantExperienceItems = [
    {
      label: '첫 화면 집중도',
      icon: Smartphone,
      value: shareReady ? `${estimatedReadSeconds}초 안에 읽기` : '질문/선택지 대기',
      help: shareReady
        ? '참여자가 링크를 열었을 때 질문과 선택지를 한 번에 훑을 수 있습니다.'
        : '질문과 최소 2개 선택지를 입력해야 실제 참여 화면이 완성됩니다.',
      ready: shareReady && responseEffort !== '높음',
    },
    {
      label: '시각 자료',
      icon: ImageIcon,
      value: imageOptionCount > 0 ? `이미지 ${imageOptionCount}개` : '텍스트 중심',
      help:
        imageOptionCount > 0
          ? '이미지가 있는 선택지는 비교 판단과 공유 미리보기에서 더 잘 드러납니다.'
          : '비교가 어려운 항목이면 선택지 이미지 업로드를 고려하세요.',
      ready: imageOptionCount > 0 || nonEmptyOptions.length <= 4,
    },
    {
      label: '참고 자료',
      icon: FileText,
      value: attachments.length > 0 ? `첨부 ${attachments.length}개` : '첨부 없음',
      help:
        attachments.length > 0
          ? '참여자가 상세 화면에서 자료를 보고 선택 이유를 남길 수 있습니다.'
          : '근거가 필요한 투표라면 작은 PDF/TXT/CSV/JSON 파일을 첨부할 수 있습니다.',
      ready: attachments.length > 0 || normalizedDescription.length >= 20,
    },
    {
      label: '운영 신호',
      icon: TimerReset,
      value: `${resultsVisibilityLabel} · ${deadlineLabel}`,
      help: endsAtLocal
        ? '마감이 있으면 공유 메시지와 리마인더에서 행동 시점이 분명해집니다.'
        : '상시 투표는 부담이 낮지만 응답을 모으는 긴급성은 약합니다.',
      ready: !isEndsAtInvalid,
    },
  ];
  const shareReadinessItems = [
    {
      label: '참여 링크',
      icon: Link2,
      ready: shareReady,
      value: shareReady ? '생성 즉시 발급' : '질문과 선택지 필요',
    },
    {
      label: '카카오 OG',
      icon: Share2,
      ready: shareReady,
      value: imageOptionCount > 0 ? '업로드 이미지 반영' : '기본 이미지 사용',
    },
    {
      label: '임베드 코드',
      icon: Code2,
      ready: shareReady,
      value: shareReady ? '웹사이트 삽입 가능' : '생성 후 복사 가능',
    },
    {
      label: '운영 상태',
      icon: TimerReset,
      ready: !isEndsAtInvalid,
      value: deadlineLabel,
    },
  ];
  const parsedBulkOptions = bulkOptionsText
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
    .slice(0, MAX_OPTIONS);
  const publishBlockedReasons = [
    normalizedQuestion.length < 2 ? '질문을 2자 이상 입력해야 합니다.' : null,
    normalizedQuestion.length > 100 ? '질문은 100자 이하로 줄여야 합니다.' : null,
    normalizedDescription.length > 500 ? '상세 내용은 500자 이하로 줄여야 합니다.' : null,
    nonEmptyOptions.length < 2 ? '선택지는 최소 2개 필요합니다.' : null,
    hasDuplicateOptions ? '중복된 선택지 텍스트를 정리해야 합니다.' : null,
    isEndsAtInvalid ? '마감 시간은 현재보다 최소 1분 이후여야 합니다.' : null,
    attachments.length > MAX_ATTACHMENTS ? '첨부파일은 최대 3개까지 등록할 수 있습니다.' : null,
    isLoading ? '투표 생성 요청을 처리 중입니다.' : null,
  ].filter((item): item is string => item !== null);
  const publishReviewItems = [
    {
      label: '질문',
      ready: normalizedQuestion.length >= 2 && normalizedQuestion.length <= 100,
      value: normalizedQuestion ? `${normalizedQuestion.length}/100자` : '입력 필요',
      help: normalizedQuestion || '공유 카드의 제목으로 쓰입니다.',
    },
    {
      label: '선택지',
      ready: nonEmptyOptions.length >= 2 && !hasDuplicateOptions,
      value: `${nonEmptyOptions.length}개`,
      help: hasDuplicateOptions ? '중복 선택지를 제거하세요.' : '응답자가 고를 항목입니다.',
    },
    {
      label: '업로드 이미지',
      ready: true,
      value: imageOptionCount > 0 ? `${imageOptionCount}개 포함` : '이미지 없이 생성',
      help:
        imageOptionCount > 0
          ? '선택지 이미지와 OG 미리보기에 반영됩니다.'
          : '필요하면 선택지별 업로드 버튼으로 파일을 추가할 수 있습니다.',
    },
    {
      label: '첨부파일',
      ready: attachments.length <= MAX_ATTACHMENTS,
      value: attachments.length > 0 ? `${attachments.length}개 첨부` : '파일 없이 생성',
      help:
        attachments.length > 0
          ? '참여자가 상세 화면에서 참고 파일을 내려받을 수 있습니다.'
          : '필요하면 PDF/TXT/CSV/JSON 파일을 첨부할 수 있습니다.',
    },
    {
      label: '운영 설정',
      ready: !isEndsAtInvalid,
      value: `${resultsVisibilityLabel} · ${deadlineLabel}`,
      help: '마감과 결과 공개 정책은 생성 후 참여 흐름에 영향을 줍니다.',
    },
  ];
  const publishReadyCount = publishReviewItems.filter((item) => item.ready).length;

  const applyPreset = (index: number) => {
    setActivePresetIndex(index);
    const template = PRESET_TEMPLATES[index];
    clearError();
    setFormError('');
    setQuestion(template.question);
    setDescription(template.description);
    setAttachments([]);
    setOptions(
      template.options.map((opt) => ({
        text: opt.text,
        imageUrl: opt.imageUrl || '',
      })),
    );
    setTimeout(() => setActivePresetIndex(null), 500);
  };

  const handleReset = () => {
    setQuestion('');
    setDescription('');
    setEndsAtLocal('');
    setResultsVisibility('afterVote');
    setOptions(createDefaultOptions());
    setAttachments([]);
    setActivePresetIndex(null);
    setFormError('');
    clearError();
    clearDraftStorage();
    setDraftSavedAt(null);
  };

  const handleAddOptionInput = () => {
    if (options.length < MAX_OPTIONS) {
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

  const handleApplyBulkOptions = () => {
    if (parsedBulkOptions.length < 2) {
      setFormError('붙여넣기 선택지는 줄바꿈 기준으로 최소 2개 이상 필요합니다.');
      return;
    }

    clearError();
    setFormError('');
    setOptions(
      parsedBulkOptions.map((text, index) => ({
        text,
        imageUrl: options[index]?.imageUrl || '',
      })),
    );
    setBulkOptionsText('');
  };

  const handleReadClipboardOptions = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
      setFormError('이 브라우저에서는 클립보드 읽기를 지원하지 않습니다. 직접 붙여넣어 주세요.');
      return;
    }

    try {
      clearError();
      setFormError('');
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText.trim()) {
        setFormError('클립보드에 가져올 선택지 텍스트가 없습니다.');
        return;
      }
      setBulkOptionsText(clipboardText);
    } catch (err) {
      console.error('[picky] failed to read clipboard options', err);
      setFormError('클립보드 권한을 확인할 수 없습니다. 선택지 목록을 직접 붙여넣어 주세요.');
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

  const handleOptionImageUpload = async (index: number, file?: File) => {
    if (!file) {
      return;
    }

    try {
      clearError();
      setFormError('');
      const imageUrl = await compressImageFile(file);
      handleOptionImageChange(index, imageUrl);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.');
    }
  };

  const handleOptionImageDrop = (index: number, event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDraggingOptionIndex(null);
    const file = event.dataTransfer.files?.[0];
    void handleOptionImageUpload(index, file);
  };

  const handleRemoveOptionImage = (index: number) => {
    handleOptionImageChange(index, '');
  };

  const isSupportedAttachmentFile = (file: File) => {
    return (
      SUPPORTED_ATTACHMENT_TYPES.includes(file.type) || /\.(pdf|txt|csv|json)$/i.test(file.name)
    );
  };

  const handleAttachmentUpload = async (fileList?: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const availableSlots = MAX_ATTACHMENTS - attachments.length;
    if (availableSlots <= 0) {
      setFormError(`첨부파일은 최대 ${MAX_ATTACHMENTS}개까지 등록할 수 있습니다.`);
      return;
    }

    try {
      clearError();
      setFormError('');
      const nextAttachments: AttachmentInput[] = [];

      for (const file of Array.from(fileList).slice(0, availableSlots)) {
        if (!isSupportedAttachmentFile(file)) {
          throw new Error('PDF, TXT, CSV, JSON 파일만 첨부할 수 있습니다.');
        }

        if (file.size > MAX_ATTACHMENT_FILE_BYTES) {
          throw new Error('첨부파일은 파일당 300KB 이하만 등록할 수 있습니다.');
        }

        const dataUrl = await readFileAsDataUrl(file);
        if (getDataUrlByteLength(dataUrl) > MAX_ATTACHMENT_DATA_URL_BYTES) {
          throw new Error('첨부파일 데이터가 너무 큽니다. 더 작은 파일을 선택해 주세요.');
        }

        nextAttachments.push({
          name: file.name.slice(0, 120),
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl,
        });
      }

      setAttachments((current) => [...current, ...nextAttachments].slice(0, MAX_ATTACHMENTS));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '첨부파일 업로드에 실패했습니다.');
    }
  };

  const handleAttachmentDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();

    if (attachments.length >= MAX_ATTACHMENTS) {
      event.dataTransfer.dropEffect = 'none';
      return;
    }

    event.dataTransfer.dropEffect = 'copy';
    setIsAttachmentDragging(true);
  };

  const handleAttachmentDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsAttachmentDragging(false);

    if (attachments.length >= MAX_ATTACHMENTS) {
      setFormError(`첨부파일은 최대 ${MAX_ATTACHMENTS}개까지 등록할 수 있습니다.`);
      return;
    }

    void handleAttachmentUpload(event.dataTransfer.files);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleCreatePollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    clearError();

    if (!normalizedQuestion) {
      setFormError('고민 제목은 필수로 입력해야 합니다.');
      return;
    }

    if (normalizedQuestion.length < 2) {
      setFormError('고민 제목은 최소 2글자 이상 입력해야 합니다.');
      return;
    }

    if (normalizedQuestion.length > 100) {
      setFormError('고민 제목은 최대 100자까지 입력할 수 있습니다.');
      return;
    }

    if (normalizedDescription.length > 500) {
      setFormError('상세 내용은 최대 500자까지만 허용됩니다.');
      return;
    }

    if (isEndsAtInvalid) {
      setFormError('마감 시간은 현재보다 최소 1분 이후로 설정해 주세요.');
      return;
    }

    if (nonEmptyOptions.length < 2) {
      setFormError('최소 2개 이상의 선택지 내용을 입력해 주세요.');
      return;
    }

    if (hasDuplicateOptions) {
      setFormError('중복된 선택지 텍스트가 존재합니다.');
      return;
    }

    const result = await createPoll({
      question: normalizedQuestion,
      description: normalizedDescription || null,
      endsAt: normalizedEndsAt,
      resultsVisibility,
      options: nonEmptyOptions,
      attachments,
    });

    if (result) {
      clearDraftStorage();
      setCachedDraft(null);
      setDraftSavedAt(null);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: 0,
            }}
          >
            새로운 고민 올리기
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            질문과 선택지들을 등록해보세요. SNS 공유에 최적화된 단축 링크가 발급됩니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="ghost-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            fontSize: '0.76rem',
          }}
        >
          <ArrowLeft size={14} />
          목록으로
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Sparkles size={13} style={{ color: 'var(--brand-accent-gold)' }} />
          빠른 작성을 위한 템플릿 프리셋:
        </span>
        <div
          role="tablist"
          aria-label="템플릿 카테고리"
          style={{
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
          }}
        >
          {PRESET_CATEGORY_OPTIONS.map((category) => {
            const active = templateCategory === category.value;

            return (
              <button
                key={category.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTemplateCategory(category.value)}
                className="ghost-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 10px',
                  fontSize: '0.68rem',
                  borderRadius: '999px',
                  color: active ? 'var(--brand-accent-teal)' : 'var(--text-secondary)',
                  borderColor: active ? 'rgba(45, 212, 191, 0.35)' : 'var(--bg-card-border)',
                  background: active ? 'rgba(45, 212, 191, 0.08)' : 'rgba(255,255,255,0.02)',
                }}
              >
                {category.label}
                <span
                  style={{
                    color: active ? 'var(--brand-accent-teal)' : 'var(--text-muted)',
                    fontSize: '0.62rem',
                    fontWeight: 900,
                  }}
                >
                  {presetCategoryCounts[category.value]}
                </span>
              </button>
            );
          })}
        </div>
        <label
          style={{
            display: 'grid',
            gap: '0.35rem',
            maxWidth: '620px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: 'var(--text-secondary)',
              fontSize: '0.68rem',
              fontWeight: 900,
            }}
          >
            <Search size={13} style={{ color: 'var(--brand-accent-teal)' }} />
            템플릿 검색
          </span>
          <div style={{ position: 'relative' }}>
            <input
              value={templateSearchInput}
              onChange={(event) => setTemplateSearchInput(event.target.value)}
              placeholder="예: 회의, 일정, 피드백, 수업, 우선순위"
              className="form-input"
              style={{
                width: '100%',
                paddingRight: templateSearchInput ? '76px' : undefined,
                minHeight: '40px',
                fontSize: '0.78rem',
              }}
            />
            {templateSearchInput ? (
              <button
                type="button"
                onClick={() => setTemplateSearchInput('')}
                className="ghost-inline"
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  fontSize: '0.66rem',
                }}
              >
                지우기
              </button>
            ) : null}
          </div>
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '8px',
          }}
        >
          {visiblePresetTemplates.length > 0 ? (
            visiblePresetTemplates.map(({ template: tmpl, index: idx }) => (
              <button
                type="button"
                key={idx}
                onClick={() => applyPreset(idx)}
                className="btn-secondary"
                style={{
                  padding: '0.78rem',
                  fontSize: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  display: 'grid',
                  alignItems: 'start',
                  gap: '0.42rem',
                  textAlign: 'left',
                  backgroundColor:
                    activePresetIndex === idx ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  borderColor:
                    activePresetIndex === idx ? 'var(--brand-primary)' : 'var(--bg-card-border)',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color:
                        activePresetIndex === idx ? 'var(--brand-primary)' : 'var(--text-primary)',
                      fontWeight: 900,
                    }}
                  >
                    <span>{tmpl.icon}</span>
                    <span>{tmpl.name}</span>
                  </span>
                  {activePresetIndex === idx ? (
                    <CheckCircle2 size={14} style={{ color: 'var(--brand-accent-teal)' }} />
                  ) : null}
                </span>
                <span
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.66rem',
                    lineHeight: 1.42,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {tmpl.question}
                </span>
                <span
                  style={{
                    color: 'var(--brand-accent-teal)',
                    fontSize: '0.62rem',
                    fontWeight: 900,
                  }}
                >
                  {
                    PRESET_CATEGORY_OPTIONS.find((category) => category.value === tmpl.category)
                      ?.label
                  }{' '}
                  템플릿
                </span>
              </button>
            ))
          ) : (
            <div
              style={{
                gridColumn: '1 / -1',
                border: '1px dashed rgba(250, 204, 21, 0.28)',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(250, 204, 21, 0.045)',
                padding: '0.9rem',
                display: 'grid',
                gap: '0.5rem',
                color: 'var(--text-secondary)',
                fontSize: '0.74rem',
              }}
            >
              <strong style={{ color: 'var(--brand-accent-gold)', fontSize: '0.82rem' }}>
                조건에 맞는 템플릿이 없습니다
              </strong>
              <span>
                검색어를 줄이거나 전체 카테고리로 돌아가면 더 많은 시작점을 볼 수 있습니다.
              </span>
              <button
                type="button"
                onClick={() => {
                  setTemplateCategory('all');
                  setTemplateSearchInput('');
                }}
                className="ghost-btn"
                style={{
                  justifySelf: 'start',
                  padding: '6px 10px',
                  fontSize: '0.68rem',
                }}
              >
                전체 템플릿 보기
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap',
            color: 'var(--text-muted)',
            fontSize: '0.68rem',
            paddingTop: '6px',
          }}
        >
          {draftSavedAt ? (
            <span>
              마지막 임시저장:{' '}
              {new Date(draftSavedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          ) : (
            <span>임시 저장되지 않음</span>
          )}
          <div style={{ display: 'inline-flex', gap: '6px', marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="ghost-inline"
              disabled={!cachedDraft}
              style={{
                color: cachedDraft ? 'var(--text-secondary)' : 'var(--text-muted)',
                cursor: cachedDraft ? 'pointer' : 'not-allowed',
              }}
            >
              임시저장 복원
            </button>
            <button
              type="button"
              onClick={handleClearDraft}
              className="ghost-inline"
              disabled={!draftSavedAt}
              style={{
                color: draftSavedAt ? 'var(--text-secondary)' : 'var(--text-muted)',
                cursor: draftSavedAt ? 'pointer' : 'not-allowed',
              }}
            >
              임시저장 삭제
            </button>
          </div>
        </div>
      </div>

      <section
        className="content-card"
        style={{
          padding: '1rem',
          display: 'grid',
          gap: '0.9rem',
          cursor: 'default',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.85rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'grid', gap: '0.2rem' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '0.96rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
              }}
            >
              작성 품질 점검
            </h2>
            <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              공유 전에 질문과 선택지가 바로 참여 가능한 상태인지 확인합니다.
            </p>
          </div>
          <div
            style={{
              minWidth: '96px',
              border: '1px solid var(--bg-card-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.55rem 0.7rem',
              textAlign: 'right',
              background: 'rgba(255,255,255,0.025)',
            }}
          >
            <span style={{ display: 'block', fontSize: '0.64rem', color: 'var(--text-muted)' }}>
              준비도
            </span>
            <strong style={{ color: qualityTone, fontSize: '1.15rem' }}>{qualityScore}%</strong>
          </div>
        </div>

        <div className="quality-grid">
          {qualityItems.map((item) => (
            <div
              key={item.label}
              style={{
                display: 'grid',
                gap: '0.35rem',
                alignContent: 'start',
                border: '1px solid var(--bg-card-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.7rem',
                background: item.passed ? 'rgba(45, 212, 191, 0.06)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: item.passed ? 'var(--brand-accent-teal)' : 'var(--brand-accent-gold)',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                }}
              >
                {item.passed ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                {item.label}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', lineHeight: 1.45 }}>
                {item.help}
              </span>
            </div>
          ))}
        </div>

        <section
          style={{
            border: '1px solid rgba(232, 200, 77, 0.18)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(232, 200, 77, 0.045)',
            padding: '0.85rem',
            display: 'grid',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'grid', gap: '0.2rem' }}>
              <h3
                style={{
                  margin: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                }}
              >
                <Sparkles size={14} style={{ color: 'var(--brand-accent-gold)' }} />
                응답률 코치
              </h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                질문이 명확하고 선택 부담이 낮을수록 단톡방에서 바로 응답하기 쉽습니다.
              </p>
            </div>
            <span
              style={{
                border: '1px solid rgba(232, 200, 77, 0.28)',
                borderRadius: '999px',
                color:
                  responseEffort === '낮음'
                    ? 'var(--brand-accent-teal)'
                    : responseEffort === '보통'
                      ? 'var(--brand-accent-gold)'
                      : 'var(--brand-accent-coral)',
                background: 'rgba(255,255,255,0.035)',
                padding: '5px 10px',
                fontSize: '0.68rem',
                fontWeight: 900,
                whiteSpace: 'nowrap',
              }}
            >
              응답 부담 {responseEffort}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '0.55rem',
            }}
          >
            {surveyCoachItems.map((item) => (
              <article
                key={item.label}
                style={{
                  display: 'grid',
                  gap: '0.35rem',
                  border: '1px solid var(--bg-card-border)',
                  borderRadius: 'var(--radius-sm)',
                  background: item.passed ? 'rgba(45, 212, 191, 0.055)' : 'rgba(255,255,255,0.025)',
                  padding: '0.7rem',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: item.passed ? 'var(--brand-accent-teal)' : 'var(--brand-accent-gold)',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                  }}
                >
                  {item.passed ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {item.label}
                </span>
                <strong
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    lineHeight: 1.35,
                  }}
                >
                  {item.value}
                </strong>
                <small
                  style={{ color: 'var(--text-muted)', fontSize: '0.66rem', lineHeight: 1.42 }}
                >
                  {item.help}
                </small>
              </article>
            ))}
          </div>
        </section>

        <div
          style={{
            display: 'flex',
            gap: '0.55rem',
            flexWrap: 'wrap',
            color: 'var(--text-muted)',
            fontSize: '0.7rem',
          }}
        >
          <span className="stat-pill">선택지 {nonEmptyOptions.length}개</span>
          <span className="stat-pill">이미지 선택지 {imageOptionCount}개</span>
          <span className="stat-pill">
            통과 항목 {passedQualityCount}/{qualityItems.length}
          </span>
        </div>
      </section>

      <section
        className="content-card"
        style={{
          padding: '1rem',
          display: 'grid',
          gap: '0.95rem',
          cursor: 'default',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '0.85rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'grid', gap: '0.24rem' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '0.96rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
              }}
            >
              공유 화면 미리보기
            </h2>
            <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              생성 후 카카오톡, 링크, 임베드에서 보일 핵심 정보를 미리 점검합니다.
            </p>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              border: '1px solid rgba(45, 212, 191, 0.28)',
              borderRadius: '999px',
              padding: '5px 10px',
              color: shareReady ? 'var(--brand-accent-teal)' : 'var(--brand-accent-gold)',
              background: shareReady ? 'rgba(45, 212, 191, 0.08)' : 'rgba(250, 204, 21, 0.08)',
              fontSize: '0.68rem',
              fontWeight: 800,
            }}
          >
            <Share2 size={13} />
            {shareReady ? '공유 준비됨' : '공유 준비 중'}
          </span>
          <button
            type="button"
            onClick={() => setShowEmbedPreview((current) => !current)}
            className="ghost-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              fontSize: '0.68rem',
              fontWeight: 800,
            }}
          >
            <Code2 size={13} />
            {showEmbedPreview ? '임베드 미리보기 닫기' : '임베드 미리보기'}
          </button>
        </div>

        <div className="share-preview-grid">
          <article className="share-preview-card">
            <div
              style={{
                minHeight: '96px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--bg-card-border)',
                background:
                  imageOptionCount > 0
                    ? 'linear-gradient(135deg, rgba(45, 212, 191, 0.2), rgba(250, 204, 21, 0.12))'
                    : 'linear-gradient(135deg, rgba(45, 212, 191, 0.14), rgba(255,255,255,0.035))',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              {imageOptionCount > 0 ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                  }}
                >
                  <ImageIcon size={15} />
                  선택지 이미지 {imageOptionCount}개 포함
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                  }}
                >
                  <ImageIcon size={15} />
                  기본 OG 이미지
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gap: '0.35rem' }}>
              <span
                style={{
                  color: 'var(--brand-accent-teal)',
                  fontSize: '0.66rem',
                  fontWeight: 900,
                }}
              >
                KAKAO · LINK PREVIEW
              </span>
              <strong
                style={{
                  color: 'var(--text-primary)',
                  fontSize: '0.92rem',
                  lineHeight: 1.42,
                  overflowWrap: 'anywhere',
                }}
              >
                {sharePreviewTitle}
              </strong>
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-muted)',
                  fontSize: '0.72rem',
                  lineHeight: 1.48,
                  display: '-webkit-box',
                  overflow: 'hidden',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {sharePreviewDescription}
              </p>
            </div>
          </article>

          <div className="share-readiness-grid">
            {shareReadinessItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="share-readiness-item"
                  style={{
                    borderColor: item.ready
                      ? 'rgba(45, 212, 191, 0.26)'
                      : 'rgba(250, 204, 21, 0.24)',
                    background: item.ready
                      ? 'rgba(45, 212, 191, 0.055)'
                      : 'rgba(250, 204, 21, 0.055)',
                  }}
                >
                  <span>
                    <Icon size={13} />
                    {item.label}
                  </span>
                  <strong>{item.value}</strong>
                </div>
              );
            })}
          </div>
        </div>

        {showEmbedPreview ? (
          <div className="embed-preview-shell">
            <div className="embed-preview-toolbar">
              <span>embed preview</span>
              <small>
                {shareReady
                  ? '생성 후 /embed/:id 로 제공됩니다.'
                  : '질문과 선택지 입력 후 활성화됩니다.'}
              </small>
              <div className="embed-device-switch" aria-label="임베드 미리보기 화면 폭 선택">
                <button
                  type="button"
                  onClick={() => setEmbedPreviewDevice('desktop')}
                  aria-pressed={embedPreviewDevice === 'desktop'}
                  className={embedPreviewDevice === 'desktop' ? 'active' : undefined}
                >
                  <Monitor size={12} />
                  데스크톱
                </button>
                <button
                  type="button"
                  onClick={() => setEmbedPreviewDevice('mobile')}
                  aria-pressed={embedPreviewDevice === 'mobile'}
                  className={embedPreviewDevice === 'mobile' ? 'active' : undefined}
                >
                  <Smartphone size={12} />
                  모바일
                </button>
              </div>
            </div>
            <div
              className={`embed-preview-card ${embedPreviewDevice === 'mobile' ? 'mobile' : ''}`}
            >
              <span className="floating-tag">POLL PREVIEW</span>
              {sharePreviewImageUrl ? (
                <img
                  src={sharePreviewImageUrl}
                  alt="업로드 이미지가 반영된 공유 미리보기"
                  style={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255,255,255,0.03)',
                  }}
                />
              ) : null}
              <strong>{sharePreviewTitle}</strong>
              <p>{sharePreviewDescription}</p>
              <div className="embed-preview-options">
                {(sharePreviewOptions.length > 0
                  ? sharePreviewOptions
                  : ['선택지 입력 대기', '선택지 입력 대기']
                ).map((option, index) => (
                  <span key={`${option}-${index}`}>
                    {index + 1}. {option}
                  </span>
                ))}
              </div>
              <button type="button" className="btn-primary" disabled={!shareReady}>
                임베드에서 투표하기
              </button>
            </div>
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.45rem',
            color: 'var(--text-muted)',
            fontSize: '0.68rem',
          }}
        >
          <span className="stat-pill">{resultsVisibilityLabel}</span>
          <span className="stat-pill">마감 {deadlineLabel}</span>
          <span className="stat-pill">
            OG 이미지 {sharePreviewImageUrl ? '업로드 이미지 반영' : '기본 이미지'}
          </span>
          <span className="stat-pill">
            선택지 {sharePreviewOptions.length > 0 ? sharePreviewOptions.join(' / ') : '입력 대기'}
          </span>
        </div>
      </section>

      <section
        className="content-card"
        style={{
          padding: '1rem',
          display: 'grid',
          gap: '0.85rem',
          borderColor: canSubmit ? 'rgba(45, 212, 191, 0.22)' : 'rgba(250, 204, 21, 0.2)',
          background: canSubmit ? 'rgba(45, 212, 191, 0.04)' : 'rgba(250, 204, 21, 0.035)',
          cursor: 'default',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '0.85rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'grid', gap: '0.25rem' }}>
            <h2
              style={{
                margin: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.96rem',
                fontWeight: 900,
              }}
            >
              <Eye size={15} style={{ color: 'var(--brand-accent-teal)' }} />
              생성 전 최종 검토
            </h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.76rem' }}>
              생성 버튼을 누르기 전에 공유 카드, 선택지, 업로드 이미지, 운영 설정을 한 번에
              확인합니다.
            </p>
          </div>
          <span
            style={{
              border: '1px solid rgba(45, 212, 191, 0.28)',
              borderRadius: '999px',
              color: canSubmit ? 'var(--brand-accent-teal)' : 'var(--brand-accent-gold)',
              background: canSubmit ? 'rgba(45, 212, 191, 0.08)' : 'rgba(250, 204, 21, 0.08)',
              padding: '5px 10px',
              fontSize: '0.68rem',
              fontWeight: 900,
              whiteSpace: 'nowrap',
            }}
          >
            {publishReadyCount}/{publishReviewItems.length} 준비됨
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '0.65rem',
          }}
        >
          {publishReviewItems.map((item) => (
            <article
              key={item.label}
              style={{
                display: 'grid',
                gap: '0.38rem',
                border: '1px solid var(--bg-card-border)',
                borderRadius: 'var(--radius-sm)',
                background: item.ready ? 'rgba(45, 212, 191, 0.055)' : 'rgba(255,255,255,0.02)',
                padding: '0.72rem',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: item.ready ? 'var(--brand-accent-teal)' : 'var(--brand-accent-gold)',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                }}
              >
                {item.ready ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                {item.label}
              </span>
              <strong
                style={{
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  lineHeight: 1.35,
                  overflowWrap: 'anywhere',
                }}
              >
                {item.value}
              </strong>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.68rem', lineHeight: 1.42 }}>
                {item.help}
              </small>
            </article>
          ))}
        </div>

        <section
          style={{
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.025)',
            padding: '0.85rem',
            display: 'grid',
            gap: '0.7rem',
          }}
          aria-label="출시 전 액션 체크"
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '0.75rem',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'grid', gap: '0.22rem' }}>
              <strong
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.84rem',
                }}
              >
                <Sparkles size={14} style={{ color: 'var(--brand-accent-gold)' }} />
                출시 전 액션 체크
              </strong>
              <span
                style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', lineHeight: 1.45 }}
              >
                공유 전에 응답자가 헷갈릴 수 있는 문장, 편향, 부담, 맥락을 빠르게 점검합니다.
              </span>
            </div>
            <span
              style={{
                border: '1px solid rgba(232, 200, 77, 0.28)',
                borderRadius: '999px',
                color:
                  launchActionReadyCount === launchActionItems.length
                    ? 'var(--brand-accent-teal)'
                    : 'var(--brand-accent-gold)',
                background:
                  launchActionReadyCount === launchActionItems.length
                    ? 'rgba(45, 212, 191, 0.08)'
                    : 'rgba(250, 204, 21, 0.08)',
                padding: '4px 9px',
                fontSize: '0.66rem',
                fontWeight: 900,
                whiteSpace: 'nowrap',
              }}
            >
              {launchActionReadyCount}/{launchActionItems.length} 통과
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.55rem',
            }}
          >
            {launchActionItems.map((item) => (
              <article
                key={item.label}
                style={{
                  border: item.ready
                    ? '1px solid rgba(45, 212, 191, 0.2)'
                    : '1px solid rgba(250, 204, 21, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  background: item.ready
                    ? 'rgba(45, 212, 191, 0.045)'
                    : 'rgba(250, 204, 21, 0.045)',
                  padding: '0.7rem',
                  display: 'grid',
                  gap: '0.34rem',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: item.ready ? 'var(--brand-accent-teal)' : 'var(--brand-accent-gold)',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                  }}
                >
                  {item.ready ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                  {item.label}
                </span>
                <strong
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    lineHeight: 1.32,
                  }}
                >
                  {item.value}
                </strong>
                <small
                  style={{ color: 'var(--text-secondary)', fontSize: '0.66rem', lineHeight: 1.45 }}
                >
                  {item.action}
                </small>
              </article>
            ))}
          </div>
        </section>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.75rem',
            alignItems: 'center',
            flexWrap: 'wrap',
            borderTop: '1px solid rgba(255,255,255,0.055)',
            paddingTop: '0.8rem',
          }}
        >
          <span
            style={{
              color: canSubmit ? 'var(--brand-accent-teal)' : 'var(--brand-accent-gold)',
              fontSize: '0.74rem',
              fontWeight: 800,
              lineHeight: 1.45,
            }}
          >
            {canSubmit
              ? '지금 생성하면 공유 링크와 카카오 미리보기가 바로 준비됩니다.'
              : publishBlockedReasons[0]}
          </span>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
            className="ghost-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 10px',
              fontSize: '0.7rem',
            }}
          >
            <ArrowLeft size={13} style={{ transform: 'rotate(-90deg)' }} />
            입력 폼으로 이동
          </button>
        </div>
      </section>

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
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            {normalizedQuestion.length} / 100
          </span>
        </div>

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
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            {normalizedDescription.length} / 500
          </span>
        </div>

        <section
          style={{
            display: 'grid',
            gap: '0.75rem',
            border: '1px solid rgba(45, 212, 191, 0.18)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            background: 'rgba(45, 212, 191, 0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'grid', gap: '0.22rem' }}>
              <h2
                style={{
                  margin: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.92rem',
                  fontWeight: 900,
                }}
              >
                <FileText size={15} style={{ color: 'var(--brand-accent-teal)' }} />
                선택지 빠른 붙여넣기
              </h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                줄바꿈으로 구분된 목록을 붙여넣으면 선택지 텍스트가 한 번에 채워집니다.
              </p>
            </div>
            <span
              style={{
                border: '1px solid var(--bg-card-border)',
                borderRadius: '999px',
                padding: '4px 9px',
                color:
                  parsedBulkOptions.length >= 2 ? 'var(--brand-accent-teal)' : 'var(--text-muted)',
                fontSize: '0.66rem',
                fontWeight: 900,
              }}
            >
              {parsedBulkOptions.length}/{MAX_OPTIONS}개 감지
            </span>
          </div>

          <textarea
            value={bulkOptionsText}
            onChange={(event) => setBulkOptionsText(event.target.value)}
            placeholder={'예:\n아침 9시 회의\n오후 2시 회의\n비동기 문서 공유'}
            rows={4}
            className="form-input"
            style={{ resize: 'vertical' }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', lineHeight: 1.45 }}>
              번호 목록, 하이픈 목록도 자동으로 정리합니다. 기존 이미지 업로드는 같은 순서에서
              유지됩니다.
            </span>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={handleReadClipboardOptions}
                className="ghost-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  fontSize: '0.74rem',
                }}
              >
                <FileText size={14} />
                클립보드 가져오기
              </button>
              <button
                type="button"
                onClick={handleApplyBulkOptions}
                disabled={parsedBulkOptions.length < 2}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  fontSize: '0.74rem',
                  opacity: parsedBulkOptions.length < 2 ? 0.55 : 1,
                  cursor: parsedBulkOptions.length < 2 ? 'not-allowed' : 'pointer',
                }}
              >
                <CheckCircle2 size={14} />
                선택지로 적용
              </button>
            </div>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gap: '0.75rem',
            border: '1px solid var(--bg-card-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            background: 'rgba(255,255,255,0.022)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'grid', gap: '0.25rem' }}>
              <h2
                style={{
                  margin: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                }}
              >
                <FileText size={15} style={{ color: 'var(--brand-accent-gold)' }} />
                참고 파일 첨부
              </h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                이미지가 아닌 자료는 작은 파일로 첨부할 수 있습니다. 참여자는 상세 화면에서
                내려받습니다.
              </p>
            </div>
            <span className="stat-pill">
              {attachments.length}/{MAX_ATTACHMENTS}
            </span>
          </div>

          <label
            className={`upload-dropzone ${isAttachmentDragging ? 'drag-over' : ''}`}
            data-drag={isAttachmentDragging ? 'true' : undefined}
            onDragEnter={handleAttachmentDragOver}
            onDragOver={handleAttachmentDragOver}
            onDragLeave={() => setIsAttachmentDragging(false)}
            onDrop={handleAttachmentDrop}
            style={{
              minHeight: '96px',
              opacity: attachments.length >= MAX_ATTACHMENTS ? 0.62 : 1,
              cursor: attachments.length >= MAX_ATTACHMENTS ? 'not-allowed' : 'pointer',
            }}
          >
            <input
              type="file"
              accept=".pdf,.txt,.csv,.json,application/pdf,text/plain,text/csv,application/json"
              multiple
              disabled={attachments.length >= MAX_ATTACHMENTS}
              onChange={(event) => {
                void handleAttachmentUpload(event.target.files);
                event.currentTarget.value = '';
              }}
            />
            <Upload size={17} />
            <span>
              {attachments.length >= MAX_ATTACHMENTS
                ? '첨부 한도 도달'
                : isAttachmentDragging
                  ? '여기에 놓아 첨부'
                  : 'PDF/TXT/CSV/JSON 파일 업로드'}
            </span>
            <small>클릭하거나 끌어다 놓기 · 최대 {MAX_ATTACHMENTS}개 · 파일당 300KB 이하</small>
          </label>

          {attachments.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {attachments.map((attachment, index) => (
                <article
                  key={`${attachment.name}-${index}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                    border: '1px solid var(--bg-card-border)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255,255,255,0.025)',
                    padding: '0.68rem 0.75rem',
                  }}
                >
                  <div style={{ minWidth: 0, display: 'grid', gap: '0.18rem' }}>
                    <strong
                      style={{
                        color: 'var(--text-primary)',
                        fontSize: '0.78rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {attachment.name}
                    </strong>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.66rem' }}>
                      {(attachment.size / 1024).toFixed(1)}KB · {attachment.type || 'file'}
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(index)}
                    className="ghost-btn"
                    aria-label={`${attachment.name} 첨부 삭제`}
                    style={{ padding: '5px 8px', fontSize: '0.68rem', flexShrink: 0 }}
                  >
                    삭제
                  </button>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section
          style={{
            display: 'grid',
            gap: '0.85rem',
            border: '1px solid var(--bg-card-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            background: 'rgba(255,255,255,0.022)',
          }}
        >
          <div style={{ display: 'grid', gap: '0.25rem' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '0.92rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
              }}
            >
              투표 운영 설정
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.72rem' }}>
              공유 후 참여 흐름을 제어합니다. 마감과 결과 공개 방식은 생성 후 투표 화면에
              표시됩니다.
            </p>
          </div>

          <div className="poll-settings-grid">
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
                className="form-input"
                style={{ fontSize: '0.82rem' }}
              />
              <div className="deadline-preset-grid" aria-label="마감 시간 빠른 선택">
                {DEADLINE_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      clearError();
                      setFormError('');
                      setEndsAtLocal(resolveDeadlinePresetValue(preset.value));
                    }}
                    className="ghost-btn"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <small
                style={{
                  color: isEndsAtInvalid ? 'var(--brand-accent-coral)' : 'var(--text-muted)',
                  fontSize: '0.66rem',
                  lineHeight: 1.4,
                }}
              >
                비워두면 상시 진행됩니다. 마감 후에는 새 투표가 차단됩니다.
              </small>
            </label>

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
                      onClick={() => setResultsVisibility(option.value)}
                      className="result-mode-button"
                      aria-pressed={active}
                      style={{
                        borderColor: active ? 'rgba(45, 212, 191, 0.42)' : 'var(--bg-card-border)',
                        background: active ? 'rgba(45, 212, 191, 0.08)' : 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <strong
                        style={{
                          color: active ? 'var(--brand-accent-teal)' : 'var(--text-primary)',
                        }}
                      >
                        {option.label}
                      </strong>
                      <span>{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <ParticipantPreviewPanel
          question={question}
          description={description}
          options={options}
          attachments={attachments}
          endsAtLocal={endsAtLocal}
          resultsVisibility={resultsVisibility}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              투표 선택지 목록 (2~10개)
            </label>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {options.length} / 10
            </span>
          </div>

          {hasDuplicateOptions ? (
            <p
              style={{
                margin: 0,
                color: 'var(--brand-accent-coral)',
                fontSize: '0.74rem',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                background: 'rgba(239, 68, 68, 0.12)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 10px',
              }}
            >
              동일한 텍스트의 선택지가 있습니다. 각 선택지는 고유해야 합니다.
            </p>
          ) : null}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {options.map((option, index) => (
              <div
                key={index}
                className="content-card"
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDraggingOptionIndex(index);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'copy';
                  setDraggingOptionIndex(index);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setDraggingOptionIndex(null);
                  }
                }}
                onDrop={(event) => handleOptionImageDrop(index, event)}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  backgroundColor:
                    draggingOptionIndex === index
                      ? 'rgba(45, 212, 191, 0.08)'
                      : 'oklch(16% 0.015 260)',
                  border:
                    draggingOptionIndex === index
                      ? '1px solid rgba(45, 212, 191, 0.42)'
                      : '1px solid var(--bg-card-border)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow:
                    draggingOptionIndex === index ? '0 0 0 3px rgba(45, 212, 191, 0.08)' : 'none',
                  transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
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
                  {options.length > 2 ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveOptionInput(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'inline-flex',
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
                  ) : null}
                </div>

                <div className="option-input-grid">
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
                  <div className="upload-control">
                    {option.imageUrl ? (
                      <figure
                        className={`upload-preview ${draggingOptionIndex === index ? 'drag-over' : ''}`}
                        data-drag={draggingOptionIndex === index ? 'true' : undefined}
                        onDragEnter={(event) => {
                          event.preventDefault();
                          setDraggingOptionIndex(index);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'copy';
                          setDraggingOptionIndex(index);
                        }}
                        onDragLeave={() => setDraggingOptionIndex(null)}
                        onDrop={(event) => handleOptionImageDrop(index, event)}
                      >
                        <img
                          src={option.imageUrl}
                          alt={`${option.text || `선택지 ${index + 1}`} 이미지`}
                        />
                        <figcaption>
                          <span>
                            <ImageIcon size={12} />
                            이미지 첨부됨
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOptionImage(index)}
                            aria-label={`선택지 ${index + 1} 이미지 삭제`}
                          >
                            <X size={13} />
                          </button>
                        </figcaption>
                        <small
                          style={{
                            color:
                              draggingOptionIndex === index
                                ? 'var(--brand-accent-teal)'
                                : 'var(--text-muted)',
                            fontSize: '0.64rem',
                            fontWeight: 800,
                          }}
                        >
                          새 파일을 드롭하면 이미지가 교체됩니다.
                        </small>
                      </figure>
                    ) : (
                      <label
                        className={`upload-dropzone ${draggingOptionIndex === index ? 'drag-over' : ''}`}
                        data-drag={draggingOptionIndex === index ? 'true' : undefined}
                        onDragEnter={(event) => {
                          event.preventDefault();
                          setDraggingOptionIndex(index);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'copy';
                          setDraggingOptionIndex(index);
                        }}
                        onDragLeave={() => setDraggingOptionIndex(null)}
                        onDrop={(event) => handleOptionImageDrop(index, event)}
                        style={{
                          borderColor:
                            draggingOptionIndex === index ? 'rgba(45, 212, 191, 0.42)' : undefined,
                          background:
                            draggingOptionIndex === index ? 'rgba(45, 212, 191, 0.08)' : undefined,
                        }}
                      >
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            void handleOptionImageUpload(index, file);
                            event.currentTarget.value = '';
                          }}
                        />
                        <Upload size={16} />
                        <span>
                          {draggingOptionIndex === index ? '여기에 놓아 업로드' : '이미지 업로드'}
                        </span>
                        <small>클릭 또는 드롭 · JPG/PNG/WebP, 5MB 이하</small>
                      </label>
                    )}
                  </div>
                </div>

                <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                  현재 글자 수: {option.text.trim().length} / 80
                </span>
              </div>
            ))}
          </div>

          {options.length < MAX_OPTIONS && (
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

        <section
          style={{
            border: '1px solid rgba(45, 212, 191, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.95rem',
            background: 'rgba(45, 212, 191, 0.035)',
            display: 'grid',
            gap: '0.78rem',
          }}
          aria-label="참여자 경험 리허설"
        >
          <div style={{ display: 'grid', gap: '0.24rem' }}>
            <h3
              style={{
                margin: 0,
                fontSize: '0.84rem',
                color: 'var(--text-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Smartphone size={14} style={{ color: 'var(--brand-accent-teal)' }} />
              참여자 경험 리허설
            </h3>
            <p
              style={{
                margin: 0,
                color: 'var(--text-secondary)',
                fontSize: '0.7rem',
                lineHeight: 1.45,
              }}
            >
              링크를 받은 사람이 실제로 보게 될 첫 화면, 자료, 운영 신호를 생성 전에 점검합니다.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.65rem',
              alignItems: 'start',
            }}
          >
            <SnsPreviewCard
              platform="kakao"
              question={sharePreviewTitle}
              description={sharePreviewDescription}
              options={nonEmptyOptions.map((option) => option.text)}
              imageUrl={sharePreviewImageUrl}
            />
            <SnsPreviewCard
              platform="x"
              question={sharePreviewTitle}
              description={sharePreviewDescription}
              options={nonEmptyOptions.map((option) => option.text)}
              imageUrl={sharePreviewImageUrl}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '0.55rem',
            }}
          >
            {participantExperienceItems.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.label}
                  style={{
                    minWidth: 0,
                    border: item.ready
                      ? '1px solid rgba(45, 212, 191, 0.22)'
                      : '1px solid rgba(250, 204, 21, 0.2)',
                    borderRadius: 'var(--radius-sm)',
                    background: item.ready
                      ? 'rgba(45, 212, 191, 0.045)'
                      : 'rgba(250, 204, 21, 0.04)',
                    padding: '0.72rem',
                    display: 'grid',
                    gap: '0.32rem',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: item.ready ? 'var(--brand-accent-teal)' : 'var(--brand-accent-gold)',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                    }}
                  >
                    <Icon size={13} />
                    {item.label}
                  </span>
                  <strong
                    style={{
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      lineHeight: 1.32,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {item.value}
                  </strong>
                  <small
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.66rem',
                      lineHeight: 1.45,
                    }}
                  >
                    {item.help}
                  </small>
                </article>
              );
            })}
          </div>
        </section>

        <div
          style={{
            border: '1px solid var(--bg-card-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.95rem',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '0.84rem',
              color: 'var(--text-primary)',
              marginBottom: '0.6rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Eye size={14} style={{ color: 'var(--brand-accent-teal)' }} />
            실시간 미리보기
          </h3>
          <p
            style={{
              margin: 0,
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontWeight: 700,
            }}
          >
            {normalizedQuestion || '질문을 입력하면 미리보기가 표시됩니다.'}
          </p>
          {nonEmptyOptions.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.45rem' }}>
              {nonEmptyOptions.slice(0, 4).map((option, index) => (
                <p
                  key={`${option.text}-${index}`}
                  style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.78rem' }}
                >
                  · {option.text}
                </p>
              ))}
              {nonEmptyOptions.length > 4 ? (
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                  ...그 외 {nonEmptyOptions.length - 4}개 선택지
                </p>
              ) : null}
              {nonEmptyOptions.some((option) => option.imageUrl) ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))',
                    gap: '0.5rem',
                    marginTop: '0.35rem',
                  }}
                >
                  {nonEmptyOptions
                    .filter((option) => option.imageUrl)
                    .slice(0, 4)
                    .map((option, index) => (
                      <figure
                        key={`${option.text}-image-${index}`}
                        style={{
                          margin: 0,
                          border: '1px solid var(--bg-card-border)',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          background: 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <img
                          src={option.imageUrl || ''}
                          alt=""
                          style={{
                            width: '100%',
                            aspectRatio: '16 / 9',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                        <figcaption
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '0.45rem 0.55rem',
                            color: 'var(--text-secondary)',
                            fontSize: '0.68rem',
                          }}
                        >
                          <ImageIcon size={12} />
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {option.text}
                          </span>
                        </figcaption>
                      </figure>
                    ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              선택지를 입력하면 미리보기가 생성됩니다.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary"
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '0.85rem',
            }}
          >
            초기화
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
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
