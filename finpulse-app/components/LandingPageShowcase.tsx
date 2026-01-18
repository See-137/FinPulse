import React, { useState, useEffect, useRef } from 'react';
import { Logo } from '../constants';
import { Shield, ArrowRight, Lock, User as UserIcon, Key, LayoutGrid, Wallet, Zap, MessageSquareText, Mail, CheckCircle, AlertCircle, Eye, EyeOff, TrendingUp, TrendingDown, DollarSign, Bitcoin, BarChart3, Globe, Send } from 'lucide-react';
import { auth } from '../services/authService';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { TrustBadge, SecurityFooter } from './TrustBadges';

interface LandingPageShowcaseProps {
  onLogin: (email: string, name: string) => void;
  initialError?: string | null;
}

type AuthMode = 'signin' | 'signup' | 'confirm' | 'forgot' | 'reset';

// Showcase Preview Components
const DashboardPreview = () => (
  <div className="p-6 space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Global Net Worth</p>
        <p className="text-3xl font-black text-white">$1,654,892.40</p>
      </div>
      <div className="text-right">
        <span className="text-emerald-400 text-sm font-bold flex items-center gap-1"><TrendingUp className="w-4 h-4"/>+12.4%</span>
        <p className="text-[10px] text-slate-500">YTD Growth</p>
      </div>
    </div>
    <div className="h-24 relative">
      <svg viewBox="0 0 200 60" className="w-full h-full">
        <path d="M0,50 Q30,45 50,35 T100,25 T150,30 T200,15" fill="none" stroke="#00e5ff" strokeWidth="2" className="drop-shadow-[0_0_8px_#00e5ff]"/>
        <circle cx="200" cy="15" r="4" fill="#00e5ff" className="animate-pulse"/>
      </svg>
    </div>
    <div className="grid grid-cols-3 gap-3">
      {[{symbol:'BTC',price:'$94,231',change:'+2.4%',up:true},{symbol:'ETH',price:'$2,923',change:'-0.4%',up:false},{symbol:'NVDA',price:'$145.20',change:'+1.2%',up:true}].map(a=>(
        <div key={a.symbol} className="bg-white/5 rounded-xl p-3">
          <p className="text-xs font-bold text-white">{a.symbol}</p>
          <p className="text-sm font-black text-white">{a.price}</p>
          <p className={`text-[10px] ${a.up?'text-emerald-400':'text-red-400'}`}>{a.change}</p>
        </div>
      ))}
    </div>
  </div>
);

const HoldingsPreview = () => (
  <div className="p-6 space-y-4">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-black text-white">Holdings Pulse</h3>
      <span className="text-[10px] bg-[#00e5ff]/10 text-[#00e5ff] px-2 py-1 rounded-full font-bold">3 Assets</span>
    </div>
    <div className="space-y-3">
      {[{symbol:'ETH',name:'Ethereum',qty:'0.5',value:'$1,475',change:'+2.92%',color:'#627eea'},{symbol:'NVDA',name:'Nvidia',qty:'5',value:'$1,000',change:'+5.53%',color:'#76b900'},{symbol:'MSTR',name:'MicroStrategy',qty:'5',value:'$1,200',change:'+2.74%',color:'#f7931a'}].map(h=>(
        <div key={h.symbol} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{backgroundColor:h.color+'20',color:h.color}}>{h.symbol[0]}</div>
            <div><p className="text-sm font-bold text-white">{h.symbol}</p><p className="text-[10px] text-slate-500">{h.name}</p></div>
          </div>
          <div className="text-right"><p className="text-sm font-bold text-white">{h.value}</p><p className="text-emerald-400 text-[10px]">{h.change}</p></div>
        </div>
      ))}
    </div>
    <div className="flex justify-center">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="12"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke="#00e5ff" strokeWidth="12" strokeDasharray="100 151" className="drop-shadow-[0_0_6px_#00e5ff]"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="12" strokeDasharray="60 191" strokeDashoffset="-100"/>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center"><p className="text-lg font-black text-white">$3.7k</p></div>
      </div>
    </div>
  </div>
);

const IntelligencePreview = () => (
  <div className="p-6 space-y-4">
    <div className="flex items-center gap-2 mb-4">
      <Zap className="w-5 h-5 text-[#00e5ff]"/>
      <h3 className="text-lg font-black text-white">Market Intelligence</h3>
    </div>
    <div className="space-y-3">
      {[{source:'U.TODAY',title:'Tether Executes Massive $780M Bitcoin Purchase',tags:['BITCOIN','CRYPTO']},{source:'TRADING ECONOMICS',title:'South Korea Exports Hit Record Highs on AI Chip Demand',tags:['MACRO','TECH']},{source:'SCHWAB/CNBC',title:'Fed Signals Cautious Approach to 2026 Rate Cuts',tags:['MACRO','RATES']}].map((n,i)=>(
        <div key={i} className="bg-white/5 rounded-xl p-3 border-l-2 border-[#00e5ff]">
          <p className="text-[9px] text-[#00e5ff] font-bold">{n.source}</p>
          <p className="text-xs font-bold text-white mt-1 leading-tight">{n.title}</p>
          <div className="flex gap-1 mt-2">{n.tags.map(t=><span key={t} className="text-[8px] bg-white/10 text-slate-400 px-1.5 py-0.5 rounded">{t}</span>)}</div>
        </div>
      ))}
    </div>
  </div>
);

const CopilotPreview = () => (
  <div className="p-6 space-y-4">
    <div className="flex items-center gap-2 mb-4">
      <MessageSquareText className="w-5 h-5 text-[#00e5ff]"/>
      <h3 className="text-lg font-black text-white">AI Market Assistant</h3>
    </div>
    <div className="space-y-3">
      <div className="bg-[#00e5ff]/10 rounded-2xl rounded-tr-sm p-3 ml-8">
        <p className="text-xs text-white">What are the key support levels for XRP?</p>
      </div>
      <div className="bg-white/5 rounded-2xl rounded-tl-sm p-3 mr-4">
        <p className="text-[11px] text-slate-300 leading-relaxed">Based on current order book data and technical pivots:</p>
        <ul className="text-[11px] text-slate-400 mt-2 space-y-1 list-disc ml-4">
          <li><span className="text-white font-medium">$1.80 - $1.82:</span> Immediate structural support</li>
          <li><span className="text-white font-medium">$1.76 - $1.77:</span> Key technical support (0 Fib)</li>
          <li><span className="text-white font-medium">$1.61:</span> Deep support zone</li>
        </ul>
      </div>
    </div>
    <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2">
      <input placeholder="Query the markets..." className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 outline-none"/>
      <button className="w-8 h-8 bg-[#00e5ff] rounded-lg flex items-center justify-center"><Send className="w-4 h-4 text-[#0b0e14]"/></button>
    </div>
  </div>
);

const SHOWCASE_ITEMS = [
  {
    id: 'dashboard',
    title: 'Global Dashboard',
    desc: 'Real-time net worth tracking and global market pulse.',
    icon: LayoutGrid,
    preview: DashboardPreview
  },
  {
    id: 'holdings',
    title: 'Holdings Pulse',
    desc: 'Precision asset tracking with multi-currency support.',
    icon: Wallet,
    preview: HoldingsPreview
  },
  {
    id: 'intelligence',
    title: 'Market Intelligence',
    desc: 'AI-curated news and sentiment analysis.',
    icon: Zap,
    preview: IntelligencePreview
  },
  {
    id: 'copilot',
    title: 'AI Market Assistant',
    desc: 'Smart AI chat for your market questions.',
    icon: MessageSquareText,
    preview: CopilotPreview
  }
];

export const LandingPageShowcase: React.FC<LandingPageShowcaseProps> = ({ onLogin, initialError }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requiresKey, setRequiresKey] = useState(false);

  // Enhanced validation state
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Sync initialError from parent (OAuth callback errors)
  useEffect(() => {
    if (initialError) {
      setError(initialError);
      // If it's an account linking error, make sure we're on signin mode
      if (initialError.toLowerCase().includes('sign in with your password')) {
        setAuthMode('signin');
      }
    }
  }, [initialError]);
  
  // Showcase State
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const rotationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      const aiStudio = (window as any).aistudio;
      if (aiStudio) {
        const hasKey = await aiStudio.hasSelectedApiKey();
        setRequiresKey(!hasKey);
      }
    };
    checkKey();
  }, []);

  const resetRotationTimer = () => {
    if (rotationTimerRef.current) {
      clearInterval(rotationTimerRef.current);
    }
    rotationTimerRef.current = setInterval(() => {
      if (!isHovering) {
        setActiveIndex((prev) => (prev + 1) % SHOWCASE_ITEMS.length);
      }
    }, 3000); // 3 seconds - faster rotation
  };

  // Initialize and clean up rotation
  useEffect(() => {
    if (!isHovering) {
      resetRotationTimer();
    } else {
      if (rotationTimerRef.current) clearInterval(rotationTimerRef.current);
    }

    return () => {
      if (rotationTimerRef.current) clearInterval(rotationTimerRef.current);
    };
  }, [isHovering]);

  const handleManualSelect = (index: number) => {
    setActiveIndex(index);
    // Reset timer so it doesn't auto-rotate immediately after user interaction
    resetRotationTimer();
  };

  const handleKeySelection = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      await aiStudio.openSelectKey();
      setRequiresKey(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  // Email validation with typo suggestions
  const validateEmail = (email: string): string | null => {
    if (!email) return null;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }

    // Common typo suggestions
    const domain = email.split('@')[1];
    if (domain === 'gmial.com') return 'Did you mean gmail.com?';
    if (domain === 'yahooo.com') return 'Did you mean yahoo.com?';
    if (domain === 'gmai.com') return 'Did you mean gmail.com?';

    return null;
  };

  // Password validation
  const validatePassword = (password: string): string | null => {
    if (!password) return null;
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Must include an uppercase letter';
    if (!/[a-z]/.test(password)) return 'Must include a lowercase letter';
    if (!/\d/.test(password)) return 'Must include a number';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    
    if (requiresKey) {
      handleKeySelection();
      return;
    }
    
    setIsLoading(true);

    try {
      if (authMode === 'signup') {
        // Sign Up
        if (password.length < 8) {
          setError('Password must be at least 8 characters');
          setIsLoading(false);
          return;
        }
        const result = await auth.signUp(email, password, name);
        if (result.success) {
          setSuccessMessage('Check your email for confirmation code');
          setAuthMode('confirm');
        } else {
          setError(result.error || 'Sign up failed');
        }
      } else if (authMode === 'signin') {
        // Sign In
        const result = await auth.signIn(email, password);
        if (result.success && result.user) {
          onLogin(result.user.email, result.user.name);
        } else if (result.needsConfirmation) {
          setError('Please verify your email first. Check your inbox for the confirmation code.');
          setAuthMode('confirm');
        } else if (result.error?.includes('Incorrect username or password') || result.error?.includes('User does not exist')) {
          setError('Email or password is incorrect. Forgot your password?');
        } else {
          setError(result.error || 'Sign in failed. Please check your credentials and try again.');
        }
      } else if (authMode === 'confirm') {
        // Confirm Sign Up
        const cleanCode = confirmCode.replace(/-/g, ''); // Remove formatting
        const result = await auth.confirmSignUp(email, cleanCode);
        if (result.success) {
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            setSuccessMessage('Email confirmed! Signing you in...');
            setAuthMode('signin');
            setConfirmCode('');
          }, 1500);
        } else {
          setError(result.error || 'Confirmation failed. Please check your code and try again.');
        }
      } else if (authMode === 'forgot') {
        // Forgot Password
        const result = await auth.forgotPassword(email);
        if (result.success) {
          setSuccessMessage('Check your email for reset code');
          setAuthMode('reset');
        } else {
          setError(result.error || 'Failed to send reset code');
        }
      } else if (authMode === 'reset') {
        // Reset Password
        if (newPassword.length < 8) {
          setError('Password must be at least 8 characters');
          setIsLoading(false);
          return;
        }
        const result = await auth.confirmForgotPassword(email, confirmCode, newPassword);
        if (result.success) {
          setSuccessMessage('Password reset! Please sign in.');
          setAuthMode('signin');
          setConfirmCode('');
          setNewPassword('');
        } else {
          setError(result.error || 'Password reset failed');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    clearMessages();
    setIsLoading(true);
    const result = await auth.resendConfirmationCode(email);
    if (result.success) {
      setSuccessMessage('Confirmation code resent to your email');
    } else {
      setError(result.error || 'Failed to resend code');
    }
    setIsLoading(false);
  };

  const getFormTitle = () => {
    switch (authMode) {
      case 'signup': return 'Establish Pulse Node';
      case 'signin': return 'Connect Session';
      case 'confirm': return 'Verify Email';
      case 'forgot': return 'Reset Password';
      case 'reset': return 'New Password';
    }
  };

  const getFormSubtitle = () => {
    switch (authMode) {
      case 'signup': return 'Start your high-fidelity tracking';
      case 'signin': return 'Access your portfolio dashboard';
      case 'confirm': return 'Enter the code sent to your email';
      case 'forgot': return 'Enter your email to receive reset code';
      case 'reset': return 'Enter code and new password';
    }
  };

  return (
    <div className="h-screen h-[100dvh] bg-[#0b0e14] flex flex-col lg:flex-row overflow-hidden selection:bg-[#00e5ff] selection:text-[#0b0e14]">
      {/* Left Side: Auth Form */}
      <div className="w-full lg:w-[35%] xl:w-[30%] h-full flex flex-col relative z-10 bg-[#0b0e14] overflow-y-auto custom-scrollbar">
        <div className="p-6 sm:p-8 lg:p-12 flex flex-col min-h-min">
            <div className="mb-8 lg:mb-10">
              <Logo />
            </div>

            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto lg:mx-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-6 shrink-0 w-fit">
                <Shield className="w-3 h-3" />
                Personal Wealth Tracker
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-[1] sm:leading-[0.95] mb-6 text-white" style={{ fontSize: 'clamp(2.5rem, 10vw, 4rem)' }}>
                All Assets. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] to-blue-500">
                One Pulse.
                </span>
            </h1>

            <div className="card-surface p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] border-white/5 shadow-2xl bg-[#151921]/50 backdrop-blur-xl mb-12">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                  <div>
                      <h3 className="text-white font-black text-lg sm:text-xl mb-1">{getFormTitle()}</h3>
                      <p className="text-slate-500 text-[10px] sm:text-xs">{getFormSubtitle()}</p>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-red-400 text-xs">{error}</p>
                  </div>
                )}

                {/* Success Message */}
                {successMessage && (
                  <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 animate-in fade-in">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-emerald-400 text-xs">{successMessage}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name Field (signup only) */}
                {authMode === 'signup' && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Pulse Identity</label>
                    <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                        required
                        type="text" 
                        placeholder="Jane Doe"
                        value={name}
                        onChange={(e) => { setName(e.target.value); clearMessages(); }}
                        className="w-full bg-[#0b0e14] border border-white/10 rounded-xl sm:rounded-2xl pl-12 pr-5 py-3.5 text-sm text-white focus:ring-1 focus:ring-[#00e5ff] outline-none transition-all"
                        />
                    </div>
                    </div>
                )}

                {/* Email Field (all modes except reset/confirm) */}
                {(authMode === 'signin' || authMode === 'signup' || authMode === 'forgot') && (
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Secure Email</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                        required
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          clearMessages();
                          if (emailTouched) {
                            setEmailError(validateEmail(e.target.value));
                          }
                        }}
                        onBlur={() => {
                          setEmailTouched(true);
                          setEmailError(validateEmail(email));
                        }}
                        aria-label="Email address"
                        aria-invalid={!!emailError}
                        aria-describedby={emailError ? "email-error" : undefined}
                        className={`w-full bg-[#0b0e14] border ${emailError && emailTouched ? 'border-red-500/50' : 'border-white/10'} rounded-xl sm:rounded-2xl pl-12 pr-5 py-4 sm:py-3.5 text-base sm:text-sm text-white focus:ring-2 focus:ring-[#00e5ff] focus:border-[#00e5ff] outline-none transition-all`}
                        />
                    </div>
                    {emailError && emailTouched && (
                      <div id="email-error" role="alert" className="flex items-center gap-1.5 text-red-400 text-[10px] animate-in fade-in slide-in-from-top-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{emailError}</span>
                      </div>
                    )}
                </div>
                )}

                {/* Password Field (signin & signup) */}
                {(authMode === 'signin' || authMode === 'signup') && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                        required
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          clearMessages();
                          if (authMode === 'signup') {
                            setPasswordError(validatePassword(e.target.value));
                          }
                        }}
                        onFocus={() => authMode === 'signup' && setShowPasswordStrength(true)}
                        aria-label="Password"
                        aria-invalid={!!passwordError}
                        aria-describedby={passwordError ? "password-error" : undefined}
                        className={`w-full bg-[#0b0e14] border ${passwordError && authMode === 'signup' ? 'border-orange-500/50' : 'border-white/10'} rounded-xl sm:rounded-2xl pl-12 pr-12 py-4 sm:py-3.5 text-base sm:text-sm text-white focus:ring-2 focus:ring-[#00e5ff] focus:border-[#00e5ff] outline-none transition-all`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {passwordError && authMode === 'signup' && (
                      <div id="password-error" role="alert" className="flex items-center gap-1.5 text-orange-400 text-[10px] animate-in fade-in slide-in-from-top-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{passwordError}</span>
                      </div>
                    )}
                    {authMode === 'signup' && (
                      <PasswordStrengthMeter password={password} show={showPasswordStrength} />
                    )}
                    </div>
                )}

                {/* Confirmation Code Field */}
                {(authMode === 'confirm' || authMode === 'reset') && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Verification Code</label>
                    <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                        required
                        type="text"
                        inputMode="numeric"
                        placeholder="123456"
                        value={confirmCode}
                        onChange={(e) => {
                          // Auto-format as XXX-XXX and only allow digits
                          const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                          const formatted = value.length > 3 ? `${value.slice(0, 3)}-${value.slice(3)}` : value;
                          setConfirmCode(formatted);
                          clearMessages();
                        }}
                        aria-label="Verification code"
                        className="w-full bg-[#0b0e14] border border-white/10 rounded-xl sm:rounded-2xl pl-12 pr-5 py-4 sm:py-3.5 text-lg sm:text-base text-white focus:ring-2 focus:ring-[#00e5ff] focus:border-[#00e5ff] outline-none transition-all tracking-[0.5em] text-center font-mono"
                        maxLength={7}
                        />
                    </div>
                    <p className="text-[9px] text-slate-600 ml-1 text-center">Enter the 6-digit code from your email</p>
                    </div>
                )}

                {/* New Password Field (reset only) */}
                {authMode === 'reset' && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">New Password</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                        required
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); clearMessages(); }}
                        className="w-full bg-[#0b0e14] border border-white/10 rounded-xl sm:rounded-2xl pl-12 pr-12 py-3.5 text-sm text-white focus:ring-1 focus:ring-[#00e5ff] outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    </div>
                )}

                {requiresKey ? (
                    <div className="p-4 sm:p-5 bg-cyan-500/5 border border-cyan-500/20 rounded-xl sm:rounded-2xl space-y-4 animate-in zoom-in-95">
                    <div className="flex items-start gap-3">
                        <Key className="w-4 h-4 sm:w-5 h-5 text-cyan-400 shrink-0 mt-1" />
                        <div>
                        <h4 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider">Intelligence Access Required</h4>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium leading-relaxed mt-1">
                            FinPulse uses high-tier models. Select an API key from a paid GCP project. 
                            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-cyan-400 ml-1 hover:underline">Billing Docs</a>
                        </p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={handleKeySelection}
                        className="w-full py-3 bg-[#00e5ff] text-[#0b0e14] font-black text-[10px] uppercase tracking-widest rounded-lg sm:rounded-xl hover:opacity-90 transition-all shadow-lg"
                    >
                        Authorize AI Engine
                    </button>
                    </div>
                ) : (
                    <button
                    type="submit"
                    disabled={isLoading || (authMode === 'signup' && (!!emailError || !!passwordError))}
                    aria-label={authMode === 'signup' ? 'Create free account' : authMode === 'signin' ? 'Sign in to your account' : 'Submit form'}
                    className={`w-full py-3.5 sm:py-4 font-black uppercase tracking-widest rounded-xl sm:rounded-2xl transition-all duration-200 flex items-center justify-center shadow-lg gap-2 mt-4 text-[11px] sm:text-xs ${
                      isLoading || (authMode === 'signup' && (!!emailError || !!passwordError))
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-white text-[#0b0e14] hover:bg-[#00e5ff] hover:scale-[1.02] active:scale-[0.98] shadow-[#00e5ff]/20'
                    }`}
                    >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-[#0b0e14]/20 border-t-[#0b0e14] rounded-full animate-spin"></div>
                          <span>Processing...</span>
                        </div>
                    ) : (
                        <>
                        {authMode === 'signup' && 'Create Free Account'}
                        {authMode === 'signin' && 'Sign In'}
                        {authMode === 'confirm' && 'Verify Email'}
                        {authMode === 'forgot' && 'Send Reset Code'}
                        {authMode === 'reset' && 'Reset Password'}
                        <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                    </button>
                )}
                </form>

                {/* Google Sign-In - Show on signin/signup modes */}
                {(authMode === 'signin' || authMode === 'signup') && !requiresKey && (
                  <div className="mt-4">
                    <div className="relative flex items-center justify-center my-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                      </div>
                      <span className="relative px-4 text-[10px] text-slate-500 bg-[#151921]/50">or continue with</span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => auth.initiateGoogleSignIn()}
                      disabled={isLoading}
                      className="w-full py-3 sm:py-3.5 bg-white/5 border border-white/10 text-white font-bold rounded-xl sm:rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-xs"
                    >
                      {/* Google Logo SVG */}
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </button>
                  </div>
                )}

                {/* Trust Badges & Security Footer */}
                {(authMode === 'signin' || authMode === 'signup') && !requiresKey && (
                  <div className="mt-6 space-y-4">
                    <div className="flex flex-wrap gap-2 justify-center">
                      <TrustBadge variant="security" text="256-bit encryption" />
                      <TrustBadge variant="privacy" text="Read-only access" />
                    </div>
                    <SecurityFooter />
                  </div>
                )}
                
                {/* Keyboard Hint */}
                {(authMode === 'signin' || authMode === 'signup') && (
                  <div className="text-[9px] text-slate-600 text-center mt-3">
                    Press <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-slate-500">Tab</kbd> to navigate • <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-slate-500">Enter</kbd> to submit
                  </div>
                )}

                {/* Navigation Links */}
                <div className="mt-4 text-center space-y-2">
                   {authMode === 'signin' && (
                     <>
                       <button onClick={() => { setAuthMode('signup'); clearMessages(); }} className="text-[#00e5ff] text-[10px] font-black uppercase tracking-widest hover:underline block w-full">
                         New User? Create Account
                       </button>
                       <button onClick={() => { setAuthMode('forgot'); clearMessages(); }} className="text-slate-500 text-[10px] font-medium hover:text-slate-300 block w-full">
                         Forgot password?
                       </button>
                     </>
                   )}
                   {authMode === 'signup' && (
                     <button onClick={() => { setAuthMode('signin'); clearMessages(); }} className="text-[#00e5ff] text-[10px] font-black uppercase tracking-widest hover:underline">
                       Already have an account? Sign In
                     </button>
                   )}
                   {authMode === 'confirm' && (
                     <>
                       <button onClick={handleResendCode} disabled={isLoading} className="text-[#00e5ff] text-[10px] font-black uppercase tracking-widest hover:underline block w-full">
                         Resend Code
                       </button>
                       <button onClick={() => { setAuthMode('signin'); clearMessages(); }} className="text-slate-500 text-[10px] font-medium hover:text-slate-300 block w-full">
                         Back to Sign In
                       </button>
                     </>
                   )}
                   {(authMode === 'forgot' || authMode === 'reset') && (
                     <button onClick={() => { setAuthMode('signin'); clearMessages(); }} className="text-slate-500 text-[10px] font-medium hover:text-slate-300">
                       Back to Sign In
                     </button>
                   )}
                </div>
            </div>

            {/* Mobile Feature List - only visible on small screens */}
            <div className="space-y-3 pb-12 lg:hidden" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
              {SHOWCASE_ITEMS.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => handleManualSelect(index)}
                  className={`w-full text-left p-4 rounded-xl border-l-4 transition-all duration-300 group ${
                    activeIndex === index 
                      ? 'bg-white/5 border-[#00e5ff]' 
                      : 'border-transparent hover:bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start gap-4">
                     <div className={`p-2 rounded-lg transition-colors ${activeIndex === index ? 'bg-[#00e5ff]/10 text-[#00e5ff]' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
                        <item.icon className="w-5 h-5" />
                     </div>
                     <div>
                        <h4 className={`text-sm font-black uppercase tracking-wide mb-1 transition-colors ${activeIndex === index ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{item.title}</h4>
                        <p className={`text-[11px] leading-relaxed transition-colors ${activeIndex === index ? 'text-slate-400' : 'text-slate-600'}`}>{item.desc}</p>
                     </div>
                  </div>
                </button>
              ))}
            </div>
            </div>

            <div className="mt-auto pt-8 flex items-center justify-between shrink-0 border-t border-white/5 pb-8 sm:pb-0">
            <p className="text-slate-600 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                © 2025 FinPulse
            </p>
            <div className="flex gap-4">
                <Lock className="w-3 h-3 text-slate-700" />
                <Shield className="w-3 h-3 text-slate-700" />
            </div>
            </div>
        </div>
      </div>

      {/* Middle: Feature Selector Cards - visible on large screens */}
      <div className="hidden lg:flex w-[200px] xl:w-[220px] flex-col justify-center py-8 px-4 border-l border-white/5" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-4 px-2">Explore Features</p>
        <div className="space-y-2">
          {SHOWCASE_ITEMS.map((item, index) => (
            <button
              key={item.id}
              onClick={() => handleManualSelect(index)}
              className={`w-full text-left p-3 rounded-xl transition-all duration-300 group ${
                activeIndex === index 
                  ? 'bg-[#00e5ff]/10 border border-[#00e5ff]/30' 
                  : 'hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                 <div className={`p-1.5 rounded-lg transition-colors ${activeIndex === index ? 'bg-[#00e5ff]/20 text-[#00e5ff]' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
                    <item.icon className="w-4 h-4" />
                 </div>
                 <div className="flex-1 min-w-0">
                    <h4 className={`text-[11px] font-bold truncate transition-colors ${activeIndex === index ? 'text-[#00e5ff]' : 'text-slate-400 group-hover:text-slate-300'}`}>{item.title}</h4>
                 </div>
              </div>
            </button>
          ))}
        </div>
        {/* Progress indicator */}
        <div className="mt-6 px-2">
          <div className="flex gap-1.5">
            {SHOWCASE_ITEMS.map((_, index) => (
              <div 
                key={index}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  activeIndex === index ? 'bg-[#00e5ff]' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Side: Interactive Showcase */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-[#0b0e14] overflow-hidden h-full">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,229,255,0.08),transparent_70%)] pointer-events-none"></div>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="relative w-full max-w-2xl px-12">
           {SHOWCASE_ITEMS.map((item, index) => {
             // Card-deck stacking effect - subtle peek
             const total = SHOWCASE_ITEMS.length;
             const position = (index - activeIndex + total) % total;
             let cardClasses = '';

             if (position === 0) {
               // Active card - fully visible, centered
               cardClasses = 'opacity-100 scale-100 translate-x-0 translate-y-0 z-30';
             } else if (position === 1) {
               // Next card - subtle peek behind, minimal offset
               cardClasses = 'opacity-20 scale-[0.98] translate-x-4 translate-y-2 z-20';
             } else if (position === total - 1) {
               // Previous card - barely visible behind
               cardClasses = 'opacity-10 scale-[0.96] -translate-x-4 translate-y-2 z-10';
             } else {
               // Other cards - hidden
               cardClasses = 'opacity-0 scale-95 translate-y-4 z-0 pointer-events-none';
             }

             return (
               <div
                  key={item.id}
                  className={`absolute inset-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out flex items-center justify-center ${cardClasses}`}
               >
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-[#00e5ff]/20 border border-white/10 bg-[#151921] w-full max-w-2xl">
                     {/* Window Chrome */}
                     <div className="h-8 bg-[#0b0e14] border-b border-white/5 flex items-center px-4 gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60"></div>
                        <span className="ml-4 text-[10px] text-slate-500 font-medium">{item.title}</span>
                     </div>
                     {/* Dynamic Preview Content */}
                     <div className="min-h-[500px]">
                        <item.preview />
                     </div>
                     {/* Overlay Gradient for polish */}
                     <div className="absolute inset-0 bg-gradient-to-tr from-[#00e5ff]/5 to-transparent pointer-events-none"></div>
                  </div>
               </div>
             );
           })}
        </div>
      </div>

      {/* Success Animation Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#0b0e14]/80 backdrop-blur-sm z-50 animate-in fade-in duration-300">
          <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 animate-in zoom-in-95 duration-300">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4 animate-pulse" strokeWidth={2.5} />
            <p className="text-white text-lg font-black text-center">Success!</p>
            <p className="text-slate-400 text-sm text-center mt-2">Email verified successfully</p>
          </div>
        </div>
      )}
    </div>
  );
};