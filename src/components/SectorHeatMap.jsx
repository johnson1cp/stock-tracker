import { useState, useEffect, useCallback } from 'react';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR4sJE64V0wzzTCWUnZUUf-KC_ZaS7Ta4pUqk8Pox7Cc3J5eYmj1X3Vwpa2qs1P-JQ0DaKyJPNG0xq0/pub?gid=1177845108&single=true&output=csv';


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
  const [sectorMarketCaps, setSectorMarketCaps] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchStocks = useCallback(async () => {
    try {
      const response = await fetch(SHEET_URL);
      const csvText = await response.text();

      const lines = csvText.trim().split('\n');
      const headers = parseCSVLine(lines[0]);

      // Find column indices
      const tickerIdx = headers.findIndex(h => h.trim() === 'Ticker');
      const priceIdx = headers.findIndex(h => h.trim() === 'Gprice');
      const pctChangeIdx = headers.findIndex(h => h.trim() === 'Gchangepct');
      const sectorIdx = headers.findIndex(h => h.trim() === 'Sector');
      const marketCapIdx = headers.findIndex(h => h.trim() === 'Market Cap');

      // Group stocks by sector
      const sectors = {};
      const sectorMarketCaps = {};

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const symbol = cols[tickerIdx]?.trim();
        const price = parseFloat(cols[priceIdx]);
        const pctChange = parseFloat(cols[pctChangeIdx]);
        const sector = cols[sectorIdx]?.trim();
        const marketCapRaw = cols[marketCapIdx]?.replace(/,/g, '') || '0';
        const marketCap = parseFloat(marketCapRaw) || 0;

        if (!symbol || !sector) continue;

        if (!sectors[sector]) {
          sectors[sector] = [];
          sectorMarketCaps[sector] = 0;
        }

        // Only keep top 100 per sector (already sorted by market cap in spreadsheet)
        if (sectors[sector].length < 100) {
          sectors[sector].push({
            symbol,
            c: price || 0,
            dp: pctChange || 0,
            marketCap,
          });
          sectorMarketCaps[sector] += marketCap;
        }
      }

      setSectorData(sectors);
      setSectorMarketCaps(sectorMarketCaps);
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

  // Sort sectors by total market cap (descending)
  const orderedSectors = Object.keys(sectorData).sort(
    (a, b) => (sectorMarketCaps[b] || 0) - (sectorMarketCaps[a] || 0)
  );

  return (
    <div className="sector-heatmap-container">
      <h2>Sector Heat Map</h2>
      <div className="sector-grid">
        {orderedSectors.map((sectorName) => {
          const stocks = sectorData[sectorName] || [];
          const avgChange = stocks.length > 0
            ? stocks.reduce((sum, s) => sum + s.dp, 0) / stocks.length
            : 0;
          return (
          <div key={sectorName} className="sector-block">
            <div className="sector-title">
              {sectorName}
              <span className={`sector-avg ${avgChange >= 0 ? 'positive' : 'negative'}`}>
                {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}%
              </span>
            </div>
            <div className="sector-tiles">
              {(sectorData[sectorName] || []).map((stock) => (
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
            </div>
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
