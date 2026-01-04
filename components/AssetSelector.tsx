import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Bitcoin, TrendingUp, Gem, Loader2 } from 'lucide-react';
import { useLanguage } from '../i18n';

type AssetType = 'CRYPTO' | 'STOCK' | 'COMMODITY';

interface Asset {
  symbol: string;
  name: string;
  type: AssetType;
}

// Popular assets for quick selection (always available offline)
const POPULAR_ASSETS: Asset[] = [
  // Top Crypto
  { symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO' },
  { symbol: 'ETH', name: 'Ethereum', type: 'CRYPTO' },
  { symbol: 'SOL', name: 'Solana', type: 'CRYPTO' },
  { symbol: 'ADA', name: 'Cardano', type: 'CRYPTO' },
  { symbol: 'XRP', name: 'Ripple', type: 'CRYPTO' },
  { symbol: 'DOGE', name: 'Dogecoin', type: 'CRYPTO' },
  { symbol: 'DOT', name: 'Polkadot', type: 'CRYPTO' },
  { symbol: 'AVAX', name: 'Avalanche', type: 'CRYPTO' },
  { symbol: 'MATIC', name: 'Polygon', type: 'CRYPTO' },
  { symbol: 'LINK', name: 'Chainlink', type: 'CRYPTO' },
  { symbol: 'UNI', name: 'Uniswap', type: 'CRYPTO' },
  { symbol: 'ATOM', name: 'Cosmos', type: 'CRYPTO' },
  
  // Top Stocks
  { symbol: 'AAPL', name: 'Apple Inc', type: 'STOCK' },
  { symbol: 'MSFT', name: 'Microsoft', type: 'STOCK' },
  { symbol: 'GOOGL', name: 'Alphabet (Google)', type: 'STOCK' },
  { symbol: 'AMZN', name: 'Amazon', type: 'STOCK' },
  { symbol: 'NVDA', name: 'NVIDIA', type: 'STOCK' },
  { symbol: 'TSLA', name: 'Tesla', type: 'STOCK' },
  { symbol: 'META', name: 'Meta Platforms', type: 'STOCK' },
  { symbol: 'NFLX', name: 'Netflix', type: 'STOCK' },
  { symbol: 'AMD', name: 'AMD', type: 'STOCK' },
  { symbol: 'MSTR', name: 'MicroStrategy', type: 'STOCK' },
  { symbol: 'PLTR', name: 'Palantir', type: 'STOCK' },
  { symbol: 'COIN', name: 'Coinbase', type: 'STOCK' },
  
  // Commodities
  { symbol: 'GOLD', name: 'Gold', type: 'COMMODITY' },
  { symbol: 'SILVER', name: 'Silver', type: 'COMMODITY' },
  { symbol: 'OIL', name: 'Crude Oil', type: 'COMMODITY' },
  { symbol: 'NATGAS', name: 'Natural Gas', type: 'COMMODITY' },
];

interface AssetSelectorProps {
  value: { symbol: string; name: string; type: AssetType };
  onChange: (asset: Asset) => void;
  disabled?: boolean;
  placeholder?: string;
  filterTypes?: AssetType[];
  excludeSymbols?: string[]; // Exclude already-added assets
}

export const AssetSelector: React.FC<AssetSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder,
  filterTypes,
  excludeSymbols = [],
}) => {
  const { t, isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [apiResults, setApiResults] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Search API when user types (debounced)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (search.length < 2) {
      setApiResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Search CoinGecko for crypto (free, no key required)
        const cryptoResponse = await fetch(
          `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(search)}`
        );
        const cryptoData = await cryptoResponse.json();
        
        const cryptoResults: Asset[] = (cryptoData.coins || [])
          .slice(0, 10)
          .map((coin: any) => ({
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            type: 'CRYPTO' as AssetType,
          }));

        setApiResults(cryptoResults);
      } catch (error) {
        console.error('Asset search error:', error);
        setApiResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search]);

  // Filter popular assets based on search and type filter
  const filteredPopular = POPULAR_ASSETS.filter(asset => {
    if (excludeSymbols.includes(asset.symbol)) return false;
    if (filterTypes && !filterTypes.includes(asset.type)) return false;
    if (search) {
      const q = search.toLowerCase();
      return asset.symbol.toLowerCase().includes(q) || 
             asset.name.toLowerCase().includes(q);
    }
    return true;
  });

  // Combine popular + API results (deduplicated)
  const popularSymbols = new Set(filteredPopular.map(a => a.symbol));
  const combinedResults = [
    ...filteredPopular,
    ...apiResults.filter(a => !popularSymbols.has(a.symbol) && !excludeSymbols.includes(a.symbol)),
  ];

  const getTypeIcon = (type: AssetType) => {
    switch (type) {
      case 'CRYPTO': return <Bitcoin className="h-4 w-4 text-orange-500" />;
      case 'STOCK': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'COMMODITY': return <Gem className="h-4 w-4 text-amber-500" />;
    }
  };

  const getTypeBadge = (type: AssetType) => {
    const colors = {
      CRYPTO: 'bg-orange-500/20 text-orange-400',
      STOCK: 'bg-blue-500/20 text-blue-400',
      COMMODITY: 'bg-amber-500/20 text-amber-400',
    };
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[type]}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2.5
          bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 
          rounded-xl text-left transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-emerald-500/50 focus:border-emerald-500'}
          ${isOpen ? 'border-emerald-500 ring-2 ring-emerald-500/20' : ''}
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {value.symbol ? (
            <>
              {getTypeIcon(value.type)}
              <span className="font-medium">{value.symbol}</span>
              <span className="text-slate-500 dark:text-slate-400 truncate text-sm">
                {value.name}
              </span>
            </>
          ) : (
            <span className="text-slate-400">
              {placeholder || t('assetSelector.selectAsset')}
            </span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`
          absolute z-50 mt-2 w-full min-w-[300px]
          bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-white/10 
          rounded-xl shadow-xl overflow-hidden
          ${isRTL ? 'right-0' : 'left-0'}
        `}>
          {/* Search Input */}
          <div className="p-2 border-b border-slate-200 dark:border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('assetSelector.searchAssets')}
                className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-white/5 
                  border border-transparent rounded-lg text-sm
                  focus:outline-none focus:border-emerald-500/50"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 animate-spin" />
              )}
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-64 overflow-y-auto">
            {combinedResults.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-sm">
                {search ? t('assetSelector.noAssetsFound') : t('assetSelector.typeToSearch')}
              </div>
            ) : (
              <>
                {/* Show category headers when not searching */}
                {!search && (
                  <div className="px-3 py-2 text-xs font-medium text-slate-400 dark:text-slate-500 uppercase">
                    {t('assetSelector.popularAssets')}
                  </div>
                )}
                {combinedResults.map((asset) => (
                  <button
                    key={`${asset.type}-${asset.symbol}`}
                    type="button"
                    onClick={() => {
                      onChange(asset);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 
                      hover:bg-slate-100 dark:hover:bg-white/5 transition-colors
                      text-left"
                  >
                    {getTypeIcon(asset.type)}
                    <span className="font-medium">{asset.symbol}</span>
                    <span className="flex-1 text-slate-500 dark:text-slate-400 text-sm truncate">
                      {asset.name}
                    </span>
                    {getTypeBadge(asset.type)}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Footer hint */}
          {search.length >= 2 && apiResults.length > 0 && (
            <div className="p-2 border-t border-slate-200 dark:border-white/10 
              text-xs text-slate-400 text-center">
              {t('assetSelector.searchPoweredBy')} CoinGecko
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { POPULAR_ASSETS };
export type { Asset, AssetType };
