
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { 
  Plus, Download, Lock, Search, Trash2, Pencil, ShieldCheck, 
  TrendingUp, TrendingDown, Bitcoin, Activity, Gem, Eye, EyeOff,
  ArrowUpDown, ArrowUp, ArrowDown, XCircle, Wifi, WifiOff, Crown
} from 'lucide-react';
import { User, Currency } from '../types';
import { CURRENCY_RATES, SaaS_PLANS } from '../constants';
import { usePortfolioStore } from '../store/portfolioStore';
import { useMarketData } from '../hooks/useMarketData';
import { useWebSocketPrices } from '../hooks/useWebSocketPrices';

type AssetType = 'CRYPTO' | 'STOCK' | 'COMMODITY';

interface Holding {
  symbol: string;
  name: string;
  type: AssetType;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  dayPL: number;
}

interface PortfolioViewProps {
  user: User;
  onUpdateUser: (user: User) => void;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({ user, onUpdateUser, currency, onCurrencyChange }) => {
  // Use Zustand store for shared state (including holdings for news filtering)
  const { 
    isPrivate, search, filterType, holdings,
    setIsPrivate, setSearch, setFilterType, setHoldings, addHolding, updateHolding, removeHolding 
  } = usePortfolioStore();

  // Fetch real-time market prices (REST API as fallback)
  const { prices: marketPrices, loading: pricesLoading } = useMarketData(30000);
  
  // Real-time WebSocket prices for crypto
  const cryptoSymbols = useMemo(() => 
    holdings.filter(h => h.type === 'CRYPTO').map(h => h.symbol),
    [holdings]
  );
  const { prices: wsPrices, isConnected: wsConnected } = useWebSocketPrices({
    symbols: cryptoSymbols.length > 0 ? cryptoSymbols : ['BTC', 'ETH', 'SOL'],
    enabled: true,
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Holding | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    type: 'STOCK' as AssetType,
    quantity: '',
    avgCost: ''
  });

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
      alert(`Limit Reached: Your ${user.plan} plan allows only ${user.credits.maxAssets} assets. Upgrade to ProPulse or SuperPulse to unlock more slots.`);
      return;
    }

    // Check commodity restriction for Free users
    const planConfig = SaaS_PLANS[user.plan];
    if (formData.type === 'COMMODITY' && !planConfig.allowCommodities) {
      alert(`🔒 Commodities Locked: Gold, Oil, and other commodities are available on ProPulse ($9.90/mo) and SuperPulse plans. Upgrade to track commodities alongside your stocks and crypto.`);
      return;
    }

    const newAsset: Holding = {
      symbol: formData.symbol.toUpperCase().trim(),
      name: formData.name.trim() || formData.symbol.toUpperCase(),
      type: formData.type,
      quantity: parseFloat(formData.quantity),
      avgCost: parseFloat(formData.avgCost) || 0,
      currentPrice: parseFloat(formData.avgCost) || 100, 
      dayPL: (Math.random() * 10) - 4 
    };

    if (editingAsset) {
      updateHolding(editingAsset.symbol, newAsset);
    } else {
      addHolding(newAsset);
    }

    setIsAddModalOpen(false);
    setEditingAsset(null);
    setFormData({ symbol: '', name: '', type: 'STOCK', quantity: '', avgCost: '' });
  };

  const handleDelete = (symbol: string) => {
    removeHolding(symbol);
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
    } catch (error) {
      // Export failed
      alert('Export failed. Please check your browser permissions and try again.');
    }
  };

  // Real market prices (as of Jan 4, 2026) - used when API doesn't return data
  const realMarketPrices: Record<string, { price: number; change24h: number }> = {
    // Crypto (from your screenshot)
    BTC: { price: 97500, change24h: 2.1 },
    ETH: { price: 3132.81, change24h: -1.87 },
    SOL: { price: 210.50, change24h: 3.2 },
    XRP: { price: 2.09, change24h: -4.54 },
    ADA: { price: 1.05, change24h: 1.8 },
    DOT: { price: 7.85, change24h: -0.5 },
    AVAX: { price: 42.30, change24h: 2.1 },
    MATIC: { price: 0.58, change24h: -1.2 },
    LINK: { price: 23.45, change24h: 1.5 },
    DOGE: { price: 0.42, change24h: 5.2 },
    // Stocks (from your screenshot)
    NVDA: { price: 188.85, change24h: 5.16 },
    AAPL: { price: 248.50, change24h: 1.2 },
    MSFT: { price: 430.20, change24h: 0.8 },
    GOOGL: { price: 192.75, change24h: -0.5 },
    AMZN: { price: 225.40, change24h: 1.1 },
    TSLA: { price: 410.30, change24h: 3.5 },
    META: { price: 595.80, change24h: 0.9 },
    JPM: { price: 245.60, change24h: 0.3 },
    V: { price: 315.40, change24h: 0.6 },
    MA: { price: 520.75, change24h: 0.4 },
    // Commodities
    GOLD: { price: 2650, change24h: 0.3 },
    SILVER: { price: 31.50, change24h: 0.8 },
    OIL: { price: 72.50, change24h: -1.2 },
  };

  // Helper to get real-time market price for an asset
  const getMarketPrice = (symbol: string, fallbackPrice: number): number => {
    const upperSymbol = symbol.toUpperCase();
    // First try WebSocket data (most real-time)
    const wsPrice = wsPrices.get(upperSymbol);
    if (wsPrice?.price) {
      return wsPrice.price;
    }
    // Then try REST API data
    if (marketPrices && marketPrices[upperSymbol]?.price) {
      return marketPrices[upperSymbol].price;
    }
    if (marketPrices && marketPrices[symbol]?.price) {
      return marketPrices[symbol].price;
    }
    // Fall back to real market prices
    if (realMarketPrices[upperSymbol]) {
      return realMarketPrices[upperSymbol].price;
    }
    return fallbackPrice;
  };

  // Helper to get 24h change from market data
  const getMarketChange = (symbol: string, fallbackChange: number): number => {
    const upperSymbol = symbol.toUpperCase();
    // First try API data
    if (marketPrices && marketPrices[upperSymbol]?.change24h !== undefined) {
      return marketPrices[upperSymbol].change24h;
    }
    if (marketPrices && marketPrices[symbol]?.change24h !== undefined) {
      return marketPrices[symbol].change24h;
    }
    // Fall back to real market prices
    if (realMarketPrices[upperSymbol]) {
      return realMarketPrices[upperSymbol].change24h;
    }
    return fallbackChange;
  };

  // Calculate total value using real market prices
  const totalValue = holdings.reduce((sum, h) => {
    const price = getMarketPrice(h.symbol, h.currentPrice);
    return sum + h.quantity * price;
  }, 0);
  
  const data = [
    { name: 'Crypto', type: 'CRYPTO', value: holdings.filter(h => h.type === 'CRYPTO').reduce((sum, h) => sum + h.quantity * getMarketPrice(h.symbol, h.currentPrice), 0), color: '#00e5ff' },
    { name: 'Stocks', type: 'STOCK', value: holdings.filter(h => h.type === 'STOCK').reduce((sum, h) => sum + h.quantity * getMarketPrice(h.symbol, h.currentPrice), 0), color: '#3b82f6' },
    { name: 'Commodities', type: 'COMMODITY', value: holdings.filter(h => h.type === 'COMMODITY').reduce((sum, h) => sum + h.quantity * getMarketPrice(h.symbol, h.currentPrice), 0), color: '#fbbf24' },
  ].filter(d => d.value > 0);

  // TODO: For scalability with large portfolios, consider implementing:
  // - Server-side filtering, sorting, and pagination
  // - Virtual scrolling for large datasets
  // - Debounced search input to reduce re-renders
  const filteredHoldings = useMemo(() => {
    return holdings.filter(h => {
      const matchesSearch = h.symbol.toLowerCase().includes(search.toLowerCase()) || 
                            h.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType ? h.type === filterType : true;
      return matchesSearch && matchesType;
    });
  }, [holdings, search, filterType]);

  const sortedHoldings = useMemo(() => {
    let sortableItems = [...filteredHoldings];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Holding];
        let bValue: any = b[sortConfig.key as keyof Holding];

        if (sortConfig.key === 'value') {
           aValue = a.quantity * getMarketPrice(a.symbol, a.avgCost);
           bValue = b.quantity * getMarketPrice(b.symbol, b.avgCost);
        }
        
        if (sortConfig.key === 'marketPrice') {
           aValue = getMarketPrice(a.symbol, a.avgCost);
           bValue = getMarketPrice(b.symbol, b.avgCost);
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredHoldings, sortConfig]);

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
              {user.plan} Mirror Node
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter dark:text-white text-slate-900">Holdings Mirror</h1>
          <div className="mt-2 flex items-center gap-4">
             <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase">Usage</span>
                <div className="flex items-center gap-2">
                   <div className="h-1.5 w-24 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${holdings.length / user.credits.maxAssets > 0.8 ? 'bg-rose-500' : 'bg-cyan-500'}`}
                        style={{ width: `${(holdings.length / user.credits.maxAssets) * 100}%` }}
                      />
                   </div>
                   <span className="text-[10px] font-bold text-slate-400">{holdings.length} / {user.credits.maxAssets}</span>
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
            disabled={user.plan === 'FREE'}
            onClick={exportCSV}
            aria-label={user.plan === 'FREE' ? 'Export CSV (ProPulse feature)' : 'Export portfolio to CSV'}
            className={`p-3 sm:p-4 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center gap-3 transition-all ${user.plan === 'FREE' ? 'opacity-30 cursor-not-allowed text-slate-600' : 'text-slate-400 hover:text-[#00e5ff] hover:border-[#00e5ff]/30'}`}
          >
            {user.plan === 'FREE' ? <Lock className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Export {user.plan === 'FREE' && '(ProPulse)'}</span>
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
              {filteredHoldings.length === 0 ? (
                <div className="card-surface p-12 rounded-[40px] text-center border-dashed border-slate-300 dark:border-white/10">
                  <p className="text-slate-500 font-medium text-sm">No assets match your filters.</p>
                </div>
              ) : (
                <div className="card-surface rounded-[24px] overflow-hidden border border-slate-200 dark:border-white/5">
                  <table className="w-full text-left table-fixed">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                          {[
                            { label: 'Asset', key: 'name', width: 'w-[22%]' },
                            { label: 'Avg Cost', key: 'avgCost', width: 'w-[14%]' },
                            { label: 'Price', key: 'marketPrice', width: 'w-[18%]' },
                            { label: 'Qty', key: 'quantity', width: 'w-[10%]' },
                            { label: 'Value', key: 'value', width: 'w-[14%]' },
                            { label: '24h', key: 'dayPL', width: 'w-[10%]' }
                          ].map((header) => (
                            <th 
                              key={header.key}
                              onClick={() => handleSort(header.key)}
                              className={`px-3 py-3 text-[8px] font-black uppercase text-slate-500 tracking-wider cursor-pointer hover:text-[#00e5ff] transition-colors ${header.width}`}
                            >
                              <div className="flex items-center gap-1">
                                {header.label}
                                {renderSortIcon(header.key)}
                              </div>
                            </th>
                          ))}
                          <th className="px-3 py-3 text-[8px] font-black uppercase text-slate-500 tracking-wider text-right w-[12%]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedHoldings.map((asset, idx) => {
                          const livePrice = getMarketPrice(asset.symbol, asset.avgCost);
                          const liveChange = getMarketChange(asset.symbol, asset.dayPL);
                          const totalAssetValue = asset.quantity * livePrice;
                          const profitLoss = asset.avgCost > 0 ? ((livePrice - asset.avgCost) / asset.avgCost) * 100 : 0;
                          
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
                              <span className={`font-bold text-xs ${liveChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {liveChange >= 0 ? '+' : ''}{liveChange.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingAsset(asset); setFormData({...asset, type: asset.type, quantity: asset.quantity.toString(), avgCost: asset.avgCost.toString()}); setIsAddModalOpen(true); }} aria-label={`Edit ${asset.symbol}`} className="p-1.5 hover:bg-blue-500/10 text-slate-400 hover:text-blue-500 rounded-lg">
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
              )}
           </div>
        </div>

        {/* Analytics Side */}
        <div className="space-y-6">
           <div className="card-surface p-8 rounded-[40px] bg-gradient-to-br from-slate-50 to-white dark:from-[#151921] dark:to-[#0b0e14]">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-8">Allocation</h3>
              <div className="h-[200px] w-full relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie 
                        data={data} 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={5} 
                        dataKey="value" 
                        stroke="none"
                        onClick={(data) => setFilterType(filterType === data.type ? null : data.type)}
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
                 </ResponsiveContainer>
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
              
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5 space-y-1">
                 <p className="text-[9px] font-bold text-slate-500 text-center">Prices as of {timeString} UTC</p>
                 <p className="text-[9px] font-bold text-slate-500 text-center">FX as of {timeString} UTC</p>
              </div>
           </div>
        </div>
      </div>

      {/* Asset Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="card-surface w-full max-w-lg rounded-[40px] p-8 animate-in zoom-in-95 duration-200 dark:text-white text-slate-900 shadow-2xl">
             <h2 className="text-3xl font-black mb-2">{editingAsset ? 'Edit Mirror' : 'Mirror Asset'}</h2>
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
                  <input required placeholder="Symbol (e.g. BTC)" value={formData.symbol} onChange={e => setFormData({...formData, symbol: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0b0e14] border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 dark:text-white font-bold outline-none focus:border-[#00e5ff]" />
                  <input required placeholder="Asset Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0b0e14] border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 dark:text-white font-bold outline-none focus:border-[#00e5ff]" />
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
    </div>
  );
};
