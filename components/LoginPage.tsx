import React, { useState } from 'react';
import { Logo } from '../constants';
import { auth } from '../services/authService';

interface LoginPageProps {
  onLogin: (email: string, name: string) => void;
}

type AuthMode = 'login' | 'signup' | 'confirm' | 'forgot' | 'reset';

const Spinner = () => (
  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetMessages = () => { setError(null); setSuccess(null); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    resetMessages();

    const result = await auth.signIn(email, password);
    
    if (result.success && result.user) {
      onLogin(result.user.email, result.user.name);
    } else if (result.needsConfirmation) {
      setMode('confirm');
      setError('Please confirm your email address');
    } else {
      setError(result.error || 'Login failed');
    }
    
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    resetMessages();

    const result = await auth.signUp(email, password, name);
    
    if (result.success) {
      if (result.needsConfirmation) {
        setMode('confirm');
        setSuccess('Check your email for a confirmation code');
      } else {
        const loginResult = await auth.signIn(email, password);
        if (loginResult.success && loginResult.user) {
          onLogin(loginResult.user.email, loginResult.user.name);
        }
      }
    } else {
      setError(result.error || 'Sign up failed');
    }
    
    setIsLoading(false);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    resetMessages();

    const result = await auth.confirmSignUp(email, confirmCode);
    
    if (result.success) {
      const loginResult = await auth.signIn(email, password);
      if (loginResult.success && loginResult.user) {
        onLogin(loginResult.user.email, loginResult.user.name);
      } else {
        setMode('login');
        setSuccess('Email confirmed! Please sign in.');
      }
    } else {
      setError(result.error || 'Confirmation failed');
    }
    
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    resetMessages();

    const result = await auth.forgotPassword(email);
    
    if (result.success) {
      setMode('reset');
      setSuccess('Check your email for a reset code');
    } else {
      setError(result.error || 'Failed to send reset code');
    }
    
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    resetMessages();

    const result = await auth.confirmForgotPassword(email, confirmCode, newPassword);
    
    if (result.success) {
      setMode('login');
      setPassword('');
      setSuccess('Password reset! Please sign in with your new password.');
    } else {
      setError(result.error || 'Password reset failed');
    }
    
    setIsLoading(false);
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    const result = await auth.resendConfirmationCode(email);
    if (result.success) {
      setSuccess('Confirmation code sent!');
    } else {
      setError(result.error || 'Failed to resend code');
    }
    setIsLoading(false);
  };

  const getTitle = () => {
    switch (mode) {
      case 'signup': return 'Create Account';
      case 'confirm': return 'Verify Email';
      case 'forgot': return 'Reset Password';
      case 'reset': return 'New Password';
      default: return 'Welcome Back';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'signup': return 'Start your financial journey';
      case 'confirm': return `We sent a code to ${email}`;
      case 'forgot': return 'Enter your email to reset';
      case 'reset': return 'Enter the code and new password';
      default: return 'Access your private financial mirror';
    }
  };

  const renderSignupForm = () => (
    <form onSubmit={handleSignup} className="space-y-4">
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</label>
        <input required type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full bg-[#0b0e14] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff] transition-all" />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email Address</label>
        <input required type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-[#0b0e14] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff] transition-all" />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Password</label>
        <input required type="password" placeholder="••••••••" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-[#0b0e14] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff] transition-all" />
        <p className="text-[10px] text-slate-600">Min 8 chars, uppercase, lowercase, number</p>
      </div>
      <button type="submit" disabled={isLoading}
        className="w-full py-4 bg-[#00e5ff] text-[#0b0e14] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center justify-center shadow-lg shadow-[#00e5ff]/20">
        {isLoading ? <Spinner /> : 'Create Account'}
      </button>
      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <button type="button" onClick={() => { setMode('login'); resetMessages(); }} className="text-[#00e5ff] hover:underline">Sign In</button>
      </p>
    </form>
  );

  const renderConfirmForm = () => (
    <form onSubmit={handleConfirm} className="space-y-4">
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Confirmation Code</label>
        <input required type="text" placeholder="123456" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)}
          className="w-full bg-[#0b0e14] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff] transition-all text-center tracking-[0.5em] text-lg" />
      </div>
      <button type="submit" disabled={isLoading}
        className="w-full py-4 bg-[#00e5ff] text-[#0b0e14] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center justify-center shadow-lg shadow-[#00e5ff]/20">
        {isLoading ? <Spinner /> : 'Verify Email'}
      </button>
      <button type="button" onClick={handleResendCode} disabled={isLoading} className="w-full text-sm text-slate-500 hover:text-[#00e5ff]">Resend Code</button>
    </form>
  );

  const renderForgotForm = () => (
    <form onSubmit={handleForgotPassword} className="space-y-4">
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email Address</label>
        <input required type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-[#0b0e14] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff] transition-all" />
      </div>
      <button type="submit" disabled={isLoading}
        className="w-full py-4 bg-[#00e5ff] text-[#0b0e14] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center justify-center shadow-lg shadow-[#00e5ff]/20">
        {isLoading ? <Spinner /> : 'Send Reset Code'}
      </button>
      <button type="button" onClick={() => { setMode('login'); resetMessages(); }} className="w-full text-sm text-slate-500 hover:text-[#00e5ff]">Back to Sign In</button>
    </form>
  );

  const renderResetForm = () => (
    <form onSubmit={handleResetPassword} className="space-y-4">
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reset Code</label>
        <input required type="text" placeholder="123456" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)}
          className="w-full bg-[#0b0e14] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff] transition-all" />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">New Password</label>
        <input required type="password" placeholder="••••••••" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
          className="w-full bg-[#0b0e14] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff] transition-all" />
      </div>
      <button type="submit" disabled={isLoading}
        className="w-full py-4 bg-[#00e5ff] text-[#0b0e14] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center justify-center shadow-lg shadow-[#00e5ff]/20">
        {isLoading ? <Spinner /> : 'Reset Password'}
      </button>
    </form>
  );

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email Address</label>
        <input required type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-[#0b0e14] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff] transition-all" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Password</label>
          <button type="button" onClick={() => { setMode('forgot'); resetMessages(); }} className="text-[10px] font-black uppercase tracking-widest text-[#00e5ff] hover:opacity-80">Forgot?</button>
        </div>
        <input required type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-[#0b0e14] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff] transition-all" />
      </div>
      <button type="submit" disabled={isLoading}
        className="w-full py-4 bg-[#00e5ff] text-[#0b0e14] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center justify-center shadow-lg shadow-[#00e5ff]/20">
        {isLoading ? <Spinner /> : 'Sign In'}
      </button>
      <p className="text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <button type="button" onClick={() => { setMode('signup'); resetMessages(); }} className="text-[#00e5ff] hover:underline">Create one</button>
      </p>
    </form>
  );

  const renderForm = () => {
    switch (mode) {
      case 'signup': return renderSignupForm();
      case 'confirm': return renderConfirmForm();
      case 'forgot': return renderForgotForm();
      case 'reset': return renderResetForm();
      default: return renderLoginForm();
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,229,255,0.05),transparent)] pointer-events-none"></div>
      
      <div className="w-full max-w-md relative">
        <div className="text-center mb-10">
          <div className="inline-block scale-125 mb-8">
            <Logo />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">{getTitle()}</h2>
          <p className="text-slate-500 text-sm">{getSubtitle()}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm text-center">
            {success}
          </div>
        )}

        <div className="card-surface p-10 rounded-[32px] shadow-2xl">
          {renderForm()}
        </div>
      </div>
    </div>
  );
};
