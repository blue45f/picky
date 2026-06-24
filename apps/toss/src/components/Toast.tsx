import { useCallback, useEffect, useRef, useState } from 'react';
import { theme } from '../theme';

/** 일시적 토스트 메시지 상태 훅. */
export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, duration = 2000) => {
    setToast(message);
    if (timerRef.current != null) {
      globalThis.clearTimeout(timerRef.current);
    }
    timerRef.current = globalThis.setTimeout(() => setToast(null), duration);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current != null) {
        globalThis.clearTimeout(timerRef.current);
      }
    },
    [],
  );

  return { toast, showToast };
}

/** 화면 하단 중앙 토스트. 액션바 위로 띄워요. */
export function Toast({
  message,
  bottom = 'calc(96px + env(safe-area-inset-bottom))',
}: Readonly<{
  message: string | null;
  bottom?: string;
}>) {
  if (!message) {
    return null;
  }
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom,
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 'calc(100vw - 40px)',
        background: theme.overlay,
        color: theme.text,
        padding: '10px 18px',
        borderRadius: theme.radiusPill,
        fontSize: 14,
        fontWeight: 600,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 50,
        animation: 'pf-toast-in 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {message}
    </div>
  );
}
