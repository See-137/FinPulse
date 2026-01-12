import React, { memo } from 'react';
import { Bell, BellOff, Trash2, TrendingUp, TrendingDown, ArrowRight, Bitcoin, Activity, Gem } from 'lucide-react';
import { WatchlistItem, AssetType } from '../store/portfolioStore';
import { useLanguage } from '../i18n';
import { Currency } from '../types';
import { CURRENCY_RATES } from '../constants';

interface WatchlistItemCardProps {
  item: WatchlistItem;
  price: number;
  change24h: number;
  rate: number;
  currencySymbol: string;
  onSetAlert: (symbol: string, currentPrice: number) => void;
  onRemove: (symbol: string) => void;
  onAddToPortfolio?: (symbol: string, name: string, type: AssetType) => void;
}

const getTypeIcon = (type: AssetType) => {
  switch (type) {
    case 'CRYPTO': return <Bitcoin className="w-4 h-4" />;
    case 'STOCK': return <Activity className="w-4 h-4" />;
    case 'COMMODITY': return <Gem className="w-4 h-4" />;
  }
};

const getTypeBadgeStyle = (type: AssetType) => {
  switch (type) {
    case 'CRYPTO': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    case 'STOCK': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'COMMODITY': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  }
};

/**
 * WatchlistItemCard Component
 * Memoized to prevent unnecessary re-renders in watchlist grid
 * Renders a single watchlist item with price, alerts, and actions
 */
export const WatchlistItemCard = memo<WatchlistItemCardProps>(({
  item,
  price,
  change24h,
  rate,
  currencySymbol,
  onSetAlert,
  onRemove,
  onAddToPortfolio,
}) => {
  const { t } = useLanguage();

  const hasAlert = item.alertPrice !== undefined;
  const alertTriggered = hasAlert && (
    (item.alertType === 'above' && price >= item.alertPrice!) ||
    (item.alertType === 'below' && price <= item.alertPrice!)
  );
  const isUp = change24h >= 0;

  return (
    <div
      key={item.symbol}
      className={`card-surface rounded-[24px] p-6 border-l-4 transition-all group ${
        alertTriggered 
          ? 'border-l-amber-400 bg-amber-500/5' 
          : 'border-l-transparent hover:border-l-[#00e5ff]'
      } bg-gradient-to-br from-[#151921] to-[#0b0e14]`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getTypeBadgeStyle(item.type)}`}>
            {getTypeIcon(item.type)}
          </div>
          <div>
            <h3 className="font-black text-white group-hover:text-[#00e5ff] transition-colors">
              {item.symbol}
            </h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{item.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onSetAlert(item.symbol, price)}
            className={`p-2 rounded-lg transition-colors ${
              hasAlert 
                ? 'text-amber-400 bg-amber-500/10' 
                : 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10'
            }`}
            title={hasAlert ? `Alert: ${item.alertType} ${currencySymbol}${item.alertPrice}` : 'Set price alert'}
          >
            {hasAlert ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onRemove(item.symbol)}
            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Remove from watchlist"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-black text-white">
            {currencySymbol}{(price * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className={`flex items-center gap-1 mt-1 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span className="text-xs font-bold">{Math.abs(change24h).toFixed(2)}%</span>
            <span className="text-[10px] text-slate-500 ml-1">24h</span>
          </div>
        </div>

        {onAddToPortfolio && (
          <button
            onClick={() => onAddToPortfolio(item.symbol, item.name, item.type)}
            className="flex items-center gap-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-[#00e5ff] hover:border-[#00e5ff]/30 transition-colors"
          >
            {t('watchlist.addToMirror')}
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Alert indicator */}
      {hasAlert && (
        <div className={`mt-4 pt-4 border-t border-white/5 flex items-center justify-between ${
          alertTriggered ? 'animate-pulse' : ''
        }`}>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            {t('watchlist.priceAlert')}: {item.alertType === 'above' ? t('watchlist.above') : t('watchlist.below')} {currencySymbol}{item.alertPrice?.toLocaleString()}
          </span>
          {alertTriggered && (
            <span className="text-[10px] font-black text-amber-400 uppercase">{t('watchlist.triggered')}</span>
          )}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo optimization
  // Returns true if props are equal (don't re-render), false if different (re-render)
  return (
    prevProps.price === nextProps.price &&
    prevProps.change24h === nextProps.change24h &&
    prevProps.item.alertPrice === nextProps.item.alertPrice &&
    prevProps.item.alertType === nextProps.item.alertType &&
    prevProps.rate === nextProps.rate &&
    prevProps.currencySymbol === nextProps.currencySymbol
  );
});

WatchlistItemCard.displayName = 'WatchlistItemCard';
