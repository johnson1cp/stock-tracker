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

  // Fetch historical data and news for all stocks on mount and when watchlist changes
  useEffect(() => {
    async function loadHistoryAndNews() {
      const updated = await Promise.all(
        watchlist.map(async (stock) => {
          // Try to fetch real intraday history first (cache if already loaded)
          let history = stock.history;
          if (!history || history.length === 0) {
            history = await fetchStockHistory(stock.symbol);
            // Fall back to generated data if API doesn't return history
            if (!history || history.length === 0) {
              history = generateSparklineData(stock.c, stock.dp, 20);
            }
          }
          // Always fetch fresh news (it changes throughout the day)
          const news = await fetchStockNews(stock.symbol);
          return { ...stock, history, news };
        })
      );
      setStocksWithHistory(updated);
    }

    if (watchlist.length > 0) {
      loadHistoryAndNews();
    } else {
      setStocksWithHistory([]);
    }
  }, [watchlist, fetchStockHistory, fetchStockNews, generateSparklineData]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    const updatedStocks = await Promise.all(
      watchlist.map(async (stock) => {
        const quote = await fetchStockQuote(stock.symbol);
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

  // Use stocksWithHistory if available, otherwise fall back to watchlist
  const displayStocks = stocksWithHistory.length > 0 ? stocksWithHistory : watchlist;

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
