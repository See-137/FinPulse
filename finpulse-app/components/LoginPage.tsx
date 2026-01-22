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
      default: return 'Access your private financial pulse';
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
      
      {/* Divider */}
      <div className="flex items-center gap-4 my-2">
        <div className="flex-1 h-px bg-white/10"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">or</span>
        <div className="flex-1 h-px bg-white/10"></div>
      </div>
      
      {/* Google Sign-In Button */}
      <button
        type="button"
        onClick={() => auth.initiateGoogleSignIn()}
        className="w-full py-4 bg-white text-gray-800 font-semibold rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-3 border border-white/20">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
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
