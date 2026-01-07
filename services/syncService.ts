/**
 * Real-Time Sync Service
 * Enables cross-device synchronization of portfolio data
 * Uses WebSocket for instant updates and localStorage for offline support
 */

import { config } from '../config';

export interface SyncEvent {
  type: 'holding_add' | 'holding_update' | 'holding_remove' | 'settings_update' | 'watchlist_update';
  payload: any;
  timestamp: number;
  deviceId: string;
  userId: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  lastSeen: number;
  browser: string;
  os: string;
  isCurrent: boolean;
}

type SyncCallback = (event: SyncEvent) => void;

class RealTimeSyncService {
  private ws: WebSocket | null = null;
  private deviceId: string;
  private userId: string | null = null;
  private syncCallbacks: Set<SyncCallback> = new Set();
  private pendingEvents: SyncEvent[] = [];
  private isOnline: boolean = navigator.onLine;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private maxReconnectAttempts = 5;
  private reconnectAttempts = 0;
  private getAuthToken = (): string | null => {
    return localStorage.getItem('finpulse_id_token') || localStorage.getItem('finpulse_access_token');
  };

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.setupOnlineListeners();
    this.loadPendingEvents();
  }

  /**
   * Get or create unique device identifier
   */
  private getOrCreateDeviceId(): string {
    const stored = localStorage.getItem('finpulse_device_id');
    if (stored) return stored;

    const newId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('finpulse_device_id', newId);
    return newId;
  }

  /**
   * Setup online/offline event listeners
   */
  private setupOnlineListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processPendingEvents();
      this.reconnect();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Load pending events from localStorage
   */
  private loadPendingEvents(): void {
    const stored = localStorage.getItem('finpulse_pending_sync');
    if (stored) {
      try {
        this.pendingEvents = JSON.parse(stored);
      } catch {
        this.pendingEvents = [];
      }
    }
  }

  /**
   * Save pending events to localStorage
   */
  private savePendingEvents(): void {
    localStorage.setItem('finpulse_pending_sync', JSON.stringify(this.pendingEvents));
  }

  /**
   * Initialize sync connection for user
   */
  connect(userId: string, accessToken: string): void {
    this.userId = userId;
    
    // Store device info
    this.registerDevice(accessToken);
    
    // Connect to sync WebSocket (if available)
    this.connectWebSocket(accessToken);
    
    // Process any pending offline events
    this.processPendingEvents();
  }

  /**
   * Connect to sync WebSocket endpoint
   */
  private connectWebSocket(accessToken: string): void {
    // Note: This would connect to your actual sync WebSocket endpoint
    // For now, we use a polling fallback approach
    const wsUrl = config.api.syncEndpoint;
    
    if (!wsUrl || wsUrl === 'undefined') {
      console.log('Sync WebSocket not configured, using polling fallback');
      this.startPollingSync();
      return;
    }

    try {
      this.ws = new WebSocket(`${wsUrl}?token=${accessToken}&device=${this.deviceId}`);
      
      this.ws.onopen = () => {
        console.log('📡 Sync WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const syncEvent: SyncEvent = JSON.parse(event.data);
          // Don't process our own events
          if (syncEvent.deviceId !== this.deviceId) {
            this.notifyCallbacks(syncEvent);
          }
        } catch (error) {
          console.error('Failed to parse sync event:', error);
        }
      };

      this.ws.onclose = () => {
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Sync WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create sync WebSocket:', error);
      this.startPollingSync();
    }
  }

  /**
   * Fallback: Poll for sync updates
   */
  private pollingInterval: NodeJS.Timeout | null = null;
  
  private startPollingSync(): void {
    if (this.pollingInterval) return;
    
    // Poll every 30 seconds for changes
    this.pollingInterval = setInterval(() => {
      this.fetchRemoteChanges();
    }, 30000);
  }

  /**
   * Fetch remote changes from API
   */
  private async fetchRemoteChanges(): Promise<void> {
    if (!this.userId || !this.isOnline) return;

    try {
      const lastSync = localStorage.getItem('finpulse_last_sync') || '0';
      const token = this.getAuthToken();
      const response = await fetch(`${config.api.baseUrl}/sync/changes?since=${lastSync}&device=${this.deviceId}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const events: SyncEvent[] = await response.json();
        events.forEach(event => {
          if (event.deviceId !== this.deviceId) {
            this.notifyCallbacks(event);
          }
        });
        localStorage.setItem('finpulse_last_sync', Date.now().toString());
      }
    } catch (error) {
      console.error('Failed to fetch sync changes:', error);
    }
  }

  /**
   * Schedule WebSocket reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnect();
    }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000));
  }

  /**
   * Reconnect WebSocket
   */
  private reconnect(): void {
    if (!this.userId || !this.isOnline) return;
    
    const token = this.getAuthToken();
    if (token) {
      this.connectWebSocket(token);
    }
  }

  /**
   * Register device with server
   */
  private async registerDevice(accessToken: string): Promise<void> {
    const deviceInfo: DeviceInfo = {
      deviceId: this.deviceId,
      deviceName: this.getDeviceName(),
      lastSeen: Date.now(),
      browser: this.getBrowser(),
      os: this.getOS(),
      isCurrent: true,
    };

    try {
      await fetch(`${config.api.baseUrl}/auth/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(deviceInfo),
      });
    } catch (error) {
      // Device registration is optional, don't fail
      console.warn('Could not register device:', error);
    }
  }

  /**
   * Get user-friendly device name
   */
  private getDeviceName(): string {
    const ua = navigator.userAgent;
    if (/Mobile/.test(ua)) return 'Mobile Device';
    if (/Tablet/.test(ua)) return 'Tablet';
    return 'Desktop';
  }

  /**
   * Get browser name
   */
  private getBrowser(): string {
    const ua = navigator.userAgent;
    if (/Chrome/.test(ua)) return 'Chrome';
    if (/Firefox/.test(ua)) return 'Firefox';
    if (/Safari/.test(ua)) return 'Safari';
    if (/Edge/.test(ua)) return 'Edge';
    return 'Unknown';
  }

  /**
   * Get OS name
   */
  private getOS(): string {
    const ua = navigator.userAgent;
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac/.test(ua)) return 'macOS';
    if (/Linux/.test(ua)) return 'Linux';
    if (/Android/.test(ua)) return 'Android';
    if (/iOS|iPhone|iPad/.test(ua)) return 'iOS';
    return 'Unknown';
  }

  /**
   * Broadcast sync event to other devices
   */
  broadcast(type: SyncEvent['type'], payload: any): void {
    if (!this.userId) return;

    const event: SyncEvent = {
      type,
      payload,
      timestamp: Date.now(),
      deviceId: this.deviceId,
      userId: this.userId,
    };

    if (this.isOnline && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    } else {
      // Queue for later
      this.pendingEvents.push(event);
      this.savePendingEvents();
    }
  }

  /**
   * Process pending events when back online
   */
  private async processPendingEvents(): Promise<void> {
    if (!this.isOnline || this.pendingEvents.length === 0) return;

    const events = [...this.pendingEvents];
    this.pendingEvents = [];
    this.savePendingEvents();

    for (const event of events) {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(event));
      }
    }
  }

  /**
   * Subscribe to sync events
   */
  subscribe(callback: SyncCallback): () => void {
    this.syncCallbacks.add(callback);
    return () => this.syncCallbacks.delete(callback);
  }

  /**
   * Notify all subscribers of sync event
   */
  private notifyCallbacks(event: SyncEvent): void {
    this.syncCallbacks.forEach(cb => cb(event));
  }

  /**
   * Get list of logged-in devices
   */
  async getDevices(): Promise<DeviceInfo[]> {
    try {
      const token = this.getAuthToken();
      const response = await fetch(`${config.api.baseUrl}/auth/devices`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const devices: DeviceInfo[] = await response.json();
        return devices.map(d => ({
          ...d,
          isCurrent: d.deviceId === this.deviceId,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    }
    return [];
  }

  /**
   * Revoke session for a specific device
   */
  async revokeDevice(deviceId: string): Promise<boolean> {
    try {
      const token = this.getAuthToken();
      const response = await fetch(`${config.api.baseUrl}/auth/devices/${deviceId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to revoke device:', error);
      return false;
    }
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllOtherDevices(): Promise<boolean> {
    try {
      const token = this.getAuthToken();
      const response = await fetch(`${config.api.baseUrl}/auth/devices/revoke-all`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'X-Current-Device': this.deviceId,
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to revoke all devices:', error);
      return false;
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.userId = null;
    
    if (this.ws) {
      this.ws.close(1000, 'User logout');
      this.ws = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

// Singleton instance
export const syncService = new RealTimeSyncService();
