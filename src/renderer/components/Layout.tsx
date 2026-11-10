import Navbar from './Navbar';
import DatePicker from './DatePicker';
import Footer from './Footer';
import useDates from '../hooks/useDates';
import PeriodPicker from './PeriodPicker';

interface ILayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: ILayoutProps) => {
  const { data: sessions, isLoading, isError, error } = useDates();

  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content">
        <section className="screen-heading" aria-labelledby="screen-title">
          <h1 id="screen-title">All-time-high bounces</h1>
          <p>
            Positive session movers that broke their prior all-time high after a
            negative lookback. Ranked independently within each universe.
          </p>
        </section>

        <section className="filters" aria-label="Result filters">
          <DatePicker />
          <PeriodPicker />
        </section>

        {isLoading ? (
          <div className="state-panel" role="status">
            Loading available US trading sessions…
          </div>
        ) : null}

        {isError ? (
          <div className="state-panel state-panel--error" role="alert">
            <strong>{error?.code || 'SESSIONS_REQUEST_FAILED'}</strong>
            <p>
              {error?.message ||
                'Available sessions could not be loaded. Try again later.'}
            </p>
          </div>
        ) : null}

        {!isLoading && !isError && sessions?.length === 0 ? (
          <div className="state-panel" role="status">
            No US sessions with complete v2 data are available.
          </div>
        ) : null}

        {sessions && sessions.length > 0 ? children : null}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
