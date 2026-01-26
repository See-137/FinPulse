
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MOCK_STOCKS, CURRENCY_RATES } from '../constants';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Currency } from '../types';
import { fetchFxRates } from '../hooks/useMarketData';
import { usePortfolioStore } from '../store/portfolioStore';
import { config } from '../config';

interface MarketTickerProps {
  currency: Currency;
}

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  type: 'CRYPTO' | 'STOCK' | 'COMMODITY';
}

// Unified polling interval (30 seconds for all assets - CoinGecko + Alpaca)
const POLL_INTERVAL = 30000;

export const MarketTicker: React.FC<MarketTickerProps> = ({ currency }) => {
  const [fxRate, setFxRate] = useState<number>(CURRENCY_RATES[currency]);
  const [allPrices, setAllPrices] = useState<Map<string, StockData>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const getHoldings = usePortfolioStore((state) => state.getHoldings);

  // Get all portfolio symbols (crypto + stocks)
  const { cryptoSymbols, stockSymbols } = useMemo(() => {
    const holdings = getHoldings();

    if (holdings.length === 0) {
      // Default view when no portfolio
      return {
        cryptoSymbols: ['BTC', 'ETH', 'SOL'],
        stockSymbols: ['AAPL', 'MSFT'],
      };
    }

    const crypto = holdings.filter(h => h.type === 'CRYPTO').map(h => h.symbol);
    const stocks = holdings.filter(h => h.type === 'STOCK' || h.type === 'COMMODITY').map(h => h.symbol);

    return {
      cryptoSymbols: crypto,
      stockSymbols: stocks,
    };
  }, [getHoldings]);

  // Unified fetch for all prices (crypto via CoinGecko + stocks via Alpaca)
  const fetchAllPrices = useCallback(async () => {
    const newPrices = new Map<string, StockData>();

    // Fetch crypto prices (CoinGecko via backend)
    if (cryptoSymbols.length > 0) {
      try {
        const cryptoParam = cryptoSymbols.join(',');
        const response = await fetch(
          `${config.apiUrl}/market/prices?symbols=${cryptoParam}&type=crypto`
        );
        const data = await response.json();

        if (data.success && data.data) {
          for (const symbol of cryptoSymbols) {
            const priceData = data.data[symbol];
            if (priceData) {
              newPrices.set(symbol, {
                symbol,
                price: priceData.price || 0,
                change: (priceData.price || 0) * ((priceData.change24h || 0) / 100),
                changePercent: priceData.change24h || 0,
                type: 'CRYPTO',
              });
            }
          }
        }
      } catch {
        // Keep existing crypto prices on error
      }
    }

    // Fetch stock prices (Alpaca via backend)
    if (stockSymbols.length > 0) {
      try {
        const stockParam = stockSymbols.join(',');
        const response = await fetch(
          `${config.apiUrl}/market/prices?symbols=${stockParam}&type=stock`
        );
        const data = await response.json();

        if (data.success && data.data) {
          for (const symbol of stockSymbols) {
            const priceData = data.data[symbol];
            if (priceData) {
              newPrices.set(symbol, {
                symbol,
                price: priceData.price || 0,
                change: (priceData.price || 0) * ((priceData.change24h || 0) / 100),
                changePercent: priceData.change24h || 0,
                type: 'STOCK',
              });
            }
          }
        }
      } catch {
        // Keep existing stock prices on error
      }
    }

    if (newPrices.size > 0) {
      setAllPrices(prev => {
        const merged = new Map(prev);
        newPrices.forEach((value, key) => merged.set(key, value));
        return merged;
      });
      setLastUpdate(new Date());
      setSecondsAgo(0);
    }
  }, [cryptoSymbols, stockSymbols]);

  // Unified polling for all assets (30 second interval)
  useEffect(() => {
    fetchAllPrices();
    const interval = setInterval(fetchAllPrices, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAllPrices]);

  // Update "seconds ago" counter every second
  useEffect(() => {
    if (!lastUpdate) return;
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdate.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdate]);

  // Convert prices map to array for display
  const liveStocks = useMemo((): StockData[] => {
    const combined: StockData[] = [];

    allPrices.forEach((data) => {
      combined.push(data);
    });

    // If no live data yet, use mock stocks
    if (combined.length === 0) {
      return MOCK_STOCKS.map(s => ({ ...s, type: 'STOCK' as const }));
    }

    return combined;
  }, [allPrices]);

  // Fetch FX rates separately
  useEffect(() => {
    const fetchFx = async () => {
      try {
        const fxRes = await fetchFxRates('USD');
        if (fxRes.success && fxRes.rates) {
          setFxRate(currency === 'ILS' ? fxRes.rates.ILS : 1);
        }
      } catch {
        // Keep default rate
      }
    };
    fetchFx();
  }, [currency]);

  // Triple the data to ensure zero gaps on ultra-wide screens
  const stocks = [...liveStocks, ...liveStocks, ...liveStocks];
  const rate = fxRate;
  const currencySymbol = currency === 'USD' ? '$' : '₪';

  // Format seconds ago for display
  const getUpdateText = () => {
    if (!lastUpdate) return 'Loading...';
    if (secondsAgo < 5) return 'Just now';
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    return `${Math.floor(secondsAgo / 60)}m ago`;
  };

  return (
    <div className="bg-[#0b0e14] text-white py-3 overflow-hidden border-b border-white/5 relative z-30">
      {/* Update indicator */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-500/10 rounded-full border border-slate-500/20">
          <RefreshCw className={`w-3 h-3 text-slate-400 ${lastUpdate ? '' : 'animate-spin'}`} />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
            {getUpdateText()}
          </span>
        </div>
      </div>

      <div className="flex animate-ticker whitespace-nowrap ml-20">
        {stocks.map((stock, i) => (
          <div
            key={`${stock.symbol}-${i}`}
            className="flex items-center gap-6 px-10 border-r border-white/5 group cursor-default hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">
                {stock.symbol}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">
                  {currencySymbol}{(stock.price * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <div className={`flex items-center gap-0.5 text-[10px] font-bold ${stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stock.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(stock.changePercent).toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
