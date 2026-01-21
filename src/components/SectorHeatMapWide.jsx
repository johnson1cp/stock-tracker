import { useState, useEffect, useCallback } from 'react';
import { StockChart } from './StockChart';

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

export function SectorHeatMapWide() {
  const [sectorData, setSectorData] = useState({});
  const [sectorMarketCaps, setSectorMarketCaps] = useState({});
  const [loading, setLoading] = useState(true);

  // Overlay states
  const [selectedSector, setSelectedSector] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [isSectorExpanded, setIsSectorExpanded] = useState(false);
  const [isStockExpanded, setIsStockExpanded] = useState(false);
  const [stockNews, setStockNews] = useState([]);
  const [sectorOrigin, setSectorOrigin] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [stockOrigin, setStockOrigin] = useState({ x: 0, y: 0, width: 0, height: 0 });

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
            sector,
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
    const opacity = 0.5 + (intensity * 0.5);
    return `rgba(255, 255, 255, ${opacity})`;
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

    requestAnimationFrame(() => {
      setIsStockExpanded(true);
    });

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

  return (
    <div className="sector-heatmap-wide-container">
      <h2>Sector Heat Map Wide</h2>
      <div className="sector-grid-wide">
        {orderedSectors.map((sectorName) => {
          const stocks = sectorData[sectorName] || [];
          const avgChange = stocks.length > 0
            ? stocks.reduce((sum, s) => sum + s.dp, 0) / stocks.length
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
              {(sectorData[sectorName] || []).map((stock) => (
                <div
                  key={stock.symbol}
                  className="sector-tile-wide"
                  style={{
                    background: getColor(stock.dp),
                    color: getTextColor(stock.dp),
                  }}
                  title={`${stock.symbol}: $${stock.c.toFixed(2)} (${stock.dp >= 0 ? '+' : ''}${stock.dp.toFixed(2)}%)`}
                >
                  <span className="sector-tile-symbol-wide">{stock.symbol}</span>
                  <span className="sector-tile-change-wide">{stock.dp >= 0 ? '+' : ''}{stock.dp.toFixed(1)}%</span>
                </div>
              ))}
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
                  (sectorData[selectedSector]?.reduce((sum, s) => sum + s.dp, 0) / sectorData[selectedSector]?.length || 0) >= 0
                    ? 'positive' : 'negative'
                }`}>
                  {(() => {
                    const avg = sectorData[selectedSector]?.reduce((sum, s) => sum + s.dp, 0) / sectorData[selectedSector]?.length || 0;
                    return `${avg >= 0 ? '+' : ''}${avg.toFixed(2)}%`;
                  })()}
                </span>
              </div>
              <div className="sector-wide-overlay-grid">
                {(sectorData[selectedSector] || []).map((stock) => (
                  <div
                    key={stock.symbol}
                    className="sector-wide-overlay-tile"
                    style={{
                      background: getColor(stock.dp),
                      color: getTextColor(stock.dp),
                    }}
                    onClick={(e) => handleStockClick(stock, e)}
                  >
                    <span className="sector-wide-overlay-symbol">{stock.symbol}</span>
                    <span className="sector-wide-overlay-change">{stock.dp >= 0 ? '+' : ''}{stock.dp.toFixed(2)}%</span>
                    <span className="sector-wide-overlay-price">${stock.c.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stock Detail Overlay - Level 3 */}
        {selectedStock && (
          <div
            className={`sector-wide-stock-overlay ${isStockExpanded ? 'expanded' : ''}`}
            style={{
              '--stock-origin-x': `${stockOrigin.x}px`,
              '--stock-origin-y': `${stockOrigin.y}px`,
              '--stock-origin-width': `${stockOrigin.width}px`,
              '--stock-origin-height': `${stockOrigin.height}px`,
              background: getColor(selectedStock.dp),
            }}
            onClick={handleStockBack}
          >
            <div className="sector-wide-stock-content" onClick={(e) => e.stopPropagation()}>
              <button className="sector-wide-back-btn" onClick={handleStockBack}>
                ← Back
              </button>
              <div className="sector-wide-stock-header">
                <div className="sector-wide-stock-info">
                  <h1 className="sector-wide-stock-symbol">{selectedStock.symbol}</h1>
                  <p className="sector-wide-stock-company">Company Name</p>
                  <div className="sector-wide-stock-tags">
                    <span className="sector-wide-tag">{selectedStock.sector}</span>
                  </div>
                </div>
                <div className="sector-wide-stock-price-section">
                  <span className="sector-wide-stock-price">${selectedStock.c.toFixed(2)}</span>
                  <span className={`sector-wide-stock-change ${selectedStock.dp >= 0 ? 'positive' : 'negative'}`}>
                    {selectedStock.dp >= 0 ? '+' : ''}{(selectedStock.c * selectedStock.dp / 100).toFixed(2)} ({selectedStock.dp >= 0 ? '+' : ''}{selectedStock.dp.toFixed(2)}%)
                  </span>
                </div>
                <div className="sector-wide-stock-stats">
                  <div className="sector-wide-stat-row">
                    <span className="sector-wide-stat-label">Market Cap</span>
                    <span className="sector-wide-stat-value">{formatMarketCap(selectedStock.marketCap)}</span>
                  </div>
                  <div className="sector-wide-stat-row">
                    <span className="sector-wide-stat-label">Volume</span>
                    <span className="sector-wide-stat-value">--</span>
                  </div>
                  <div className="sector-wide-stat-row">
                    <span className="sector-wide-stat-label">Rel Volume</span>
                    <span className="sector-wide-stat-value">--</span>
                  </div>
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
                    const val = period === '1D' ? selectedStock.dp : (Math.random() - 0.3) * 50;
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
            </div>
          </div>
        )}
      </div>
      <div className="heatmap-legend">
        <span className="legend-label">-5%</span>
        <div className="legend-gradient"></div>
        <span className="legend-label">+5%</span>
      </div>
    </div>
  );
}
