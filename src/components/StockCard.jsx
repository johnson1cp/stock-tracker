import { Sparkline } from './Sparkline';
import { StockChart } from './StockChart';

const formatMarketCap = (value) => {
  if (!value) return 'N/A';
  const num = parseFloat(value);
  if (isNaN(num)) return 'N/A';

  // Format with 4 significant digits
  if (num >= 1e12) {
    const t = num / 1e12;
    if (t >= 100) return '$' + t.toFixed(1) + 'T';
    if (t >= 10) return '$' + t.toFixed(2) + 'T';
    return '$' + t.toFixed(3) + 'T';
  }
  if (num >= 1e9) {
    const b = num / 1e9;
    if (b >= 100) return '$' + b.toFixed(1) + 'B';
    if (b >= 10) return '$' + b.toFixed(2) + 'B';
    return '$' + b.toFixed(3) + 'B';
  }
  if (num >= 1e6) {
    const m = num / 1e6;
    if (m >= 100) return '$' + m.toFixed(1) + 'M';
    if (m >= 10) return '$' + m.toFixed(2) + 'M';
    return '$' + m.toFixed(3) + 'M';
  }
  return '$' + num.toFixed(0);
};

const formatPercent = (value) => {
  if (!value) return 'N/A';
  const num = parseFloat(value);
  if (isNaN(num)) return 'N/A';
  return (num * 100).toFixed(2) + '%';
};

const getTimeAgo = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1d ago';
  return `${diffDays}d ago`;
};

export function StockCard({ stock, onRemove, onAdd, onClose, isInWatchlist, showChart = false, onClick }) {
  const isPositive = stock.d >= 0;
  const changeColor = isPositive ? 'positive' : 'negative';
  const arrow = isPositive ? '▲' : '▼';

  const handleClick = (e) => {
    // Don't trigger if clicking remove/add/close buttons
    if (e.target.closest('.remove-btn') || e.target.closest('.add-btn') || e.target.closest('.close-btn')) return;
    if (onClick) onClick(stock.symbol);
  };

  return (
    <div className={`stock-card ${onClick ? 'clickable' : ''}`} onClick={handleClick}>
      <div className="stock-header">
        <div className="stock-info">
          <div className="stock-symbol-row">
            <h3 className="stock-symbol">{stock.symbol}</h3>
            {stock.website && (
              <a
                href={stock.website}
                target="_blank"
                rel="noopener noreferrer"
                className="stock-website-link"
                onClick={(e) => e.stopPropagation()}
                title={stock.website}
              >
                ↗
              </a>
            )}
          </div>
          <span className="stock-name">{stock.name}</span>
        </div>
        <div className="stock-actions">
          {onClose && (
            <button
              className="close-btn"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              title="Close"
            >
              ×
            </button>
          )}
          {onRemove && (
            <button
              className="remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(stock.symbol);
              }}
              title="Remove from watchlist"
            >
              ×
            </button>
          )}
          {onAdd && !isInWatchlist && (
            <button
              className="add-btn"
              onClick={(e) => {
                e.stopPropagation();
                onAdd(stock);
              }}
              title="Add to watchlist"
            >
              +
            </button>
          )}
          {onAdd && isInWatchlist && (
            <span className="in-watchlist">✓ In Watchlist</span>
          )}
        </div>
      </div>
      <div className="stock-price-row">
        <div className="stock-price">
          <span className="current-price">${stock.c.toFixed(2)}</span>
          <span className={`price-change ${changeColor}`}>
            {arrow} {isPositive ? '+' : '-'}${Math.abs(stock.d).toFixed(2)} ({isPositive ? '+' : '-'}{Math.abs(stock.dp).toFixed(2)}%)
          </span>
        </div>
        {stock.history && stock.history.length > 1 && (
          <div className="stock-sparkline">
            <Sparkline
              data={stock.history}
              width={80}
              height={35}
              positive={isPositive}
              previousClose={stock.pc}
            />
          </div>
        )}
      </div>
      {(stock.sector || stock.industry) && (
        <div className="stock-meta">
          {stock.sector && <span className="stock-sector">{stock.sector}</span>}
          {stock.industry && <span className="stock-industry">{stock.industry}</span>}
        </div>
      )}
      <div className={`stock-details ${showChart ? 'expanded' : ''}`}>
        {/* Basic stats for all views: Open, Low, High, Mkt Cap */}
        <div className="detail">
          <span className="label">Open</span>
          <span className="value">${stock.o.toFixed(2)}</span>
        </div>
        <div className="detail">
          <span className="label">Low</span>
          <span className="value">${stock.l.toFixed(2)}</span>
        </div>
        <div className="detail">
          <span className="label">High</span>
          <span className="value">${stock.h.toFixed(2)}</span>
        </div>
        <div className="detail">
          <span className="label">{showChart ? 'MKT CAP' : 'MCap'}</span>
          <span className="value">{stock.marketCap ? formatMarketCap(stock.marketCap) : 'N/A'}</span>
        </div>
        {/* Extended stats only for search result (showChart) */}
        {showChart && (
          <>
            <div className="detail">
              <span className="label">Beta</span>
              <span className="value">{stock.beta ? parseFloat(stock.beta).toFixed(2) : 'N/A'}</span>
            </div>
            <div className="detail">
              <span className="label">Target</span>
              <span className="value">{stock.analystTargetPrice ? `$${parseFloat(stock.analystTargetPrice).toFixed(2)}` : 'N/A'}</span>
            </div>
            <div className="detail">
              <span className="label">Prev</span>
              <span className="value">${stock.pc.toFixed(2)}</span>
            </div>
            <div className="detail">
              <span className="label">52W Low</span>
              <span className="value">{stock.week52Low ? `$${parseFloat(stock.week52Low).toFixed(2)}` : 'N/A'}</span>
            </div>
            <div className="detail">
              <span className="label">52W High</span>
              <span className="value">{stock.week52High ? `$${parseFloat(stock.week52High).toFixed(2)}` : 'N/A'}</span>
            </div>
            <div className="detail">
              <span className="label">Div Yield</span>
              <span className="value">{stock.dividendYield ? formatPercent(stock.dividendYield) : 'N/A'}</span>
            </div>
            <div className="detail">
              <span className="label">EPS</span>
              <span className="value">{stock.eps ? `$${stock.eps}` : 'N/A'}</span>
            </div>
            <div className="detail">
              <span className="label">P/E</span>
              <span className="value">{stock.peRatio || 'N/A'}</span>
            </div>
          </>
        )}
      </div>
      {showChart && stock.history && stock.history.length > 1 && (
        <div className="stock-chart-wrapper">
          <StockChart
            data={stock.history}
            width={1100}
            height={200}
            positive={isPositive}
            previousClose={stock.pc}
            symbol={stock.symbol}
          />
        </div>
      )}
      {stock.news && Array.isArray(stock.news) && stock.news.length > 0 && showChart && (
        <div className="stock-news-grid">
          <h4>Recent News</h4>
          <div className="news-grid">
            {stock.news.map((item, index) => {
              const date = new Date(item.datetime * 1000);
              const timeAgo = getTimeAgo(date);
              return (
                <a
                  key={index}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-grid-item"
                >
                  <span className="news-headline">{item.headline}</span>
                  <span className="news-meta">
                    <span className="news-source">{item.source}</span>
                    <span className="news-time">{timeAgo}</span>
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}
      {showChart && (stock.address || stock.description) && (
        <div className="stock-about">
          {stock.description && (
            <p className="stock-description">{stock.description}</p>
          )}
          {stock.address && (
            <p className="stock-address">{stock.address}</p>
          )}
        </div>
      )}
      {stock.news && Array.isArray(stock.news) && stock.news.length > 0 && !showChart && (
        <div className="stock-news">
          <a href={stock.news[0].url} target="_blank" rel="noopener noreferrer" title={stock.news[0].headline}>
            {stock.news[0].headline}
          </a>
          <span className="news-source">{stock.news[0].source}</span>
        </div>
      )}
      {stock.news && !Array.isArray(stock.news) && (
        <div className="stock-news">
          <a href={stock.news.url} target="_blank" rel="noopener noreferrer" title={stock.news.headline}>
            {stock.news.headline}
          </a>
          <span className="news-source">{stock.news.source}</span>
        </div>
      )}
    </div>
  );
}
