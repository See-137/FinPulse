
import React from 'react';
import { X, ShieldAlert, Zap, RefreshCw, UserPlus } from 'lucide-react';
import { User, PlanType } from '../types';
import { SaaS_PLANS } from '../constants';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdateUser: (user: User) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ isOpen, onClose, user, onUpdateUser }) => {
  if (!isOpen) return null;

  const setPlan = (plan: PlanType) => {
    onUpdateUser({
      ...user,
      plan,
      credits: {
        ...user.credits,
        maxAi: SaaS_PLANS[plan].maxAiQueries,
        maxAssets: SaaS_PLANS[plan].maxAssets
      }
    });
  };

  const resetUsage = () => {
    onUpdateUser({
      ...user,
      credits: { ...user.credits, ai: 0 }
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="card-surface w-full max-w-md rounded-[40px] p-8 border border-rose-500/20 shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-8">
           <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-500" />
              <h2 className="text-xl font-black uppercase text-white">Admin Portal</h2>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5"/></button>
        </div>

        <div className="space-y-6">
           <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Authenticated Subject</p>
              <p className="text-sm font-bold text-white">{user.email}</p>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase">Override Plan State</label>
              <div className="grid grid-cols-3 gap-2">
                 {(['FREE', 'PRO', 'TEAM'] as PlanType[]).map(p => (
                   <button 
                     key={p} 
                     onClick={() => setPlan(p)}
                     className={`py-2 text-[10px] font-black rounded-lg border transition-all ${user.plan === p ? 'bg-white text-black border-white' : 'border-white/10 text-slate-500 hover:border-white/30'}`}
                   >
                     {p}
                   </button>
                 ))}
              </div>
           </div>

           <div className="space-y-4 pt-4">
              <button onClick={resetUsage} className="w-full flex items-center justify-center gap-2 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-700">
                <RefreshCw className="w-4 h-4" /> Reset Daily AI Credits
              </button>
              <button onClick={onClose} className="w-full py-4 text-slate-500 font-black uppercase tracking-widest text-[10px]">
                Close
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
