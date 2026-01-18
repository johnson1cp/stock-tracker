import { useState, useEffect, useCallback } from 'react';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR0HlhpfGQtqzlf-fQelPx3GUS_aoS3WPKnoWnZuAWiX59j4k-OqvCZ48XxGTNdu34Y7wOMAjqYWCel/pub?gid=1639123512&single=true&output=csv';

export function HeatMap() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

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

      // Skip header row, take first 100 stocks
      for (let i = 1; i <= 100 && i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);

        const symbol = cols[tickerIdx]?.trim();
        const price = parseFloat(cols[priceIdx]);
        const pctChange = parseFloat(cols[pctChangeIdx]);
        const change = parseFloat(cols[changeIdx]);

        if (symbol && !isNaN(price) && !isNaN(pctChange)) {
          results.push({
            symbol,
            c: price,
            d: change,
            dp: pctChange,
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

  return (
    <div className="heatmap-container">
      <h2>Market Heat Map</h2>
      <div className="heatmap-grid">
        {stocks.map((stock) => (
          <div
            key={stock.symbol}
            className="heatmap-cell"
            style={{
              background: getColor(stock.dp),
              color: getTextColor(stock.dp),
            }}
            title={`${stock.symbol}: $${stock.c.toFixed(2)} (${stock.dp >= 0 ? '+' : ''}${stock.dp.toFixed(2)}%)`}
          >
            <span className="heatmap-symbol">{stock.symbol}</span>
            <span className="heatmap-change">{stock.dp >= 0 ? '+' : ''}{stock.dp.toFixed(2)}%</span>
          </div>
        ))}
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
