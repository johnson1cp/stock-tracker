import { useState, useEffect } from 'react';
import { useStockData, POPULAR_STOCKS } from '../hooks/useStockData';
import { StockCard } from './StockCard';

export function StockSearch({ onAddToWatchlist, watchlistSymbols, externalSearch }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const { fetchStockQuote, fetchStockHistory, fetchStockNews, generateSparklineData, loading, error } = useStockData();

  // Handle external search trigger (e.g., from watchlist click)
  useEffect(() => {
    if (externalSearch) {
      const symbol = externalSearch.split('-')[0]; // Extract symbol from "SYMBOL-timestamp"
      handleQuickSearch(symbol);
    }
  }, [externalSearch]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const result = await fetchStockQuote(searchTerm.trim());
    if (result) {
      let history = await fetchStockHistory(result.symbol);
      if (!history || history.length === 0) {
        history = generateSparklineData(result.c, result.dp, 78);
      }
      const news = await fetchStockNews(result.symbol);
      setSearchResult({ ...result, history, news });
    } else {
      setSearchResult(null);
    }
  };

  const handleQuickSearch = async (symbol) => {
    setSearchTerm(symbol);
    const result = await fetchStockQuote(symbol);
    if (result) {
      let history = await fetchStockHistory(result.symbol);
      if (!history || history.length === 0) {
        history = generateSparklineData(result.c, result.dp, 78);
      }
      const news = await fetchStockNews(result.symbol);
      setSearchResult({ ...result, history, news });
    } else {
      setSearchResult(null);
    }
  };

  return (
    <div className="stock-search">
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          placeholder="Enter stock symbol (e.g., AAPL)"
          className="search-input"
        />
        <button type="submit" className="search-btn" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className="popular-stocks">
        <span className="popular-label">Popular:</span>
        {POPULAR_STOCKS.map((symbol) => (
          <button
            key={symbol}
            className="popular-btn"
            onClick={() => handleQuickSearch(symbol)}
          >
            {symbol}
          </button>
        ))}
      </div>

      {error && <div className="error-message">{error}</div>}

      {searchResult && (
        <div className="search-result">
          <StockCard
            stock={searchResult}
            onAdd={onAddToWatchlist}
            onClose={() => setSearchResult(null)}
            isInWatchlist={watchlistSymbols.includes(searchResult.symbol)}
            showChart={true}
          />
        </div>
      )}
    </div>
  );
}
