const Navbar = () => {
  return (
    <header className="app-bar">
      <div className="app-bar__inner">
        <span className="brand-mark" aria-hidden="true">
          SB
        </span>
        <div>
          <div className="brand-name">StockBounce</div>
          <div className="brand-market">US · NYSE / NASDAQ</div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
