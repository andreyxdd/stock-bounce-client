import '@testing-library/jest-dom';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import App from '../renderer/App';
import useStore from '../renderer/hooks/useStore';
import {
  IBounceResults,
  IpcResponse,
  IpcSuccess,
  ISessionPage,
} from '../types';

const sessions: IpcSuccess<ISessionPage> = {
  ok: true,
  data: {
    items: [
      {
        epoch: 1792963200000,
        date_string: '2026-10-26',
        max_lookback: 120,
      },
      {
        epoch: 1793059200000,
        date_string: '2026-10-27',
        max_lookback: 240,
      },
    ],
    next_cursor: null,
  },
};

const results: IpcSuccess<IBounceResults> = {
  ok: true,
  data: {
    schema_version: 2,
    market: 'US',
    date: '2026-10-27',
    lookback: 20,
    whole_market: {
      rows: [
        {
          id: 1,
          ticker: 'XYZ',
          open: 140,
          high: 148,
          close: 147,
          volume: 1234567,
          open_close_change_pct: 5,
          lookback_change_pct: -12.5,
          previous_all_time_high: 146,
        },
      ],
      coverage: {
        status: 'exact',
        universe_provenance: 'archived_tickers+local_ohlcv',
        exclusions_count: 0,
        unseeded_count: 0,
      },
    },
    macd_history: {
      rows: [
        {
          id: 1,
          ticker: 'OLD',
          open: 40,
          high: 44,
          close: 43,
          volume: 987654,
          open_close_change_pct: 7.5,
          lookback_change_pct: -8.25,
          previous_all_time_high: 43.5,
        },
      ],
      coverage: {
        status: 'degraded',
        universe_provenance: 'recoverable_macd_membership',
        exclusions_count: 3,
        unseeded_count: null,
      },
    },
  },
};

const getDates = jest.fn<
  Promise<IpcResponse<ISessionPage>>,
  [request?: unknown]
>();
const getBounceResults = jest.fn<
  Promise<IpcResponse<IBounceResults>>,
  [request?: unknown]
>();

const deferred = <T,>() => {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
};

const emptyResults = (): IpcResponse<IBounceResults> => ({
  ok: true,
  data: {
    ...results.data,
    whole_market: {
      ...results.data.whole_market,
      rows: [],
    },
    macd_history: {
      ...results.data.macd_history,
      rows: [],
    },
  },
});

describe('StockBounce US all-time-high screen', () => {
  beforeEach(() => {
    getDates.mockReset();
    getBounceResults.mockReset();
    getDates.mockResolvedValue(sessions);
    getBounceResults.mockResolvedValue(results);
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { getDates, getBounceResults },
    });
    useStore.setState({
      selectedDate: undefined,
      lookback: 20,
      activeUniverse: 'whole_market',
    });
  });

  it('renders every contracted field and switches independent top-20 lists without another request', async () => {
    render(<App />);

    const table = await screen.findByRole('table', {
      name: 'Whole Market top 20',
    });
    expect(getBounceResults).toHaveBeenCalledTimes(1);
    expect(getBounceResults).toHaveBeenCalledWith({
      date: '2026-10-27',
      lookback: 20,
    });
    expect(getDates).toHaveBeenCalledWith({ limit: 500 });

    [
      'Rank',
      'Ticker',
      'T open',
      'T high',
      'T close',
      'Volume',
      'Open-close change',
      'Lookback change',
      'Previous all-time high',
    ].forEach((name) => {
      expect(within(table).getByRole('columnheader', { name })).toBeVisible();
    });
    expect(within(table).getByText('XYZ')).toHaveAttribute(
      'href',
      'https://finance.yahoo.com/quote/XYZ'
    );
    expect(within(table).getByText('148')).toBeVisible();
    expect(within(table).getByText('1,234,567')).toBeVisible();
    expect(within(table).getByText('+5.00%')).toBeVisible();
    expect(within(table).getByText('−12.50%')).toBeVisible();
    expect(within(table).getByText('146')).toBeVisible();
    expect(screen.getByText(/exact historical coverage/i)).toBeInTheDocument();

    const macdTab = screen.getByRole('tab', { name: 'MACD History' });
    fireEvent.click(macdTab);

    const macdTable = await screen.findByRole('table', {
      name: 'MACD History top 20',
    });
    expect(within(macdTable).getByText('OLD')).toBeVisible();
    expect(
      screen.queryByRole('table', { name: 'Whole Market top 20' })
    ).toBeNull();
    expect(
      screen.getByText(
        /3 tickers excluded for missing history\. This list may be incomplete\./i
      )
    ).toBeVisible();
    expect(screen.getByText(/3 exclusions/i)).toBeVisible();
    expect(screen.getByText(/unseeded exclusions: unknown/i)).toBeVisible();
    expect(getBounceResults).toHaveBeenCalledTimes(1);
  });

  it('distinguishes positive unseeded exclusions from unknown legacy metadata', async () => {
    const positiveCoverage = {
      ...results,
      data: {
        ...results.data,
        whole_market: {
          ...results.data.whole_market,
          coverage: {
            ...results.data.whole_market.coverage,
            exclusions_count: 4,
            unseeded_count: 2,
          },
        },
      },
    };
    getBounceResults.mockResolvedValue(positiveCoverage);
    render(<App />);

    await screen.findByRole('table', { name: 'Whole Market top 20' });
    expect(screen.getByText(/4 exclusions/i)).toBeVisible();
    expect(
      screen.getByText(
        /2 tickers excluded because all-time-high seeding is incomplete/i
      )
    ).toBeVisible();
    expect(screen.getByText(/unseeded exclusions: unknown/i)).not.toBeVisible();

    fireEvent.click(screen.getByRole('tab', { name: 'MACD History' }));
    expect(
      await screen.findByText(/unseeded exclusions: unknown/i)
    ).toBeVisible();
  });

  it('paginates sessions and selects the latest complete session', async () => {
    getDates
      .mockResolvedValueOnce({
        ok: true,
        data: {
          items: [sessions.data.items[0]],
          next_cursor: 'opaque-page-2',
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          items: [sessions.data.items[1]],
          next_cursor: null,
        },
      });
    render(<App />);

    await screen.findByRole('table', { name: 'Whole Market top 20' });
    expect(getDates).toHaveBeenNthCalledWith(1, { limit: 500 });
    expect(getDates).toHaveBeenNthCalledWith(2, {
      cursor: 'opaque-page-2',
      limit: 500,
    });
    expect(screen.getByLabelText('US trading session')).toHaveValue(
      '2026-10-27'
    );
  });

  it('supports keyboard tabs, labeled date and lookback controls, and bounded lookbacks', async () => {
    render(<App />);
    await screen.findByRole('table', { name: 'Whole Market top 20' });

    const wholeTab = screen.getByRole('tab', { name: 'Whole Market' });
    wholeTab.focus();
    fireEvent.keyDown(wholeTab, { key: 'ArrowRight' });
    const macdTab = screen.getByRole('tab', { name: 'MACD History' });
    expect(macdTab).toHaveAttribute('aria-selected', 'true');
    expect(macdTab).toHaveFocus();
    expect(getBounceResults).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText('US trading session'), {
      target: { value: '2026-10-26' },
    });
    await waitFor(() =>
      expect(getBounceResults).toHaveBeenLastCalledWith({
        date: '2026-10-26',
        lookback: 20,
      })
    );

    const lookback = screen.getByLabelText('Lookback (trading sessions)');
    expect(lookback).toHaveAttribute('max', '120');
    fireEvent.change(lookback, { target: { value: '60' } });
    expect(getBounceResults).toHaveBeenCalledTimes(2);
    fireEvent.blur(lookback);
    await waitFor(() =>
      expect(getBounceResults).toHaveBeenLastCalledWith({
        date: '2026-10-26',
        lookback: 60,
      })
    );
    expect(getBounceResults).toHaveBeenCalledTimes(3);

    fireEvent.change(lookback, { target: { value: '121' } });
    fireEvent.keyDown(lookback, { key: 'Enter' });
    expect(
      await screen.findByText(/lookback must be between 1 and 120/i)
    ).toBeVisible();
    expect(getBounceResults).toHaveBeenCalledTimes(3);
    expect(document.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('announces loading and provides independent empty states', async () => {
    const pending = deferred<IpcResponse<IBounceResults>>();
    getBounceResults.mockReturnValue(pending.promise);
    render(<App />);

    expect(
      await screen.findByRole('status', {
        name: /loading whole market and macd history results/i,
      })
    ).toBeVisible();
    pending.resolve(emptyResults());

    expect(
      await screen.findByText(/no whole market stocks qualified/i)
    ).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'MACD History' }));
    expect(
      await screen.findByText(/no macd history stocks qualified/i)
    ).toBeVisible();
    expect(getBounceResults).toHaveBeenCalledTimes(1);
  });

  it('surfaces missing-credential and structured session errors', async () => {
    getDates.mockResolvedValue({
      ok: false,
      error: {
        code: 'MARKETEYE_API_KEY_MISSING',
        message:
          'StockBounce is not configured. Set MARKETEYE_API_KEY in the desktop main process.',
      },
    });
    render(<App />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('MARKETEYE_API_KEY_MISSING');
    expect(alert).toHaveTextContent('Set MARKETEYE_API_KEY');
    expect(getBounceResults).not.toHaveBeenCalled();
  });

  it('surfaces structured result errors without replacing the controls', async () => {
    getBounceResults.mockResolvedValue({
      ok: false,
      error: {
        code: 'BOUNCE_SESSION_NOT_READY',
        message: 'The selected session is still being prepared.',
        details: { date: '2026-10-27' },
      },
    });
    render(<App />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('BOUNCE_SESSION_NOT_READY');
    expect(alert).toHaveTextContent('still being prepared');
    expect(screen.getByLabelText('US trading session')).toBeEnabled();
    expect(screen.getByLabelText('Lookback (trading sessions)')).toBeEnabled();
  });

  it('commits lookback edits on Enter instead of requesting per keystroke', async () => {
    render(<App />);
    await screen.findByRole('table', { name: 'Whole Market top 20' });
    const lookback = screen.getByLabelText('Lookback (trading sessions)');

    fireEvent.change(lookback, { target: { value: '1' } });
    fireEvent.change(lookback, { target: { value: '12' } });
    fireEvent.change(lookback, { target: { value: '120' } });
    expect(getBounceResults).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(lookback, { key: 'Enter' });
    await waitFor(() =>
      expect(getBounceResults).toHaveBeenLastCalledWith({
        date: '2026-10-27',
        lookback: 120,
      })
    );
    expect(getBounceResults).toHaveBeenCalledTimes(2);
  });

  it('explains when a selected session has no supported lookback', async () => {
    getDates.mockResolvedValue({
      ok: true,
      data: {
        items: [
          {
            epoch: 1792876800000,
            date_string: '2026-10-25',
            max_lookback: 0,
          },
          ...sessions.data.items,
        ],
        next_cursor: null,
      },
    });
    render(<App />);
    await screen.findByRole('table', { name: 'Whole Market top 20' });

    fireEvent.change(screen.getByLabelText('US trading session'), {
      target: { value: '2026-10-25' },
    });
    expect(
      await screen.findByText(/no prior sessions; lookback unavailable/i)
    ).toBeVisible();
    expect(screen.getByLabelText('Lookback (trading sessions)')).toBeDisabled();
    expect(getBounceResults).toHaveBeenCalledTimes(1);
  });

  it('distinguishes reconstructed coverage from exclusion-only degradation', async () => {
    getBounceResults.mockResolvedValue({
      ok: true,
      data: {
        ...results.data,
        whole_market: {
          ...results.data.whole_market,
          coverage: {
            ...results.data.whole_market.coverage,
            status: 'degraded',
            exclusions_count: 2,
          },
        },
      },
    });
    render(<App />);

    await screen.findByRole('table', { name: 'Whole Market top 20' });
    expect(
      screen.getByText(
        /reconstructed universe\. Membership may be incomplete\./i
      )
    ).toBeVisible();
    expect(
      screen.queryByText(/2 tickers excluded for missing history/i)
    ).not.toBeInTheDocument();
  });

  it('removes legacy workflow controls and preserves focus during status updates', async () => {
    const pending = deferred<IpcResponse<IBounceResults>>();
    getBounceResults.mockReturnValue(pending.promise);
    render(<App />);
    const lookback = await screen.findByLabelText(
      'Lookback (trading sessions)'
    );
    lookback.focus();

    expect(screen.queryByText('Short Term')).toBeNull();
    expect(screen.queryByText('Long Term')).toBeNull();
    expect(screen.queryByLabelText(/closing price range/i)).toBeNull();
    expect(screen.queryByLabelText(/tracking period/i)).toBeNull();
    expect(
      screen.queryByRole('columnheader', { name: /frequencies/i })
    ).toBeNull();

    pending.resolve(results);
    await screen.findByRole('table', { name: 'Whole Market top 20' });
    expect(lookback).toHaveFocus();
  });
});

describe('StockBounce reflow styles', () => {
  it('keeps the page reflowable and confines horizontal overflow to the table', () => {
    const css = jest
      .requireActual<typeof import('fs')>('fs')
      .readFileSync(`${process.cwd()}/src/renderer/App.css`, 'utf8');
    const bodyRule = css.match(/(?:^|\n)body\s*\{[^}]*\}/)?.[0] || '';
    const baseFiltersIndex =
      css.match(
        /(?:^|\n)\.filters\s*\{[^}]*grid-template-columns:\s*minmax\(240px, 1fr\)/
      )?.index ?? -1;
    const responsiveFiltersIndex =
      css.match(/\.filters\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/)
        ?.index ?? -1;

    expect(bodyRule).not.toContain('min-width');
    expect(baseFiltersIndex).toBeGreaterThanOrEqual(0);
    expect(responsiveFiltersIndex).toBeGreaterThanOrEqual(0);
    expect(baseFiltersIndex).toBeLessThan(responsiveFiltersIndex);
    expect(css).toMatch(/\.table-scroll\s*\{[^}]*overflow-x:\s*auto/);
  });
});
