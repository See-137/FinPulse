import React from 'react';
import { Shield, Lock, Eye, CheckCircle, Users } from 'lucide-react';

interface TrustBadgeProps {
  variant: 'security' | 'privacy' | 'social' | 'verified';
  text?: string;
  compact?: boolean;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({ variant, text, compact = false }) => {
  const badges = {
    security: {
      icon: Shield,
      defaultText: 'Bank-level encryption',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    privacy: {
      icon: Eye,
      defaultText: 'Your data is private',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    social: {
      icon: Users,
      defaultText: 'Trusted by 10,000+ investors',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
    verified: {
      icon: CheckCircle,
      defaultText: 'Verified secure',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
  };

  const badge = badges[variant];
  const Icon = badge.icon;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${badge.color}`} title={text || badge.defaultText}>
        <Icon className="w-3.5 h-3.5" />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${badge.bg} ${badge.border} ${badge.color}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-[10px] font-bold">{text || badge.defaultText}</span>
    </div>
  );
};

export const TrustBadgeGroup: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex flex-wrap items-center gap-2 ${className}`}>
    <TrustBadge variant="security" />
    <TrustBadge variant="privacy" text="Read-only access" />
  </div>
);

export const SecurityFooter: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-4 pt-4 border-t border-white/5 ${className}`}>
    <div className="flex items-center gap-1.5 text-slate-600">
      <Lock className="w-3 h-3" />
      <span className="text-[9px] font-medium">SSL Encrypted</span>
    </div>
    <div className="flex items-center gap-1.5 text-slate-600">
      <Shield className="w-3 h-3" />
      <span className="text-[9px] font-medium">SOC 2 Compliant</span>
    </div>
  </div>
);
