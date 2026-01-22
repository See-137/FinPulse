import React, { useState, useEffect } from 'react';
import { X, Database, RefreshCw, AlertTriangle, CheckCircle2, Copy, Trash2 } from 'lucide-react';
import { usePortfolioStore } from '../store/portfolioStore';
import { componentLogger } from '../services/logger';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
}

interface StorageData {
  portfolioStore: any;
  userSession: any;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose, currentUserId }) => {
  const [storageData, setStorageData] = useState<StorageData | null>(null);
  const [availableUserIds, setAvailableUserIds] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  
  const { setCurrentUser } = usePortfolioStore();

  const loadStorageData = () => {
    try {
      const portfolioStore = JSON.parse(localStorage.getItem('finpulse-portfolio-store') || '{}');
      const userSession = JSON.parse(localStorage.getItem('finpulse_user_session') || 'null');
      
      setStorageData({ portfolioStore, userSession });
      
      // Extract all user IDs from holdings and watchlists
      const holdingsKeys = Object.keys(portfolioStore?.state?.userHoldings || {});
      const watchlistKeys = Object.keys(portfolioStore?.state?.userWatchlists || {});
      const allKeys = [...new Set([...holdingsKeys, ...watchlistKeys])];
      setAvailableUserIds(allKeys);
      
    } catch (e) {
      componentLogger.error('Failed to load storage data:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStorageData();
    }
  }, [isOpen]);

  const getHoldingsCount = (userId: string): number => {
    return storageData?.portfolioStore?.state?.userHoldings?.[userId]?.length || 0;
  };

  const getWatchlistCount = (userId: string): number => {
    return storageData?.portfolioStore?.state?.userWatchlists?.[userId]?.length || 0;
  };

  const migrateData = (fromUserId: string, toUserId: string) => {
    if (!fromUserId || !toUserId) return;
    
    try {
      const portfolioStore = JSON.parse(localStorage.getItem('finpulse-portfolio-store') || '{}');
      
      // Copy holdings
      if (portfolioStore?.state?.userHoldings?.[fromUserId]) {
        portfolioStore.state.userHoldings[toUserId] = [
          ...(portfolioStore.state.userHoldings[toUserId] || []),
          ...portfolioStore.state.userHoldings[fromUserId]
        ];
      }
      
      // Copy watchlist
      if (portfolioStore?.state?.userWatchlists?.[fromUserId]) {
        portfolioStore.state.userWatchlists[toUserId] = [
          ...(portfolioStore.state.userWatchlists[toUserId] || []),
          ...portfolioStore.state.userWatchlists[fromUserId]
        ];
      }
      
      localStorage.setItem('finpulse-portfolio-store', JSON.stringify(portfolioStore));
      setMigrationStatus(`✅ Migrated data from ${fromUserId.slice(0, 8)}... to ${toUserId.slice(0, 8)}...`);
      
      // Reload to reflect changes
      loadStorageData();
      
      // Force store refresh
      if (toUserId === currentUserId) {
        setCurrentUser(toUserId);
      }
      
    } catch (e) {
      setMigrationStatus(`❌ Migration failed: ${e}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const clearOldUserData = (userId: string) => {
    if (!confirm(`Delete all data for user ${userId.slice(0, 8)}...? This cannot be undone.`)) return;
    
    try {
      const portfolioStore = JSON.parse(localStorage.getItem('finpulse-portfolio-store') || '{}');
      
      if (portfolioStore?.state?.userHoldings?.[userId]) {
        delete portfolioStore.state.userHoldings[userId];
      }
      if (portfolioStore?.state?.userWatchlists?.[userId]) {
        delete portfolioStore.state.userWatchlists[userId];
      }
      
      localStorage.setItem('finpulse-portfolio-store', JSON.stringify(portfolioStore));
      setMigrationStatus(`🗑️ Deleted data for ${userId.slice(0, 8)}...`);
      loadStorageData();
      
    } catch (e) {
      setMigrationStatus(`❌ Delete failed: ${e}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Debug Panel - Asset Recovery</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Current User Info */}
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Current Session</h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">User ID:</span>
                <span className="text-cyan-400 font-mono flex items-center gap-1">
                  {currentUserId ? (
                    <>
                      {currentUserId.slice(0, 20)}...
                      <button onClick={() => copyToClipboard(currentUserId)} className="hover:text-cyan-300">
                        <Copy className="h-3 w-3" />
                      </button>
                    </>
                  ) : 'Not logged in'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="text-white">{storageData?.userSession?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Holdings:</span>
                <span className="text-green-400">{currentUserId ? getHoldingsCount(currentUserId) : 0}</span>
              </div>
            </div>
          </div>

          {/* Available User Data */}
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-300">Stored User Data</h3>
              <button onClick={loadStorageData} className="p-1 hover:bg-slate-700 rounded">
                <RefreshCw className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            
            {availableUserIds.length === 0 ? (
              <p className="text-xs text-slate-500">No user data found in localStorage</p>
            ) : (
              <div className="space-y-2">
                {availableUserIds.map(userId => (
                  <div 
                    key={userId} 
                    className={`p-2 rounded border ${
                      userId === currentUserId 
                        ? 'border-cyan-500 bg-cyan-500/10' 
                        : 'border-slate-600 bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-mono text-xs text-white flex items-center gap-1">
                          {userId.slice(0, 24)}...
                          <button onClick={() => copyToClipboard(userId)} className="hover:text-cyan-300">
                            <Copy className="h-3 w-3 text-slate-400" />
                          </button>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {getHoldingsCount(userId)} holdings, {getWatchlistCount(userId)} watchlist
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {userId === currentUserId ? (
                          <span className="text-xs text-cyan-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Current
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => setSelectedUserId(userId)}
                              className="px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded"
                            >
                              Migrate
                            </button>
                            <button
                              onClick={() => clearOldUserData(userId)}
                              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Migration Confirmation */}
          {selectedUserId && currentUserId && selectedUserId !== currentUserId && (
            <div className="bg-amber-500/20 border border-amber-500 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-amber-300">Confirm Migration</h4>
                  <p className="text-xs text-amber-200 mt-1">
                    This will copy {getHoldingsCount(selectedUserId)} holdings and {getWatchlistCount(selectedUserId)} watchlist items 
                    from <span className="font-mono">{selectedUserId.slice(0, 8)}...</span> to your current account.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        migrateData(selectedUserId, currentUserId);
                        setSelectedUserId(null);
                      }}
                      className="px-3 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded"
                    >
                      Confirm Migration
                    </button>
                    <button
                      onClick={() => setSelectedUserId(null)}
                      className="px-3 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-white rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status Message */}
          {migrationStatus && (
            <div className="p-2 bg-slate-800 rounded border border-slate-700 text-xs text-slate-300">
              {migrationStatus}
            </div>
          )}

          {/* Raw Data View */}
          <details className="bg-slate-800 rounded-lg border border-slate-700">
            <summary className="p-3 cursor-pointer text-sm font-semibold text-slate-300 hover:text-white">
              Raw Storage Data (Advanced)
            </summary>
            <pre className="p-3 text-xs text-slate-400 overflow-x-auto border-t border-slate-700 max-h-40">
              {JSON.stringify(storageData, null, 2)}
            </pre>
          </details>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700 text-xs text-slate-500">
          💡 Tip: If you see data under a different User ID, use "Migrate" to copy it to your current account.
        </div>
      </div>
    </div>
  );
};
