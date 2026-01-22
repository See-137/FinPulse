
import React, { useState, useEffect, useMemo } from 'react';
import { MOCK_STOCKS, CURRENCY_RATES } from '../constants';
import { TrendingUp, TrendingDown, Wifi, WifiOff } from 'lucide-react';
import { Currency } from '../types';
import { useWebSocketPrices } from '../hooks/useWebSocketPrices';
import { fetchFxRates } from '../hooks/useMarketData';

interface MarketTickerProps {
  currency: Currency;
}

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'AVAX', 'MATIC', 'LINK', 'DOGE', 'BNB'];

export const MarketTicker: React.FC<MarketTickerProps> = ({ currency }) => {
  const [fxRate, setFxRate] = useState<number>(CURRENCY_RATES[currency]);
  
  // Real-time WebSocket prices
  const { prices, isConnected } = useWebSocketPrices({
    symbols: CRYPTO_SYMBOLS,
    enabled: true,
  });

  // Transform WebSocket prices to StockData format
  const liveStocks = useMemo((): StockData[] => {
    if (prices.size === 0) return MOCK_STOCKS;
    
    const wsStocks: StockData[] = [];
    prices.forEach((data, symbol) => {
      wsStocks.push({
        symbol,
        price: data.price,
        change: data.price * (data.change24h / 100),
        changePercent: data.change24h,
      });
    });
    
    // Combine with remaining mock stocks for variety
    return wsStocks.length > 0 
      ? [...wsStocks, ...MOCK_STOCKS.slice(wsStocks.length)]
      : MOCK_STOCKS;
  }, [prices]);

  // Fetch FX rates separately (doesn't need real-time)
  useEffect(() => {
    const fetchFx = async () => {
      try {
        const fxRes = await fetchFxRates('USD');
        if (fxRes.success && fxRes.rates) {
          setFxRate(currency === 'ILS' ? fxRes.rates.ILS : 1);
        }
      } catch (err) {
        // Keep default rate
      }
    };
    fetchFx();
  }, [currency]);

  // Triple the data to ensure zero gaps on ultra-wide screens
  const stocks = [...liveStocks, ...liveStocks, ...liveStocks];
  const rate = fxRate;
  const currencySymbol = currency === 'USD' ? '$' : '₪';

  return (
    <div className="bg-[#0b0e14] text-white py-3 overflow-hidden border-b border-white/5 relative z-30">
      {/* Live indicator */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2">
        {isConnected ? (
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
