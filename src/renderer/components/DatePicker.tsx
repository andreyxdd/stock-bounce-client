import useDates from '../hooks/useDates';
import useStore from '../hooks/useStore';

const DatePicker = () => {
  const selectedDate = useStore((state) => state.selectedDate);
  const { data: sessions, isLoading } = useDates();

  const handleChange = (date: string) => {
    const session = sessions?.find((item) => item.date_string === date);
    if (!session) return;
    useStore.setState({
      selectedDate: date,
      lookback: Math.min(20, session.max_lookback),
    });
  };

  return (
    <div className="control-group">
      <label htmlFor="session-select">
        US trading session
        <select
          id="session-select"
          value={selectedDate || ''}
          onChange={(event) => handleChange(event.target.value)}
          disabled={isLoading || !sessions?.length}
        >
          {!selectedDate ? <option value="">Select a session</option> : null}
          {sessions?.map((session) => (
            <option key={session.date_string} value={session.date_string}>
              {session.date_string}
            </option>
          ))}
        </select>
      </label>
      <span className="control-hint">Only sessions with complete v2 data</span>
    </div>
  );
};

export default DatePicker;
