
import React, { useState, useEffect } from 'react';
import { MOCK_STOCKS, CURRENCY_RATES } from '../constants';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Currency } from '../types';
import { fetchMarketPrices, fetchFxRates } from '../hooks/useMarketData';

interface MarketTickerProps {
  currency: Currency;
}

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export const MarketTicker: React.FC<MarketTickerProps> = ({ currency }) => {
  const [liveStocks, setLiveStocks] = useState<StockData[]>(MOCK_STOCKS);
  const [fxRate, setFxRate] = useState<number>(CURRENCY_RATES[currency]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const [pricesRes, fxRes] = await Promise.all([
          fetchMarketPrices(),
          fetchFxRates('USD'),
        ]);

        if (pricesRes.success && pricesRes.data) {
          const transformed: StockData[] = Object.entries(pricesRes.data).map(([sym, data]: [string, any]) => ({
            symbol: sym,
            price: data.price,
            change: data.price * (data.change24h / 100),
            changePercent: data.change24h,
          }));
          // Combine with static stocks for variety
          setLiveStocks([...transformed, ...MOCK_STOCKS.slice(3)]);
          setIsLive(true);
        }

        if (fxRes.success && fxRes.rates) {
          setFxRate(currency === 'ILS' ? fxRes.rates.ILS : 1);
        }
      } catch (err) {
        // Fallback to mock data
      }
    };

    fetchLiveData();
    const interval = setInterval(fetchLiveData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [currency]);

  // Triple the data to ensure zero gaps on ultra-wide screens
  const stocks = [...liveStocks, ...liveStocks, ...liveStocks];
  const rate = fxRate;
  const symbol = currency === 'USD' ? '$' : '₪';

  return (
    <div className="bg-[#0b0e14] text-white py-3 overflow-hidden border-b border-white/5 relative z-30">
      <div className="flex animate-ticker whitespace-nowrap">
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
                  {symbol}{(stock.price * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
