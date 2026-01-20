import { useState, useCallback } from 'react';

const API_KEY = 'cmg1hn1r01qv3c72lbd0cmg1hn1r01qv3c72lbdg'; // Finnhub API key
const ALPHA_VANTAGE_KEY = 'YAPGQI7QBF5G5NIL'; // Alpha Vantage API key for historical data

export function useStockData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStockQuote = useCallback(async (symbol, includeOverview = true) => {
    setLoading(true);
    setError(null);

    try {
      const upperSymbol = symbol.toUpperCase();

      // Always fetch quote from Finnhub
      const quoteResponse = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(upperSymbol)}&token=${API_KEY}`
      );

      if (!quoteResponse.ok) {
        throw new Error('Failed to fetch stock data');
      }

      const quoteData = await quoteResponse.json();

      if (quoteData.c === 0 && quoteData.h === 0) {
        throw new Error('Stock symbol not found');
      }

      // Basic result with Finnhub data only
      let result = {
        symbol: upperSymbol,
        ...quoteData,
        name: getCompanyName(upperSymbol),
      };

      // For watchlist (no full overview), fetch Finnhub profile for basic data like market cap
      if (!includeOverview) {
        try {
          const profileResponse = await fetch(
            `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(upperSymbol)}&token=${API_KEY}`
          );
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            if (profileData && profileData.name) {
              result.name = profileData.name;
              result.marketCap = profileData.marketCapitalization ? profileData.marketCapitalization * 1000000 : null; // Convert from millions
              result.sector = profileData.finnhubIndustry || null; // Use finnhubIndustry as sector for watchlist
              result.logo = profileData.logo || null;
              result.website = profileData.weburl || null;
            }
          }
        } catch {
          // Finnhub profile failed, continue with basic data
        }
      }

      // Only fetch Alpha Vantage overview if requested (for search results)
      if (includeOverview) {
        let alphaVantageSuccess = false;
        try {
          const overviewResponse = await fetch(
            `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(upperSymbol)}&apikey=${ALPHA_VANTAGE_KEY}`
          );
          const overviewData = overviewResponse.ok ? await overviewResponse.json() : {};

          // Merge overview data if available
          if (overviewData && overviewData.Name) {
            alphaVantageSuccess = true;
            result = {
              ...result,
              // Basic info
              name: overviewData.Name || result.name,
              description: overviewData.Description || null,
              sector: overviewData.Sector || null,
              industry: overviewData.Industry || null,
              exchange: overviewData.Exchange || null,
              country: overviewData.Country || null,
              website: overviewData.OfficialSite || null,
              address: overviewData.Address || null,
              // Valuation
              marketCap: overviewData.MarketCapitalization || null,
              peRatio: overviewData.PERatio || null,
              pegRatio: overviewData.PEGRatio || null,
              bookValue: overviewData.BookValue || null,
              eps: overviewData.EPS || null,
              // Dividends
              dividendYield: overviewData.DividendYield || null,
              dividendPerShare: overviewData.DividendPerShare || null,
              exDividendDate: overviewData.ExDividendDate || null,
              // Analyst
              analystTargetPrice: overviewData.AnalystTargetPrice || null,
              analystRatings: overviewData.AnalystRatingBuy ? {
                strongBuy: overviewData.AnalystRatingStrongBuy,
                buy: overviewData.AnalystRatingBuy,
                hold: overviewData.AnalystRatingHold,
                sell: overviewData.AnalystRatingSell,
                strongSell: overviewData.AnalystRatingStrongSell,
              } : null,
              // Technical
              week52High: overviewData['52WeekHigh'] || null,
              week52Low: overviewData['52WeekLow'] || null,
              movingAvg50: overviewData['50DayMovingAverage'] || null,
              movingAvg200: overviewData['200DayMovingAverage'] || null,
              beta: overviewData.Beta || null,
              // Financials
              profitMargin: overviewData.ProfitMargin || null,
              revenueGrowth: overviewData.QuarterlyRevenueGrowthYOY || null,
              earningsGrowth: overviewData.QuarterlyEarningsGrowthYOY || null,
            };
          }
        } catch {
          // Alpha Vantage failed
        }

        // Fallback to Finnhub profile if Alpha Vantage failed or hit rate limit
        if (!alphaVantageSuccess) {
          try {
            const profileResponse = await fetch(
              `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(upperSymbol)}&token=${API_KEY}`
            );
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              if (profileData && profileData.name) {
                result.name = profileData.name;
                result.marketCap = profileData.marketCapitalization ? profileData.marketCapitalization * 1000000 : null;
                result.sector = profileData.finnhubIndustry || null;
                result.logo = profileData.logo || null;
                result.website = profileData.weburl || null;
                result.exchange = profileData.exchange || null;
                result.country = profileData.country || null;
              }
            }
          } catch {
            // Finnhub profile also failed
          }
        }
      }

      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, []);

  const fetchStockHistory = useCallback(async (symbol) => {
    try {
      const upperSymbol = symbol.toUpperCase();

      // Use Alpha Vantage intraday data for 1-day sparkline
      const response = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${encodeURIComponent(upperSymbol)}&interval=5min&apikey=${ALPHA_VANTAGE_KEY}`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (data['Error Message'] || data['Note'] || !data['Time Series (5min)']) {
        return null;
      }

      // Extract closing prices from intraday time series
      const timeSeries = data['Time Series (5min)'];
      const times = Object.keys(timeSeries).sort();
      const closingPrices = times.map(time => parseFloat(timeSeries[time]['4. close']));

      return closingPrices;
    } catch {
      return null;
    }
  }, []);

  // Generate simulated sparkline data based on current price and change
  const generateSparklineData = useCallback((currentPrice, percentChange, days = 20) => {
    const data = [];
    const dailyVolatility = 0.015; // 1.5% daily volatility

    // Work backwards from current price
    let price = currentPrice;
    const trend = percentChange / days / 100; // Spread the change across days

    for (let i = days; i >= 0; i--) {
      data.unshift(price);
      // Add some randomness but maintain general trend
      const randomChange = (Math.random() - 0.5) * 2 * dailyVolatility;
      price = price / (1 + trend + randomChange);
    }

    return data;
  }, []);

  const fetchStockNews = useCallback(async (symbol, count = 10) => {
    try {
      const upperSymbol = symbol.toUpperCase();
      // Use a week range to get more news results
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const toDate = today.toISOString().split('T')[0];
      const fromDate = weekAgo.toISOString().split('T')[0];

      const response = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(upperSymbol)}&from=${fromDate}&to=${toDate}&token=${API_KEY}`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        return null;
      }

      // Return array of news items
      return data.slice(0, count);
    } catch {
      return null;
    }
  }, []);

  return { fetchStockQuote, fetchStockHistory, fetchStockNews, generateSparklineData, loading, error };
}

function getCompanyName(symbol) {
  const names = {
    AAPL: 'Apple Inc.',
    GOOGL: 'Alphabet Inc.',
    MSFT: 'Microsoft Corporation',
    AMZN: 'Amazon.com Inc.',
    TSLA: 'Tesla Inc.',
    META: 'Meta Platforms Inc.',
    NVDA: 'NVIDIA Corporation',
    LLY: 'Lilly(Eli) & Co',
WMT: 'Walmart Inc',
JPM: 'JPMorgan Chase & Co',
V: 'Visa Inc',
ORCL: 'Oracle Corp',
XOM: 'Exxon Mobil Corp',
JNJ: 'Johnson & Johnson',
MA: 'Mastercard Incorporated',
COST: 'Costco Wholesale Corp',
MU: 'Micron Technology Inc',
    JPM: 'JPMorgan Chase & Co.',
    '^DJI': 'Dow Jones Industrial Average',
    '^GSPC': 'S&P 500',
    '^IXIC': 'Nasdaq Composite',
  };
  return names[symbol] || symbol;
}

export const POPULAR_STOCKS = ['AAPL', 'GOOGL', 'MSFT', 'SPY', 'AMZN', 'TSLA', 'META', 'NVDA', 'WMT', 'V', 'ORCL', 'LLY', 'JPM'];
