
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MOCK_STOCKS, CURRENCY_RATES } from '../constants';
import { TrendingUp, TrendingDown, Wifi, WifiOff } from 'lucide-react';
import { Currency } from '../types';
import { useWebSocketPrices } from '../hooks/useWebSocketPrices';
import { fetchFxRates, fetchMarketPrices } from '../hooks/useMarketData';
import { usePortfolioStore } from '../store/portfolioStore';

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

// Stock price polling interval (30 seconds - stocks don't need real-time)
const STOCK_POLL_INTERVAL = 30000;

export const MarketTicker: React.FC<MarketTickerProps> = ({ currency }) => {
  const [fxRate, setFxRate] = useState<number>(CURRENCY_RATES[currency]);
  const [stockPrices, setStockPrices] = useState<Map<string, StockData>>(new Map());
  const getHoldings = usePortfolioStore((state) => state.getHoldings);

  // Separate portfolio into crypto and non-crypto for different data sources
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

  // Real-time WebSocket prices for crypto only
  const { prices: cryptoPrices, isConnected } = useWebSocketPrices({
    symbols: cryptoSymbols,
    enabled: cryptoSymbols.length > 0,
  });

  // Fetch stock prices via REST API (polling)
  const fetchStockPrices = useCallback(async () => {
    if (stockSymbols.length === 0) return;

    try {
      const response = await fetchMarketPrices();
      if (response.success && response.data) {
        const newStockPrices = new Map<string, StockData>();

        for (const symbol of stockSymbols) {
          const priceData = response.data[symbol];
          if (priceData) {
            newStockPrices.set(symbol, {
              symbol,
              price: priceData.price || 0,
              change: (priceData.price || 0) * ((priceData.change24h || 0) / 100),
              changePercent: priceData.change24h || 0,
              type: 'STOCK',
            });
          }
        }

        setStockPrices(newStockPrices);
      }
    } catch {
      // Keep existing prices on error
    }
  }, [stockSymbols]);

  // Poll stock prices
  useEffect(() => {
    fetchStockPrices();
    const interval = setInterval(fetchStockPrices, STOCK_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStockPrices]);

  // Combine crypto (WebSocket) and stock (REST) prices
  const liveStocks = useMemo((): StockData[] => {
    const combined: StockData[] = [];

    // Add crypto prices from WebSocket
    cryptoPrices.forEach((data, symbol) => {
      combined.push({
        symbol,
        price: data.price,
        change: data.price * (data.change24h / 100),
        changePercent: data.change24h,
        type: 'CRYPTO',
      });
    });

    // Add stock prices from REST polling
    stockPrices.forEach((data) => {
      combined.push(data);
    });

    // If no live data yet, use mock stocks
    if (combined.length === 0) {
      return MOCK_STOCKS.map(s => ({ ...s, type: 'STOCK' as const }));
    }

    return combined;
  }, [cryptoPrices, stockPrices]);

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

  // Show connected if WebSocket is live OR we have stock data
  const hasLiveData = isConnected || stockPrices.size > 0;

  return (
    <div className="bg-[#0b0e14] text-white py-3 overflow-hidden border-b border-white/5 relative z-30">
      {/* Live indicator */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2">
        {hasLiveData ? (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">Live</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
            <WifiOff className="w-3 h-3 text-amber-400" />
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">Delayed</span>
          </div>
        )}
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
