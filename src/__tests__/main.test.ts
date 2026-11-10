/* eslint global-require: off */
import axios from 'axios';

type Handler = (event: unknown, request?: unknown) => Promise<unknown>;

const handlers: Record<string, Handler> = {};
const ipcHandle = jest.fn((channel: string, handler: Handler) => {
  handlers[channel] = handler;
});

jest.mock('electron', () => ({
  app: {
    whenReady: jest.fn(() => new Promise(() => {})),
    on: jest.fn(),
    isPackaged: false,
  },
  BrowserWindow: jest.fn(),
  shell: { openExternal: jest.fn() },
  ipcMain: { handle: ipcHandle, on: jest.fn() },
}));

jest.mock('electron-updater', () => ({
  autoUpdater: {
    checkForUpdatesAndNotify: jest.fn(),
  },
}));

jest.mock('electron-log', () => ({
  transports: { file: { level: 'info' } },
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    isAxiosError: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

const loadMain = () => {
  jest.isolateModules(() => {
    require('../main/main');
  });
};

describe('main-process v2 IPC', () => {
  beforeEach(() => {
    Object.keys(handlers).forEach((key) => delete handlers[key]);
    ipcHandle.mockClear();
    mockedAxios.get.mockReset();
    (mockedAxios.isAxiosError as unknown as jest.Mock).mockReset();
    process.env.MARKETEYE_API_KEY = 'test-key';
    process.env.MARKETEYE_API_URL = 'https://marketeye.example.test';
  });

  afterAll(() => {
    delete process.env.MARKETEYE_API_KEY;
    delete process.env.MARKETEYE_API_URL;
  });

  it('requires the credential in main and never sends it in the query', async () => {
    delete process.env.MARKETEYE_API_KEY;
    loadMain();

    const response = await handlers['get-bounce-results'](null, {
      date: '2026-10-27',
      lookback: 20,
    });

    expect(response).toEqual({
      ok: false,
      error: {
        code: 'MARKETEYE_API_KEY_MISSING',
        message:
          'StockBounce is not configured. Set MARKETEYE_API_KEY in the desktop main process.',
      },
    });
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('requires the API URL through main-process configuration', async () => {
    delete process.env.MARKETEYE_API_URL;
    loadMain();

    const response = await handlers['get-bounce-results'](null, {
      date: '2026-10-27',
      lookback: 20,
    });

    expect(response).toEqual({
      ok: false,
      error: {
        code: 'MARKETEYE_API_URL_MISSING',
        message:
          'StockBounce is not configured. Set MARKETEYE_API_URL in the desktop main process.',
      },
    });
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('uses one typed combined request with X-API-Key authentication', async () => {
    const payload = { schema_version: 2, market: 'US' };
    mockedAxios.get.mockResolvedValue({ data: payload });
    loadMain();

    const response = await handlers['get-bounce-results'](null, {
      date: '2026-10-27',
      lookback: 20,
    });

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://marketeye.example.test/api/stock-bounce/v2/results',
      {
        params: { date: '2026-10-27', lookback: 20 },
        headers: { 'X-API-Key': 'test-key' },
      }
    );
    expect(response).toEqual({ ok: true, data: payload });
    const request = mockedAxios.get.mock.calls[0][1];
    expect(JSON.stringify(request?.params)).not.toContain('test-key');
  });

  it('keeps sessions paginated and header-authenticated', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { items: [], next_cursor: 'next-page' },
    });
    process.env.MARKETEYE_API_URL = 'https://marketeye.example.test/api/';
    loadMain();

    await handlers['get-dates'](null, { cursor: 'opaque', limit: 500 });

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://marketeye.example.test/api/stock-bounce/v2/sessions',
      {
        params: { cursor: 'opaque', limit: 500 },
        headers: { 'X-API-Key': 'test-key' },
      }
    );
  });

  it('returns structured API errors without leaking request headers', async () => {
    const error = {
      response: {
        data: {
          detail: {
            code: 'BOUNCE_SESSION_NOT_READY',
            message: 'The selected session is still being prepared.',
            details: { date: '2026-10-27' },
          },
        },
      },
      config: { headers: { 'X-API-Key': 'test-key' } },
    };
    mockedAxios.get.mockRejectedValue(error);
    (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
    loadMain();

    const response = await handlers['get-bounce-results'](null, {
      date: '2026-10-27',
      lookback: 20,
    });

    expect(response).toEqual({
      ok: false,
      error: {
        code: 'BOUNCE_SESSION_NOT_READY',
        message: 'The selected session is still being prepared.',
        details: { date: '2026-10-27' },
      },
    });
    expect(JSON.stringify(response)).not.toContain('test-key');
    expect(JSON.stringify(response)).not.toContain('headers');
  });
});
