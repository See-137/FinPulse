/**
 * Data Freshness Indicator Component
 *
 * Shows visual feedback for data freshness status:
 * - Live: Real-time data (green)
 * - Stale: Cached data older than threshold (yellow)
 * - Demo: Mock/fallback data (gray)
 *
 * Used in PortfolioView, MarketTicker, and other data-displaying components
 * to help users understand the quality of data they're viewing.
 */

import React from 'react';
import { Wifi, WifiOff, Clock, Database, AlertCircle } from 'lucide-react';

export type DataFreshnessStatus = 'live' | 'stale' | 'demo' | 'error' | 'loading';

interface DataFreshnessIndicatorProps {
  status: DataFreshnessStatus;
  lastUpdated?: number | null;
  /** Threshold in seconds after which data is considered stale */
  staleThreshold?: number;
  /** Show compact version (icon only with tooltip) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Custom label override */
  label?: string;
  /** Show timestamp */
  showTimestamp?: boolean;
}

/**
 * Format time ago string
 */
function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleTimeString();
}

/**
 * Determine status based on timestamp and threshold
 */
export function getDataFreshnessStatus(
  lastUpdated: number | null | undefined,
  staleThreshold: number = 300, // 5 minutes default
  isDemo: boolean = false,
  isError: boolean = false
): DataFreshnessStatus {
  if (isError) return 'error';
  if (isDemo) return 'demo';
  if (!lastUpdated) return 'loading';

  const ageSeconds = (Date.now() - lastUpdated) / 1000;
  return ageSeconds > staleThreshold ? 'stale' : 'live';
}

const STATUS_CONFIG: Record<DataFreshnessStatus, {
  icon: React.FC<{ className?: string }>;
  label: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  iconClass: string;
  pulse?: boolean;
}> = {
  live: {
    icon: Wifi,
    label: 'Live',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/20',
    textClass: 'text-emerald-400',
    iconClass: 'text-emerald-400',
    pulse: true,
  },
  stale: {
    icon: Clock,
    label: 'Stale',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/20',
    textClass: 'text-amber-400',
    iconClass: 'text-amber-400',
  },
  demo: {
    icon: Database,
    label: 'Demo',
    bgClass: 'bg-slate-500/10',
    borderClass: 'border-slate-500/20',
    textClass: 'text-slate-400',
    iconClass: 'text-slate-400',
  },
  error: {
    icon: AlertCircle,
    label: 'Error',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/20',
    textClass: 'text-rose-400',
    iconClass: 'text-rose-400',
  },
  loading: {
    icon: WifiOff,
    label: 'Loading',
    bgClass: 'bg-slate-500/10',
    borderClass: 'border-slate-500/20',
    textClass: 'text-slate-500',
    iconClass: 'text-slate-500 animate-pulse',
  },
};

export const DataFreshnessIndicator: React.FC<DataFreshnessIndicatorProps> = ({
  status,
  lastUpdated,
  compact = false,
  className = '',
  label: customLabel,
  showTimestamp = false,
}) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const displayLabel = customLabel || config.label;
  const timeAgo = lastUpdated ? formatTimeAgo(lastUpdated) : null;

  // Compact mode - icon only with title tooltip
  if (compact) {
    return (
      <div
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${config.bgClass} ${config.borderClass} border ${className}`}
        title={`${displayLabel}${timeAgo ? ` - ${timeAgo}` : ''}`}
      >
        <Icon className={`w-3 h-3 ${config.iconClass}`} />
        {config.pulse && status === 'live' && (
          <span className="absolute w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-75" />
        )}
      </div>
    );
  }

  // Full mode - icon + label + optional timestamp
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bgClass} ${config.borderClass} border ${className}`}
    >
      <div className="relative">
        <Icon className={`w-3 h-3 ${config.iconClass}`} />
        {config.pulse && status === 'live' && (
          <span className="absolute inset-0 w-3 h-3 bg-emerald-400 rounded-full animate-ping opacity-30" />
        )}
      </div>
      <span className={`text-[9px] font-black uppercase tracking-wider ${config.textClass}`}>
        {displayLabel}
      </span>
      {showTimestamp && timeAgo && (
        <span className={`text-[9px] ${config.textClass} opacity-70`}>
          {timeAgo}
        </span>
      )}
    </div>
  );
};

/**
 * Hook to manage data freshness state
 */
export function useDataFreshness(
  staleThreshold: number = 300,
  options?: {
    isDemo?: boolean;
    isError?: boolean;
  }
) {
  const [lastUpdated, setLastUpdated] = React.useState<number | null>(null);

  const status = React.useMemo(
    () => getDataFreshnessStatus(
      lastUpdated,
      staleThreshold,
      options?.isDemo ?? false,
      options?.isError ?? false
    ),
    [lastUpdated, staleThreshold, options?.isDemo, options?.isError]
  );

  const markFresh = React.useCallback(() => {
    setLastUpdated(Date.now());
  }, []);

  const reset = React.useCallback(() => {
    setLastUpdated(null);
  }, []);

  return {
    status,
    lastUpdated,
    markFresh,
    reset,
    setLastUpdated,
  };
}

export default DataFreshnessIndicator;
