import { useState } from 'react';
import { useStockData, POPULAR_STOCKS } from '../hooks/useStockData';
import { StockCard } from './StockCard';

export function StockSearch({ onAddToWatchlist, watchlistSymbols }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const { fetchStockQuote, loading, error } = useStockData();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const result = await fetchStockQuote(searchTerm.trim());
    setSearchResult(result);
  };

  const handleQuickSearch = async (symbol) => {
    setSearchTerm(symbol);
    const result = await fetchStockQuote(symbol);
    setSearchResult(result);
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
            isInWatchlist={watchlistSymbols.includes(searchResult.symbol)}
          />
        </div>
      )}
    </div>
  );
}
