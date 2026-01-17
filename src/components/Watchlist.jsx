import { useState, useEffect, useCallback } from 'react';
import { useStockData } from '../hooks/useStockData';
import { StockCard } from './StockCard';

const STORAGE_KEY = 'stock-watchlist';

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  const addToWatchlist = useCallback((stock) => {
    setWatchlist((prev) => {
      if (prev.find((s) => s.symbol === stock.symbol)) {
        return prev;
      }
      return [...prev, stock];
    });
  }, []);

  const removeFromWatchlist = useCallback((symbol) => {
    setWatchlist((prev) => prev.filter((s) => s.symbol !== symbol));
  }, []);

  return { watchlist, addToWatchlist, removeFromWatchlist };
}

export function Watchlist({ watchlist, onRemove, onRefresh }) {
  const { fetchStockQuote, loading } = useStockData();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    const updatedStocks = await Promise.all(
      watchlist.map((stock) => fetchStockQuote(stock.symbol))
    );
    updatedStocks.forEach((stock) => {
      if (stock) onRefresh(stock);
    });
    setRefreshing(false);
  };

  if (watchlist.length === 0) {
    return (
      <div className="watchlist-empty">
        <p>Your watchlist is empty.</p>
        <p>Search for stocks above and click + to add them.</p>
      </div>
    );
  }

  return (
    <div className="watchlist">
      <div className="watchlist-header">
        <h2>My Watchlist ({watchlist.length})</h2>
        <button
          className="refresh-btn"
          onClick={handleRefreshAll}
          disabled={refreshing || loading}
        >
          {refreshing ? 'Refreshing...' : 'Refresh All'}
        </button>
      </div>
      <div className="watchlist-grid">
        {watchlist.map((stock) => (
          <StockCard key={stock.symbol} stock={stock} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}
