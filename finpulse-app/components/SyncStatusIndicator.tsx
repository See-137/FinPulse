/**
 * Sync Status Indicator Component
 * Shows visual feedback for portfolio sync status with retry capability
 * Displays pending operations count and allows manual retry
 */

import React from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { usePortfolioStore } from '../store/portfolioStore';

interface SyncStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const { 
    syncStatus, 
    lastSyncError, 
    lastSyncTime, 
    pendingOperations,
    isSyncing,
    retryPendingOperations,
    clearSyncError
  } = usePortfolioStore();

  const pendingCount = pendingOperations.length;

  // Format last sync time
  const formatLastSync = () => {
    if (!lastSyncTime) return null;
    const diff = Date.now() - lastSyncTime;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(lastSyncTime).toLocaleDateString();
  };

  const handleRetry = async () => {
    await retryPendingOperations();
  };

  // Minimal indicator for nav bar
  if (!showDetails) {
    if (syncStatus === 'idle' && pendingCount === 0) {
      return null; // Don't show when everything is synced
    }

    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {syncStatus === 'syncing' && (
          <RefreshCw className="w-4 h-4 text-[#00e5ff] animate-spin" />
        )}
        {syncStatus === 'error' && (
          <button 
            onClick={handleRetry}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs hover:bg-amber-500/20 transition-colors"
            title={lastSyncError || 'Sync error - click to retry'}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {pendingCount > 0 && <span>{pendingCount}</span>}
          </button>
        )}
        {syncStatus === 'offline' && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-500/10 border border-slate-500/20 text-slate-400 text-xs">
            <CloudOff className="w-3.5 h-3.5" />
            <span>Offline</span>
          </div>
        )}
      </div>
    );
  }

  // Detailed indicator for settings or portfolio view
  return (
    <div className={`rounded-xl border p-4 ${className} ${
      syncStatus === 'error' 
        ? 'bg-amber-500/5 border-amber-500/20' 
        : syncStatus === 'offline'
        ? 'bg-slate-500/5 border-slate-500/20'
        : 'bg-slate-100 dark:bg-[#151921] border-slate-200 dark:border-white/10'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {syncStatus === 'idle' && (
            <>
              <Cloud className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Synced</span>
            </>
          )}
          {syncStatus === 'syncing' && (
            <>
              <RefreshCw className="w-5 h-5 text-[#00e5ff] animate-spin" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Syncing...</span>
            </>
          )}
          {syncStatus === 'error' && (
            <>
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">Sync Error</span>
            </>
          )}
          {syncStatus === 'offline' && (
            <>
              <CloudOff className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-400">Offline Mode</span>
            </>
          )}
        </div>
        
        {lastSyncTime && syncStatus === 'idle' && (
          <span className="text-xs text-slate-500">{formatLastSync()}</span>
        )}
      </div>

      {/* Error details */}
      {lastSyncError && (
        <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-300 mb-2">{lastSyncError}</p>
          <div className="flex gap-2">
            <button
              onClick={handleRetry}
              disabled={isSyncing}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Retry ({pendingCount})
            </button>
            <button
              onClick={clearSyncError}
              className="px-3 py-1.5 rounded-lg text-slate-400 text-xs hover:text-slate-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Pending operations */}
      {pendingCount > 0 && !lastSyncError && (
        <div className="mt-2 text-xs text-slate-500">
          {pendingCount} pending operation{pendingCount > 1 ? 's' : ''} waiting to sync
        </div>
      )}

      {/* Success state */}
      {syncStatus === 'idle' && pendingCount === 0 && !lastSyncError && (
        <div className="flex items-center gap-1 text-xs text-green-400">
          <Check className="w-3.5 h-3.5" />
          All changes saved to cloud
        </div>
      )}
    </div>
  );
};

export default SyncStatusIndicator;
