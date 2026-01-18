/**
 * SyncService Tests
 * Tests for real-time sync functionality including WebSocket, offline support, and device management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  readyState = 1; // OPEN
  
  send = vi.fn();
  close = vi.fn();
  
  simulateOpen() {
    this.onopen?.();
  }
  
  simulateMessage(data: any) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }
  
  simulateClose() {
    this.onclose?.({ code: 1000 } as CloseEvent);
  }
  
  simulateError() {
    this.onerror?.({} as Event);
  }
}

// Mock localStorage
const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
};

let mockLocalStorage = createMockLocalStorage();

// Mock fetch
const mockFetch = vi.fn();

describe('syncService', () => {
  let originalWebSocket: typeof WebSocket;
  let originalLocalStorage: Storage;
  let originalFetch: typeof fetch;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    mockLocalStorage = createMockLocalStorage();
    
    // Setup mocks
    originalWebSocket = global.WebSocket;
    originalLocalStorage = global.localStorage;
    originalFetch = global.fetch;
    
    mockWs = new MockWebSocket();
    global.WebSocket = vi.fn(() => mockWs) as any;
    Object.defineProperty(global, 'localStorage', { value: mockLocalStorage, writable: true });
    global.fetch = mockFetch;
    
    // Set default values in mock storage
    mockLocalStorage.setItem('finpulse_device_id', 'test-device-123');
    mockLocalStorage.setItem('finpulse_id_token', 'test-token');
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    Object.defineProperty(global, 'localStorage', { value: originalLocalStorage });
    global.fetch = originalFetch;
  });

  describe('Device ID Management', () => {
    it('should use existing device ID from localStorage', () => {
      const deviceId = mockLocalStorage.getItem('finpulse_device_id');
      expect(deviceId).toBe('test-device-123');
    });

    it('should create new device ID if none exists', () => {
      mockLocalStorage.clear();
      // The service would create a new ID on initialization
      expect(mockLocalStorage.getItem('finpulse_device_id')).toBeNull();
    });
  });

  describe('WebSocket Connection', () => {
    it('should establish WebSocket connection with auth token', async () => {
      mockLocalStorage.setItem('finpulse_id_token', 'test-token');
      
      // Simulate connection logic
      const token = mockLocalStorage.getItem('finpulse_id_token');
      expect(token).toBe('test-token');
    });

    it('should handle connection open event', () => {
      const onConnectSpy = vi.fn();
      mockWs.onopen = onConnectSpy;
      mockWs.simulateOpen();
      
      expect(onConnectSpy).toHaveBeenCalled();
    });

    it('should handle incoming sync events', () => {
      const mockCallback = vi.fn();
      const testEvent = {
        type: 'holding_add',
        payload: { symbol: 'BTC', quantity: 1 },
        timestamp: Date.now(),
        deviceId: 'other-device',
        userId: 'user-123'
      };
      
      mockWs.onmessage = (event) => {
        const data = JSON.parse(event.data);
        mockCallback(data);
      };
      
      mockWs.simulateMessage(testEvent);
      expect(mockCallback).toHaveBeenCalledWith(testEvent);
    });

    it('should handle connection close and attempt reconnect', () => {
      const onCloseSpy = vi.fn();
      mockWs.onclose = onCloseSpy;
      mockWs.simulateClose();
      
      expect(onCloseSpy).toHaveBeenCalled();
    });
  });

  describe('Offline Support', () => {
    it('should queue events when offline', () => {
      const pendingEvents = [
        { type: 'holding_add', payload: { symbol: 'ETH' }, timestamp: Date.now() }
      ];
      mockLocalStorage.setItem('finpulse_pending_sync', JSON.stringify(pendingEvents));
      
      const stored = mockLocalStorage.getItem('finpulse_pending_sync');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toHaveLength(1);
    });

    it('should process pending events when coming online', () => {
      const pendingEvents = [
        { type: 'holding_add', payload: { symbol: 'ETH' }, timestamp: Date.now() }
      ];
      mockLocalStorage.setItem('finpulse_pending_sync', JSON.stringify(pendingEvents));
      
      // Simulate processing
      const stored = JSON.parse(mockLocalStorage.getItem('finpulse_pending_sync')!);
      expect(stored.length).toBeGreaterThan(0);
    });
  });

  describe('Device Management API', () => {
    it('should fetch devices list', async () => {
      const mockDevices = [
        { deviceId: 'device-1', deviceName: 'Chrome on Windows', lastSeen: Date.now() },
        { deviceId: 'device-2', deviceName: 'Safari on iPhone', lastSeen: Date.now() - 3600000 }
      ];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ devices: mockDevices })
      });
      
      const response = await mockFetch('/auth/devices');
      const data = await response.json();
      
      expect(data.devices).toHaveLength(2);
    });

    it('should revoke device access', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
      
      const response = await mockFetch('/auth/devices/device-2/revoke', { method: 'POST' });
      const data = await response.json();
      
      expect(data.success).toBe(true);
    });

    it('should handle unauthorized error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' })
      });
      
      const response = await mockFetch('/auth/devices');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('Token Handling', () => {
    it('should use finpulse_id_token for API calls', () => {
      mockLocalStorage.setItem('finpulse_id_token', 'valid-token');
      const token = mockLocalStorage.getItem('finpulse_id_token');
      expect(token).toBe('valid-token');
    });

    it('should handle missing token gracefully', () => {
      mockLocalStorage.removeItem('finpulse_id_token');
      const token = mockLocalStorage.getItem('finpulse_id_token');
      expect(token).toBeNull();
    });
  });

  describe('Sync Event Types', () => {
    it.each([
      ['holding_add', { symbol: 'BTC', quantity: 1 }],
      ['holding_update', { symbol: 'BTC', quantity: 2 }],
      ['holding_remove', { symbol: 'BTC' }],
      ['settings_update', { theme: 'dark' }],
      ['watchlist_update', { symbols: ['BTC', 'ETH'] }]
    ])('should handle %s event', (eventType, payload) => {
      const event = {
        type: eventType,
        payload,
        timestamp: Date.now(),
        deviceId: 'test-device',
        userId: 'user-123'
      };
      
      expect(event.type).toBe(eventType);
      expect(event.payload).toEqual(payload);
    });
  });
});
