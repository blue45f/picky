/**
 * 한글/영문 의견 토크나이저 — web/toss 두 앱이 공유하는 순수 키워드 추출 로직.
 * UI(토픽 클라우드 SVG·복사 텍스트)는 각 앱에서 이 결과를 가공해 그려요.
 */

export interface KeywordStat {
  word: string;
  count: number;
}

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

/** 토큰 양끝의 비키워드 문자(구두점 등)를 제거하고 소문자화. */
export const trimTokenBoundary = (token: string): string => {
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

/** 흔한 한글 어미/조사 접미사를 끝에서 한 번 제거. */
export const removeKoreanSuffix = (token: string): string => {
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

/** 토큰 1개 정규화: 경계 정리 → 어미 제거. */
export const normalizeToken = (token: string): string =>
  removeKoreanSuffix(trimTokenBoundary(token));

/**
 * 여러 텍스트에서 2글자 이상·불용어 제외 키워드를 빈도순으로 추출.
 * 동률은 사전순으로 안정 정렬하고, 상위 `limit`개만 반환해요.
 */
export const extractKeywords = (texts: string[], limit: number): KeywordStat[] => {
  const counts = new Map<string, number>();

  for (const text of texts) {
    for (const token of splitKeywordTokens(text)) {
      const word = normalizeToken(token);
      if (word.length >= 2 && !STOP_WORDS.has(word)) {
        counts.set(word, (counts.get(word) ?? 0) + 1);
      }
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
};
