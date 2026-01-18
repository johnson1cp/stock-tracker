import { useState, useEffect } from 'react';
import { StockSearch } from './components/StockSearch';
import { Watchlist, useWatchlist } from './components/Watchlist';
import { IndexWidget } from './components/IndexWidget';
import { HeatMap } from './components/HeatMap';
import { SectorHeatMap } from './components/SectorHeatMap';
import './App.css';

function App() {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('stock-tracker-theme');
    return saved ? saved === 'dark' : true;
  });

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
          />
        </section>

        <section className="watchlist-section">
          <Watchlist
            watchlist={watchlist}
            onRemove={removeFromWatchlist}
            onRefresh={handleRefresh}
          />
        </section>

        <section className="heatmap-section">
          <HeatMap />
        </section>

        <section className="sector-heatmap-section">
          <SectorHeatMap />
        </section>
      </main>

      <footer className="app-footer">
        <p>Data provided for demo purposes. Replace API key for live data.</p>
      </footer>
    </div>
  );
}

export default App;
