
import React, { useState } from 'react';
import { X, CreditCard, Sparkles, ChevronRight, Moon, Sun, Monitor, Palette, LogOut, Download, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { User, PlanType, Theme } from '../types';
import { SaaS_PLANS } from '../constants';
import { auth } from '../services/authService';
import { redirectToCustomerPortal } from '../services/lemonSqueezyService';
import { componentLogger } from '../services/logger';
import { config } from '../config';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpgrade: (plan: PlanType) => void;
  onOpenPricing: () => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  onLogout: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpgrade: _onUpgrade,
  onOpenPricing,
  currentTheme,
  onThemeChange,
  onLogout
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleLogout = async () => {
    await auth.signOut();
    onLogout();
    onClose();
  };

  const handleBillingPortal = async () => {
    try {
      await redirectToCustomerPortal(user.id);
    } catch (error) {
      componentLogger.error('Failed to open billing portal:', error);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem('finpulse_id_token');
      const response = await fetch(`${config.apiUrl}/auth/export-data`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finpulse-data-${user.email}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      componentLogger.error('Failed to export data:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('finpulse_id_token');
      const response = await fetch(`${config.apiUrl}/auth/account`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Delete failed');
      
      // Sign out and redirect
      await auth.signOut();
      onLogout();
      onClose();
      alert('Your account has been deleted. Thank you for using FinPulse.');
    } catch (error) {
      componentLogger.error('Failed to delete account:', error);
      alert('Failed to delete account. Please contact support.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <div className="card-surface w-full max-w-3xl rounded-[48px] p-10 overflow-hidden relative shadow-2xl animate-in fade-in zoom-in duration-300 dark:text-white text-slate-900">
        <button onClick={onClose} className="absolute right-8 top-8 p-3 text-slate-500 hover:text-[#00e5ff] bg-slate-100 dark:bg-white/5 rounded-full transition-colors"><X className="w-6 h-6"/></button>
        
        <h2 className="text-4xl font-black mb-2">Pulse Settings</h2>
        <p className="text-slate-500 mb-10">Manage node configuration and intelligence tier.</p>

        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-8">
            {/* Theme Toggle Section */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Palette className="w-3 h-3" /> Appearance
              </h3>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5 flex">
                {[
                  { id: 'light', icon: Sun, label: 'Light' },
                  { id: 'dark', icon: Moon, label: 'Dark' },
                  { id: 'system', icon: Monitor, label: 'System' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onThemeChange(t.id as Theme)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${currentTheme === t.id ? 'bg-white dark:bg-[#151921] text-[#00e5ff] shadow-sm' : 'text-slate-500 hover:text-slate-400'}`}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
               <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Plan</h3>
               <div className={`p-6 rounded-3xl border ${user.plan === 'SUPERPULSE' ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/5'}`}>
                  <div className="flex justify-between items-start mb-4">
                     <span className={`text-xs font-black px-2 py-1 rounded-md ${user.plan === 'SUPERPULSE' ? 'bg-cyan-500 text-black' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white'}`}>{user.plan}</span>
                     <span className="text-2xl font-black">{SaaS_PLANS[user.plan].price}<span className="text-xs text-slate-500">/mo</span></span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Your account is currently trialing institutional features.</p>
               </div>
            </div>

            <div className="space-y-4">
               <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pulse Usage</h3>
               <div className="space-y-4">
                  <div className="space-y-1">
                     <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                        <span>AI Pulse Credits</span>
                        <span>{user.credits.ai} / {user.credits.maxAi}</span>
                     </div>
                     <div className="h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-cyan-500" style={{ width: `${(user.credits.ai / user.credits.maxAi) * 100}%` }} /></div>
                  </div>
                  <div className="space-y-1">
                     <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                        <span>Pulse Slots</span>
                        <span>{user.credits.assets} / {user.credits.maxAssets}</span>
                     </div>
                     <div className="h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${(user.credits.assets / user.credits.maxAssets) * 100}%` }} /></div>
                  </div>
               </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-white/[0.02] p-8 rounded-[40px] border border-slate-200 dark:border-white/5">
             <h3 className="text-lg font-black mb-6">Upgrade Tier</h3>
             <div className="space-y-4">
                {(['PROPULSE', 'SUPERPULSE'] as PlanType[]).map(p => (
                  <button 
                    key={p}
                    onClick={onOpenPricing}
                    className="w-full p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl flex items-center justify-between hover:border-cyan-500/50 group transition-all shadow-sm dark:shadow-none"
                  >
                    <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p === 'PROPULSE' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'}`}><Sparkles className="w-5 h-5" /></div>
                       <div className="text-left">
                          <p className="text-sm font-black">{SaaS_PLANS[p].name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">{SaaS_PLANS[p].price}/mo</p>
                       </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-400" />
                  </button>
                ))}
             </div>
             <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5 space-y-4">
                <button 
                  onClick={handleBillingPortal}
                  className="flex items-center gap-3 text-slate-500 hover:text-[#00e5ff] text-xs font-black uppercase tracking-widest"
                >
                   <CreditCard className="w-4 h-4" /> Billing Portal
                </button>
                <button 
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="flex items-center gap-3 text-slate-500 hover:text-emerald-400 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                >
                   {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export My Data
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-3 text-slate-500 hover:text-red-400 text-xs font-black uppercase tracking-widest"
                >
                   <Trash2 className="w-4 h-4" /> Delete Account
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 text-slate-500 hover:text-red-400 text-xs font-black uppercase tracking-widest w-full"
                >
                   <LogOut className="w-4 h-4" /> Sign Out
                </button>
             </div>
          </div>
        </div>

        {/* Delete Account Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#151921] p-8 rounded-3xl max-w-md w-full shadow-2xl border border-red-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-xl font-black text-red-500">Delete Account</h3>
              </div>
              
              <p className="text-sm text-slate-500 mb-4">
                This action is <span className="text-red-400 font-bold">permanent and irreversible</span>. 
                All your data including portfolios, watchlists, and AI history will be deleted.
              </p>
              
              <p className="text-sm text-slate-500 mb-4">
                A copy of your data will be downloaded before deletion.
              </p>
              
              <div className="mb-6">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
                  Type DELETE to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono focus:border-red-500 focus:outline-none"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  className="flex-1 py-3 text-slate-500 font-bold text-sm hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                  className="flex-1 py-3 bg-red-500 text-white font-bold text-sm rounded-xl hover:bg-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
