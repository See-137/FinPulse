
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { TrendingUp, Wallet, Shield, Globe } from 'lucide-react';

const data = [
  { time: '09:00', value: 1600000 },
  { time: '10:00', value: 1615000 },
  { time: '11:00', value: 1608000 },
  { time: '12:00', value: 1632000 },
  { time: '13:00', value: 1641000 },
  { time: '14:00', value: 1628000 },
  { time: '15:00', value: 1648000 },
  { time: '16:00', value: 1654892 },
];

export const DashboardPreview: React.FC = () => {
  return (
    <div className="bg-[#151921] rounded-[32px] border border-white/10 overflow-hidden w-full shadow-2xl flex flex-col min-h-0">
      {/* Header Mockup */}
      <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02] shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Global Net Worth</span>
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          </div>
          <p className="text-4xl font-black text-white tracking-tighter">$1,654,892.40</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-emerald-400 font-black text-lg">+12.4%</p>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">YTD Growth</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
             <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Chart Area - Fixed height with relative positioning to stabilize Recharts */}
      <div className="h-[300px] w-full p-6 pb-2 relative min-h-0 shrink-0">
        <ResponsiveContainer width="100%" height="100%" minHeight={150}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#00e5ff" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
            <XAxis dataKey="time" hide />
            <YAxis hide domain={['dataMin - 10000', 'dataMax + 10000']} />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#00e5ff" 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#colorValue)" 
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Holdings Preview Mockup */}
      <div className="p-8 pt-2 flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Key Pulse Holdings</h4>
          <span className="text-[10px] font-black text-cyan-400 hover:underline cursor-pointer">View All Assets</span>
        </div>
        <div className="space-y-3">
          {[
            { symbol: 'BTC', name: 'Bitcoin', val: '$94,231', change: '+2.4%', color: 'bg-orange-500/10 text-orange-400' },
            { symbol: 'ETH', name: 'Ethereum', val: '$2,923', change: '-0.4%', color: 'bg-indigo-400/10 text-indigo-400' },
            { symbol: 'NVDA', name: 'Nvidia Corp', val: '$145.20', change: '+1.2%', color: 'bg-emerald-400/10 text-emerald-400' }
          ].map(asset => (
            <div key={asset.symbol} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${asset.color}`}>
                  {asset.symbol[0]}
                </div>
                <div>
                  <p className="text-xs font-black text-white">{asset.symbol}</p>
                  <p className="text-[9px] font-bold text-slate-500">{asset.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-white">{asset.val}</p>
                <p className="text-[9px] font-bold text-emerald-400">{asset.change}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar Mockup */}
      <div className="grid grid-cols-3 divide-x divide-white/5 border-t border-white/5 bg-white/[0.01] shrink-0">
        <div className="p-4 flex flex-col items-center">
          <Globe className="w-4 h-4 text-slate-500 mb-1" />
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Global Feed</p>
        </div>
        <div className="p-4 flex flex-col items-center">
          <Wallet className="w-4 h-4 text-cyan-400 mb-1" />
          <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Pulse Active</p>
        </div>
        <div className="p-4 flex flex-col items-center">
          <Shield className="w-4 h-4 text-slate-500 mb-1" />
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Secure View</p>
        </div>
      </div>
    </div>
  );
};
