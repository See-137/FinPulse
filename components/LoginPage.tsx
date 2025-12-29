
import React, { useState } from 'react';
import { Logo } from '../constants';

interface LoginPageProps {
  onLogin: (email: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      onLogin(email || 'User');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,229,255,0.05),transparent)] pointer-events-none"></div>
      
      <div className="w-full max-w-md relative">
        <div className="text-center mb-10">
          <div className="inline-block scale-125 mb-8">
            <Logo />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Welcome Back</h2>
          <p className="text-slate-500 text-sm">Access your private financial mirror</p>
        </div>

        <form onSubmit={handleSubmit} className="card-surface p-10 rounded-[32px] shadow-2xl space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email Address</label>
            <input 
              required
              type="email" 
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0b0e14] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff] transition-all"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Password</label>
              <a href="#" className="text-[10px] font-black uppercase tracking-widest text-[#00e5ff] hover:opacity-80">Forgot?</a>
            </div>
            <input 
              required
              type="password" 
              placeholder="••••••••"
              className="w-full bg-[#0b0e14] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff] transition-all"
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-[#00e5ff] text-[#0b0e14] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center justify-center shadow-lg shadow-[#00e5ff]/20"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Sign In'}
          </button>

          <div className="relative py-4 flex items-center justify-center">
            <div className="absolute w-full h-[1px] bg-white/5"></div>
            <span className="relative bg-[#151921] px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Or continue with</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button type="button" className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.909 3.141-1.908 4.141-1.28 1.28-3.303 2.701-7.23 2.701-6.101 0-10.741-4.901-10.741-11s4.641-11 10.741-11c3.279 0 5.679 1.28 7.479 2.979l2.301-2.301c-2.32-2.12-5.32-3.419-9.78-3.419-8.471 0-15.541 6.84-15.541 15.42 0 8.58 7.07 15.42 15.541 15.42 4.58 0 7.98-1.5 10.72-4.361 2.82-2.821 3.72-6.781 3.72-10.161 0-.96-.06-1.881-.18-2.761h-14.261z"/></svg>
              <span className="text-xs font-bold">Google</span>
            </button>
            <button type="button" className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.419 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.987 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.701 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12c0-5.523-4.477-10-10-10z"/></svg>
              <span className="text-xs font-bold">GitHub</span>
            </button>
          </div>
        </form>

        <p className="text-center mt-10 text-slate-600 text-xs">
          Don't have an account? <a href="#" className="text-[#00e5ff] font-bold">Sign up free</a>
        </p>
      </div>
    </div>
  );
};
