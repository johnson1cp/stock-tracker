import { useState, useEffect } from 'react';
import { useStockData } from '../hooks/useStockData';

const INDICES = [
  { symbol: '^DJI', name: 'Dow Jones' },
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^IXIC', name: 'Nasdaq' },
];

export function IndexWidget() {
  const { fetchStockQuote } = useStockData();
  const [indexData, setIndexData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIndices() {
      setLoading(true);
      const results = await Promise.all(
        INDICES.map(async (index) => {
          const data = await fetchStockQuote(index.symbol);
          return data ? { ...data, displayName: index.name } : null;
        })
      );
      setIndexData(results.filter(Boolean));
      setLoading(false);
    }

    fetchIndices();
    // Refresh every 60 seconds
    const interval = setInterval(fetchIndices, 60000);
    return () => clearInterval(interval);
  }, [fetchStockQuote]);

  if (loading && indexData.length === 0) {
    return <div className="index-widget loading">Loading indices...</div>;
  }

  return (
    <div className="index-widget">
      {indexData.map((index) => {
        const isPositive = index.d >= 0;
        const arrow = isPositive ? '▲' : '▼';
        const changeClass = isPositive ? 'positive' : 'negative';

        return (
          <div key={index.symbol} className="index-item">
            <span className="index-name">{index.displayName}</span>
            <span className="index-price">${index.c.toFixed(2)}</span>
            <span className={`index-change ${changeClass}`}>
              {arrow} {Math.abs(index.dp).toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
