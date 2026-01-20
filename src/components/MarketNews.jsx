import { useState, useEffect, useCallback } from 'react';

const API_URL = 'https://api.massive.com/v2/reference/news?order=desc&limit=20&sort=published_utc&apiKey=ENpf5PTsrm4kkeInh1bCoRPPoiU4yY8Y';

export function MarketNews() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNews = useCallback(async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }
      const data = await response.json();
      // Filter out GlobeNewswire
      const filtered = (data.results || []).filter(
        item => !item.publisher?.name?.includes('GlobeNewswire')
      );
      setNews(filtered);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch market news:', err);
      setError('Failed to load market news');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
    // Refresh news every 5 minutes
    const interval = setInterval(fetchNews, 300000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
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
        <p>Loading market news...</p>
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
    <div className="market-news-container">
      <h2>Market News</h2>
      <div className="market-news-grid">
        {news.map((item) => (
          <a
            key={item.id}
            href={item.article_url}
            target="_blank"
            rel="noopener noreferrer"
            className="market-news-item"
          >
            {item.image_url && (
              <div className="news-image-wrapper">
                <img
                  src={item.image_url}
                  alt=""
                  className="news-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="news-content">
              <span className="news-headline">{item.title}</span>
              {item.tickers && item.tickers.length > 0 && (
                <div className="news-tickers">
                  {item.tickers.slice(0, 4).map((ticker) => (
                    <span key={ticker} className="news-ticker">{ticker}</span>
                  ))}
                </div>
              )}
              {item.keywords && item.keywords.length > 0 && (
                <div className="news-keywords">
                  {item.keywords.slice(0, 3).map((keyword) => (
                    <span key={keyword} className="news-keyword">{keyword}</span>
                  ))}
                </div>
              )}
              <div className="news-meta">
                {item.insights?.[0]?.sentiment && (
                  <span
                    className={`news-sentiment ${item.insights[0].sentiment}`}
                    title={item.insights[0].sentiment_reasoning || item.insights[0].sentiment}
                  />
                )}
                {item.publisher?.favicon_url && (
                  <img
                    src={item.publisher.favicon_url}
                    alt=""
                    className="news-publisher-icon"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <span className="news-source">{item.publisher?.name}</span>
                <span className="news-time">{formatTime(item.published_utc)}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
