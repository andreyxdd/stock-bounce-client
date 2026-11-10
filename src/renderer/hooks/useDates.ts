import { useQuery } from 'react-query';
import {
  ISession,
  ISessionsRequest,
  StockBounceError,
  unwrapIpcResponse,
} from '../../types';
import useStore from './useStore';

const SESSION_PAGE_LIMIT = 500;

const getAllSessions = async (): Promise<ISession[]> => {
  const items: ISession[] = [];
  let cursor: string | undefined;

  do {
    const request: ISessionsRequest = { limit: SESSION_PAGE_LIMIT };
    if (cursor) request.cursor = cursor;
    // Each opaque cursor depends on the preceding page.
    // eslint-disable-next-line no-await-in-loop
    const page = unwrapIpcResponse(await window.electronAPI.getDates(request));
    items.push(...page.items);
    cursor = page.next_cursor || undefined;
  } while (cursor);

  return items;
};

const useDates = () => {
  return useQuery<ISession[], StockBounceError>(
    'stock-bounce-v2-sessions',
    getAllSessions,
    {
      staleTime: Infinity,
      cacheTime: 0,
      retry: false,
      onSuccess: (sessions) => {
        const { selectedDate, lookback } = useStore.getState();
        const selectedSession = sessions.find(
          (session) => session.date_string === selectedDate
        );
        let nextSession = selectedSession;
        if (!nextSession && sessions.length > 0)
          nextSession = sessions[sessions.length - 1];
        let nextLookback = 20;
        if (nextSession) {
          nextLookback =
            lookback >= 1 && lookback <= nextSession.max_lookback
              ? lookback
              : Math.min(20, nextSession.max_lookback);
        }

        useStore.setState({
          selectedDate: nextSession?.date_string,
          lookback: nextLookback,
        });
      },
    }
  );
};

export default useDates;
