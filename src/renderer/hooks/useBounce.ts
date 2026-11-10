import { useQuery } from 'react-query';
import {
  IBounceResults,
  StockBounceError,
  unwrapIpcResponse,
} from '../../types';
import useDates from './useDates';
import useStore from './useStore';

const useBounce = () => {
  const selectedDate = useStore((state) => state.selectedDate);
  const lookback = useStore((state) => state.lookback);
  const { data: sessions } = useDates();
  const selectedSession = sessions?.find(
    (session) => session.date_string === selectedDate
  );
  const hasValidInputs = Boolean(
    selectedDate &&
      selectedSession &&
      Number.isInteger(lookback) &&
      lookback >= 1 &&
      lookback <= selectedSession.max_lookback
  );

  const query = useQuery<IBounceResults, StockBounceError>(
    ['stock-bounce-v2-results', selectedDate, lookback],
    async () =>
      unwrapIpcResponse(
        await window.electronAPI.getBounceResults({
          date: selectedDate as string,
          lookback,
        })
      ),
    {
      enabled: hasValidInputs,
      staleTime: Infinity,
      cacheTime: 0,
      retry: false,
    }
  );

  return { ...query, hasValidInputs };
};

export default useBounce;
