import { useMemo, useState } from 'react';
import { Check, Copy, MessageCircle, Sparkles, Tags, TrendingUp } from 'lucide-react';
import type { Poll } from '@picky/shared';
import { copyText } from '../lib/pollShare';

type KeywordStat = {
  word: string;
  count: number;
  weight: number;
};

type OptionKeywordGroup = {
  optionId: number;
  optionText: string;
  voteCount: number;
  keywords: KeywordStat[];
};

type OpinionTopicCloudProps = Readonly<{
  poll: Poll;
}>;

const STOP_WORDS = new Set([
  '그리고',
  '그래서',
  '하지만',
  '그런데',
  '이것',
  '저것',
  '그것',
  '합니다',
  '해요',
  '있어요',
  '있습니다',
  '같아요',
  '같습니다',
  '때문',
  '너무',
  '정말',
  '조금',
  '그냥',
  '일단',
  '저는',
  '제가',
  '우리',
  '이번',
  '가능',
  '선택',
  '투표',
  '의견',
  '생각',
  '좋은',
  '좋아요',
  '좋습니다',
  'would',
  'could',
  'should',
  'this',
  'that',
  'with',
  'from',
  'have',
  'just',
  'really',
  'because',
]);

const KOREAN_SUFFIXES = [
  '입니다',
  '합니다',
  '해요',
  '네요',
  '어요',
  '아요',
  '으로',
  '에서',
  '에게',
  '보다',
  '까지',
  '부터',
  '처럼',
  '만큼',
];

const TOKEN_SEPARATORS = new Set([
  ',',
  '.',
  ';',
  ':',
  '!',
  '?',
  '(',
  ')',
  '[',
  ']',
  '{',
  '}',
  '"',
  "'",
  '“',
  '”',
  '‘',
  '’',
  '/',
  '\\',
  '|',
]);

const isKeywordChar = (char: string): boolean => {
  const code = char.codePointAt(0) ?? 0;
  const isAsciiLetter = code >= 97 && code <= 122;
  const isDigit = code >= 48 && code <= 57;
  const isHangulSyllable = code >= 0xac00 && code <= 0xd7a3;
  return isAsciiLetter || isDigit || isHangulSyllable;
};

const trimTokenBoundary = (token: string): string => {
  const chars = Array.from(token.toLowerCase());
  let start = 0;
  let end = chars.length;

  while (start < end && !isKeywordChar(chars[start] ?? '')) {
    start += 1;
  }
  while (end > start && !isKeywordChar(chars[end - 1] ?? '')) {
    end -= 1;
  }

  return chars.slice(start, end).join('');
};

const removeKoreanSuffix = (token: string): string => {
  for (const suffix of KOREAN_SUFFIXES) {
    if (token.endsWith(suffix)) {
      return token.slice(0, -suffix.length);
    }
  }

  return token;
};

const splitKeywordTokens = (text: string): string[] => {
  const tokens: string[] = [];
  let current = '';

  for (const char of text) {
    if (char.trim() === '' || TOKEN_SEPARATORS.has(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
};

const normalizeToken = (token: string): string => {
  return removeKoreanSuffix(trimTokenBoundary(token));
};

const extractKeywords = (texts: string[], limit: number): KeywordStat[] => {
  const counts = new Map<string, number>();

  texts.forEach((text) => {
    splitKeywordTokens(text)
      .map(normalizeToken)
      .filter((word) => word.length >= 2 && !STOP_WORDS.has(word))
      .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  });

  const maxCount = Math.max(1, ...counts.values());

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({
      word,
      count,
      weight: count / maxCount,
    }));
};

const buildSummaryText = (
  poll: Poll,
  topKeywords: KeywordStat[],
  optionGroups: OptionKeywordGroup[],
): string => {
  const keywordLine =
    topKeywords.length > 0
      ? topKeywords.map((keyword) => `${keyword.word}(${keyword.count})`).join(', ')
      : '반복 키워드 없음';
  const optionLines = optionGroups
    .map((group) => {
      const words =
        group.keywords.length > 0
          ? group.keywords.map((keyword) => `${keyword.word}(${keyword.count})`).join(', ')
          : '키워드 없음';
      return `- ${group.optionText}: ${words}`;
    })
    .join('\n');

  return [
    `[pickflow 의견 토픽 브리핑]`,
    `질문: ${poll.question}`,
    `의견 수: ${poll.comments.length}개`,
    `전체 반복 키워드: ${keywordLine}`,
    '',
    '[선택지별 키워드]',
    optionLines || '- 아직 선택지별 의견이 없습니다.',
  ].join('\n');
};

export function OpinionTopicCloud({ poll }: OpinionTopicCloudProps) {
  const [copied, setCopied] = useState(false);
  const topicData = useMemo(() => {
    const comments = poll.comments || [];
    const commentTexts = comments.map((commentItem) => commentItem.comment).filter(Boolean);
    const topKeywords = extractKeywords(commentTexts, 18);
    const optionGroups = poll.options
      .map((option) => {
        const optionTexts = comments
          .filter((commentItem) => commentItem.selectedOptionId === option.id)
          .map((commentItem) => commentItem.comment)
          .filter(Boolean);

        return {
          optionId: option.id,
          optionText: option.text,
          voteCount: option.voteCount,
          keywords: extractKeywords(optionTexts, 5),
        };
      })
      .sort((a, b) => b.voteCount - a.voteCount);

    return {
      commentCount: comments.length,
      optionGroups,
      summaryText: buildSummaryText(poll, topKeywords, optionGroups),
      topKeywords,
    };
  }, [poll]);

  const handleCopySummary = async () => {
    try {
      await copyText(topicData.summaryText);
      setCopied(true);
      globalThis.setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('opinion topic summary copy failed', err);
    }
  };

  return (
    <section
      className="content-card"
      style={{
        display: 'grid',
        gap: '1rem',
        border: '1px solid rgba(45, 212, 191, 0.16)',
        background:
          'linear-gradient(135deg, rgba(45, 212, 191, 0.07), rgba(99, 102, 241, 0.045) 52%, rgba(255,255,255,0.025))',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '0.85rem',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--brand-accent-teal)',
              fontSize: '0.68rem',
              fontWeight: 900,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            <Tags size={13} />
            Opinion topic cloud
          </span>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>
            반복되는 이유와 키워드
          </h3>
          <p
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: '0.76rem',
              lineHeight: 1.55,
              maxWidth: '62ch',
            }}
          >
            코멘트에서 자주 나온 단어를 뽑아 토론 주제를 빠르게 파악합니다. 선택지별로 어떤 이유가
            붙었는지도 함께 볼 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopySummary}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            fontSize: '0.72rem',
            whiteSpace: 'nowrap',
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? '토픽 복사됨' : '토픽 브리핑 복사'}
        </button>
      </div>

      {topicData.topKeywords.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.1fr) minmax(min(100%, 260px), 0.9fr)',
            gap: '0.85rem',
          }}
        >
          <div
            style={{
              minHeight: '230px',
              border: '1px solid var(--bg-card-border)',
              borderRadius: 'var(--radius-sm)',
              background:
                'radial-gradient(circle at 20% 20%, rgba(45, 212, 191, 0.14), transparent 32%), rgba(3, 14, 12, 0.36)',
              padding: '1rem',
              display: 'flex',
              alignContent: 'center',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '0.55rem 0.72rem',
            }}
            aria-label="의견 반복 키워드 클라우드"
          >
            {topicData.topKeywords.map((keyword, index) => {
              const size = 0.76 + keyword.weight * 0.78;
              const colors = [
                'var(--brand-accent-teal)',
                'var(--brand-accent-gold)',
                'var(--text-primary)',
                'var(--brand-primary)',
              ];
              const rotateByThird = index % 3 === 1 ? '1deg' : '0deg';
              const rotation = index % 3 === 0 ? '-2deg' : rotateByThird;

              return (
                <span
                  key={keyword.word}
                  title={`${keyword.word}: ${keyword.count}회`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: colors[index % colors.length],
                    fontSize: `${size}rem`,
                    fontWeight: 900,
                    lineHeight: 1,
                    opacity: 0.78 + keyword.weight * 0.22,
                    transform: `rotate(${rotation})`,
                  }}
                >
                  {keyword.word}
                  <small
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.55em',
                      fontWeight: 800,
                    }}
                  >
                    {keyword.count}
                  </small>
                </span>
              );
            })}
          </div>

          <aside
            style={{
              display: 'grid',
              gap: '0.65rem',
              alignContent: 'start',
              border: '1px solid var(--bg-card-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,255,255,0.032)',
              padding: '0.85rem',
            }}
          >
            <div className="insight-tile">
              <span>
                <MessageCircle size={13} />
                분석 의견
              </span>
              <strong>{topicData.commentCount}개</strong>
              <small>선택 이유에서 반복 단어를 추출했습니다.</small>
            </div>
            <div className="insight-tile">
              <span>
                <TrendingUp size={13} />
                최상위 키워드
              </span>
              <strong>{topicData.topKeywords[0]?.word || '없음'}</strong>
              <small>
                {topicData.topKeywords[0]
                  ? `${topicData.topKeywords[0].count}회 반복되었습니다.`
                  : '의견이 더 필요합니다.'}
              </small>
            </div>
          </aside>
        </div>
      ) : (
        <div
          style={{
            minHeight: '180px',
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
            border: '1px dashed rgba(148, 163, 184, 0.26)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,0.025)',
            padding: '1rem',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'grid', gap: '0.45rem', justifyItems: 'center' }}>
            <Sparkles size={20} />
            <p style={{ margin: 0, fontSize: '0.76rem', lineHeight: 1.55 }}>
              아직 반복 키워드를 만들 만큼 의견이 없습니다. 투표 참여자에게 선택 이유 한 줄을 요청해
              보세요.
            </p>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
          gap: '0.65rem',
        }}
      >
        {topicData.optionGroups.map((group) => (
          <article
            key={group.optionId}
            style={{
              display: 'grid',
              gap: '0.55rem',
              border: '1px solid var(--bg-card-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(3, 14, 12, 0.28)',
              padding: '0.75rem',
              alignContent: 'start',
            }}
          >
            <div style={{ display: 'grid', gap: '0.18rem' }}>
              <strong
                style={{
                  color: 'var(--text-primary)',
                  fontSize: '0.76rem',
                  lineHeight: 1.35,
                  overflowWrap: 'anywhere',
                }}
              >
                {group.optionText}
              </strong>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.64rem' }}>
                {group.voteCount}표 · 대표 키워드
              </small>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.38rem' }}>
              {group.keywords.length > 0 ? (
                group.keywords.map((keyword) => (
                  <span
                    key={`${group.optionId}-${keyword.word}`}
                    style={{
                      border: '1px solid rgba(45, 212, 191, 0.18)',
                      borderRadius: '999px',
                      background: 'rgba(45, 212, 191, 0.055)',
                      color: 'var(--text-secondary)',
                      padding: '4px 8px',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                    }}
                  >
                    {keyword.word} {keyword.count}
                  </span>
                ))
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                  아직 이 선택지에는 의견 키워드가 없습니다.
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
