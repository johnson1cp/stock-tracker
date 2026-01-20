import { useState, useEffect } from 'react';
import { StockSearch } from './components/StockSearch';
import { Watchlist, useWatchlist } from './components/Watchlist';
import { IndexWidget } from './components/IndexWidget';
import { HeatMap } from './components/HeatMap';
import { SectorHeatMap } from './components/SectorHeatMap';
import { MarketNews } from './components/MarketNews';
import { FinnhubNews } from './components/FinnhubNews';
import './App.css';

function App() {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('stock-tracker-theme');
    return saved ? saved === 'dark' : true;
  });
  const [searchSymbol, setSearchSymbol] = useState(null);

  useEffect(() => {
    localStorage.setItem('stock-tracker-theme', darkMode ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  const watchlistSymbols = watchlist.map((s) => s.symbol);

  const handleRefresh = (updatedStock) => {
    removeFromWatchlist(updatedStock.symbol);
    addToWatchlist(updatedStock);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <h1>Stock Tracker</h1>
          <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
        <p className="subtitle">Track your favorite stocks in real-time</p>
        <IndexWidget />
      </header>

      <main className="app-main">
        <section className="search-section">
          <h2>Search Stocks</h2>
          <StockSearch
            onAddToWatchlist={addToWatchlist}
            watchlistSymbols={watchlistSymbols}
            externalSearch={searchSymbol}
          />
        </section>

        <section className="watchlist-section">
          <Watchlist
            watchlist={watchlist}
            onRemove={removeFromWatchlist}
            onRefresh={handleRefresh}
            onStockClick={(symbol) => setSearchSymbol(symbol + '-' + Date.now())}
          />
        </section>

        <section className="heatmap-section">
          <HeatMap />
        </section>

        <section className="sector-heatmap-section">
          <SectorHeatMap />
        </section>

        <section className="market-news-section">
          <FinnhubNews />
        </section>

        <section className="market-news-section">
          <MarketNews />
        </section>
      </main>

      <footer className="app-footer">
        <p>© Copyright 2026. Data provided for demo purposes.</p>
      </footer>
    </div>
  );
}

export default App;
