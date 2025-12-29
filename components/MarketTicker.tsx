
import React from 'react';
import { MOCK_STOCKS } from '../constants';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const MarketTicker: React.FC = () => {
  // Triple the data to ensure zero gaps on ultra-wide screens
  const stocks = [...MOCK_STOCKS, ...MOCK_STOCKS, ...MOCK_STOCKS];

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
                  ${stock.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
