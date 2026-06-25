import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 토스 환경 판정(isInToss)을 구동하는 getOperationalEnvironment 모킹.
const getOperationalEnvironment = vi.fn<() => 'toss' | 'sandbox' | 'web'>(() => 'toss');
// 웹 프레임워크 Analytics.click 모킹 — 호출 인자/no-op을 검증.
const analyticsClick = vi.fn<(params?: Record<string, unknown>) => Promise<void> | undefined>();

vi.mock('@apps-in-toss/web-framework', () => ({
  getOperationalEnvironment: () => getOperationalEnvironment(),
  Analytics: {
    screen: vi.fn(),
    impression: vi.fn(),
    click: (params?: Record<string, unknown>) => analyticsClick(params),
  },
}));

async function load() {
  vi.resetModules();
  return import('./analytics');
}

beforeEach(() => {
  getOperationalEnvironment.mockReturnValue('toss');
  analyticsClick.mockReset();
  analyticsClick.mockReturnValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('analytics (토스 Analytics 래퍼)', () => {
  it('토스 안에서 log_name으로 이벤트를 click에 위임한다', async () => {
    const { logEvent } = await load();
    logEvent('app_open');
    expect(analyticsClick).toHaveBeenCalledWith({ log_name: 'app_open' });
  });

  it('토스 밖(web)에서는 절대 수집하지 않는다(no-op)', async () => {
    getOperationalEnvironment.mockReturnValue('web');
    const { logEvent, trackVote, trackShare } = await load();
    logEvent('vote');
    trackVote(3);
    trackShare('toss');
    expect(analyticsClick).not.toHaveBeenCalled();
  });

  it('비식별 파라미터만 첨부한다 — 핵심 이벤트별 헬퍼', async () => {
    const { trackVote, trackComment, trackCreatePoll, trackShare } = await load();
    trackVote(4);
    trackComment(true);
    trackCreatePoll('private');
    trackShare('clipboard');
    expect(analyticsClick).toHaveBeenNthCalledWith(1, { log_name: 'vote', option_count: 4 });
    expect(analyticsClick).toHaveBeenNthCalledWith(2, { log_name: 'comment', is_reply: true });
    expect(analyticsClick).toHaveBeenNthCalledWith(3, {
      log_name: 'create_poll',
      visibility: 'private',
    });
    expect(analyticsClick).toHaveBeenNthCalledWith(4, { log_name: 'share', method: 'clipboard' });
  });

  it('인자 없는 헬퍼는 컨텍스트 없이 이벤트명만 보낸다', async () => {
    const { trackAppOpen, trackVote, trackCreatePoll, trackShare } = await load();
    trackAppOpen();
    trackVote();
    trackCreatePoll();
    trackShare();
    expect(analyticsClick).toHaveBeenNthCalledWith(1, { log_name: 'app_open' });
    expect(analyticsClick).toHaveBeenNthCalledWith(2, { log_name: 'vote' });
    expect(analyticsClick).toHaveBeenNthCalledWith(3, { log_name: 'create_poll' });
    expect(analyticsClick).toHaveBeenNthCalledWith(4, { log_name: 'share' });
  });

  it('SDK가 throw해도 흐름을 막지 않는다(흡수)', async () => {
    analyticsClick.mockImplementation(() => {
      throw new Error('bridge unavailable');
    });
    const { logEvent } = await load();
    expect(() => logEvent('vote')).not.toThrow();
  });

  it('click이 거부된 Promise를 돌려줘도 unhandled rejection이 없다', async () => {
    analyticsClick.mockReturnValue(Promise.reject(new Error('collect failed')));
    const { logEvent } = await load();
    expect(() => logEvent('share', { method: 'toss' })).not.toThrow();
    // 마이크로태스크 한 바퀴 — .catch가 거부를 흡수했는지 확인.
    await Promise.resolve();
  });
});
