import { ReactNode } from 'react';
import { ICoverage, Universe } from '../../../types';
import useBounce from '../../hooks/useBounce';
import useStore from '../../hooks/useStore';
import UniverseTabs from '../UniverseTabs';
import Table from './Table';

const labels: Record<Universe, string> = {
  whole_market: 'Whole Market',
  macd_history: 'MACD History',
};

const getUnseededLabel = (count: number | null) => {
  if (count === null)
    return 'Unseeded exclusions: unknown for this legacy snapshot.';
  if (count > 0)
    return `${count} tickers excluded because all-time-high seeding is incomplete.`;
  return 'No unseeded exclusions.';
};

const Coverage = ({ coverage }: { coverage: ICoverage }) => {
  const isReconstructed = coverage.universe_provenance.startsWith('archived');
  let coverageLabel = 'Exact historical coverage.';
  if (coverage.status === 'degraded') {
    coverageLabel = isReconstructed
      ? 'Reconstructed universe. Membership may be incomplete.'
      : `${coverage.exclusions_count} tickers excluded for missing history. This list may be incomplete.`;
  }

  return (
    <div
      className={`coverage coverage--${coverage.status}`}
      role="note"
      aria-label={`${coverage.status} coverage details`}
    >
      <strong>{coverageLabel}</strong>
      <span>Provenance: {coverage.universe_provenance}</span>
      <span>{coverage.exclusions_count} exclusions.</span>
      <span>{getUnseededLabel(coverage.unseeded_count)}</span>
    </div>
  );
};

function DataTable() {
  const activeUniverse = useStore((state) => state.activeUniverse);
  const { data, isLoading, isError, error, isSuccess, hasValidInputs } =
    useBounce();
  let announcement = '';
  if (isLoading) announcement = 'Loading Whole Market and MACD History results';
  else if (isError) announcement = `Results error: ${error?.code}`;
  else if (isSuccess)
    announcement = 'Whole Market and MACD History results loaded';

  let content: ReactNode = null;
  if (hasValidInputs) {
    if (isLoading) {
      content = (
        <div
          className="state-panel"
          role="status"
          aria-label="Loading Whole Market and MACD History results"
        >
          <span className="loading-line" aria-hidden="true" />
          Loading both top-20 lists…
        </div>
      );
    } else if (isError) {
      content = (
        <div className="state-panel state-panel--error" role="alert">
          <strong>{error?.code}</strong>
          <p>{error?.message}</p>
        </div>
      );
    } else if (data) {
      content = (Object.keys(labels) as Universe[]).map((universe) => (
        <div
          key={universe}
          id={`${universe}-panel`}
          role="tabpanel"
          aria-labelledby={`${universe}-tab`}
          hidden={activeUniverse !== universe}
          tabIndex={0}
        >
          <div className="panel-heading">
            <h2>{labels[universe]}</h2>
            <span>
              {data.date} · {data.lookback}-session lookback
            </span>
          </div>
          <Coverage coverage={data[universe].coverage} />
          {data[universe].rows.length > 0 ? (
            <Table data={data[universe]} label={labels[universe]} />
          ) : (
            <div className="state-panel" role="status">
              No {labels[universe]} stocks qualified for this session and
              lookback. Try another supported combination.
            </div>
          )}
        </div>
      ));
    }
  }

  return (
    <section
      className="results-section"
      aria-label="All-time-high bounce results"
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      <UniverseTabs />
      {content}
    </section>
  );
}

export default DataTable;
