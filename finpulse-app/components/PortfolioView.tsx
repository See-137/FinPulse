
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import {
  Plus, Download, Upload, Lock, Search, Trash2, Pencil, ShieldCheck,
  TrendingUp, TrendingDown, Bitcoin, Activity, Gem, Eye, EyeOff,
  ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, CheckCircle, X,
  Share2, Link as LinkIcon
} from 'lucide-react';
import { User, Currency, Holding, AssetType, CombinedSignal } from '../types';
import { CURRENCY_RATES, SaaS_PLANS } from '../constants';
import { usePortfolioStore } from '../store/portfolioStore';
import { useMarketData, fetchCoinGeckoPrices } from '../hooks/useMarketData';
import { useWebSocketPrices } from '../hooks/useWebSocketPrices';
import { cacheService } from '../services/cacheService';
import { useDebounce } from '../hooks/useDebounce';
import { AssetSelector } from './AssetSelector';
import { PremiumAnalytics } from './PremiumAnalytics';
import { SignalCard } from './SignalCard';
import { DataFreshnessIndicator, getDataFreshnessStatus } from './DataFreshnessIndicator';
import signalService from '../services/signalService';
import { useToast } from './Toast';
import { UpgradeModal } from './UpgradeModal';
import { LockedFeaturePreview } from './LockedFeaturePreview';
import { useLanguage } from '../i18n';
import { PlanType } from '../types';

interface PortfolioViewProps {
  user: User;
  onUpdateUser: (user: User) => void;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  onUpgradeClick?: () => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({ user, onUpdateUser, currency, onCurrencyChange, onUpgradeClick }) => {
  const { showToast } = useToast();
  const { t } = useLanguage();

  // Upgrade modal state
  const [upgradeModal, setUpgradeModal] = useState<{
    featureName: string;
    featureDescription: string;
    requiredPlan: PlanType;
  } | null>(null);

  // Share modal state
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Use Zustand store for shared state (including holdings for news filtering)
  const {
    isPrivate, search, filterType, getHoldings,
    setIsPrivate, setSearch, setFilterType, addHolding, updateHolding, removeHolding,
    isSyncing
  } = usePortfolioStore();
  
  // Get user-scoped holdings
  const holdings = getHoldings();

  // Extract all unique symbols from holdings for dynamic price fetching
  const holdingSymbols = useMemo(() => 
    holdings.map(h => h.symbol),
    [holdings]
  );

  // Fetch real-time market prices (REST API) - dynamically based on user's holdings
  const { prices: marketPrices } = useMarketData({
    symbols: holdingSymbols,
    refreshInterval: 30000,
    fetchNews: false,  // News is fetched separately by NewsSidebar
    fetchFx: true,
  });
  
  // Real-time WebSocket prices for crypto - subscribes to user's actual crypto holdings
  const cryptoSymbols = useMemo(() =>
    holdings.filter(h => h.type === 'CRYPTO').map(h => h.symbol),
    [holdings]
  );
  const { prices: wsPrices, isConnected: wsConnected } = useWebSocketPrices({
    symbols: cryptoSymbols, // Only subscribe to user's actual crypto holdings
    enabled: cryptoSymbols.length > 0, // Disable if no crypto in portfolio
  });

  // Additional CoinGecko prices for non-Binance cryptos
  const [coinGeckoPrices, setCoinGeckoPrices] = useState<Record<string, { price: number; change24h: number }>>({});

  // Track last price update timestamp for freshness indicator
  const [lastPriceUpdate, setLastPriceUpdate] = useState<number | null>(null);
  
  // Stable key for cryptoSymbols to avoid complex dependency expression
  const cryptoSymbolsKey = useMemo(() => cryptoSymbols.join(','), [cryptoSymbols]);

  // Fetch CoinGecko prices for all cryptos (with caching to reduce API calls)
  useEffect(() => {
    if (cryptoSymbols.length === 0) return;

    const fetchPrices = async () => {
      const cacheKey = `coingecko:${cryptoSymbolsKey}`;

      // Try cache first (2 minute TTL)
      const cached = await cacheService.get<Record<string, { price: number; change24h: number }>>(cacheKey);
      if (cached) {
        setCoinGeckoPrices(cached);
        setLastPriceUpdate(Date.now());
        return;
      }

      // Fetch fresh data and cache it
      const prices = await fetchCoinGeckoPrices(cryptoSymbols);
      if (Object.keys(prices).length > 0) {
        await cacheService.set(cacheKey, prices, 120); // 2 minute TTL
        setLastPriceUpdate(Date.now());
      }
      setCoinGeckoPrices(prices);
    };

    fetchPrices();
    // Refresh every 60 seconds (cache will prevent unnecessary API calls)
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, [cryptoSymbols, cryptoSymbolsKey]);

  // Update last price time when WebSocket prices update
  useEffect(() => {
    if (wsPrices.size > 0) {
      setLastPriceUpdate(Date.now());
    }
  }, [wsPrices]);

  // Determine data freshness status
  const dataFreshnessStatus = useMemo(() => {
    const hasCrypto = cryptoSymbols.length > 0;
    const hasData = wsPrices.size > 0 || Object.keys(coinGeckoPrices).length > 0 || Object.keys(marketPrices || {}).length > 0;

    // If no holdings, show demo
    if (holdings.length === 0) return 'demo';

    // If WebSocket connected and has data, show live
    if (hasCrypto && wsConnected && wsPrices.size > 0) return 'live';

    // If we have price data but no WebSocket, check freshness
    if (hasData) {
      return getDataFreshnessStatus(lastPriceUpdate, 300); // 5 min stale threshold
    }

    return 'loading';
  }, [cryptoSymbols.length, wsConnected, wsPrices.size, coinGeckoPrices, marketPrices, holdings.length, lastPriceUpdate]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Holding | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [deleteConfirmSymbol, setDeleteConfirmSymbol] = useState<string | null>(null);

  // CSV Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Holding[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    type: 'STOCK' as AssetType,
    quantity: '',
    avgCost: ''
  });

  // Live signals state (fetched asynchronously from APIs)
  const [signals, setSignals] = useState<Record<string, CombinedSignal>>({});
  
  const [selectedAsset, setSelectedAsset] = useState<{ symbol: string; name: string; type: AssetType }>(
    { symbol: '', name: '', type: 'STOCK' }
  );

  // Use refs to avoid stale closures while preventing unnecessary re-renders
  const userRef = useRef(user);
  const onUpdateUserRef = useRef(onUpdateUser);
  
  // Update refs on every render to avoid stale closures
  useEffect(() => {
    userRef.current = user;
    onUpdateUserRef.current = onUpdateUser;
  }, [user, onUpdateUser]);

  const rate = CURRENCY_RATES[currency];
  const currencySymbol = currency === 'USD' ? '$' : '₪';

  useEffect(() => {
    // Only update user credits when holdings count changes
    const currentUser = userRef.current;
    const updateUser = onUpdateUserRef.current;
    if (currentUser.credits.assets !== holdings.length) {
      updateUser({ ...currentUser, credits: { ...currentUser.credits, assets: holdings.length } });
    }
  }, [holdings.length]);

  const handleAddOrUpdateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check asset limit
    if (!editingAsset && holdings.length >= user.credits.maxAssets) {
      setUpgradeModal({
        featureName: t('upgrade.assetLimit'),
        featureDescription: t('upgrade.assetLimitDesc'),
        requiredPlan: 'PROPULSE',
      });
      return;
    }

    // Check commodity restriction for Free users
    const planConfig = SaaS_PLANS[user.plan];
    if (formData.type === 'COMMODITY' && !planConfig.allowCommodities) {
      setUpgradeModal({
        featureName: t('upgrade.commoditiesLocked'),
        featureDescription: t('upgrade.commoditiesLockedDesc'),
        requiredPlan: 'PROPULSE',
      });
      return;
    }

    const newAsset: Holding = {
      symbol: formData.symbol.toUpperCase().trim(),
      name: formData.name.trim() || formData.symbol.toUpperCase(),
      type: formData.type,
      quantity: parseFloat(formData.quantity),
      avgCost: parseFloat(formData.avgCost) || 0,
      currentPrice: parseFloat(formData.avgCost) || 0,
      dayPL: 0 
    };

    if (editingAsset) {
      updateHolding(editingAsset.symbol, newAsset);
    } else {
      addHolding(newAsset);
    }

    setIsAddModalOpen(false);
    setEditingAsset(null);
    setFormData({ symbol: '', name: '', type: 'STOCK', quantity: '', avgCost: '' });
    setSelectedAsset({ symbol: '', name: '', type: 'STOCK' });
  };

  const handleDelete = (symbol: string) => {
    setDeleteConfirmSymbol(symbol);
  };

  const confirmDelete = () => {
    if (deleteConfirmSymbol) {
      removeHolding(deleteConfirmSymbol);
      setDeleteConfirmSymbol(null);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const exportCSV = () => {
    if (user.plan === 'FREE') return; 
    
    try {
      const headers = ['Asset Name', 'Symbol', 'Type', 'Quantity', 'Market Price', 'Total Value', '24h Gain/Loss %'];
      const csvContent = [
        headers.join(','),
        ...holdings.map(h => [
          `"${h.name}"`,
          h.symbol,
          h.type,
          h.quantity,
          h.currentPrice,
          (h.quantity * h.currentPrice).toFixed(2),
          h.dayPL.toFixed(2)
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'finpulse_holdings.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Clean up the URL object after sufficient delay to ensure download initiates
        // Using 1 second to be safe across different browsers
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      // Export failed
      showToast(t('toast.exportFailed'), 'error');
    }
  };

  // CSV Import functionality
  const parseCSV = (text: string): { holdings: Holding[]; errors: string[] } => {
    const lines = text.trim().split('\n');
    const errors: string[] = [];
    const parsedHoldings: Holding[] = [];
    
    if (lines.length < 2) {
      return { holdings: [], errors: ['CSV file is empty or has no data rows'] };
    }

    // Parse header to determine column mapping
    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Flexible column mapping - support multiple header variations
    const symbolIndex = headers.findIndex(h => ['symbol', 'ticker', 'asset'].includes(h));
    const nameIndex = headers.findIndex(h => ['name', 'asset name', 'asset_name'].includes(h));
    const typeIndex = headers.findIndex(h => ['type', 'asset type', 'asset_type', 'category'].includes(h));
    const quantityIndex = headers.findIndex(h => ['quantity', 'qty', 'amount', 'shares', 'units'].includes(h));
    const avgCostIndex = headers.findIndex(h => ['avg cost', 'avgcost', 'avg_cost', 'average cost', 'cost basis', 'cost', 'price'].includes(h));

    if (symbolIndex === -1) {
      return { holdings: [], errors: ['Missing required column: Symbol (or Ticker)'] };
    }
    if (quantityIndex === -1) {
      return { holdings: [], errors: ['Missing required column: Quantity (or Qty, Shares, Units)'] };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quoted values with commas inside
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const symbol = values[symbolIndex]?.replace(/"/g, '').toUpperCase();
      const name = nameIndex !== -1 ? values[nameIndex]?.replace(/"/g, '') : symbol;
      const typeRaw = typeIndex !== -1 ? values[typeIndex]?.replace(/"/g, '').toUpperCase() : 'STOCK';
      const quantity = parseFloat(values[quantityIndex]?.replace(/"/g, '') || '0');
      const avgCost = avgCostIndex !== -1 ? parseFloat(values[avgCostIndex]?.replace(/"/g, '') || '0') : 0;

      // Validate
      if (!symbol) {
        errors.push(`Row ${i + 1}: Missing symbol`);
        continue;
      }
      if (isNaN(quantity) || quantity <= 0) {
        errors.push(`Row ${i + 1}: Invalid quantity for ${symbol}`);
        continue;
      }

      // Determine type
      let type: AssetType = 'STOCK';
      if (['CRYPTO', 'CRYPTOCURRENCY'].includes(typeRaw)) {
        type = 'CRYPTO';
      } else if (['COMMODITY', 'COMMODITIES'].includes(typeRaw)) {
        type = 'COMMODITY';
      } else if (['STOCK', 'STOCKS', 'EQUITY'].includes(typeRaw)) {
        type = 'STOCK';
      }

      // Check for duplicates
      const existingInList = parsedHoldings.find(h => h.symbol === symbol);
      const existingInPortfolio = holdings.find(h => h.symbol === symbol);
      
      if (existingInList) {
        errors.push(`Row ${i + 1}: Duplicate symbol ${symbol} in import file`);
        continue;
      }
      if (existingInPortfolio) {
        errors.push(`Row ${i + 1}: ${symbol} already exists in portfolio (will skip)`);
        continue;
      }

      parsedHoldings.push({
        symbol,
        name: name || symbol,
        type,
        quantity,
        avgCost: avgCost || 0,
        currentPrice: 0,  // Real value fetched via getMarketPrice() on render
        dayPL: 0  // Real value fetched via getMarketChange() on render
      });
    }

    return { holdings: parsedHoldings, errors };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setImportErrors(['Please select a CSV file']);
      return;
    }

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { holdings: parsed, errors } = parseCSV(text);
      setImportPreview(parsed);
      setImportErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    // Check asset limit
    const remainingSlots = user.credits.maxAssets - holdings.length;
    const planConfig = SaaS_PLANS[user.plan];
    
    let imported = 0;
    const skipped: string[] = [];

    for (const holding of importPreview) {
      if (imported >= remainingSlots) {
        skipped.push(`${holding.symbol} (limit reached)`);
        continue;
      }
      if (holding.type === 'COMMODITY' && !planConfig.allowCommodities) {
        skipped.push(`${holding.symbol} (commodities require ProPulse)`);
        continue;
      }
      
      await addHolding(holding);
      imported++;
    }

    // Close modal and show result
    setIsImportModalOpen(false);
    setImportPreview([]);
    setImportErrors([]);
    setImportFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (skipped.length > 0) {
      showToast(`Imported ${imported} assets. Skipped: ${skipped.join(', ')}`, 'info', 6000);
    } else {
      showToast(`Successfully imported ${imported} assets!`, 'success');
    }
  };

  // Helper to get real-time market price for an asset
  // Priority: WebSocket (Binance) -> CoinGecko -> REST API -> holding's stored price
  const getMarketPrice = useCallback((symbol: string, fallbackPrice: number): number => {
    const upperSymbol = symbol.toUpperCase();

    // First try WebSocket data (most real-time for Binance-listed crypto)
    const wsPrice = wsPrices.get(upperSymbol);
    if (wsPrice?.price) {
      return wsPrice.price;
    }

    // Then try CoinGecko (for non-Binance cryptos like DN, LAVA, ICP)
    if (coinGeckoPrices[upperSymbol]?.price) {
      return coinGeckoPrices[upperSymbol].price;
    }

    // Then try REST API data (works for all asset types)
    if (marketPrices?.[upperSymbol]?.price) {
      return marketPrices[upperSymbol].price;
    }
    if (marketPrices?.[symbol]?.price) {
      return marketPrices[symbol].price;
    }

    // Fall back to holding's stored price (last known price)
    return fallbackPrice;
  }, [wsPrices, coinGeckoPrices, marketPrices]);

  // Helper to get 24h change from market data
  // Priority: WebSocket -> CoinGecko -> REST API -> holding's stored change
  const getMarketChange = useCallback((symbol: string, fallbackChange: number): number => {
    const upperSymbol = symbol.toUpperCase();

    // First try WebSocket data (real-time for Binance crypto)
    const wsPrice = wsPrices.get(upperSymbol);
    if (wsPrice?.change24h !== undefined) {
      return wsPrice.change24h;
    }

    // Then try CoinGecko (for non-Binance cryptos)
    if (coinGeckoPrices[upperSymbol]?.change24h !== undefined) {
      return coinGeckoPrices[upperSymbol].change24h;
    }

    // Then try REST API data
    if (marketPrices?.[upperSymbol]?.change24h !== undefined) {
      return marketPrices[upperSymbol].change24h;
    }
    if (marketPrices?.[symbol]?.change24h !== undefined) {
      return marketPrices[symbol].change24h;
    }
    return fallbackChange;
  }, [wsPrices, coinGeckoPrices, marketPrices]);

  // Calculate total value using real market prices
  const totalValue = holdings.reduce((sum, h) => {
    const price = getMarketPrice(h.symbol, h.currentPrice);
    return sum + h.quantity * price;
  }, 0);

  // Calculate 24h portfolio change (weighted by asset value)
  const portfolio24hChange = useMemo(() => {
    let totalCurrentValue = 0;
    let totalPreviousValue = 0;

    holdings.forEach(h => {
      const currentPrice = getMarketPrice(h.symbol, h.currentPrice);
      const change24hPercent = getMarketChange(h.symbol, h.dayPL);
      const assetCurrentValue = h.quantity * currentPrice;
      // Calculate previous value: currentValue / (1 + change%)
      const assetPreviousValue = assetCurrentValue / (1 + change24hPercent / 100);

      totalCurrentValue += assetCurrentValue;
      totalPreviousValue += assetPreviousValue;
    });

    const dollarChange = totalCurrentValue - totalPreviousValue;
    const percentChange = totalPreviousValue > 0
      ? ((totalCurrentValue - totalPreviousValue) / totalPreviousValue) * 100
      : 0;

    return { dollarChange, percentChange };
  }, [holdings, getMarketPrice, getMarketChange]);
  
  // Memoized allocation data for pie chart - prevents recalculation on every render
  const data = useMemo(() => [
    { name: 'Crypto', type: 'CRYPTO', value: holdings.filter(h => h.type === 'CRYPTO').reduce((sum, h) => sum + h.quantity * getMarketPrice(h.symbol, h.currentPrice), 0), color: '#00e5ff' },
    { name: 'Stocks', type: 'STOCK', value: holdings.filter(h => h.type === 'STOCK').reduce((sum, h) => sum + h.quantity * getMarketPrice(h.symbol, h.currentPrice), 0), color: '#3b82f6' },
    { name: 'Commodities', type: 'COMMODITY', value: holdings.filter(h => h.type === 'COMMODITY').reduce((sum, h) => sum + h.quantity * getMarketPrice(h.symbol, h.currentPrice), 0), color: '#fbbf24' },
  ].filter(d => d.value > 0), [holdings, getMarketPrice]);

  // Debounced search for better performance with large portfolios
  const debouncedSearch = useDebounce(search, 300);
  
  // Optimized filtering with debounced search
  const filteredHoldings = useMemo(() => {
    return holdings.filter(h => {
      const matchesSearch = h.symbol.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                            h.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesType = filterType ? h.type === filterType : true;
      return matchesSearch && matchesType;
    });
  }, [holdings, debouncedSearch, filterType]);

  const sortedHoldings = useMemo(() => {
    const sortableItems = [...filteredHoldings];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: number;
        let bValue: number;

        // Handle special computed columns
        switch (sortConfig.key) {
          case 'value':
            aValue = a.quantity * getMarketPrice(a.symbol, a.avgCost);
            bValue = b.quantity * getMarketPrice(b.symbol, b.avgCost);
            break;
          case 'marketPrice':
            aValue = getMarketPrice(a.symbol, a.avgCost);
            bValue = getMarketPrice(b.symbol, b.avgCost);
            break;
          case 'dayPL':
            // Use actual market change for sorting (handles negatives correctly)
            aValue = getMarketChange(a.symbol, a.dayPL);
            bValue = getMarketChange(b.symbol, b.dayPL);
            break;
          case 'totalReturnDollar':
            aValue = a.quantity * (getMarketPrice(a.symbol, a.avgCost) - a.avgCost);
            bValue = b.quantity * (getMarketPrice(b.symbol, b.avgCost) - b.avgCost);
            break;
          case 'totalReturnPercent':
            aValue = a.avgCost > 0 ? (getMarketPrice(a.symbol, a.avgCost) - a.avgCost) / a.avgCost : 0;
            bValue = b.avgCost > 0 ? (getMarketPrice(b.symbol, b.avgCost) - b.avgCost) / b.avgCost : 0;
            break;
          default:
            // For other columns, get value from holding object
            aValue = a[sortConfig.key as keyof Holding] as number;
            bValue = b[sortConfig.key as keyof Holding] as number;
        }

        // Numeric comparison (properly handles negative values)
        const diff = aValue - bValue;
        if (diff < 0) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (diff > 0) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredHoldings, sortConfig, getMarketPrice, getMarketChange]);

  // Fetch live signals from APIs (whale, technical, sentiment)
  // Stable key for holdings to prevent excessive re-fetches
  const holdingsSymbolsKey = useMemo(() => holdings.map(h => h.symbol).sort().join(','), [holdings]);

  useEffect(() => {
    const symbols = holdings.map(h => h.symbol);
    if (symbols.length === 0) {
      setSignals({});
      return;
    }

    let isCancelled = false;

    const fetchSignals = async () => {
      try {
        const signalMap = await signalService.generateLiveSignalsBatch(symbols);
        if (!isCancelled) {
          // Convert Map to Record
          const signalRecord: Record<string, CombinedSignal> = {};
          signalMap.forEach((signal, symbol) => {
            signalRecord[symbol] = signal;
          });
          setSignals(signalRecord);
        }
      } catch (error) {
        console.error('Failed to fetch live signals:', error);
        // On error, keep existing signals or set empty
        if (!isCancelled) {
          setSignals({});
        }
      }
    };

    fetchSignals();

    // Refresh signals every 5 minutes
    const interval = setInterval(fetchSignals, 5 * 60 * 1000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [holdings, holdingsSymbolsKey]); // Re-fetch when holdings change

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#00e5ff]" /> : <ArrowDown className="w-3 h-3 text-[#00e5ff]" />;
  };

  const currentTime = new Date();
  const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6 sm:space-y-10 pb-24 w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-[#00e5ff]" />
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#00e5ff]">
              {user.plan} Pulse Node
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter dark:text-white text-slate-900">PulseBoard</h1>
          <div className="mt-2 flex items-center gap-4">
             <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase">Usage</span>
                <div className="flex items-center gap-2">
                   <div className="h-1.5 w-24 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${user.credits.maxAssets < 9999 && holdings.length / user.credits.maxAssets > 0.8 ? 'bg-rose-500' : 'bg-cyan-500'}`}
                        style={{ width: user.credits.maxAssets >= 9999 ? '0%' : `${(holdings.length / user.credits.maxAssets) * 100}%` }}
                      />
                   </div>
                   <span className="text-[10px] font-bold text-slate-400">{holdings.length} / {user.credits.maxAssets >= 9999 ? '∞' : user.credits.maxAssets}</span>
                </div>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          {/* Currency Toggle */}
          <div className="flex bg-slate-100 dark:bg-[#151921] p-1 rounded-xl border border-slate-200 dark:border-white/5 mr-2">
            {(['USD', 'ILS'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => onCurrencyChange(c)}
                aria-label={`Switch to ${c} currency`}
                className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
                  currency === c 
                    ? 'bg-white dark:bg-white/10 text-black dark:text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (user.plan === 'FREE') {
                setUpgradeModal({ featureName: t('upgrade.csvExport'), featureDescription: t('upgrade.csvExportDesc'), requiredPlan: 'PROPULSE' });
                return;
              }
              exportCSV();
            }}
            aria-label={user.plan === 'FREE' ? t('upgrade.csvExport') : 'Export portfolio to CSV'}
            className={`p-3 sm:p-4 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center gap-3 transition-all ${user.plan === 'FREE' ? 'opacity-50 text-slate-600 hover:opacity-70 hover:border-[#00e5ff]/30 cursor-pointer' : 'text-slate-400 hover:text-[#00e5ff] hover:border-[#00e5ff]/30'}`}
          >
            {user.plan === 'FREE' ? <Lock className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Export {user.plan === 'FREE' && '(ProPulse)'}</span>
          </button>
          <button
            onClick={() => {
              if (user.plan === 'FREE') {
                setUpgradeModal({ featureName: t('upgrade.csvImport'), featureDescription: t('upgrade.csvImportDesc'), requiredPlan: 'PROPULSE' });
                return;
              }
              setIsImportModalOpen(true);
            }}
            aria-label={user.plan === 'FREE' ? t('upgrade.csvImport') : 'Import portfolio from CSV'}
            className={`p-3 sm:p-4 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center gap-3 transition-all ${user.plan === 'FREE' ? 'opacity-50 text-slate-600 hover:opacity-70 hover:border-emerald-400/30 cursor-pointer' : 'text-slate-400 hover:text-emerald-400 hover:border-emerald-400/30'}`}
          >
            {user.plan === 'FREE' ? <Lock className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Import {user.plan === 'FREE' && '(ProPulse)'}</span>
          </button>
          <button
            onClick={() => setIsShareOpen(true)}
            aria-label={t('share.button')}
            className="p-3 sm:p-4 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center gap-3 text-slate-400 hover:text-emerald-400 hover:border-emerald-400/30 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{t('share.button')}</span>
          </button>
          <button
            onClick={() => {
              setEditingAsset(null);
              setFormData({ symbol: '', name: '', type: 'STOCK', quantity: '', avgCost: '' });
              setIsAddModalOpen(true);
            }}
            aria-label="Add new asset to portfolio"
            className="flex items-center gap-3 px-8 py-4 bg-[#00e5ff] text-[#0b0e14] font-black uppercase tracking-widest text-[11px] rounded-[24px] shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-all"
          >
            <Plus className="w-5 h-5" /> Capture Asset
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           {/* Controls */}
           <div className="card-surface p-3 rounded-[28px] flex flex-col sm:flex-row items-center gap-3 bg-white/[0.01]">
              {/* Asset Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
                {['ALL', 'CRYPTO', 'STOCK', 'COMMODITY'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type === 'ALL' ? null : type)}
                    aria-label={`Filter by ${type.toLowerCase()} assets`}
                    className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap flex-1 sm:flex-none ${
                      (filterType === type) || (type === 'ALL' && filterType === null)
                        ? 'bg-[#00e5ff] text-[#0b0e14] shadow-sm'
                        : 'text-slate-500 hover:text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="flex-1 w-full relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#00e5ff] transition-colors" />
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by symbol..." 
                  className="w-full bg-slate-50 dark:bg-[#0b0e14] border border-slate-200 dark:border-white/5 rounded-xl pl-12 pr-6 py-3 text-xs font-bold outline-none focus:ring-1 focus:ring-[#00e5ff]/50 transition-all dark:text-white"
                />
              </div>
              
              <button 
                onClick={() => setIsPrivate(!isPrivate)}
                aria-label={isPrivate ? 'Show portfolio values' : 'Hide portfolio values'}
                className={`p-3 rounded-xl border transition-all ${isPrivate ? 'bg-[#00e5ff]/10 border-[#00e5ff]/50 text-[#00e5ff]' : 'bg-slate-50 dark:bg-[#0b0e14] border-slate-200 dark:border-white/5 text-slate-500'}`}
              >
                {isPrivate ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
           </div>

           {/* Holdings Table */}
           <div className="space-y-4">
              {isSyncing ? (
                <div className="card-surface p-12 rounded-[40px] text-center border border-slate-200 dark:border-white/5">
                  <div className="w-8 h-8 mx-auto mb-4 border-2 border-[#00e5ff]/20 border-t-[#00e5ff] rounded-full animate-spin" />
                  <p className="text-slate-500 font-medium text-sm">Syncing your portfolio...</p>
                </div>
              ) : holdings.length === 0 ? (
                <div className="card-surface p-12 rounded-[40px] text-center border-2 border-dashed border-[#00e5ff]/20 dark:border-[#00e5ff]/10">
                  {/* Heartbeat SVG — flatline that implies "add assets to bring it to life" */}
                  <div className="w-64 h-16 mx-auto mb-6">
                    <svg viewBox="0 0 260 60" className="w-full h-full" fill="none">
                      <line x1="0" y1="30" x2="260" y2="30" stroke="currentColor" strokeWidth="1" className="text-slate-300 dark:text-slate-700" />
                      <polyline
                        points="0,30 40,30 55,30 65,8 75,52 85,20 95,38 105,30 140,30 155,30 165,8 175,52 185,20 195,38 205,30 260,30"
                        stroke="#00e5ff"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-draw-pulse"
                        style={{ filter: 'drop-shadow(0 0 6px rgba(0, 229, 255, 0.3))' }}
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black dark:text-white mb-2">{t('emptyPortfolio.title')}</h3>
                  <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">{t('emptyPortfolio.description')}</p>
                  <button
                    onClick={() => {
                      setEditingAsset(null);
                      setFormData({ symbol: '', name: '', type: 'STOCK', quantity: '', avgCost: '' });
                      setIsAddModalOpen(true);
                    }}
                    className="inline-flex items-center gap-3 px-10 py-5 bg-[#00e5ff] text-[#0b0e14] font-black uppercase tracking-widest text-[11px] rounded-[24px] shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-all"
                  >
                    <Plus className="w-5 h-5" /> {t('emptyPortfolio.cta')}
                  </button>
                </div>
              ) : filteredHoldings.length === 0 ? (
                <div className="card-surface p-12 rounded-[40px] text-center border-dashed border-slate-300 dark:border-white/10">
                  <p className="text-slate-500 font-medium text-sm">{t('emptyPortfolio.noFilterMatch')}</p>
                </div>
              ) : (
                <div className="card-surface rounded-[24px] overflow-hidden border border-slate-200 dark:border-white/5">
                  <div className="overflow-x-auto">
                  <table className="w-full text-left" style={{ minWidth: '700px' }}>
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                          {[
                            { label: 'Asset', key: 'name', minWidth: '120px' },
                            { label: 'Cost', key: 'avgCost', minWidth: '70px' },
                            { label: 'Price', key: 'marketPrice', minWidth: '70px' },
                            { label: 'Qty', key: 'quantity', minWidth: '50px' },
                            { label: 'Value', key: 'value', minWidth: '70px' },
                            { label: 'P/L $', key: 'totalReturnDollar', minWidth: '70px' },
                            { label: 'P/L %', key: 'totalReturnPercent', minWidth: '55px' },
                            { label: '24h', key: 'dayPL', minWidth: '55px' },
                            { label: 'Signal', key: 'signal', minWidth: '80px' }
                          ].map((header) => (
                            <th
                              key={header.key}
                              onClick={() => header.key !== 'signal' && handleSort(header.key)}
                              style={{ minWidth: header.minWidth }}
                              className={`px-3 py-3 text-[8px] font-black uppercase text-slate-500 tracking-wider whitespace-nowrap ${header.key !== 'signal' ? 'cursor-pointer hover:text-[#00e5ff] transition-colors' : ''}`}
                            >
                              <div className="flex items-center gap-1">
                                {header.label}
                                {header.key !== 'signal' && renderSortIcon(header.key)}
                              </div>
                            </th>
                          ))}
                          <th className="px-3 py-3 text-[8px] font-black uppercase text-slate-500 tracking-wider text-right w-[8%]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedHoldings.map((asset, idx) => {
                          const livePrice = getMarketPrice(asset.symbol, asset.avgCost);
                          const liveChange = getMarketChange(asset.symbol, asset.dayPL);
                          const totalAssetValue = asset.quantity * livePrice;
                          const profitLoss = asset.avgCost > 0 ? ((livePrice - asset.avgCost) / asset.avgCost) * 100 : 0;

                          // Total Return calculations
                          const totalReturnDollar = (livePrice - asset.avgCost) * asset.quantity;
                          const totalReturnPercent = asset.avgCost > 0
                            ? ((livePrice - asset.avgCost) / asset.avgCost) * 100
                            : 0;

                          return (
                          <tr key={idx} className="border-b border-slate-200 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${asset.type === 'CRYPTO' ? 'bg-orange-500/10 text-orange-500' : asset.type === 'STOCK' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                  {asset.type === 'CRYPTO' ? <Bitcoin className="w-4 h-4" /> : asset.type === 'STOCK' ? <Activity className="w-4 h-4" /> : <Gem className="w-4 h-4" />}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-black text-xs dark:text-white block truncate">{asset.symbol}</span>
                                  <p className="text-[10px] font-medium text-slate-500 truncate">{asset.name}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 font-medium text-xs text-slate-400">
                              {currencySymbol}{(asset.avgCost * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-xs dark:text-white">
                                  {currencySymbol}{(livePrice * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                {asset.avgCost > 0 && livePrice !== asset.avgCost && (
                                  <span className={`text-[9px] font-bold ${profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 font-bold text-xs dark:text-white">
                              {isPrivate ? '••••' : asset.quantity.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 font-bold text-xs dark:text-white">
                              {isPrivate ? '••••' : `${currencySymbol}${(totalAssetValue * rate).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                            </td>
                            <td className="px-3 py-3">
                              <span className={`font-bold text-xs ${totalReturnDollar >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isPrivate ? '••••' : `${totalReturnDollar >= 0 ? '+' : ''}${currencySymbol}${(Math.abs(totalReturnDollar) * rate).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className={`font-bold text-xs ${totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {totalReturnPercent >= 0 ? '+' : ''}{totalReturnPercent.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className={`font-bold text-xs ${liveChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {liveChange >= 0 ? '+' : ''}{liveChange.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center">
                                {signals[asset.symbol] && (
                                  <SignalCard
                                    signal={signals[asset.symbol]}
                                    compact={true}
                                    showComponents={false}
                                  />
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { 
                                  setEditingAsset(asset); 
                                  setFormData({...asset, type: asset.type, quantity: asset.quantity.toString(), avgCost: asset.avgCost.toString()}); 
                                  setSelectedAsset({ symbol: asset.symbol, name: asset.name, type: asset.type });
                                  setIsAddModalOpen(true); 
                                }} aria-label={`Edit ${asset.symbol}`} className="p-1.5 hover:bg-blue-500/10 text-slate-400 hover:text-blue-500 rounded-lg">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDelete(asset.symbol)} aria-label={`Delete ${asset.symbol}`} className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
           </div>
        </div>

        {/* Analytics Side */}
        <div className="space-y-6">
           {/* 24h Portfolio Performance Hero Card */}
           <div className="card-surface p-8 rounded-[40px] bg-gradient-to-br from-slate-50 to-white dark:from-[#151921] dark:to-[#0b0e14]">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-4">Portfolio Value</h3>
              <div className="text-center">
                 <p className="text-4xl font-black dark:text-white mb-3">
                   {isPrivate ? '••••••' : `${currencySymbol}${(totalValue * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                 </p>
                 <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl ${
                   portfolio24hChange.percentChange >= 0 
                     ? 'bg-green-500/10 text-green-500' 
                     : 'bg-red-500/10 text-red-500'
                 }`}>
                   {portfolio24hChange.percentChange >= 0 ? (
                     <TrendingUp className="w-5 h-5" />
                   ) : (
                     <TrendingDown className="w-5 h-5" />
                   )}
                   <span className="text-lg font-black">
                     {isPrivate ? '••••' : (
                       <>
                         {portfolio24hChange.percentChange >= 0 ? '+' : ''}
                         {currencySymbol}{(Math.abs(portfolio24hChange.dollarChange) * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         {' '}
                         ({portfolio24hChange.percentChange >= 0 ? '+' : ''}{portfolio24hChange.percentChange.toFixed(2)}%)
                       </>
                     )}
                   </span>
                   <span className="text-xs opacity-70">24h</span>
                 </div>
              </div>
           </div>

           <div className="card-surface p-8 rounded-[40px] bg-gradient-to-br from-slate-50 to-white dark:from-[#151921] dark:to-[#0b0e14]">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-8">Allocation</h3>
              {data.length > 0 && totalValue > 0 ? (
                <>
                  <div className="relative flex items-center justify-center" style={{ minHeight: '200px' }}>
                     <PieChart width={180} height={180}>
                        <Pie
                         data={data}
                         cx={90}
                         cy={90}
                         innerRadius={55}
                         outerRadius={75}
                         paddingAngle={5}
                         dataKey="value"
                         stroke="none"
                         onClick={(entry) => setFilterType(filterType === entry.type ? null : entry.type)}
                         className="cursor-pointer outline-none"
                        >
                           {data.map((entry, index) => (
                              <Cell
                                 key={`cell-${index}`}
                                 fill={entry.color}
                                 opacity={filterType && filterType !== entry.type ? 0.3 : 1}
                              />
                           ))}
                        </Pie>
                     </PieChart>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <p className="text-xs font-black text-slate-400 uppercase">Total</p>
                        <p className="text-lg font-black dark:text-white">
                          {isPrivate ? '••••' : `${currencySymbol}${(totalValue * rate / 1000).toFixed(1)}k`}
                        </p>
                     </div>
                  </div>
                  <div className="space-y-3 mt-4">
                     {data.map(d => (
                        <div
                          key={d.name}
                          onClick={() => setFilterType(filterType === d.type ? null : d.type)}
                          className={`flex justify-between items-center text-xs cursor-pointer p-2 rounded-lg transition-colors ${filterType === d.type ? 'bg-white/5' : 'hover:bg-white/5'}`}
                        >
                           <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                              <span className="font-bold text-slate-600 dark:text-slate-400">{d.name}</span>
                           </div>
                           <span className="font-black dark:text-white">{((d.value / totalValue) * 100).toFixed(1)}%</span>
                        </div>
                     ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] w-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#00e5ff]/10 flex items-center justify-center border border-[#00e5ff]/20">
                      <Plus className="w-8 h-8 text-[#00e5ff]" />
                    </div>
                    <p className="text-sm font-bold dark:text-white mb-1">{t('emptyPortfolio.allocationTitle')}</p>
                    <p className="text-xs text-slate-400">{t('emptyPortfolio.allocationDesc')}</p>
                  </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5 space-y-3">
                 <div className="flex justify-center">
                   <DataFreshnessIndicator
                     status={dataFreshnessStatus}
                     lastUpdated={lastPriceUpdate}
                     showTimestamp={true}
                   />
                 </div>
                 <p className="text-[9px] font-bold text-slate-500 text-center">FX as of {timeString} UTC</p>
              </div>
           </div>
        </div>
      </div>

      {/* Premium Analytics Section */}
      {holdings.length > 0 && (
        <div className="mt-8">
          <LockedFeaturePreview
            title={t('upgrade.premiumAnalytics')}
            description={t('upgrade.premiumAnalyticsDesc')}
            unlockPlan="SUPERPULSE"
            currentPlan={user.plan}
            onUpgrade={onUpgradeClick}
            variant="blur"
            showPreview={true}
          >
            <PremiumAnalytics
              holdings={holdings.map(h => ({
                symbol: h.symbol,
                name: h.name,
                type: h.type,
                quantity: h.quantity,
                avgCost: h.avgCost,
                currentPrice: getMarketPrice(h.symbol, h.avgCost),
                dayPL: getMarketChange(h.symbol, h.dayPL),
                addedAt: h.addedAt,
              }))}
              user={user}
              onUpgradeClick={onUpgradeClick || (() => {})}
              currency={currency}
              currencySymbol={currencySymbol}
              exchangeRate={rate}
              isPrivate={isPrivate}
            />
          </LockedFeaturePreview>
        </div>
      )}

      {/* Asset Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="card-surface w-full max-w-lg rounded-[40px] p-8 animate-in zoom-in-95 duration-200 dark:text-white text-slate-900 shadow-2xl">
             <h2 className="text-3xl font-black mb-2">{editingAsset ? 'Edit Asset' : 'Add Asset'}</h2>
             <p className="text-slate-500 text-sm mb-8">Node Capacity: {user.credits.maxAssets - holdings.length} slots remaining.</p>
             <form onSubmit={handleAddOrUpdateAsset} className="space-y-4">
                <div className="grid grid-cols-3 gap-2 mb-4">
                   {(['STOCK', 'CRYPTO', 'COMMODITY'] as AssetType[]).map(t => (
                      <button 
                        key={t}
                        type="button"
                        onClick={() => setFormData({...formData, type: t})}
                        aria-label={`Select ${t} asset type`}
                        className={`py-3 text-[10px] font-black uppercase rounded-xl border transition-all ${formData.type === t ? 'bg-[#00e5ff]/10 border-[#00e5ff] text-[#00e5ff]' : 'border-slate-200 dark:border-white/10 text-slate-500'}`}
                      >
                        {t}
                      </button>
                   ))}
                </div>
                <div className="space-y-4">
                  <AssetSelector
                    value={selectedAsset}
                    onChange={(asset) => {
                      setSelectedAsset(asset);
                      setFormData({...formData, symbol: asset.symbol, name: asset.name, type: asset.type});
                    }}
                    disabled={!!editingAsset}
                    filterTypes={formData.type ? [formData.type] : undefined}
                    excludeSymbols={holdings.map(h => h.symbol)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                     <input required type="number" step="any" placeholder="Quantity" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0b0e14] border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 dark:text-white font-bold outline-none focus:border-[#00e5ff]" />
                     <input required type="number" step="any" placeholder="Avg Cost" value={formData.avgCost} onChange={e => setFormData({...formData, avgCost: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0b0e14] border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 dark:text-white font-bold outline-none focus:border-[#00e5ff]" />
                  </div>
                </div>
                
                <div className="pt-6 flex gap-4">
                   <button type="button" onClick={() => setIsAddModalOpen(false)} aria-label="Cancel and close modal" className="flex-1 py-4 text-slate-500 font-black uppercase text-xs hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-all">Cancel</button>
                   <button type="submit" aria-label={editingAsset ? 'Update asset' : 'Add new asset'} className="flex-[2] py-5 bg-[#00e5ff] text-[#0b0e14] font-black uppercase tracking-widest rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20">{editingAsset ? 'Update Node' : 'Capture'}</button>
                </div>
             </form>
           </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsImportModalOpen(false)}>
          <div className="bg-white dark:bg-[#151921] p-8 rounded-[32px] w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => {
                setIsImportModalOpen(false);
                setImportPreview([]);
                setImportErrors([]);
                setImportFile(null);
              }}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-black dark:text-white mb-2">Import Holdings</h2>
            <p className="text-sm text-slate-500 mb-6">Upload a CSV file to bulk-import your portfolio</p>
            
            {/* File Upload */}
            <div className="mb-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label 
                htmlFor="csv-upload"
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl cursor-pointer hover:border-[#00e5ff] hover:bg-[#00e5ff]/5 transition-all"
              >
                <Upload className="w-10 h-10 text-slate-400 mb-3" />
                <span className="text-sm font-bold text-slate-500">
                  {importFile ? importFile.name : 'Click to select CSV file'}
                </span>
                <span className="text-xs text-slate-400 mt-1">or drag and drop</span>
              </label>
            </div>

            {/* CSV Format Help */}
            <div className="mb-6 p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
              <h4 className="text-xs font-black text-slate-500 uppercase mb-2">CSV Format</h4>
              <p className="text-xs text-slate-400 mb-2">Required columns: <span className="text-emerald-400">Symbol</span>, <span className="text-emerald-400">Quantity</span></p>
              <p className="text-xs text-slate-400">Optional: Name, Type (STOCK/CRYPTO/COMMODITY), Avg Cost</p>
              <div className="mt-3 p-2 bg-slate-100 dark:bg-[#0b0e14] rounded-lg font-mono text-[10px] text-slate-500">
                Symbol,Name,Type,Quantity,Avg Cost<br/>
                BTC,Bitcoin,CRYPTO,1.5,45000<br/>
                AAPL,Apple Inc,STOCK,50,175.50
              </div>
            </div>

            {/* Errors */}
            {importErrors.length > 0 && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black text-amber-400 uppercase">Warnings</span>
                </div>
                <ul className="space-y-1">
                  {importErrors.slice(0, 5).map((error, i) => (
                    <li key={i} className="text-xs text-amber-300">{error}</li>
                  ))}
                  {importErrors.length > 5 && (
                    <li className="text-xs text-amber-400">...and {importErrors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            {/* Preview */}
            {importPreview.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black text-emerald-400 uppercase">
                    {importPreview.length} assets ready to import
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {importPreview.map((h, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-[#00e5ff]">{h.symbol}</span>
                        <span className="text-xs text-slate-500">{h.name}</span>
                        <span className="text-[9px] px-2 py-0.5 bg-slate-200 dark:bg-white/10 rounded text-slate-500">{h.type}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold dark:text-white">{h.quantity}</span>
                        {h.avgCost > 0 && <span className="text-[10px] text-slate-500 ml-2">@ ${h.avgCost}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportPreview([]);
                  setImportErrors([]);
                  setImportFile(null);
                }}
                className="flex-1 py-4 text-slate-500 font-black uppercase text-xs hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleImport}
                disabled={importPreview.length === 0}
                className="flex-[2] py-5 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import {importPreview.length} Assets
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeModal !== null}
        onClose={() => setUpgradeModal(null)}
        onUpgrade={() => { setUpgradeModal(null); onUpgradeClick?.(); }}
        featureName={upgradeModal?.featureName || ''}
        featureDescription={upgradeModal?.featureDescription || ''}
        requiredPlan={upgradeModal?.requiredPlan || 'PROPULSE'}
      />

      {/* Share Modal */}
      {/* Delete Confirmation Dialog */}
      {deleteConfirmSymbol && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setDeleteConfirmSymbol(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative card-surface w-full max-w-sm rounded-3xl p-8 animate-in zoom-in-95 duration-200 shadow-2xl dark:text-white text-slate-900" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-lg font-black">Remove {deleteConfirmSymbol}?</h3>
              <p className="text-sm text-slate-500 mt-1">This will remove the asset from your portfolio. This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmSymbol(null)}
                className="flex-1 py-3 font-bold text-sm rounded-2xl border border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 font-bold text-sm rounded-2xl bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isShareOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setIsShareOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative card-surface w-full max-w-sm rounded-3xl p-8 animate-in zoom-in-95 duration-200 shadow-2xl dark:text-white" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsShareOpen(false)} className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Share2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-black">{t('share.title')}</h3>
              <p className="text-sm text-slate-500 mt-1">{t('share.description')}</p>
            </div>

            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl mb-6 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5">
              {t('share.messageTemplate').replace('assets', `${holdings.length} assets`)}
            </div>

            <div className="space-y-3">
              {'share' in navigator && (
                <button
                  onClick={async () => {
                    try {
                      await navigator.share({
                        title: 'FinPulse',
                        text: t('share.messageTemplate').replace('assets', `${holdings.length} assets`),
                        url: `https://finpulse.me/?ref=${user.id}`,
                      });
                      setIsShareOpen(false);
                    } catch {
                      // User cancelled share — ignore
                    }
                  }}
                  className="w-full py-3 px-6 bg-emerald-500 text-white font-bold text-sm rounded-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" /> {t('share.shareNative')}
                </button>
              )}
              <button
                onClick={async () => {
                  try {
                    const shareText = `${t('share.messageTemplate').replace('assets', `${holdings.length} assets`)} https://finpulse.me/?ref=${user.id}`;
                    await navigator.clipboard.writeText(shareText);
                    showToast(t('share.copied'), 'success');
                    setIsShareOpen(false);
                  } catch {
                    showToast(t('share.copyFailed'), 'error');
                  }
                }}
                className="w-full py-3 px-6 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold text-sm rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2"
              >
                <LinkIcon className="w-4 h-4" /> {t('share.copyLink')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
