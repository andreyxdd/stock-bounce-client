import { useEffect, useState } from 'react';
import useDates from '../hooks/useDates';
import useStore from '../hooks/useStore';

const PeriodPicker = () => {
  const selectedDate = useStore((state) => state.selectedDate);
  const lookback = useStore((state) => state.lookback);
  const [draftLookback, setDraftLookback] = useState(String(lookback));
  const { data: sessions } = useDates();
  const selectedSession = sessions?.find(
    (session) => session.date_string === selectedDate
  );
  const maxLookback = selectedSession?.max_lookback;
  const draftValue = Number(draftLookback);
  const isValid = Boolean(
    maxLookback &&
      Number.isInteger(draftValue) &&
      draftValue >= 1 &&
      draftValue <= maxLookback
  );

  useEffect(() => {
    setDraftLookback(String(lookback));
  }, [lookback]);

  const commitLookback = () => {
    if (draftValue !== lookback)
      useStore.setState({ lookback: Number(draftLookback) });
  };

  let lookbackHint = 'Select a session first';
  if (selectedSession) {
    lookbackHint =
      maxLookback === 0
        ? 'No prior sessions; lookback unavailable'
        : `1–${maxLookback} sessions have complete coverage`;
  }

  return (
    <div className="control-group">
      <label htmlFor="lookback-input">
        Lookback (trading sessions)
        <input
          id="lookback-input"
          type="number"
          inputMode="numeric"
          min={1}
          max={maxLookback}
          step={1}
          value={draftLookback}
          disabled={!selectedSession || maxLookback === 0}
          aria-invalid={!isValid}
          aria-describedby={
            !isValid && maxLookback
              ? 'lookback-hint lookback-error'
              : 'lookback-hint'
          }
          onChange={(event) => setDraftLookback(event.target.value)}
          onBlur={commitLookback}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitLookback();
          }}
        />
      </label>
      <span id="lookback-hint" className="control-hint">
        {lookbackHint}
      </span>
      {!isValid && maxLookback ? (
        <span id="lookback-error" className="control-error" role="alert">
          Lookback must be between 1 and {maxLookback}.
        </span>
      ) : null}
    </div>
  );
};

export default PeriodPicker;
