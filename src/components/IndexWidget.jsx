import { useState, useEffect, useCallback } from 'react';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTqBTN6lfC6dKSHu3fpiuoo20-UPLcZ8fV7My1-AlZMunJ_SXK-NnD1-B7ssnl-74tgThJNuE7av7G5/pub?gid=446822103&single=true&output=csv';

const INDEX_NAMES = {
  DOW: 'Dow Jones',
  SP500: 'S&P 500',
  NASDAQ: 'Nasdaq',
  VIX: 'VIX',
};

export function IndexWidget() {
  const [indexData, setIndexData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchIndices = useCallback(async () => {
    try {
      const response = await fetch(SHEET_URL);
      const csvText = await response.text();

      // Parse CSV
      const lines = csvText.trim().split('\n');
      const results = [];

      for (let i = 1; i < lines.length; i++) { // Skip header
        const cols = lines[i].split(',');
        if (cols.length >= 4) {
          const symbol = cols[0].trim();
          const price = parseFloat(cols[1]);
          const pctChange = parseFloat(cols[2].replace('%', ''));
          const change = parseFloat(cols[3]);

          if (INDEX_NAMES[symbol] && !isNaN(price)) {
            results.push({
              symbol,
              name: INDEX_NAMES[symbol],
              price,
              pctChange,
              change,
            });
          }
        }
      }

      setIndexData(results);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch index data:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIndices();
    // Refresh every 60 seconds
    const interval = setInterval(fetchIndices, 60000);
    return () => clearInterval(interval);
  }, [fetchIndices]);

  if (loading && indexData.length === 0) {
    return <div className="index-widget loading">Loading indices...</div>;
  }

  const formatNumber = (num, decimals = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  return (
    <div className="index-widget">
      {indexData.map((index) => {
        const isPositive = index.pctChange >= 0;
        const arrow = isPositive ? '▲' : '▼';
        const changeClass = isPositive ? 'positive' : 'negative';
        // VIX is inverse - high VIX is bad, so swap colors
        const vixClass = index.symbol === 'VIX'
          ? (isPositive ? 'negative' : 'positive')
          : changeClass;

        return (
          <div key={index.symbol} className="index-item">
            <span className="index-name">{index.name}</span>
            <span className="index-price">{formatNumber(index.price)}</span>
            <span className={`index-change ${index.symbol === 'VIX' ? vixClass : changeClass}`}>
              {arrow} {isPositive ? '+' : ''}{formatNumber(index.change)} ({isPositive ? '+' : ''}{index.pctChange.toFixed(2)}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}
