
import React from 'react';
import { X, CreditCard, Sparkles, Check, ChevronRight } from 'lucide-react';
import { User, PlanType } from '../types';
import { SaaS_PLANS } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpgrade: (plan: PlanType) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, user, onUpgrade }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <div className="card-surface w-full max-w-3xl rounded-[48px] p-10 overflow-hidden relative shadow-2xl animate-in fade-in zoom-in duration-300">
        <button onClick={onClose} className="absolute right-8 top-8 p-3 text-slate-500 hover:text-white bg-white/5 rounded-full"><X className="w-6 h-6"/></button>
        
        <h2 className="text-4xl font-black text-white mb-2">Mirror Settings</h2>
        <p className="text-slate-500 mb-10">Manage node configuration and intelligence tier.</p>

        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-8">
            <div className="space-y-4">
               <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Plan</h3>
               <div className={`p-6 rounded-3xl border ${user.plan === 'PRO' ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-slate-800/50 border-white/5'}`}>
                  <div className="flex justify-between items-start mb-4">
                     <span className={`text-xs font-black px-2 py-1 rounded-md ${user.plan === 'PRO' ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white'}`}>{user.plan}</span>
                     <span className="text-2xl font-black text-white">{SaaS_PLANS[user.plan].price}<span className="text-xs text-slate-500">/mo</span></span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">Your account is currently trialing institutional features.</p>
               </div>
            </div>

            <div className="space-y-4">
               <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mirror Usage</h3>
               <div className="space-y-4">
                  <div className="space-y-1">
                     <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                        <span>AI Mirror Credits</span>
                        <span>{user.credits.ai} / {user.credits.maxAi}</span>
                     </div>
                     <div className="h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-cyan-500" style={{ width: `${(user.credits.ai / user.credits.maxAi) * 100}%` }} /></div>
                  </div>
                  <div className="space-y-1">
                     <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                        <span>Mirror Slots</span>
                        <span>{user.credits.assets} / {user.credits.maxAssets}</span>
                     </div>
                     <div className="h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${(user.credits.assets / user.credits.maxAssets) * 100}%` }} /></div>
                  </div>
               </div>
            </div>
          </div>

          <div className="bg-white/[0.02] p-8 rounded-[40px] border border-white/5">
             <h3 className="text-lg font-black text-white mb-6">Upgrade Tier</h3>
             <div className="space-y-4">
                {(['PRO', 'TEAM'] as PlanType[]).map(p => (
                  <button 
                    key={p}
                    onClick={() => { onUpgrade(p); onClose(); }}
                    className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between hover:border-cyan-500/50 group transition-all"
                  >
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400"><Sparkles className="w-5 h-5" /></div>
                       <div className="text-left">
                          <p className="text-sm font-black text-white">{SaaS_PLANS[p].name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">{SaaS_PLANS[p].price}/mo</p>
                       </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400" />
                  </button>
                ))}
             </div>
             <div className="mt-8 pt-6 border-t border-white/5">
                <button className="flex items-center gap-3 text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest">
                   <CreditCard className="w-4 h-4" /> Billing Portal
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
