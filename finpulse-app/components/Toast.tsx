/**
 * FinPulse Toast Notification System
 * Replaces browser alert() with styled in-app notifications.
 *
 * Usage:
 *   1. Wrap app with <ToastProvider>
 *   2. const { showToast } = useToast();
 *   3. showToast('Message', 'success');         // auto-dismiss 4s
 *   4. showToast('Message', 'error', 6000);     // auto-dismiss 6s
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

// ---- Individual toast item ----
const ToastNotification: React.FC<{
  toast: ToastItem;
  onDismiss: (id: number) => void;
}> = ({ toast, onDismiss }) => {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, toast.duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, toast.duration, onDismiss]);

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  const variantConfig = {
    success: {
      icon: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
    },
    error: {
      icon: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
      border: 'border-red-500/30',
      bg: 'bg-red-500/10',
    },
    info: {
      icon: <Info className="w-5 h-5 text-[#00e5ff] shrink-0" />,
      border: 'border-[#00e5ff]/30',
      bg: 'bg-[#00e5ff]/10',
    },
  };

  const config = variantConfig[toast.variant];

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl max-w-sm w-full
        bg-[#151921]/95 ${config.border} transition-all duration-300
        ${exiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0 animate-slide-up'}`}
    >
      <div className={`p-1.5 rounded-lg ${config.bg}`}>
        {config.icon}
      </div>
      <p className="text-sm text-slate-200 flex-1 min-w-0 leading-relaxed pt-0.5">{toast.message}</p>
      <button
        onClick={handleDismiss}
        className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4 text-slate-500" />
      </button>
    </div>
  );
};

// ---- Provider ----
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info', duration?: number) => {
    const defaultDurations: Record<ToastVariant, number> = {
      success: 4000,
      error: 6000,
      info: 4000,
    };
    const id = ++idRef.current;
    setToasts(prev => [...prev.slice(-4), { id, message, variant, duration: duration ?? defaultDurations[variant] }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 right-6 z-[70] flex flex-col gap-3 pointer-events-auto">
          {toasts.map(t => (
            <ToastNotification key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
