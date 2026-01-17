export function StockCard({ stock, onRemove, onAdd, isInWatchlist }) {
  const isPositive = stock.d >= 0;
  const changeColor = isPositive ? 'positive' : 'negative';
  const arrow = isPositive ? '▲' : '▼';

  return (
    <div className="stock-card">
      <div className="stock-header">
        <div className="stock-info">
          <h3 className="stock-symbol">{stock.symbol}</h3>
          <span className="stock-name">{stock.name}</span>
        </div>
        {onRemove && (
          <button className="remove-btn" onClick={() => onRemove(stock.symbol)} title="Remove from watchlist">
            ×
          </button>
        )}
        {onAdd && !isInWatchlist && (
          <button className="add-btn" onClick={() => onAdd(stock)} title="Add to watchlist">
            +
          </button>
        )}
        {onAdd && isInWatchlist && (
          <span className="in-watchlist">✓ In Watchlist</span>
        )}
      </div>
      <div className="stock-price">
        <span className="current-price">${stock.c.toFixed(2)}</span>
        <span className={`price-change ${changeColor}`}>
          {arrow} {Math.abs(stock.d).toFixed(2)} ({Math.abs(stock.dp).toFixed(2)}%)
        </span>
      </div>
      <div className="stock-details">
        <div className="detail">
          <span className="label">Open</span>
          <span className="value">${stock.o.toFixed(2)}</span>
        </div>
        <div className="detail">
          <span className="label">High</span>
          <span className="value">${stock.h.toFixed(2)}</span>
        </div>
        <div className="detail">
          <span className="label">Low</span>
          <span className="value">${stock.l.toFixed(2)}</span>
        </div>
        <div className="detail">
          <span className="label">Prev Close</span>
          <span className="value">${stock.pc.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
