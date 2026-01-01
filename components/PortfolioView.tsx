
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { 
  Plus, Download, Lock, Search, Trash2, Pencil, ShieldCheck, 
  TrendingUp, TrendingDown, Bitcoin, Activity, Gem, Eye, EyeOff,
  ArrowUpDown, ArrowUp, ArrowDown, XCircle
} from 'lucide-react';
import { User, Currency } from '../types';
import { CURRENCY_RATES } from '../constants';
import { usePortfolioStore } from '../store/portfolioStore';

const STORAGE_KEY = 'finpulse_mirror_holdings';

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
  // Use Zustand store for shared state
  const { isPrivate, search, filterType, setIsPrivate, setSearch, setFilterType } = usePortfolioStore();
  
  const [holdings, setHoldings] = useState<Holding[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
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
  
  useEffect(() => {
    userRef.current = user;
    onUpdateUserRef.current = onUpdateUser;
  });

  const rate = CURRENCY_RATES[currency];
  const currencySymbol = currency === 'USD' ? '$' : '₪';

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  }, [holdings]);

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
    
    if (!editingAsset && holdings.length >= user.credits.maxAssets) {
      alert(`Limit Reached: Your ${user.plan} plan allows only ${user.credits.maxAssets} assets. Please upgrade to unlock more slots.`);
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
      setHoldings(prev => prev.map(h => h.symbol === editingAsset.symbol ? newAsset : h));
    } else {
      setHoldings(prev => [...prev, newAsset]);
    }

    setIsAddModalOpen(false);
    setEditingAsset(null);
    setFormData({ symbol: '', name: '', type: 'STOCK', quantity: '', avgCost: '' });
  };

  const handleDelete = (symbol: string) => {
    setHoldings(prev => prev.filter(h => h.symbol !== symbol));
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
        // Clean up the URL object after a delay to ensure download completes
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Export failed. Please check your browser permissions and try again.');
    }
  };

  const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0);
  
  const data = [
    { name: 'Crypto', type: 'CRYPTO', value: holdings.filter(h => h.type === 'CRYPTO').reduce((sum, h) => sum + h.quantity * h.currentPrice, 0), color: '#00e5ff' },
    { name: 'Stocks', type: 'STOCK', value: holdings.filter(h => h.type === 'STOCK').reduce((sum, h) => sum + h.quantity * h.currentPrice, 0), color: '#3b82f6' },
    { name: 'Commodities', type: 'COMMODITY', value: holdings.filter(h => h.type === 'COMMODITY').reduce((sum, h) => sum + h.quantity * h.currentPrice, 0), color: '#fbbf24' },
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
           aValue = a.quantity * a.currentPrice;
           bValue = b.quantity * b.currentPrice;
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
            aria-label={user.plan === 'FREE' ? 'Export CSV (PRO feature)' : 'Export portfolio to CSV'}
            className={`p-3 sm:p-4 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center gap-3 transition-all ${user.plan === 'FREE' ? 'opacity-30 cursor-not-allowed text-slate-600' : 'text-slate-400 hover:text-[#00e5ff] hover:border-[#00e5ff]/30'}`}
          >
            {user.plan === 'FREE' ? <Lock className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Export {user.plan === 'FREE' && '(PRO)'}</span>
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
                <div className="card-surface rounded-[32px] overflow-hidden border border-slate-200 dark:border-white/5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                          {[
                            { label: 'Asset Name', key: 'name' },
                            { label: 'Market Price', key: 'currentPrice' },
                            { label: 'Quantity', key: 'quantity' },
                            { label: 'Value', key: 'value' },
                            { label: '24h Change', key: 'dayPL' }
                          ].map((header) => (
                            <th 
                              key={header.key}
                              onClick={() => handleSort(header.key)}
                              className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest cursor-pointer hover:text-[#00e5ff] transition-colors whitespace-nowrap"
                            >
                              <div className="flex items-center gap-2">
                                {header.label}
                                {renderSortIcon(header.key)}
                              </div>
                            </th>
                          ))}
                          <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedHoldings.map((asset, idx) => (
                          <tr key={idx} className="border-b border-slate-200 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                            <td className="p-6">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${asset.type === 'CRYPTO' ? 'bg-orange-500/10 text-orange-500' : asset.type === 'STOCK' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                  {asset.type === 'CRYPTO' ? <Bitcoin className="w-5 h-5" /> : asset.type === 'STOCK' ? <Activity className="w-5 h-5" /> : <Gem className="w-5 h-5" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-sm dark:text-white">{asset.symbol}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[8px] font-black uppercase text-slate-500">{asset.type}</span>
                                  </div>
                                  <p className="text-xs font-medium text-slate-500">{asset.name}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-6 font-bold text-sm dark:text-white">
                              {currencySymbol}{(asset.currentPrice * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-6 font-bold text-sm dark:text-white">
                              {isPrivate ? '••••••' : asset.quantity.toLocaleString()}
                            </td>
                            <td className="p-6 font-bold text-sm dark:text-white">
                              {isPrivate ? '••••••' : `${currencySymbol}${(asset.quantity * asset.currentPrice * rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                            </td>
                            <td className="p-6">
                              <div className={`flex items-center gap-1 font-bold text-sm ${asset.dayPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {asset.dayPL >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(asset.dayPL).toFixed(2)}%
                              </div>
                            </td>
                            <td className="p-6">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingAsset(asset); setFormData({...asset, type: asset.type, quantity: asset.quantity.toString(), avgCost: asset.avgCost.toString()}); setIsAddModalOpen(true); }} aria-label={`Edit ${asset.symbol}`} className="p-2 hover:bg-blue-500/10 text-slate-400 hover:text-blue-500 rounded-lg">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(asset.symbol)} aria-label={`Delete ${asset.symbol}`} className="p-2 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
