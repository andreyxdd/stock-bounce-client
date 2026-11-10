export interface IBounceRequest {
  date: string;
  lookback: number;
}

export interface ISessionsRequest {
  cursor?: string;
  limit?: number;
}

export interface ISession {
  epoch: number;
  date_string: string;
  max_lookback: number;
}

export interface ISessionPage {
  items: ISession[];
  next_cursor: string | null;
}

export type Universe = 'whole_market' | 'macd_history';

export interface IBounceRow {
  id: number;
  ticker: string;
  open: number;
  high: number;
  close: number;
  volume: number;
  open_close_change_pct: number;
  lookback_change_pct: number;
  previous_all_time_high: number;
}

export interface ICoverage {
  status: 'exact' | 'degraded';
  universe_provenance: string;
  exclusions_count: number;
  unseeded_count: number | null;
}

export interface IBounceUniverse {
  rows: IBounceRow[];
  coverage: ICoverage;
}

export interface IBounceResults {
  schema_version: 2;
  market: 'US';
  date: string;
  lookback: number;
  whole_market: IBounceUniverse;
  macd_history: IBounceUniverse;
}

export interface IApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface IpcSuccess<T> {
  ok: true;
  data: T;
}

export interface IpcFailure {
  ok: false;
  error: IApiError;
}

export type IpcResponse<T> = IpcSuccess<T> | IpcFailure;

export class StockBounceError extends Error {
  code: string;

  details?: unknown;

  constructor(error: IApiError) {
    super(error.message);
    this.name = 'StockBounceError';
    this.code = error.code;
    this.details = error.details;
  }
}

export const unwrapIpcResponse = <T>(response: IpcResponse<T>): T => {
  if (!response.ok) throw new StockBounceError(response.error);
  return response.data;
};
