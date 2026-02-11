/**
 * Whale Wallet Service Tests
 * Tests for whale metrics, signal conversion, deterministic mock data,
 * per-symbol thresholds, and isMock tracking
 */

import { describe, it, expect } from 'vitest';
import { WhaleWalletService } from './whaleWalletService';
import { WHALE_THRESHOLDS, DEFAULT_WHALE_THRESHOLD } from '../constants';
import { mapSymbolToWhaleAlert, isWhaleAlertSupported } from './dataProviders/whaleAlertAPI';

describe('WhaleWalletService', () => {
  const service = new WhaleWalletService();

  describe('getWhaleMetrics', () => {
    it('should return metrics for a known symbol', async () => {
      const metrics = await service.getWhaleMetrics('BTC');
      expect(metrics).toBeDefined();
      expect(metrics.symbol).toBe('BTC');
      expect(typeof metrics.netFlow24h).toBe('number');
      expect(typeof metrics.largeTransfers).toBe('number');
      expect(metrics.exchangeReserves).toBeDefined();
    });

    it('should track wasMockData flag', async () => {
      await service.getWhaleMetrics('ETH');
      expect(typeof service.wasMockData).toBe('boolean');
    });
  });

  describe('convertToWhaleSignal', () => {
    it('should return bullish when net flow exceeds per-symbol threshold', () => {
      const btcThreshold = WHALE_THRESHOLDS['BTC'] ?? DEFAULT_WHALE_THRESHOLD;
      const metrics = {
        symbol: 'BTC',
        netFlow24h: btcThreshold + 1_000_000, // Slightly above threshold
        largeTransfers: 10,
        topHolderChange: 0,
        exchangeReserves: { inflow: 0, outflow: btcThreshold + 1_000_000, net: btcThreshold + 1_000_000 },
      };

      const signal = service.convertToWhaleSignal(metrics);
      expect(signal.direction).toBe('bullish');
      expect(signal.activity).toBe('accumulation');
      expect(signal.score).toBeGreaterThan(0);
      expect(signal.score).toBeLessThanOrEqual(100);
    });

    it('should return bearish when net flow below negative threshold', () => {
      const btcThreshold = WHALE_THRESHOLDS['BTC'] ?? DEFAULT_WHALE_THRESHOLD;
      const metrics = {
        symbol: 'BTC',
        netFlow24h: -(btcThreshold + 1_000_000),
        largeTransfers: 10,
        topHolderChange: 0,
        exchangeReserves: { inflow: btcThreshold + 1_000_000, outflow: 0, net: -(btcThreshold + 1_000_000) },
      };

      const signal = service.convertToWhaleSignal(metrics);
      expect(signal.direction).toBe('bearish');
      expect(signal.activity).toBe('distribution');
    });

    it('should return neutral when net flow within threshold', () => {
      const metrics = {
        symbol: 'BTC',
        netFlow24h: 5_000_000, // Well below BTC's $50M threshold
        largeTransfers: 3,
        topHolderChange: 0,
        exchangeReserves: { inflow: 0, outflow: 5_000_000, net: 5_000_000 },
      };

      const signal = service.convertToWhaleSignal(metrics);
      expect(signal.direction).toBe('neutral');
    });

    it('should use per-symbol thresholds from constants', () => {
      // DOGE has a $5M threshold, so $6M should trigger bullish
      const dogeMetrics = {
        symbol: 'DOGE',
        netFlow24h: 6_000_000,
        largeTransfers: 5,
        topHolderChange: 0,
        exchangeReserves: { inflow: 0, outflow: 6_000_000, net: 6_000_000 },
      };

      const signal = service.convertToWhaleSignal(dogeMetrics);
      expect(signal.direction).toBe('bullish');

      // Same $6M for BTC should be neutral (threshold is $50M)
      const btcMetrics = { ...dogeMetrics, symbol: 'BTC' };
      const btcSignal = service.convertToWhaleSignal(btcMetrics);
      expect(btcSignal.direction).toBe('neutral');
    });

    it('should use DEFAULT_WHALE_THRESHOLD for unknown symbols', () => {
      const unknownMetrics = {
        symbol: 'UNKNOWN',
        netFlow24h: DEFAULT_WHALE_THRESHOLD + 1_000_000,
        largeTransfers: 5,
        topHolderChange: 0,
        exchangeReserves: { inflow: 0, outflow: DEFAULT_WHALE_THRESHOLD + 1_000_000, net: DEFAULT_WHALE_THRESHOLD + 1_000_000 },
      };

      const signal = service.convertToWhaleSignal(unknownMetrics);
      expect(signal.direction).toBe('bullish');
    });

    it('should include valid score, symbol, and timestamp', () => {
      const metrics = {
        symbol: 'ETH',
        netFlow24h: 35_000_000,
        largeTransfers: 8,
        topHolderChange: 0,
        exchangeReserves: { inflow: 0, outflow: 35_000_000, net: 35_000_000 },
      };

      const signal = service.convertToWhaleSignal(metrics);
      expect(signal.symbol).toBe('ETH');
      expect(signal.score).toBeGreaterThanOrEqual(0);
      expect(signal.score).toBeLessThanOrEqual(100);
      expect(signal.timestamp).toBeGreaterThan(0);
      expect(signal.volumeIndicator).toBe(35); // 35M / 1M
    });
  });

  describe('Deterministic Mock Data', () => {
    it('should produce same metrics for same symbol across calls', async () => {
      const service1 = new WhaleWalletService();
      const service2 = new WhaleWalletService();

      const m1 = await service1.getWhaleMetrics('BTC');
      const m2 = await service2.getWhaleMetrics('BTC');

      expect(m1.netFlow24h).toBe(m2.netFlow24h);
      expect(m1.largeTransfers).toBe(m2.largeTransfers);
      expect(m1.topHolderChange).toBe(m2.topHolderChange);
    });

    it('should produce different metrics for different symbols', async () => {
      const btc = await service.getWhaleMetrics('BTC');
      const eth = await service.getWhaleMetrics('ETH');

      // Very unlikely for two different symbols to produce identical hash-based values
      expect(btc.netFlow24h === eth.netFlow24h && btc.largeTransfers === eth.largeTransfers).toBe(false);
    });
  });
});

describe('mapSymbolToWhaleAlert', () => {
  it('should map known symbols to Whale Alert names', () => {
    expect(mapSymbolToWhaleAlert('BTC')).toBe('bitcoin');
    expect(mapSymbolToWhaleAlert('ETH')).toBe('ethereum');
    expect(mapSymbolToWhaleAlert('SOL')).toBe('solana');
    expect(mapSymbolToWhaleAlert('DOGE')).toBe('dogecoin');
    expect(mapSymbolToWhaleAlert('XRP')).toBe('ripple');
    expect(mapSymbolToWhaleAlert('BNB')).toBe('binance-coin');
    expect(mapSymbolToWhaleAlert('ADA')).toBe('cardano');
  });

  it('should map newly added symbols correctly', () => {
    expect(mapSymbolToWhaleAlert('AVAX')).toBe('avalanche');
    expect(mapSymbolToWhaleAlert('MATIC')).toBe('polygon');
    expect(mapSymbolToWhaleAlert('PAXG')).toBe('pax-gold');
  });

  it('should lowercase unknown symbols', () => {
    expect(mapSymbolToWhaleAlert('PEPE')).toBe('pepe');
    expect(mapSymbolToWhaleAlert('FLOKI')).toBe('floki');
  });
});

describe('isWhaleAlertSupported', () => {
  it('should return true for supported crypto symbols', () => {
    expect(isWhaleAlertSupported('BTC')).toBe(true);
    expect(isWhaleAlertSupported('ETH')).toBe(true);
    expect(isWhaleAlertSupported('PAXG')).toBe(true);
    expect(isWhaleAlertSupported('AVAX')).toBe(true);
  });

  it('should return false for stocks and unknown tokens', () => {
    expect(isWhaleAlertSupported('NVDA')).toBe(false);
    expect(isWhaleAlertSupported('AAPL')).toBe(false);
    expect(isWhaleAlertSupported('MSTR')).toBe(false);
    expect(isWhaleAlertSupported('PEPE')).toBe(false);
  });
});

describe('WHALE_THRESHOLDS', () => {
  it('should have thresholds for major symbols', () => {
    expect(WHALE_THRESHOLDS['BTC']).toBe(50_000_000);
    expect(WHALE_THRESHOLDS['ETH']).toBe(30_000_000);
    expect(WHALE_THRESHOLDS['DOGE']).toBe(5_000_000);
  });

  it('should have BTC threshold higher than DOGE', () => {
    expect(WHALE_THRESHOLDS['BTC']).toBeGreaterThan(WHALE_THRESHOLDS['DOGE']);
  });

  it('DEFAULT_WHALE_THRESHOLD should be $10M', () => {
    expect(DEFAULT_WHALE_THRESHOLD).toBe(10_000_000);
  });
});
