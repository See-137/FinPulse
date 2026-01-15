import { useEffect, useState, useCallback } from 'react';
import { syncService, SyncEvent, DeviceInfo } from '../services/syncService';
import { usePortfolioStore } from '../store/portfolioStore';

/**
 * Hook for real-time portfolio sync across devices
 */
export function useRealtimeSync(userId: string | null, accessToken: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const { addHolding, updateHolding, removeHolding, setHoldings } = usePortfolioStore();

  useEffect(() => {
    if (!userId || !accessToken) return;

    // Connect to sync service
    syncService.connect(userId, accessToken);
    setIsConnected(true);

    // Subscribe to sync events
    const unsubscribe = syncService.subscribe((event: SyncEvent) => {
      switch (event.type) {
        case 'holding_add':
          addHolding(event.payload);
          break;
        case 'holding_update':
          updateHolding(event.payload.symbol, event.payload);
          break;
        case 'holding_remove':
          removeHolding(event.payload.symbol);
          break;
        case 'settings_update':
          // Handle settings update
          break;
        case 'watchlist_update':
          // Handle watchlist update
          break;
      }
    });

    return () => {
      unsubscribe();
      syncService.disconnect();
      setIsConnected(false);
    };
  }, [userId, accessToken, addHolding, updateHolding, removeHolding]);

  // Broadcast functions
  const broadcastHoldingAdd = useCallback((holding: any) => {
    syncService.broadcast('holding_add', holding);
  }, []);

  const broadcastHoldingUpdate = useCallback((holding: any) => {
    syncService.broadcast('holding_update', holding);
  }, []);

  const broadcastHoldingRemove = useCallback((symbol: string) => {
    syncService.broadcast('holding_remove', { symbol });
  }, []);

  return {
    isConnected,
    broadcastHoldingAdd,
    broadcastHoldingUpdate,
    broadcastHoldingRemove,
  };
}

/**
 * Hook for device management
 */
export function useDeviceManagement() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const deviceList = await syncService.getDevices();
      setDevices(deviceList);
    } catch (err) {
      setError('Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  }, []);

  const revokeDevice = useCallback(async (deviceId: string) => {
    setLoading(true);
    try {
      const success = await syncService.revokeDevice(deviceId);
      if (success) {
        setDevices(prev => prev.filter(d => d.deviceId !== deviceId));
      }
      return success;
    } catch (err) {
      setError('Failed to revoke device');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const revokeAllOther = useCallback(async () => {
    setLoading(true);
    try {
      const success = await syncService.revokeAllOtherDevices();
      if (success) {
        setDevices(prev => prev.filter(d => d.isCurrent));
      }
      return success;
    } catch (err) {
      setError('Failed to revoke devices');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    devices,
    loading,
    error,
    fetchDevices,
    revokeDevice,
    revokeAllOther,
  };
}
