import { IBounceUniverse } from '../../../types';

type Props = {
  data: IBounceUniverse;
  label: string;
};

const formatPrice = (value: number) =>
  Number(value.toPrecision(6)).toLocaleString('en-US');

const formatPercentage = (value: number) => {
  let sign = '';
  if (value > 0) sign = '+';
  if (value < 0) sign = '−';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
};

const Table = ({ data, label }: Props) => {
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label={`${label} table, scrollable`}
      // Keyboard focus lets users scroll wide data tables.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    >
      <table>
        <caption className="sr-only">{label} top 20</caption>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Ticker</th>
            <th scope="col">T open</th>
            <th scope="col">T high</th>
            <th scope="col">T close</th>
            <th scope="col">Volume</th>
            <th scope="col" aria-label="Open-close change">
              Open-close change (%)
            </th>
            <th scope="col" aria-label="Lookback change">
              Lookback change (%)
            </th>
            <th scope="col">Previous all-time high</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.ticker}>
              <td className="rank-cell">{row.id}</td>
              <th scope="row">
                <a
                  href={`https://finance.yahoo.com/quote/${encodeURIComponent(
                    row.ticker
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${row.ticker} on Yahoo Finance (opens in a new window)`}
                >
                  {row.ticker}
                </a>
              </th>
              <td>{formatPrice(row.open)}</td>
              <td>{formatPrice(row.high)}</td>
              <td>{formatPrice(row.close)}</td>
              <td>{row.volume.toLocaleString('en-US')}</td>
              <td className="positive-change">
                {formatPercentage(row.open_close_change_pct)}
              </td>
              <td className="negative-change">
                {formatPercentage(row.lookback_change_pct)}
              </td>
              <td>{formatPrice(row.previous_all_time_high)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
