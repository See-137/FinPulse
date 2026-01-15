import React, { useEffect } from 'react';
import { Monitor, Smartphone, Tablet, X, RefreshCw, Shield, Clock } from 'lucide-react';
import { useDeviceManagement } from '../hooks/useRealtimeSync';
import { DeviceInfo } from '../services/syncService';

interface DeviceManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Device Management Component
 * Lists all logged-in devices and allows session revocation
 */
export const DeviceManager: React.FC<DeviceManagerProps> = ({ isOpen, onClose }) => {
  const { devices, loading, error, fetchDevices, revokeDevice, revokeAllOther } = useDeviceManagement();

  useEffect(() => {
    if (isOpen) {
      fetchDevices();
    }
  }, [isOpen, fetchDevices]);

  const getDeviceIcon = (device: DeviceInfo) => {
    const iconClass = "w-5 h-5";
    switch (device.deviceName) {
      case 'Mobile Device':
        return <Smartphone className={iconClass} />;
      case 'Tablet':
        return <Tablet className={iconClass} />;
      default:
        return <Monitor className={iconClass} />;
    }
  };

  const formatLastSeen = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#0c0f14] rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden border border-slate-200 dark:border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-xl">
              <Shield className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold dark:text-white">Device Management</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage your logged-in devices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {loading && devices.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 text-sm">{error}</p>
              <button
                onClick={fetchDevices}
                className="mt-4 px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 text-sm">No other devices found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.deviceId}
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    device.isCurrent
                      ? 'bg-cyan-500/5 border-cyan-500/20'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      device.isCurrent 
                        ? 'bg-cyan-500/10 text-cyan-500' 
                        : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                    }`}>
                      {getDeviceIcon(device)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm dark:text-white">
                          {device.deviceName}
                        </span>
                        {device.isCurrent && (
                          <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-500 text-[10px] font-bold rounded-full">
                            THIS DEVICE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>{device.browser} • {device.os}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatLastSeen(device.lastSeen)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {!device.isCurrent && (
                    <button
                      onClick={() => revokeDevice(device.deviceId)}
                      disabled={loading}
                      className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {devices.length > 1 && (
          <div className="p-6 border-t border-slate-200 dark:border-white/10">
            <button
              onClick={revokeAllOther}
              disabled={loading}
              className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Revoking...' : 'Log Out All Other Devices'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
