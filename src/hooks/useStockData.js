import { useState, useCallback } from 'react';

const API_KEY = 'demo'; // Replace with your Finnhub API key for real data

// Demo data for when API is not available
const DEMO_STOCKS = {
  AAPL: { c: 178.52, d: 2.34, dp: 1.33, h: 179.23, l: 175.10, o: 175.50, pc: 176.18, t: Date.now() },
  GOOGL: { c: 141.80, d: -0.95, dp: -0.67, h: 143.20, l: 140.50, o: 142.75, pc: 142.75, t: Date.now() },
  MSFT: { c: 378.91, d: 4.21, dp: 1.12, h: 380.00, l: 374.50, o: 375.00, pc: 374.70, t: Date.now() },
  AMZN: { c: 178.25, d: 1.50, dp: 0.85, h: 179.00, l: 176.30, o: 177.00, pc: 176.75, t: Date.now() },
  TSLA: { c: 248.50, d: -3.25, dp: -1.29, h: 253.00, l: 246.10, o: 251.75, pc: 251.75, t: Date.now() },
  META: { c: 505.75, d: 8.25, dp: 1.66, h: 508.00, l: 497.50, o: 498.00, pc: 497.50, t: Date.now() },
  NVDA: { c: 875.30, d: 15.80, dp: 1.84, h: 880.00, l: 858.00, o: 860.00, pc: 859.50, t: Date.now() },
  JPM: { c: 195.40, d: 0.85, dp: 0.44, h: 196.20, l: 194.10, o: 194.50, pc: 194.55, t: Date.now() },
};

export function useStockData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStockQuote = useCallback(async (symbol) => {
    setLoading(true);
    setError(null);

    try {
      // Check if we have demo data for this symbol
      const upperSymbol = symbol.toUpperCase();
      if (DEMO_STOCKS[upperSymbol]) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));
        setLoading(false);
        return {
          symbol: upperSymbol,
          ...DEMO_STOCKS[upperSymbol],
          name: getCompanyName(upperSymbol),
        };
      }

      // Try real API
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${upperSymbol}&token=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stock data');
      }

      const data = await response.json();

      if (data.c === 0 && data.h === 0) {
        throw new Error('Stock symbol not found');
      }

      setLoading(false);
      return {
        symbol: upperSymbol,
        ...data,
        name: getCompanyName(upperSymbol),
      };
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, []);

  return { fetchStockQuote, loading, error };
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
    JPM: 'JPMorgan Chase & Co.',
  };
  return names[symbol] || symbol;
}

export const POPULAR_STOCKS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM'];
