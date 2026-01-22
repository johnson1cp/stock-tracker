import { useState, useEffect, useCallback } from 'react';
import { StockChart } from './StockChart';
import { useStockData } from '../hooks/useStockData';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQfT7xKYOeFEfNJ984gt2TJ41nog4jqzRcZnVnDauMHwRgpkbtiNRXnlZpNKZHu7sd58qB1Kgi7T-bo/pub?gid=1854993035&single=true&output=csv';

// Column header mappings
const COLUMN_HEADERS = {
  ticker: 'Ticker',
  company: 'Company',
  sector: 'Sector',
  industry: 'Industry',
  price: 'Gprice',
  pctChange: 'Gchangepct',
  change: 'Gchange',
  volume: 'Gvolume',
  avgVolume: 'Gvolumeavg',
  marketCap: 'Gmarketcap',
  relVolume: 'Grelvol',
  perf1W: 'Performance (Week)',
  perf1M: 'Performance (Month)',
  perf3M: 'Performance (Quarter)',
  perf6M: 'Performance (Half Year)',
  perfYTD: 'Performance (YTD)',
  perf1Y: 'Performance (Year)',
  perf3Y: 'Performance (3 Years)',
  perf5Y: 'Performance (5 Years)',
  perf10Y: 'Performance (10 Years)',
};


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

const formatMarketCap = (value) => {
  if (!value || isNaN(value)) return 'N/A';
  if (value >= 1e12) return '$' + (value / 1e12).toFixed(3) + 'T';
  if (value >= 1e9) return '$' + (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return '$' + (value / 1e6).toFixed(3) + 'M';
  return '$' + value.toFixed(0);
};

const getTimeAgo = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1d ago';
  return `${diffDays}d ago`;
};

const DISPLAY_MODES = [
  { key: 'pct', label: '%' },
  { key: 'price', label: 'Price' },
  { key: 'volume', label: 'Vol' },
  { key: 'relvol', label: 'RelVol' },
  { key: 'marketcap', label: 'MCap' },
  { key: 'company', label: 'Co' },
  { key: 'sector', label: 'Sect' },
];

const TIME_PERIODS = [
  { key: '1D', label: '1D', colKey: null },  // Uses Gchangepct
  { key: '1W', label: '1W', colKey: 'perf1W' },
  { key: '1M', label: '1M', colKey: 'perf1M' },
  { key: '3M', label: '3M', colKey: 'perf3M' },
  { key: '6M', label: '6M', colKey: 'perf6M' },
  { key: 'YTD', label: 'YTD', colKey: 'perfYTD' },
  { key: '1Y', label: '1Y', colKey: 'perf1Y' },
  { key: '3Y', label: '3Y', colKey: 'perf3Y' },
  { key: '5Y', label: '5Y', colKey: 'perf5Y' },
  { key: '10Y', label: '10Y', colKey: 'perf10Y' },
];

// Sector colors for RelVol mode - each sector gets a distinct bright color
const SECTOR_COLORS = {
  'Technology':          { r: [40, 180], g: [20, 50],  b: [80, 255] },   // Purple
  'Healthcare':          { r: [20, 50],  g: [80, 200], b: [120, 255] },  // Cyan/Teal
  'Financial':           { r: [80, 255], g: [50, 180], b: [10, 50] },  // Orange/Gold - darker low
  'Consumer Cyclical':   { r: [40, 255], g: [20, 100], b: [40, 150] }, // Pink - darker low for more midrange contrast
  'Communication Services': { r: [80, 150], g: [50, 100], b: [180, 255] }, // Blue
  'Industrials':         { r: [60, 220], g: [50, 180], b: [20, 80] },  // Yellow/Lime - darker low
  'Consumer Defensive':  { r: [20, 80],  g: [60, 220], b: [40, 120] }, // Green - darker low, richer bright
  'Energy':              { r: [80, 255], g: [40, 140], b: [20, 80] },   // Red/Orange - darker low end
  'Utilities':           { r: [40, 160], g: [30, 140], b: [80, 240] }, // Lavender - darker low
  'Real Estate':         { r: [70, 240], g: [50, 200], b: [40, 140] }, // Tan/Beige - darker low
  'Basic Materials':     { r: [60, 200], g: [40, 150], b: [30, 120] }, // Brown/Bronze - darker low
  'Exchange Traded Fund': { r: [20, 100], g: [60, 180], b: [20, 100] }, // Darker Green - darker low end
};

// Default color if sector not found
const DEFAULT_SECTOR_COLOR = { r: [40, 180], g: [20, 50], b: [80, 255] }; // Purple

// Neutral background for when heat is disabled
const NEUTRAL_BG = 'linear-gradient(180deg, rgb(56, 56, 56) 0%, rgb(26, 26, 26) 50%, rgb(10, 10, 10) 100%)';

// Color scales per time period: { neutral: threshold for black, maxUp: max for green, maxDown: max for red }
const COLOR_SCALES = {
  '1D':  { neutral: 0.5, maxUp: 5, maxDown: 5 },
  '1W':  { neutral: 2, maxUp: 10, maxDown: 10 },
  '1M':  { neutral: 3, maxUp: 15, maxDown: 15 },
  '3M':  { neutral: 5, maxUp: 25, maxDown: 25 },
  '6M':  { neutral: 5, maxUp: 35, maxDown: 35 },
  'YTD': { neutral: 5, maxUp: 30, maxDown: 30 },
  '1Y':  { neutral: 5, maxUp: 100, maxDown: 50 },
  '3Y':  { neutral: 10, maxUp: 300, maxDown: 50 },
  '5Y':  { neutral: 10, maxUp: 500, maxDown: 50 },
  '10Y': { neutral: 10, maxUp: 1000, maxDown: 50 },
};

export function SectorHeatMapWide() {
  const [sectorData, setSectorData] = useState({});
  const [sectorMarketCaps, setSectorMarketCaps] = useState({});
  const [loading, setLoading] = useState(true);

  // Control states
  const [displayMode, setDisplayMode] = useState('pct');
  const [timePeriod, setTimePeriod] = useState('1D');
  const [heatEnabled, setHeatEnabled] = useState(true);

  // Overlay states
  const [selectedSector, setSelectedSector] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [isSectorExpanded, setIsSectorExpanded] = useState(false);
  const [isStockExpanded, setIsStockExpanded] = useState(false);
  const [stockNews, setStockNews] = useState([]);
  const [sectorOrigin, setSectorOrigin] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [stockOrigin, setStockOrigin] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [extendedStockData, setExtendedStockData] = useState(null);

  // Hook for fetching extended stock data
  const { fetchStockQuote } = useStockData();

  const fetchStocks = useCallback(async () => {
    try {
      const response = await fetch(SHEET_URL);
      const csvText = await response.text();

      const lines = csvText.trim().split('\n');
      const headers = parseCSVLine(lines[0]);

      // Find column indices by header name
      const getIdx = (key) => headers.findIndex(h => h.trim() === COLUMN_HEADERS[key]);

      const idx = {
        ticker: getIdx('ticker'),
        company: getIdx('company'),
        sector: getIdx('sector'),
        industry: getIdx('industry'),
        price: getIdx('price'),
        pctChange: getIdx('pctChange'),
        change: getIdx('change'),
        volume: getIdx('volume'),
        avgVolume: getIdx('avgVolume'),
        marketCap: getIdx('marketCap'),
        relVolume: getIdx('relVolume'),
        perf1W: getIdx('perf1W'),
        perf1M: getIdx('perf1M'),
        perf3M: getIdx('perf3M'),
        perf6M: getIdx('perf6M'),
        perfYTD: getIdx('perfYTD'),
        perf1Y: getIdx('perf1Y'),
        perf3Y: getIdx('perf3Y'),
        perf5Y: getIdx('perf5Y'),
        perf10Y: getIdx('perf10Y'),
      };

      // Group stocks by sector
      const sectors = {};
      const sectorMarketCaps = {};

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const symbol = cols[idx.ticker]?.trim();
        const sector = cols[idx.sector]?.trim();

        if (!symbol || !sector) continue;

        // Parse numeric values
        const parseNum = (val) => parseFloat(val?.replace(/[,%]/g, '')) || 0;

        const price = parseNum(cols[idx.price]);
        const pctChange = parseNum(cols[idx.pctChange]);
        const change = parseNum(cols[idx.change]);
        const volume = parseNum(cols[idx.volume]);
        const avgVolume = parseNum(cols[idx.avgVolume]);
        const marketCap = parseNum(cols[idx.marketCap]);
        const relVolume = parseNum(cols[idx.relVolume]);

        // Parse period changes (already in percent form in CSV)
        const periodChanges = {
          '1D': pctChange,
          '1W': parseNum(cols[idx.perf1W]),
          '1M': parseNum(cols[idx.perf1M]),
          '3M': parseNum(cols[idx.perf3M]),
          '6M': parseNum(cols[idx.perf6M]),
          'YTD': parseNum(cols[idx.perfYTD]),
          '1Y': parseNum(cols[idx.perf1Y]),
          '3Y': parseNum(cols[idx.perf3Y]),
          '5Y': parseNum(cols[idx.perf5Y]),
          '10Y': parseNum(cols[idx.perf10Y]),
        };

        if (!sectors[sector]) {
          sectors[sector] = [];
          sectorMarketCaps[sector] = 0;
        }

        // Only keep top 100 per sector (already sorted by market cap in spreadsheet)
        if (sectors[sector].length < 100) {
          sectors[sector].push({
            symbol,
            company: cols[idx.company]?.trim() || symbol,
            sector,
            industry: cols[idx.industry]?.trim() || '',
            c: price,
            dp: pctChange,
            change,
            volume,
            avgVolume,
            marketCap,
            relVolume,
            periodChanges,
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
    // Refresh every 3 minutes (staggered from Market Heat Map)
    const interval = setInterval(fetchStocks, 180000);
    return () => clearInterval(interval);
  }, [fetchStocks]);

  const getColor = (percentChange, period = timePeriod) => {
    const scale = COLOR_SCALES[period] || COLOR_SCALES['1D'];
    const neutralThreshold = scale.neutral;
    const maxThreshold = percentChange >= 0 ? scale.maxUp : scale.maxDown;

    if (Math.abs(percentChange) <= neutralThreshold || isNaN(percentChange)) {
      return 'linear-gradient(180deg, rgb(56, 56, 56) 0%, rgb(26, 26, 26) 50%, rgb(10, 10, 10) 100%)';
    }

    // Calculate intensity based on the range from neutral to max
    const absChange = Math.abs(percentChange);
    const intensity = Math.min((absChange - neutralThreshold) / (maxThreshold - neutralThreshold), 1);

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

  const getTextColor = (percentChange, period = timePeriod) => {
    const scale = COLOR_SCALES[period] || COLOR_SCALES['1D'];
    const maxThreshold = percentChange >= 0 ? scale.maxUp : scale.maxDown;
    const intensity = Math.min(Math.abs(percentChange) / maxThreshold, 1);
    const opacity = 0.5 + (intensity * 0.5);
    return `rgba(255, 255, 255, ${opacity})`;
  };

  const getRelVolColor = (relVol, sector) => {
    // Scale from 1x (black) to 3x (bright sector color)
    if (!relVol || relVol <= 1) {
      return 'linear-gradient(180deg, rgb(56, 56, 56) 0%, rgb(26, 26, 26) 50%, rgb(10, 10, 10) 100%)';
    }

    // Map 1.0-3.0 to 0-1 intensity
    const intensity = Math.min((relVol - 1) / 2, 1);

    // Get sector-specific color or default
    const sectorColor = SECTOR_COLORS[sector] || DEFAULT_SECTOR_COLOR;

    // Interpolate from dark to bright based on intensity
    const r = Math.round(sectorColor.r[0] + (sectorColor.r[1] - sectorColor.r[0]) * intensity);
    const g = Math.round(sectorColor.g[0] + (sectorColor.g[1] - sectorColor.g[0]) * intensity);
    const b = Math.round(sectorColor.b[0] + (sectorColor.b[1] - sectorColor.b[0]) * intensity);

    const light = `rgb(${Math.min(r + 30, 255)}, ${Math.min(g + 30, 255)}, ${Math.min(b + 30, 255)})`;
    const base = `rgb(${r}, ${g}, ${b})`;
    const dark = `rgb(${Math.max(r - 30, 0)}, ${Math.max(g - 30, 0)}, ${Math.max(b - 30, 0)})`;

    return `linear-gradient(180deg, ${light} 0%, ${base} 50%, ${dark} 100%)`;
  };

  const getRelVolTextColor = (relVol) => {
    if (!relVol || relVol <= 1) return 'rgba(255, 255, 255, 0.5)';
    const intensity = Math.min((relVol - 1) / 2, 1);
    const opacity = 0.5 + (intensity * 0.5);
    return `rgba(255, 255, 255, ${opacity})`;
  };

  // Get colored text for neutral mode (green/red based on percent change)
  const getNeutralTextColor = (percentChange, period = timePeriod) => {
    const scale = COLOR_SCALES[period] || COLOR_SCALES['1D'];
    const maxThreshold = percentChange >= 0 ? scale.maxUp : scale.maxDown;
    const intensity = Math.min(Math.abs(percentChange) / maxThreshold, 1);

    if (percentChange >= 0) {
      // Green range
      const r = Math.round(60 + (46 - 60) * intensity);
      const g = Math.round(160 + (213 - 160) * intensity);
      const b = Math.round(80 + (115 - 80) * intensity);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Red range
      const r = Math.round(200 + (255 - 200) * intensity);
      const g = Math.round(80 + (71 - 80) * intensity);
      const b = Math.round(90 + (87 - 90) * intensity);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // Get percent change for a stock based on selected time period
  const getPctChange = (stock) => {
    return stock.periodChanges?.[timePeriod] ?? stock.dp ?? 0;
  };

  // Format volume for display
  const formatVolume = (value) => {
    if (!value || isNaN(value)) return 'N/A';
    if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
    return value.toFixed(0);
  };

  // Get display value based on selected mode
  const getDisplayValue = (stock) => {
    const pct = getPctChange(stock);
    switch (displayMode) {
      case 'pct':
        return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
      case 'price':
        return `$${stock.c.toFixed(2)}`;
      case 'volume':
        return formatVolume(stock.volume);
      case 'relvol':
        return stock.relVolume ? stock.relVolume.toFixed(2) + 'x' : 'N/A';
      case 'marketcap':
        return formatMarketCap(stock.marketCap);
      case 'company':
        return stock.company || stock.symbol;
      case 'sector':
        return stock.sector;
      default:
        return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    }
  };

  const handleSectorClick = (sectorName, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const containerRect = event.currentTarget.closest('.sector-grid-wide').getBoundingClientRect();

    setSectorOrigin({
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
    });
    setSelectedSector(sectorName);

    requestAnimationFrame(() => {
      setIsSectorExpanded(true);
    });
  };

  const handleSectorBack = () => {
    setIsSectorExpanded(false);
    setTimeout(() => {
      setSelectedSector(null);
    }, 400);
  };

  const handleStockClick = async (stock, event) => {
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    const containerRect = event.currentTarget.closest('.sector-grid-wide').getBoundingClientRect();

    setStockOrigin({
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
    });
    setSelectedStock(stock);
    setStockNews([]);
    setExtendedStockData(null);

    requestAnimationFrame(() => {
      setIsStockExpanded(true);
    });

    // Fetch extended stock data (Open, High, Low, Beta, P/E, etc.)
    try {
      const extendedData = await fetchStockQuote(stock.symbol, true);
      if (extendedData) {
        setExtendedStockData(extendedData);
      }
    } catch (err) {
      console.error('Failed to fetch extended stock data:', err);
    }

    // Fetch news for the selected stock
    try {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const toDate = today.toISOString().split('T')[0];
      const fromDate = weekAgo.toISOString().split('T')[0];

      const response = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(stock.symbol)}&from=${fromDate}&to=${toDate}&token=cmg1hn1r01qv3c72lbd0cmg1hn1r01qv3c72lbdg`
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setStockNews(data.slice(0, 10));
        }
      }
    } catch (err) {
      console.error('Failed to fetch news:', err);
    }
  };

  const handleStockBack = (event) => {
    event.stopPropagation();
    setIsStockExpanded(false);
    setStockNews([]);
    setExtendedStockData(null);
    setTimeout(() => {
      setSelectedStock(null);
    }, 400);
  };

  if (loading) {
    return (
      <div className="sector-heatmap-wide-loading">
        <p>Loading sector heat map...</p>
      </div>
    );
  }

  // Sort sectors by total market cap (descending)
  const orderedSectors = Object.keys(sectorData).sort(
    (a, b) => (sectorMarketCaps[b] || 0) - (sectorMarketCaps[a] || 0)
  );

  // Calculate averages for display
  const allStocks = Object.values(sectorData).flat();
  const dailyAvg = allStocks.length > 0
    ? allStocks.reduce((sum, s) => sum + s.dp, 0) / allStocks.length
    : 0;
  const ytdAvg = allStocks.length > 0
    ? allStocks.reduce((sum, s) => sum + (s.periodChanges?.['YTD'] || 0), 0) / allStocks.length
    : 0;
  const currentAvg = allStocks.length > 0
    ? allStocks.reduce((sum, s) => sum + (s.periodChanges?.[timePeriod] || 0), 0) / allStocks.length
    : 0;

  return (
    <div className="sector-heatmap-wide-container">
      <h2>Sector Heat Map Wide</h2>
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
        <button
          className={`heat-toggle-btn ${heatEnabled ? 'active' : ''}`}
          onClick={() => setHeatEnabled(!heatEnabled)}
          title={heatEnabled ? 'Turn off heat colors' : 'Turn on heat colors'}
        >
          {heatEnabled ? '◐' : '○'}
        </button>
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
      <div className="sector-grid-wide">
        {orderedSectors.map((sectorName) => {
          const stocks = sectorData[sectorName] || [];
          const avgChange = stocks.length > 0
            ? stocks.reduce((sum, s) => sum + getPctChange(s), 0) / stocks.length
            : 0;
          return (
          <div
            key={sectorName}
            className="sector-block-wide"
            onClick={(e) => handleSectorClick(sectorName, e)}
            style={{ cursor: 'pointer' }}
          >
            <div className="sector-title-wide">
              {sectorName}
              <span className={`sector-avg ${avgChange >= 0 ? 'positive' : 'negative'}`}>
                {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}%
              </span>
            </div>
            <div className="sector-tiles-wide">
              {(sectorData[sectorName] || []).map((stock) => {
                const pct = getPctChange(stock);
                const useNeutral = !heatEnabled && displayMode !== 'relvol';
                return (
                <div
                  key={stock.symbol}
                  className="sector-tile-wide"
                  style={{
                    background: useNeutral ? NEUTRAL_BG : displayMode === 'relvol' ? getRelVolColor(stock.relVolume, stock.sector) : getColor(pct),
                    color: useNeutral ? 'rgba(255, 255, 255, 0.9)' : displayMode === 'relvol' ? getRelVolTextColor(stock.relVolume) : getTextColor(pct),
                  }}
                  title={`${stock.symbol}: $${stock.c.toFixed(2)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`}
                >
                  <span className="sector-tile-symbol-wide">{stock.symbol}</span>
                  <span
                    className="sector-tile-change-wide"
                    style={useNeutral && displayMode === 'pct' ? { color: getNeutralTextColor(pct) } : {}}
                  >{getDisplayValue(stock)}</span>
                </div>
                );
              })}
            </div>
          </div>
          );
        })}

        {/* Sector Overlay - Level 2 */}
        {selectedSector && (
          <div
            className={`sector-wide-overlay ${isSectorExpanded ? 'expanded' : ''}`}
            style={{
              '--origin-x': `${sectorOrigin.x}px`,
              '--origin-y': `${sectorOrigin.y}px`,
              '--origin-width': `${sectorOrigin.width}px`,
              '--origin-height': `${sectorOrigin.height}px`,
            }}
            onClick={handleSectorBack}
          >
            <div className="sector-wide-overlay-content" onClick={(e) => e.stopPropagation()}>
              <div className="sector-wide-overlay-header">
                <button className="sector-wide-back-btn" onClick={handleSectorBack}>
                  ← Back
                </button>
                <h2>{selectedSector}</h2>
                <span className={`sector-avg-large ${
                  (sectorData[selectedSector]?.reduce((sum, s) => sum + getPctChange(s), 0) / sectorData[selectedSector]?.length || 0) >= 0
                    ? 'positive' : 'negative'
                }`}>
                  {(() => {
                    const avg = sectorData[selectedSector]?.reduce((sum, s) => sum + getPctChange(s), 0) / sectorData[selectedSector]?.length || 0;
                    return `${avg >= 0 ? '+' : ''}${avg.toFixed(2)}%`;
                  })()}
                </span>
              </div>
              <div className="sector-wide-overlay-grid">
                {(sectorData[selectedSector] || []).map((stock) => {
                  const pct = getPctChange(stock);
                  const useNeutral = !heatEnabled && displayMode !== 'relvol';
                  return (
                  <div
                    key={stock.symbol}
                    className="sector-wide-overlay-tile"
                    style={{
                      background: useNeutral ? NEUTRAL_BG : displayMode === 'relvol' ? getRelVolColor(stock.relVolume, stock.sector) : getColor(pct),
                      color: useNeutral ? 'rgba(255, 255, 255, 0.9)' : displayMode === 'relvol' ? getRelVolTextColor(stock.relVolume) : getTextColor(pct),
                    }}
                    onClick={(e) => handleStockClick(stock, e)}
                  >
                    <span className="sector-wide-overlay-symbol">{stock.symbol}</span>
                    <span
                      className="sector-wide-overlay-change"
                      style={useNeutral ? { color: getNeutralTextColor(pct) } : {}}
                    >{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</span>
                    {displayMode !== 'pct' && (
                      <span className="sector-wide-overlay-price">{getDisplayValue(stock)}</span>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Stock Detail Overlay - Level 3 */}
        {selectedStock && (() => {
          const useNeutral = !heatEnabled && displayMode !== 'relvol';
          return (
          <div
            className={`sector-wide-stock-overlay ${isStockExpanded ? 'expanded' : ''}`}
            style={{
              '--stock-origin-x': `${stockOrigin.x}px`,
              '--stock-origin-y': `${stockOrigin.y}px`,
              '--stock-origin-width': `${stockOrigin.width}px`,
              '--stock-origin-height': `${stockOrigin.height}px`,
              background: useNeutral ? NEUTRAL_BG : displayMode === 'relvol' ? getRelVolColor(selectedStock.relVolume, selectedStock.sector) : getColor(getPctChange(selectedStock)),
            }}
            onClick={handleStockBack}
          >
            <div className="sector-wide-stock-content" onClick={(e) => e.stopPropagation()}>
              <button className="sector-wide-back-btn" onClick={handleStockBack}>
                ← Back
              </button>
              <div className="detail-header" style={{ marginTop: '40px' }}>
                <div className="detail-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h1 className="detail-symbol">{selectedStock.symbol}</h1>
                    {extendedStockData?.website && (
                      <a
                        href={extendedStockData.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="stock-website-link"
                        onClick={(e) => e.stopPropagation()}
                        title={extendedStockData.website}
                      >
                        ↗
                      </a>
                    )}
                  </div>
                  <p className="detail-company">{extendedStockData?.name || selectedStock.company}</p>
                  {(selectedStock.sector || selectedStock.industry) && (
                    <div className="detail-meta" style={{ marginTop: '10px' }}>
                      {selectedStock.sector && <span className="stock-sector" style={{ background: 'rgba(102, 126, 234, 0.6)', color: '#d4dfff' }}>{selectedStock.sector}</span>}
                      {selectedStock.industry && <span className="stock-industry" style={{ background: 'rgba(255, 255, 255, 0.3)' }}>{selectedStock.industry}</span>}
                    </div>
                  )}
                </div>
                <div className="detail-price-section">
                  <span className="detail-price" style={{ fontSize: '2.3rem' }}>${selectedStock.c.toFixed(2)}</span>
                  <span className={`detail-change ${selectedStock.dp >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '1.25rem' }}>
                    {selectedStock.dp >= 0 ? '▲' : '▼'} {selectedStock.dp >= 0 ? '+' : '-'}${Math.abs(selectedStock.c * selectedStock.dp / 100).toFixed(2)} ({selectedStock.dp >= 0 ? '+' : '-'}{Math.abs(selectedStock.dp).toFixed(2)}%)
                  </span>
                </div>
                <div className="detail-stats">
                  <div className="stat-row">
                    <span className="stat-label">Market Cap</span>
                    <span className="stat-value">{formatMarketCap(selectedStock.marketCap)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Volume</span>
                    <span className="stat-value">{formatVolume(selectedStock.volume)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Rel Volume</span>
                    <span className="stat-value">{selectedStock.relVolume ? selectedStock.relVolume.toFixed(1) + 'X' : 'N/A'}</span>
                  </div>
                </div>
              </div>
              {/* Stats Grid - like Search page */}
              <div className="stock-details expanded">
                <div className="detail">
                  <span className="label">OPEN</span>
                  <span className="value">{extendedStockData?.o ? `$${extendedStockData.o.toFixed(2)}` : 'N/A'}</span>
                </div>
                <div className="detail">
                  <span className="label">LOW</span>
                  <span className="value">{extendedStockData?.l ? `$${extendedStockData.l.toFixed(2)}` : 'N/A'}</span>
                </div>
                <div className="detail">
                  <span className="label">HIGH</span>
                  <span className="value">{extendedStockData?.h ? `$${extendedStockData.h.toFixed(2)}` : 'N/A'}</span>
                </div>
                <div className="detail">
                  <span className="label">MKT CAP</span>
                  <span className="value">{extendedStockData?.marketCap ? formatMarketCap(extendedStockData.marketCap) : formatMarketCap(selectedStock.marketCap)}</span>
                </div>
                <div className="detail">
                  <span className="label">BETA</span>
                  <span className="value">{extendedStockData?.beta ? parseFloat(extendedStockData.beta).toFixed(2) : 'N/A'}</span>
                </div>
                <div className="detail">
                  <span className="label">TARGET</span>
                  <span className="value">{extendedStockData?.analystTargetPrice ? `$${parseFloat(extendedStockData.analystTargetPrice).toFixed(2)}` : 'N/A'}</span>
                </div>
                <div className="detail">
                  <span className="label">PREV</span>
                  <span className="value">{extendedStockData?.pc ? `$${extendedStockData.pc.toFixed(2)}` : 'N/A'}</span>
                </div>
                <div className="detail">
                  <span className="label">52W LOW</span>
                  <span className="value">{extendedStockData?.week52Low ? `$${parseFloat(extendedStockData.week52Low).toFixed(2)}` : 'N/A'}</span>
                </div>
                <div className="detail">
                  <span className="label">52W HIGH</span>
                  <span className="value">{extendedStockData?.week52High ? `$${parseFloat(extendedStockData.week52High).toFixed(2)}` : 'N/A'}</span>
                </div>
                <div className="detail">
                  <span className="label">DIV YIELD</span>
                  <span className="value">{extendedStockData?.dividendYield ? (parseFloat(extendedStockData.dividendYield) * 100).toFixed(2) + '%' : 'N/A'}</span>
                </div>
                <div className="detail">
                  <span className="label">EPS</span>
                  <span className="value">{extendedStockData?.eps ? `$${extendedStockData.eps}` : 'N/A'}</span>
                </div>
                <div className="detail">
                  <span className="label">P/E</span>
                  <span className="value">{extendedStockData?.peRatio || 'N/A'}</span>
                </div>
              </div>
              <div className="sector-wide-stock-chart">
                <StockChart
                  data={(() => {
                    const data = [];
                    const dailyVolatility = 0.002;
                    let price = selectedStock.c;
                    const trend = selectedStock.dp / 78 / 100;
                    for (let i = 78; i >= 0; i--) {
                      data.unshift(price);
                      const randomChange = (Math.random() - 0.5) * 2 * dailyVolatility;
                      price = price / (1 + trend + randomChange);
                    }
                    return data;
                  })()}
                  width={1000}
                  height={200}
                  positive={selectedStock.dp >= 0}
                  previousClose={selectedStock.c / (1 + selectedStock.dp / 100)}
                  symbol={selectedStock.symbol}
                />
              </div>
              <div className="sector-wide-performance">
                <h3>Performance</h3>
                <div className="sector-wide-performance-grid">
                  {['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', '10Y'].map((period) => {
                    const val = selectedStock.periodChanges?.[period] ?? 0;
                    return (
                      <div key={period} className={`sector-wide-performance-item ${val >= 0 ? 'positive' : 'negative'}`}>
                        <span className="sector-wide-performance-label">{period}</span>
                        <span className="sector-wide-performance-value">{val >= 0 ? '+' : ''}{val.toFixed(2)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {stockNews.length > 0 && (
                <div className="sector-wide-stock-news">
                  <h3>Recent News</h3>
                  <div className="sector-wide-news-list">
                    {stockNews.map((item, index) => {
                      const date = new Date(item.datetime * 1000);
                      const timeAgo = getTimeAgo(date);
                      return (
                        <a
                          key={index}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sector-wide-news-item"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="sector-wide-news-headline">{item.headline}</span>
                          <span className="sector-wide-news-meta">
                            <span className="sector-wide-news-source">{item.source}</span>
                            <span className="sector-wide-news-time">{timeAgo}</span>
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Description Section */}
              {(extendedStockData?.description || extendedStockData?.address) && (
                <div className="stock-about">
                  {extendedStockData.description && (
                    <p className="stock-description">{extendedStockData.description}</p>
                  )}
                  {extendedStockData.address && (
                    <p className="stock-address">{extendedStockData.address}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          );
        })()}
      </div>
      <div className="heatmap-legend">
        <span className="legend-label">-5%</span>
        <div className="legend-gradient"></div>
        <span className="legend-label">+5%</span>
      </div>
    </div>
  );
}
