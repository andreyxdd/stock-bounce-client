/* eslint global-require: off */
const exposeInMainWorld = jest.fn();
const invoke = jest.fn();

jest.mock('electron', () => ({
  contextBridge: { exposeInMainWorld },
  ipcRenderer: {
    invoke,
    send: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
  },
}));

describe('preload StockBounce API', () => {
  beforeEach(() => {
    exposeInMainWorld.mockClear();
    invoke.mockReset();
    jest.isolateModules(() => {
      require('../main/preload');
    });
  });

  it('exposes only typed v2 data operations, not HTTP or legacy controls', () => {
    const api = exposeInMainWorld.mock.calls[0][1];

    expect(exposeInMainWorld).toHaveBeenCalledWith('electronAPI', api);
    expect(api).toEqual(
      expect.objectContaining({
        getBounceResults: expect.any(Function),
        getDates: expect.any(Function),
      })
    );
    expect(api.getBounceStocks).toBeUndefined();
    expect(api.getTrackedStocks).toBeUndefined();
    expect(api.getFrequencies).toBeUndefined();
    expect(api.http).toBeUndefined();
    expect(api.request).toBeUndefined();
    expect(api.conn).toBeUndefined();
    expect(Object.keys(api).sort()).toEqual(['getBounceResults', 'getDates']);
  });

  it('forwards the combined request and paginated sessions through IPC', async () => {
    const api = exposeInMainWorld.mock.calls[0][1];
    const request = { date: '2026-10-27', lookback: 20 };

    await api.getBounceResults(request);
    await api.getDates({ cursor: 'opaque', limit: 500 });

    expect(invoke).toHaveBeenNthCalledWith(1, 'get-bounce-results', request);
    expect(invoke).toHaveBeenNthCalledWith(2, 'get-dates', {
      cursor: 'opaque',
      limit: 500,
    });
  });
});
