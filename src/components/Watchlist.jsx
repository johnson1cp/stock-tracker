import { useState, useEffect, useCallback, useRef } from 'react';
import { useStockData } from '../hooks/useStockData';
import { StockCard } from './StockCard';

const STORAGE_KEY = 'stock-watchlist';
const DEFAULT_SYMBOLS = ['AAPL', 'GOOGL', 'NVDA', 'MSFT'];
const API_KEY = 'cmg1hn1r01qv3c72lbd0cmg1hn1r01qv3c72lbdg';

// Standalone fetch function for initialization
async function fetchQuote(symbol) {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (data.c === 0 && data.h === 0) return null;
    return { symbol, ...data };
  } catch {
    return null;
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const initRef = useRef(false);

  // Load default stocks if watchlist is empty on first mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved || JSON.parse(saved).length === 0) {
      // Fetch default stocks
      Promise.all(DEFAULT_SYMBOLS.map(fetchQuote)).then((results) => {
        const validStocks = results.filter(Boolean);
        if (validStocks.length > 0) {
          setWatchlist(validStocks);
        }
      });
    }
  }, []);

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

  const updateStock = useCallback((updatedStock) => {
    setWatchlist((prev) =>
      prev.map((s) => (s.symbol === updatedStock.symbol ? updatedStock : s))
    );
  }, []);

  return { watchlist, addToWatchlist, removeFromWatchlist, updateStock };
}

export function Watchlist({ watchlist, onRemove, onRefresh, onStockClick }) {
  const { fetchStockQuote, fetchStockHistory, fetchStockNews, generateSparklineData, loading } = useStockData();
  const [refreshing, setRefreshing] = useState(false);
  const [stocksWithHistory, setStocksWithHistory] = useState([]);
  const hasAutoRefreshed = useRef(false);

  // Auto-refresh quotes on mount, then fetch history and news
  useEffect(() => {
    async function loadFreshData() {
      // Only auto-refresh once per mount
      if (hasAutoRefreshed.current) return;
      hasAutoRefreshed.current = true;

      const updated = await Promise.all(
        watchlist.map(async (stock) => {
          // Fetch fresh quote data
          const freshQuote = await fetchStockQuote(stock.symbol, false);
          const baseStock = freshQuote || stock;

          // Fetch history
          let history = await fetchStockHistory(baseStock.symbol);
          if (!history || history.length === 0) {
            history = generateSparklineData(baseStock.c, baseStock.dp, 20);
          }

          // Fetch news
          const news = await fetchStockNews(baseStock.symbol);

          // Update the watchlist with fresh data
          if (freshQuote) {
            onRefresh({ ...freshQuote, history, news });
          }

          return { ...baseStock, history, news };
        })
      );
      setStocksWithHistory(updated);
    }

    if (watchlist.length > 0) {
      loadFreshData();
    } else {
      setStocksWithHistory([]);
    }
  }, [watchlist, fetchStockQuote, fetchStockHistory, fetchStockNews, generateSparklineData, onRefresh]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    const updatedStocks = await Promise.all(
      watchlist.map(async (stock) => {
        // Use Finnhub only for watchlist refresh (no Alpha Vantage overview)
        const quote = await fetchStockQuote(stock.symbol, false);
        if (quote) {
          let history = await fetchStockHistory(stock.symbol);
          if (!history || history.length === 0) {
            history = generateSparklineData(quote.c, quote.dp, 20);
          }
          const news = await fetchStockNews(stock.symbol);
          return { ...quote, history, news };
        }
        return null;
      })
    );
    updatedStocks.forEach((stock) => {
      if (stock) onRefresh(stock);
    });
    setStocksWithHistory(updatedStocks.filter(Boolean));
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

  // Merge stocksWithHistory with any new watchlist items that aren't in it yet
  const displayStocks = watchlist.map((stock) => {
    const enriched = stocksWithHistory.find((s) => s.symbol === stock.symbol);
    return enriched || stock;
  });

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
        {displayStocks.map((stock) => (
          <StockCard key={stock.symbol} stock={stock} onRemove={onRemove} onClick={onStockClick} />
        ))}
      </div>
    </div>
  );
}
