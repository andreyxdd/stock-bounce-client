import {
  IBounceRequest,
  IBounceResults,
  IpcResponse,
  ISessionPage,
  ISessionsRequest,
} from './types';

export interface IElectronAPIConn {
  myPing: () => void;
  on: (channel: string, func: (...args: unknown[]) => void) => void;
  once: (channel: string, func: (...args: unknown[]) => void) => void;
}

export interface IElectronAPI {
  getDates: (req?: ISessionsRequest) => Promise<IpcResponse<ISessionPage>>;
  getBounceResults: (
    req: IBounceRequest
  ) => Promise<IpcResponse<IBounceResults>>;
  conn: IElectronAPIConn;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
