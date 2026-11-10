/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import axios from 'axios';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import {
  IApiError,
  IBounceRequest,
  IBounceResults,
  IpcFailure,
  IpcResponse,
  ISessionPage,
  ISessionsRequest,
} from '../types';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

const getApiUrl = () => {
  const configuredUrl = process.env.MARKETEYE_API_URL?.replace(/\/+$/, '');
  if (!configuredUrl) return undefined;
  return configuredUrl.endsWith('/api')
    ? configuredUrl
    : `${configuredUrl}/api`;
};

const configurationError = (): IpcFailure | null => {
  if (!process.env.MARKETEYE_API_KEY) {
    return {
      ok: false,
      error: {
        code: 'MARKETEYE_API_KEY_MISSING',
        message:
          'StockBounce is not configured. Set MARKETEYE_API_KEY in the desktop main process.',
      },
    };
  }
  if (!getApiUrl()) {
    return {
      ok: false,
      error: {
        code: 'MARKETEYE_API_URL_MISSING',
        message:
          'StockBounce is not configured. Set MARKETEYE_API_URL in the desktop main process.',
      },
    };
  }
  return null;
};

const requestError = (error: unknown): IpcFailure => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail as IApiError | undefined;
    if (
      detail &&
      typeof detail.code === 'string' &&
      typeof detail.message === 'string'
    ) {
      return {
        ok: false,
        error: {
          code: detail.code,
          message: detail.message,
          details: detail.details,
        },
      };
    }
  }

  return {
    ok: false,
    error: {
      code: 'BOUNCE_REQUEST_FAILED',
      message:
        'The StockBounce service could not complete the request. Try again later.',
    },
  };
};

const requestV2 = async <T>(
  operation: 'results' | 'sessions',
  params: Record<string, string | number | undefined>
): Promise<IpcResponse<T>> => {
  const configError = configurationError();
  if (configError) return configError;

  try {
    const response = await axios.get<T>(
      `${getApiUrl()}/stock-bounce/v2/${operation}`,
      {
        params,
        headers: { 'X-API-Key': process.env.MARKETEYE_API_KEY as string },
        timeout: 30_000,
      }
    );
    return { ok: true, data: response.data };
  } catch (error) {
    return requestError(error);
  }
};

ipcMain.handle('get-bounce-results', (_event, request: IBounceRequest) =>
  requestV2<IBounceResults>('results', {
    date: request.date,
    lookback: request.lookback,
  })
);

ipcMain.handle(
  'get-dates',
  (_event, request: ISessionsRequest = { limit: 500 }) =>
    requestV2<ISessionPage>('sessions', {
      cursor: request.cursor,
      limit: request.limit,
    })
);

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDevelopment) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDevelopment) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1280,
    height: 960,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.maximize();

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
