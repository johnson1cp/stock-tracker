import { useState, useEffect, useCallback } from 'react';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR0HlhpfGQtqzlf-fQelPx3GUS_aoS3WPKnoWnZuAWiX59j4k-OqvCZ48XxGTNdu34Y7wOMAjqYWCel/pub?gid=1639123512&single=true&output=csv';

const TIME_PERIODS = [
  { key: '1D', label: '1D', colIndex: null }, // Uses Gchangepct
  { key: '1W', label: '1W', colIndex: 20 },   // Column U
  { key: '1M', label: '1M', colIndex: 21 },   // Column V
  { key: '3M', label: '3M', colIndex: 22 },   // Column W
  { key: '6M', label: '6M', colIndex: 23 },   // Column X
  { key: 'YTD', label: 'YTD', colIndex: 24 }, // Column Y
  { key: '1Y', label: '1Y', colIndex: 25 },   // Column Z
  { key: '3Y', label: '3Y', colIndex: 26 },   // Column AA
  { key: '5Y', label: '5Y', colIndex: 27 },   // Column AB
  { key: '10Y', label: '10Y', colIndex: 28 }, // Column AC
];

const DISPLAY_MODES = [
  { key: 'pct', label: '%' },
  { key: 'price', label: 'Price' },
  { key: 'marketcap', label: 'MCap' },
];

const MARKETCAP_COL_INDEX = 7; // Column H - adjust if needed

const formatMarketCap = (value) => {
  if (!value || isNaN(value)) return 'N/A';
  if (value >= 1e12) return (value / 1e12).toFixed(3) + 'T';
  if (value >= 1e9) return (value / 1e9).toFixed(3) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(3) + 'M';
  return value.toFixed(0);
};

export function HeatMap() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('1D');
  const [displayMode, setDisplayMode] = useState('pct');

  const fetchStocks = useCallback(async () => {
    try {
      const response = await fetch(SHEET_URL);
      const csvText = await response.text();

      // Parse CSV
      const lines = csvText.trim().split('\n');
      const results = [];

      // Parse header to find column indices
      const headers = parseCSVLine(lines[0]);
      const tickerIdx = headers.findIndex(h => h.trim() === 'Ticker');
      const priceIdx = headers.findIndex(h => h.trim() === 'Gprice');
      const pctChangeIdx = headers.findIndex(h => h.trim() === 'Gchangepct');
      const changeIdx = headers.findIndex(h => h.trim() === 'Gchange');

      // Skip header row, take first 112 stocks
      for (let i = 1; i <= 112 && i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);

        const symbol = cols[tickerIdx]?.trim();
        const price = parseFloat(cols[priceIdx]);
        const pctChange = parseFloat(cols[pctChangeIdx]);
        const change = parseFloat(cols[changeIdx]);

        // Parse all time period percent changes
        const periodChanges = {};
        TIME_PERIODS.forEach(period => {
          if (period.colIndex !== null) {
            periodChanges[period.key] = parseFloat(cols[period.colIndex]) || 0;
          }
        });
        periodChanges['1D'] = pctChange;

        // Parse market cap
        const marketCap = parseFloat(cols[MARKETCAP_COL_INDEX]) || 0;

        if (symbol && !isNaN(price)) {
          results.push({
            symbol,
            c: price,
            d: change,
            dp: pctChange,
            periodChanges,
            marketCap,
          });
        }
      }

      setStocks(results);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch heatmap data:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks();
    // Refresh every 60 seconds
    const interval = setInterval(fetchStocks, 60000);
    return () => clearInterval(interval);
  }, [fetchStocks]);

  const getColor = (percentChange) => {
    if (percentChange >= -0.49 && percentChange <= 0.49) {
      return 'linear-gradient(180deg, rgb(56, 56, 56) 0%, rgb(26, 26, 26) 50%, rgb(10, 10, 10) 100%)';
    }

    const intensity = Math.min(Math.abs(percentChange) / 5, 1);

    let r, g, b;
    if (percentChange > 0) {
      r = Math.round(20 + (30 - 20) * (1 - intensity));
      g = Math.round(80 + (200 - 80) * intensity);
      b = Math.round(50 + (80 - 50) * (1 - intensity));
    } else {
      r = Math.round(80 + (220 - 80) * intensity);
      g = Math.round(50 + (50 - 50) * (1 - intensity));
      b = Math.round(50 + (70 - 50) * (1 - intensity));
    }

    const light = `rgb(${Math.min(r + 30, 255)}, ${Math.min(g + 30, 255)}, ${Math.min(b + 30, 255)})`;
    const base = `rgb(${r}, ${g}, ${b})`;
    const dark = `rgb(${Math.max(r - 30, 0)}, ${Math.max(g - 30, 0)}, ${Math.max(b - 30, 0)})`;

    return `linear-gradient(180deg, ${light} 0%, ${base} 50%, ${dark} 100%)`;
  };

  const getTextColor = (percentChange) => {
    const intensity = Math.min(Math.abs(percentChange) / 5, 1);
    const opacity = 0.5 + (intensity * 0.5); // Scales from 0.5 to 1.0
    return `rgba(255, 255, 255, ${opacity})`;
  };

  if (loading) {
    return (
      <div className="heatmap-loading">
        <p>Loading heat map...</p>
      </div>
    );
  }

  // Calculate averages
  const currentAvg = stocks.length > 0
    ? stocks.reduce((sum, s) => sum + (s.periodChanges[timePeriod] || 0), 0) / stocks.length
    : 0;
  const dailyAvg = stocks.length > 0
    ? stocks.reduce((sum, s) => sum + (s.periodChanges['1D'] || 0), 0) / stocks.length
    : 0;

  return (
    <div className="heatmap-container">
      <div className="heatmap-header">
        <div className="heatmap-title-row">
          <h2>Market Heat Map</h2>
          <div className="heatmap-averages">
            <span className={`avg-value ${dailyAvg >= 0 ? 'positive' : 'negative'}`}>
              1D Avg: {dailyAvg >= 0 ? '+' : ''}{dailyAvg.toFixed(2)}%
            </span>
            {timePeriod !== '1D' && (
              <span className={`avg-value ${currentAvg >= 0 ? 'positive' : 'negative'}`}>
                {timePeriod} Avg: {currentAvg >= 0 ? '+' : ''}{currentAvg.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
        <div className="heatmap-controls">
          <div className="display-mode-selector">
            {DISPLAY_MODES.map((mode) => (
              <button
                key={mode.key}
                className={`display-mode-btn ${displayMode === mode.key ? 'active' : ''}`}
                onClick={() => setDisplayMode(mode.key)}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <div className="time-period-selector">
            {TIME_PERIODS.map((period) => (
              <button
                key={period.key}
                className={`time-period-btn ${timePeriod === period.key ? 'active' : ''}`}
                onClick={() => setTimePeriod(period.key)}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="heatmap-grid">
        {stocks.map((stock) => {
          const pctChange = stock.periodChanges[timePeriod] || 0;
          const displayValue = displayMode === 'price'
            ? `$${stock.c.toFixed(2)}`
            : displayMode === 'marketcap'
            ? formatMarketCap(stock.marketCap)
            : null;
          return (
            <div
              key={stock.symbol}
              className="heatmap-cell"
              style={{
                background: getColor(pctChange),
                color: getTextColor(pctChange),
              }}
              title={`${stock.symbol}: $${stock.c.toFixed(2)} | MCap: ${formatMarketCap(stock.marketCap)} (${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%)`}
            >
              <span className="heatmap-symbol">{stock.symbol}</span>
              {displayValue && <span className="heatmap-value">{displayValue}</span>}
              <span className="heatmap-change">{pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%</span>
            </div>
          );
        })}
      </div>
      <div className="heatmap-legend">
        <span className="legend-label">-5%</span>
        <div className="legend-gradient"></div>
        <span className="legend-label">+5%</span>
      </div>
    </div>
  );
}

// Parse CSV line handling quoted fields with commas
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
