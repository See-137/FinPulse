import React, { useState, useMemo } from 'react';
import { 
  Eye, Plus, Search, Trash2, Bell, BellOff, TrendingUp, TrendingDown,
  Bitcoin, Activity, Gem, Star, ArrowRight, X, Loader2, Wifi, WifiOff
} from 'lucide-react';
import { usePortfolioStore, WatchlistItem, AssetType } from '../store/portfolioStore';
import { useWebSocketPrices } from '../hooks/useWebSocketPrices';
import { useMarketData } from '../hooks/useMarketData';
import { useLanguage } from '../i18n';
import { Currency } from '../types';
import { CURRENCY_RATES } from '../constants';
import { WatchlistItemCard } from './WatchlistItemCard';

interface WatchlistProps {
  currency: Currency;
  onAddToPortfolio?: (symbol: string, name: string, type: AssetType) => void;
}

// Popular assets to suggest
const POPULAR_ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO' as AssetType },
  { symbol: 'ETH', name: 'Ethereum', type: 'CRYPTO' as AssetType },
  { symbol: 'SOL', name: 'Solana', type: 'CRYPTO' as AssetType },
  { symbol: 'XRP', name: 'Ripple', type: 'CRYPTO' as AssetType },
  { symbol: 'ADA', name: 'Cardano', type: 'CRYPTO' as AssetType },
  { symbol: 'AVAX', name: 'Avalanche', type: 'CRYPTO' as AssetType },
  { symbol: 'DOGE', name: 'Dogecoin', type: 'CRYPTO' as AssetType },
  { symbol: 'LINK', name: 'Chainlink', type: 'CRYPTO' as AssetType },
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK' as AssetType },
  { symbol: 'MSFT', name: 'Microsoft', type: 'STOCK' as AssetType },
  { symbol: 'GOOGL', name: 'Alphabet', type: 'STOCK' as AssetType },
  { symbol: 'AMZN', name: 'Amazon', type: 'STOCK' as AssetType },
  { symbol: 'NVDA', name: 'NVIDIA', type: 'STOCK' as AssetType },
  { symbol: 'TSLA', name: 'Tesla', type: 'STOCK' as AssetType },
  { symbol: 'META', name: 'Meta Platforms', type: 'STOCK' as AssetType },
  { symbol: 'PLTR', name: 'Palantir', type: 'STOCK' as AssetType },
  { symbol: 'GOLD', name: 'Gold', type: 'COMMODITY' as AssetType },
];

// Real market prices fallback
const FALLBACK_PRICES: Record<string, { price: number; change24h: number }> = {
  BTC: { price: 97500, change24h: 2.1 },
  ETH: { price: 3132.81, change24h: -1.87 },
  SOL: { price: 210.50, change24h: 3.2 },
  XRP: { price: 2.09, change24h: -4.54 },
  ADA: { price: 1.05, change24h: 1.8 },
  AVAX: { price: 42.30, change24h: 2.1 },
  DOGE: { price: 0.42, change24h: 5.2 },
  LINK: { price: 23.45, change24h: 1.5 },
  AAPL: { price: 248.50, change24h: 1.2 },
  MSFT: { price: 430.20, change24h: 0.8 },
  GOOGL: { price: 192.75, change24h: -0.5 },
  AMZN: { price: 225.40, change24h: 1.1 },
  NVDA: { price: 188.85, change24h: 5.16 },
  TSLA: { price: 410.30, change24h: 3.5 },
  META: { price: 595.80, change24h: 0.9 },
  PLTR: { price: 67.85, change24h: 2.4 },
  GOLD: { price: 2650, change24h: 0.3 },
};

export const Watchlist: React.FC<WatchlistProps> = ({ currency, onAddToPortfolio }) => {
  const { t } = useLanguage();
  const { getWatchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, setWatchlistAlert } = usePortfolioStore();
  const watchlist = getWatchlist();
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [alertModal, setAlertModal] = useState<{ symbol: string; currentPrice: number } | null>(null);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertType, setAlertType] = useState<'above' | 'below'>('above');
  
  // Track triggered alerts to avoid repeated notifications
  const [triggeredAlerts, setTriggeredAlerts] = useState<Set<string>>(new Set());

  // Get watchlist symbols for WebSocket (crypto only)
  const watchlistSymbols = useMemo(() => 
    watchlist.filter(w => w.type === 'CRYPTO').map(w => w.symbol),
    [watchlist]
  );

  // Get all watchlist symbols for REST API (stocks + commodities)
  const allWatchlistSymbols = useMemo(() => 
    watchlist.map(w => w.symbol),
    [watchlist]
  );

  const { prices: wsPrices, isConnected } = useWebSocketPrices({
    symbols: watchlistSymbols.length > 0 ? watchlistSymbols : ['BTC', 'ETH'],
    enabled: true,
  });

  // Fetch stock/commodity prices via REST API
  const { prices: marketPrices } = useMarketData({
    symbols: allWatchlistSymbols,
    refreshInterval: 30000,
    fetchNews: false,
    fetchFx: false,
  });

  const rate = CURRENCY_RATES[currency];
  const currencySymbol = currency === 'USD' ? '$' : '₪';

  // Get price for a symbol - prefers WebSocket for crypto, REST API for stocks
  const getPrice = (symbol: string): { price: number; change24h: number } => {
    const upperSymbol = symbol.toUpperCase();
    
    // Try WebSocket prices first (best for crypto)
    const wsPrice = wsPrices.get(upperSymbol);
    if (wsPrice) {
      return { price: wsPrice.price, change24h: wsPrice.change24h };
    }
    
    // Try REST API prices (works for both stocks and crypto)
    if (marketPrices && marketPrices[upperSymbol]) {
      return { 
        price: marketPrices[upperSymbol].price, 
        change24h: marketPrices[upperSymbol].change24h 
      };
    }
    
    // Fallback to static prices
    return FALLBACK_PRICES[upperSymbol] || { price: 0, change24h: 0 };
  };

  // Filter assets for search
  const filteredAssets = POPULAR_ASSETS.filter(asset => 
    (asset.symbol.toLowerCase().includes(search.toLowerCase()) ||
    asset.name.toLowerCase().includes(search.toLowerCase())) &&
    !isInWatchlist(asset.symbol)
  );

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

  const handleAddToWatchlist = (asset: typeof POPULAR_ASSETS[0]) => {
    addToWatchlist({
      symbol: asset.symbol,
      name: asset.name,
      type: asset.type,
    });
    setSearch('');
    setIsAddModalOpen(false);
  };

  const handleSetAlert = () => {
    if (alertModal && alertPrice) {
      setWatchlistAlert(alertModal.symbol, parseFloat(alertPrice), alertType);
      setAlertModal(null);
      setAlertPrice('');
    }
  };

  const handleRemoveAlert = (symbol: string) => {
    setWatchlistAlert(symbol, undefined, undefined);
    // Remove from triggered alerts when alert is cleared
    setTriggeredAlerts(prev => {
      const next = new Set(prev);
      next.delete(symbol);
      return next;
    });
  };

  // Monitor prices and trigger browser notifications for alerts
  useEffect(() => {
    // Request notification permission on first render
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Check price alerts
  useEffect(() => {
    watchlist.forEach(item => {
      if (!item.alertPrice || !item.alertType) return;
      
      const alertKey = `${item.symbol}-${item.alertPrice}-${item.alertType}`;
      if (triggeredAlerts.has(alertKey)) return; // Already triggered
      
      const { price } = getPrice(item.symbol);
      if (price === 0) return; // No price data yet
      
      const shouldTrigger = 
        (item.alertType === 'above' && price >= item.alertPrice) ||
        (item.alertType === 'below' && price <= item.alertPrice);
      
      if (shouldTrigger) {
        // Mark as triggered
        setTriggeredAlerts(prev => new Set(prev).add(alertKey));
        
        // Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`🔔 FinPulse Price Alert`, {
            body: `${item.symbol} is now ${item.alertType === 'above' ? 'above' : 'below'} $${item.alertPrice.toLocaleString()} (Current: $${price.toLocaleString()})`,
            icon: '/favicon.ico',
            tag: alertKey, // Prevents duplicate notifications
          });
        }
        
        // Also show in-page toast (fallback)
        console.log(`[Alert] ${item.symbol} triggered: ${item.alertType} $${item.alertPrice}`);
      }
    });
  }, [watchlist, wsPrices, marketPrices, triggeredAlerts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
            <Star className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">{t('watchlist.title')}</h2>
            <p className="text-sm text-slate-500">{t('watchlist.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
            isConnected 
              ? 'bg-emerald-500/10 border-emerald-500/20' 
              : 'bg-amber-500/10 border-amber-500/20'
          }`}>
            {isConnected ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="text-[9px] font-black text-emerald-400 uppercase">{t('common.live')}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span className="text-[9px] font-black text-amber-400 uppercase">{t('common.delayed')}</span>
              </>
            )}
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#00e5ff] text-[#0b0e14] font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('watchlist.addAsset')}
          </button>
        </div>
      </div>

      {/* Watchlist Grid */}
      {watchlist.length === 0 ? (
        <div className="card-surface rounded-[32px] p-12 text-center bg-gradient-to-br from-[#151921] to-[#0b0e14]">
          <Eye className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-black text-white mb-2">{t('watchlist.empty')}</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            {t('watchlist.emptyDesc')}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('watchlist.addFirst')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {watchlist.map((item) => {
            const { price, change24h } = getPrice(item.symbol);

            return (
              <WatchlistItemCard
                key={item.symbol}
                item={item}
                price={price}
                change24h={change24h}
                rate={rate}
                currencySymbol={currencySymbol}
                onSetAlert={(symbol, currentPrice) => setAlertModal({ symbol, currentPrice })}
                onRemove={removeFromWatchlist}
                onAddToPortfolio={onAddToPortfolio}
              />
            );
          })}
        </div>
      )}

      {/* Add Asset Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151921] rounded-[32px] w-full max-w-md p-8 relative max-h-[80vh] overflow-hidden flex flex-col">
            <button
              onClick={() => { setIsAddModalOpen(false); setSearch(''); }}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-black text-white mb-6">{t('watchlist.addAsset')}</h2>

            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder={t('watchlist.searchAssets')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0b0e14] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-medium outline-none text-white placeholder:text-slate-500 focus:ring-1 focus:ring-[#00e5ff]/50"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
              {filteredAssets.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No assets found</p>
              ) : (
                filteredAssets.map((asset) => {
                  const { price, change24h } = getPrice(asset.symbol);
                  const isUp = change24h >= 0;

                  return (
                    <button
                      key={asset.symbol}
                      onClick={() => handleAddToWatchlist(asset)}
                      className="w-full flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/5 rounded-xl border border-white/5 hover:border-[#00e5ff]/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getTypeBadgeStyle(asset.type)}`}>
                          {getTypeIcon(asset.type)}
                        </div>
                        <div className="text-left">
                          <p className="font-black text-white group-hover:text-[#00e5ff] transition-colors">
                            {asset.symbol}
                          </p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{asset.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white">
                          {currencySymbol}{(price * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className={`text-xs ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isUp ? '+' : ''}{change24h.toFixed(2)}%
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151921] rounded-[32px] w-full max-w-sm p-8 relative">
            <button
              onClick={() => { setAlertModal(null); setAlertPrice(''); }}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">{t('watchlist.priceAlert')}</h2>
                <p className="text-sm text-slate-500">{alertModal.symbol}</p>
              </div>
            </div>

            <p className="text-sm text-slate-400 mb-4">
              {t('watchlist.currentPrice')}: <span className="text-white font-bold">{currencySymbol}{(alertModal.currentPrice * rate).toLocaleString()}</span>
            </p>

            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setAlertType('above')}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
                    alertType === 'above'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/5 text-slate-500 border border-white/10'
                  }`}
                >
                  {t('watchlist.above')}
                </button>
                <button
                  onClick={() => setAlertType('below')}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
                    alertType === 'below'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-white/5 text-slate-500 border border-white/10'
                  }`}
                >
                  {t('watchlist.below')}
                </button>
              </div>

              <input
                type="number"
                placeholder="Alert price..."
                value={alertPrice}
                onChange={(e) => setAlertPrice(e.target.value)}
                className="w-full bg-[#0b0e14] border border-white/10 rounded-xl px-4 py-3 text-sm font-medium outline-none text-white placeholder:text-slate-500 focus:ring-1 focus:ring-[#00e5ff]/50"
              />

              <div className="flex gap-2">
                {watchlist.find(w => w.symbol === alertModal.symbol)?.alertPrice && (
                  <button
                    onClick={() => { handleRemoveAlert(alertModal.symbol); setAlertModal(null); }}
                    className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-500/20 transition-colors"
                  >
                    {t('watchlist.removeAlert')}
                  </button>
                )}
                <button
                  onClick={handleSetAlert}
                  disabled={!alertPrice}
                  className="flex-1 py-3 bg-[#00e5ff] text-[#0b0e14] rounded-xl text-xs font-black uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('watchlist.setAlert')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
