import { useState, useEffect, useCallback } from 'react';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR0HlhpfGQtqzlf-fQelPx3GUS_aoS3WPKnoWnZuAWiX59j4k-OqvCZ48XxGTNdu34Y7wOMAjqYWCel/pub?gid=1639123512&single=true&output=csv';

const SECTORS = [
  { id: 1, name: 'Consumer Cyclical' },
  { id: 2, name: 'Consumer Defensive' },
  { id: 3, name: 'Healthcare' },
  { id: 4, name: 'Communication Services' },
  { id: 5, name: 'Technology' },
  { id: 6, name: 'Financial' },
  { id: 7, name: 'Energy' },
  { id: 8, name: 'Industrials' },
  { id: 9, name: 'Materials' },
];

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

export function SectorHeatMap() {
  const [sectorData, setSectorData] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchStocks = useCallback(async () => {
    try {
      const response = await fetch(SHEET_URL);
      const csvText = await response.text();

      const lines = csvText.trim().split('\n');
      const headers = parseCSVLine(lines[0]);

      // Find column indices
      const noIdx = headers.findIndex(h => h.trim() === 'No.');
      const tickerIdx = headers.findIndex(h => h.trim() === 'Ticker');
      const priceIdx = headers.findIndex(h => h.trim() === 'Gprice');
      const pctChangeIdx = headers.findIndex(h => h.trim() === 'Gchangepct');

      // Group stocks by sector (1-100 = sector 1, 101-200 = sector 2, etc.)
      const sectors = {};
      SECTORS.forEach(s => { sectors[s.id] = []; });

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const no = parseInt(cols[noIdx]);
        const symbol = cols[tickerIdx]?.trim();
        const price = parseFloat(cols[priceIdx]);
        const pctChange = parseFloat(cols[pctChangeIdx]);

        if (!symbol || isNaN(no)) continue;

        // Determine sector based on row number
        const sectorId = Math.ceil(no / 100);
        if (sectorId >= 1 && sectorId <= 9 && sectors[sectorId]) {
          sectors[sectorId].push({
            symbol,
            c: price || 0,
            dp: pctChange || 0,
            position: (no - 1) % 100, // Position within sector (0-99)
          });
        }
      }

      setSectorData(sectors);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch sector heatmap data:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, 60000);
    return () => clearInterval(interval);
  }, [fetchStocks]);

  const getColor = (percentChange) => {
    if ((percentChange >= -0.49 && percentChange <= 0.49) || isNaN(percentChange)) {
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
      <div className="sector-heatmap-loading">
        <p>Loading sector heat map...</p>
      </div>
    );
  }

  return (
    <div className="sector-heatmap-container">
      <h2>Sector Heat Map</h2>
      <div className="sector-grid">
        {SECTORS.map((sector) => (
          <div key={sector.id} className="sector-block">
            <div className="sector-title">{sector.name}</div>
            <div className="sector-tiles">
              {(sectorData[sector.id] || []).map((stock, idx) => (
                <div
                  key={stock.symbol}
                  className="sector-tile"
                  style={{
                    background: getColor(stock.dp),
                    color: getTextColor(stock.dp),
                  }}
                  title={`${stock.symbol}: $${stock.c.toFixed(2)} (${stock.dp >= 0 ? '+' : ''}${stock.dp.toFixed(2)}%)`}
                >
                  <span className="sector-tile-symbol">{stock.symbol}</span>
                  <span className="sector-tile-change">{stock.dp >= 0 ? '+' : ''}{stock.dp.toFixed(1)}%</span>
                </div>
              ))}
              {/* Fill empty spots if sector has fewer than 100 stocks */}
              {Array.from({ length: Math.max(0, 100 - (sectorData[sector.id]?.length || 0)) }).map((_, idx) => (
                <div key={`empty-${idx}`} className="sector-tile empty" />
              ))}
            </div>
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
