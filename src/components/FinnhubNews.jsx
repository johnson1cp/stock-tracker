import { useState, useEffect, useCallback } from 'react';

const FINNHUB_API_URL = 'https://finnhub.io/api/v1/news?category=general&token=cmg1hn1r01qv3c72lbd0cmg1hn1r01qv3c72lbdg';

export function FinnhubNews() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNews = useCallback(async () => {
    try {
      const response = await fetch(FINNHUB_API_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }
      const data = await response.json();
      // Filter out MarketWatch and take first 10
      const filtered = data.filter(item => item.source !== 'MarketWatch');
      setNews(filtered.slice(0, 10));
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch Finnhub news:', err);
      setError('Failed to load news');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 300000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="market-news-loading">
        <p>Loading Finnhub news...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="market-news-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="finnhub-news-container">
      <h2>Top Stories</h2>
      <div className="market-news-grid">
        {news.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="market-news-item"
          >
            {item.image && (
              <div className="news-image-wrapper">
                <img
                  src={item.image}
                  alt=""
                  className="news-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="news-content">
              <span className="news-headline">{item.headline}</span>
              {item.category && (
                <div className="news-keywords">
                  <span className="news-keyword">{item.category}</span>
                </div>
              )}
              <div className="news-meta">
                <span className="news-source">{item.source}</span>
                <span className="news-time">{formatTime(item.datetime)}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
