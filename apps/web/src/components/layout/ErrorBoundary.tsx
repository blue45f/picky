import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
  /** 바운더리 리셋(다시 시도) 시 함께 호출 — 외부 상태(쿼리 캐시 등) 리셋 연결용. */
  onReset?: () => void;
};

type ErrorBoundaryState = {
  error: Error | null;
};

/**
 * 컴포넌트 레벨 에러 바운더리 — 렌더 중 throw(lazy 청크 로드 실패, 프로바이더 트리 예외 등)가
 * 전체 SPA 를 백스크린으로 만드는 것을 막고 친절한 폴백 + 복구 동선을 보여준다.
 * 에러 바운더리는 클래스 컴포넌트로만 구현되므로 여기만 예외적으로 클래스를 쓴다.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // 사용자에겐 원문 노출하지 않되, 운영 모니터링 전송 지점 + 디버깅을 위해 콘솔엔 남긴다.
    console.error('[picky] Unhandled render error:', error, info.componentStack);
  }

  private readonly handleReset = (): void => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <main
          role="alert"
          style={{
            maxWidth: '480px',
            margin: '0 auto',
            padding: '5rem 1.5rem',
            textAlign: 'center',
            display: 'grid',
            gap: '0.75rem',
            justifyItems: 'center',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>
            문제가 발생했어요
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            예상치 못한 오류로 화면을 표시하지 못했어요. 다시 시도하거나 홈으로 돌아가 주세요.
          </p>
          <div style={{ marginTop: '0.5rem', display: 'inline-flex', gap: '0.5rem' }}>
            <button type="button" className="btn-primary" onClick={this.handleReset}>
              다시 시도
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                globalThis.location.href = '/';
              }}
            >
              홈으로
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
