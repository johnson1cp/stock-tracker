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
  { key: 'volume', label: 'Vol' },
  { key: 'relvol', label: 'RelVol' },
  { key: 'marketcap', label: 'MCap' },
  { key: 'company', label: 'Co' },
  { key: 'sector', label: 'Sect' },
];

const MARKETCAP_COL_INDEX = 43;  // Column AR
const COMPANY_COL_INDEX = 2;    // Column C - adjust if needed
const SECTOR_COL_INDEX = 3;     // Column D - adjust if needed
const VOLUME_COL_INDEX = 41;    // Column AP
const RELVOL_COL_INDEX = 44;    // Column AS - relative volume

const formatMarketCap = (value) => {
  if (!value || isNaN(value)) return 'N/A';
  if (value >= 1e12) return '$' + (value / 1e12).toFixed(3) + 'T';
  if (value >= 1e9) return '$' + (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return '$' + (value / 1e6).toFixed(3) + 'M';
  return '$' + value.toFixed(0);
};

const formatVolume = (value) => {
  if (!value || isNaN(value)) return 'N/A';
  return (value / 1e6).toFixed(1) + 'M';
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

      // Skip header row, take first 150 stocks (15 columns x 10 rows)
      for (let i = 1; i <= 150 && i < lines.length; i++) {
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

        // Parse market cap, company, sector, volume
        const marketCapRaw = cols[MARKETCAP_COL_INDEX]?.replace(/,/g, '') || '0';
        const marketCap = parseFloat(marketCapRaw) || 0;
        const company = cols[COMPANY_COL_INDEX]?.trim() || '';
        const sector = cols[SECTOR_COL_INDEX]?.trim() || '';
        const volumeRaw = cols[VOLUME_COL_INDEX]?.replace(/,/g, '') || '0';
        const volume = parseFloat(volumeRaw) || 0;
        const relVolRaw = cols[RELVOL_COL_INDEX]?.replace(/,/g, '') || '0';
        const relVol = parseFloat(relVolRaw) || 0;

        if (symbol && !isNaN(price)) {
          results.push({
            symbol,
            c: price,
            d: change,
            dp: pctChange,
            periodChanges,
            marketCap,
            company,
            sector,
            volume,
            relVol,
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

  const getRelVolColor = (relVol) => {
    // Scale from 1x (black) to 3x (bright purple/magenta)
    if (relVol <= 1) {
      return 'linear-gradient(180deg, rgb(56, 56, 56) 0%, rgb(26, 26, 26) 50%, rgb(10, 10, 10) 100%)';
    }

    // Map 1.0-3.0 to 0-1 intensity
    const intensity = Math.min((relVol - 1) / 2, 1);

    // Black to fluorescent purple
    const r = Math.round(40 + (180 - 40) * intensity);
    const g = Math.round(20 + (50 - 20) * intensity);
    const b = Math.round(80 + (255 - 80) * intensity);

    const light = `rgb(${Math.min(r + 30, 255)}, ${Math.min(g + 30, 255)}, ${Math.min(b + 30, 255)})`;
    const base = `rgb(${r}, ${g}, ${b})`;
    const dark = `rgb(${Math.max(r - 30, 0)}, ${Math.max(g - 30, 0)}, ${Math.max(b - 30, 0)})`;

    return `linear-gradient(180deg, ${light} 0%, ${base} 50%, ${dark} 100%)`;
  };

  const getRelVolTextColor = (relVol) => {
    if (relVol <= 1) return 'rgba(255, 255, 255, 0.8)';
    const intensity = Math.min((relVol - 1) / 2, 1);
    const opacity = 0.8 + (intensity * 0.2);
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
  const ytdAvg = stocks.length > 0
    ? stocks.reduce((sum, s) => sum + (s.periodChanges['YTD'] || 0), 0) / stocks.length
    : 0;

  return (
    <div className="heatmap-container">
      <div className="heatmap-header">
        <div className="heatmap-title-row">
          <h2>Market Heat Map</h2>
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
          <div className="heatmap-averages">
            <span className={`avg-value ${dailyAvg >= 0 ? 'positive' : 'negative'}`}>
              1D Avg: {dailyAvg >= 0 ? '+' : ''}{dailyAvg.toFixed(2)}%
            </span>
            {timePeriod === '1D' && (
              <span className={`avg-value ${ytdAvg >= 0 ? 'positive' : 'negative'}`}>
                YTD Avg: {ytdAvg >= 0 ? '+' : ''}{ytdAvg.toFixed(2)}%
              </span>
            )}
            {timePeriod !== '1D' && (
              <span className={`avg-value ${currentAvg >= 0 ? 'positive' : 'negative'}`}>
                {timePeriod} Avg: {currentAvg >= 0 ? '+' : ''}{currentAvg.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="heatmap-grid">
        {stocks.map((stock) => {
          const pctChange = stock.periodChanges[timePeriod] || 0;
          const displayValue = displayMode === 'price'
            ? `$${stock.c.toFixed(2)}`
            : displayMode === 'volume'
            ? formatVolume(stock.volume)
            : displayMode === 'relvol'
            ? `${stock.relVol.toFixed(1)}X`
            : displayMode === 'marketcap'
            ? formatMarketCap(stock.marketCap)
            : displayMode === 'company'
            ? stock.company
            : displayMode === 'sector'
            ? stock.sector
            : null;
          const bgColor = displayMode === 'relvol' ? getRelVolColor(stock.relVol) : getColor(pctChange);
          const txtColor = displayMode === 'relvol' ? getRelVolTextColor(stock.relVol) : getTextColor(pctChange);
          return (
            <div
              key={stock.symbol}
              className="heatmap-cell"
              style={{
                background: bgColor,
                color: txtColor,
              }}
              title={`${stock.symbol} - ${stock.company} | ${stock.sector} | $${stock.c.toFixed(2)} | MCap: ${formatMarketCap(stock.marketCap)} (${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%)`}
            >
              <span className="heatmap-symbol">{stock.symbol}</span>
              <span
                className="heatmap-change"
                style={displayMode === 'relvol'
                  ? {
                      color: (() => {
                        const intensity = Math.min(Math.abs(pctChange) / 5, 1);
                        if (pctChange >= 0) {
                          // Brighter green range (60, 160, 80) to bright green (46, 213, 115)
                          const r = Math.round(60 + (46 - 60) * intensity);
                          const g = Math.round(160 + (213 - 160) * intensity);
                          const b = Math.round(80 + (115 - 80) * intensity);
                          return `rgb(${r}, ${g}, ${b})`;
                        } else {
                          // Red range (200, 80, 90) to bright red (255, 71, 87)
                          const r = Math.round(200 + (255 - 200) * intensity);
                          const g = Math.round(80 + (71 - 80) * intensity);
                          const b = Math.round(90 + (87 - 90) * intensity);
                          return `rgb(${r}, ${g}, ${b})`;
                        }
                      })()
                    }
                  : {}}
              >{pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%</span>
              {displayValue && <span className="heatmap-value small">{displayValue}</span>}
            </div>
          );
        })}
      </div>
      <div className="heatmap-legend">
        {displayMode === 'relvol' ? (
          <>
            <span className="legend-label">1X</span>
            <div className="legend-gradient relvol"></div>
            <span className="legend-label">3X</span>
          </>
        ) : (
          <>
            <span className="legend-label">-5%</span>
            <div className="legend-gradient"></div>
            <span className="legend-label">+5%</span>
          </>
        )}
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
