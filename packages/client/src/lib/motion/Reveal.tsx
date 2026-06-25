import { useReveal } from './useReveal';

import type { CSSProperties, ElementType, ReactNode } from 'react';

export interface RevealProps {
  children: ReactNode;
  /** 렌더 태그(기본 'div'). 시맨틱을 유지하려면 'section' 등으로 바꿔요. */
  as?: ElementType;
  /** 살짝 올라오며 페이드('up') vs 페이드만('soft'). 기본 'up'. */
  variant?: 'up' | 'soft';
  /** 스태거용 진입 지연(ms). 형제 목록에만 써요(예: index * 60). */
  delay?: number;
  className?: string;
  id?: string;
  /** 진입 임계값/루트 여백 override (useReveal 로 전달). */
  threshold?: number;
  rootMargin?: string;
}

/**
 * 스크롤 진입 시 한 번 안착하는 래퍼 — web/toss 공유. **CLS 0 안전**.
 *
 * 기본은 "보임"이라 빈 출하·레이아웃 시프트가 없어요. 모션은 `.is-revealed`
 * 가 붙기 전 from-state 를 더할 뿐이고, JS/IO 미지원·헤드리스·SSR·
 * prefers-reduced-motion 에서는 그냥 보여요.
 *
 * 키프레임은 각 앱이 자기 토큰으로 소유해요(picky 토큰 매핑):
 *   `.reveal` / `.reveal.is-revealed` → `@keyframes reveal-up`   (var(--ease-out-quint))
 *   `.reveal-soft` / `.is-revealed`   → `@keyframes reveal-fade`  (var(--ease-out-quart))
 *   둘 다 `animation-delay: calc(var(--reveal-delay, 0) * 1ms)` 로 스태거.
 */
export function Reveal({
  children,
  as: Tag = 'div',
  variant = 'up',
  delay = 0,
  className,
  id,
  threshold,
  rootMargin,
}: Readonly<RevealProps>) {
  const { ref, revealed } = useReveal<HTMLElement>({ threshold, rootMargin });
  const base = variant === 'soft' ? 'reveal-soft' : 'reveal';
  const classNames = `${base}${revealed ? ' is-revealed' : ''}${className ? ` ${className}` : ''}`;

  return (
    <Tag
      ref={ref}
      id={id}
      className={classNames}
      style={delay ? ({ '--reveal-delay': delay } as CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
