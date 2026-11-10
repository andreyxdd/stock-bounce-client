import {
  IBounceRequest,
  IBounceResults,
  IpcResponse,
  ISessionPage,
  ISessionsRequest,
} from './types';

export interface IElectronAPI {
  getDates: (req?: ISessionsRequest) => Promise<IpcResponse<ISessionPage>>;
  getBounceResults: (
    req: IBounceRequest
  ) => Promise<IpcResponse<IBounceResults>>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
