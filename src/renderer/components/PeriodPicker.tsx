import useDates from '../hooks/useDates';
import useStore from '../hooks/useStore';

const PeriodPicker = () => {
  const selectedDate = useStore((state) => state.selectedDate);
  const lookback = useStore((state) => state.lookback);
  const { data: sessions } = useDates();
  const selectedSession = sessions?.find(
    (session) => session.date_string === selectedDate
  );
  const maxLookback = selectedSession?.max_lookback;
  const isValid = Boolean(
    maxLookback &&
      Number.isInteger(lookback) &&
      lookback >= 1 &&
      lookback <= maxLookback
  );

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
          value={lookback}
          disabled={!selectedSession}
          aria-invalid={!isValid}
          aria-describedby={
            isValid ? 'lookback-hint' : 'lookback-hint lookback-error'
          }
          onChange={(event) =>
            useStore.setState({ lookback: Number(event.target.value) })
          }
        />
      </label>
      <span id="lookback-hint" className="control-hint">
        {maxLookback
          ? `1–${maxLookback} sessions have complete coverage`
          : 'Select a session first'}
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
