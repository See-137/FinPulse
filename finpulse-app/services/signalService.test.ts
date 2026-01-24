/**
 * Signal Service Tests
 * Tests for confidence scoring, conflict detection, and signal combination
 */

import { describe, it, expect } from 'vitest';
import {
  validateSignal,
  calculateConfidence,
  detectConflict,
  applyConflictPenalty,
  determineDirection,
  combineSignals,
  getAverageAccuracy,
} from './signalService';
import type { SignalDirection } from '../types';
import { WhaleSignal, TradeSignal, SentimentSignal } from '../types';
import { SIGNAL_SCORING } from '../constants';

describe('Signal Service', () => {
  const mockWhale: WhaleSignal = {
    symbol: 'BTC',
    direction: 'bullish',
    score: 80,
    activity: 'accumulation',
    volumeIndicator: 150,
    timestamp: Date.now(),
  };

  const mockTrade: TradeSignal = {
    symbol: 'BTC',
    direction: 'bullish',
    score: 75,
    technicalPattern: 'breakout',
    timestamp: Date.now(),
  };

  const mockSentiment: SentimentSignal = {
    symbol: 'BTC',
    direction: 'bullish',
    score: 70,
    source: 'social',
    momentum: 30,
    timestamp: Date.now(),
  };

  describe('validateSignal', () => {
    it('should validate correct signal', () => {
      expect(validateSignal(mockWhale)).toBe(true);
    });

    it('should reject signal with missing symbol', () => {
      const invalid = { ...mockWhale, symbol: '' };
      expect(validateSignal(invalid)).toBe(false);
    });

    it('should reject signal with invalid direction', () => {
      const invalid = { ...mockWhale, direction: 'invalid' as SignalDirection };
      expect(validateSignal(invalid)).toBe(false);
    });

    it('should reject signal with score out of range', () => {
      expect(validateSignal({ ...mockWhale, score: -1 })).toBe(false);
      expect(validateSignal({ ...mockWhale, score: 101 })).toBe(false);
    });
  });

  describe('calculateConfidence', () => {
    it('should calculate confidence with all signals (40/35/25)', () => {
      const confidence = calculateConfidence(mockWhale, mockTrade, mockSentiment);
      // (80 × 0.40) + (75 × 0.35) + (70 × 0.25) = 32 + 26.25 + 17.5 = 75.75
      expect(confidence).toBeCloseTo(75.75, 0);
    });

    it('should handle missing whale signal (recalculate weights)', () => {
      const confidence = calculateConfidence(null, mockTrade, mockSentiment);
      // (75 × 0.35 + 70 × 0.25) / 0.60 ≈ 72.5
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(100);
    });

    it('should return 0 when all signals null', () => {
      const confidence = calculateConfidence(null, null, null);
      expect(confidence).toBe(0);
    });

    it('should clamp confidence to 0-100 range', () => {
      const veryHigh = { ...mockWhale, score: 150 };
      const confidence = calculateConfidence(veryHigh as WhaleSignal, null, null);
      expect(confidence).toBeLessThanOrEqual(100);
      expect(confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('detectConflict', () => {
    it('should detect bullish/bearish conflict', () => {
      const bearish = { ...mockTrade, direction: 'bearish' as const };
      const conflict = detectConflict(mockWhale, bearish, mockSentiment);
      expect(conflict.hasConflict).toBe(true);
      expect(conflict.details).toContain('Conflicting signals');
    });

    it('should not detect conflict when all same direction', () => {
      const conflict = detectConflict(mockWhale, mockTrade, mockSentiment);
      expect(conflict.hasConflict).toBe(false);
    });

    it('should not detect conflict with <2 signals', () => {
      const conflict = detectConflict(mockWhale, null, null);
      expect(conflict.hasConflict).toBe(false);
    });

    it('should handle neutral signals', () => {
      const neutral = { ...mockSentiment, direction: 'neutral' as const };
      const conflict = detectConflict(mockWhale, mockTrade, neutral);
      expect(conflict.hasConflict).toBe(false);
    });
  });

  describe('applyConflictPenalty', () => {
    it('should apply penalty multiplier when conflict exists', () => {
      const baseConfidence = 80;
      const penalized = applyConflictPenalty(baseConfidence, true);
      expect(penalized).toBe(80 * SIGNAL_SCORING.CONFLICT_PENALTY);
      expect(penalized).toBeCloseTo(56, 0); // 80 × 0.7 = 56
    });

    it('should not apply penalty when no conflict', () => {
      const baseConfidence = 80;
      const unchanged = applyConflictPenalty(baseConfidence, false);
      expect(unchanged).toBe(baseConfidence);
    });
  });

  describe('determineDirection', () => {
    it('should return bullish when 2+ bullish signals', () => {
      const direction = determineDirection(mockWhale, mockTrade, mockSentiment);
      expect(direction).toBe('bullish');
    });

    it('should return bearish when 2+ bearish signals', () => {
      const bearish = { ...mockWhale, direction: 'bearish' as const };
      const bearish2 = { ...mockTrade, direction: 'bearish' as const };
      const direction = determineDirection(bearish, bearish2, mockSentiment);
      expect(direction).toBe('bearish');
    });

    it('should return neutral when mixed signals', () => {
      const bearish = { ...mockTrade, direction: 'bearish' as const };
      const direction = determineDirection(mockWhale, bearish, null);
      expect(direction).toBe('neutral');
    });

    it('should return neutral when no signals', () => {
      const direction = determineDirection(null, null, null);
      expect(direction).toBe('neutral');
    });
  });

  describe('combineSignals', () => {
    it('should combine all signals with confidence score', () => {
      const combined = combineSignals('BTC', mockWhale, mockTrade, mockSentiment);
      expect(combined.symbol).toBe('BTC');
      expect(combined.direction).toBe('bullish');
      expect(combined.confidenceScore).toBeGreaterThan(0);
      expect(combined.confidenceScore).toBeLessThanOrEqual(100);
      expect(combined.hasConflict).toBe(false);
    });

    it('should apply conflict penalty in combined signal', () => {
      const bearish = { ...mockTrade, direction: 'bearish' as const };
      const combined = combineSignals('BTC', mockWhale, bearish, mockSentiment);
      expect(combined.hasConflict).toBe(true);
      expect(combined.confidenceScore).toBeLessThan(75); // Should be penalized
    });

    it('should handle null signals gracefully', () => {
      const combined = combineSignals('BTC', mockWhale, null, null);
      expect(combined.symbol).toBe('BTC');
      expect(combined.componentScores.whale).toBe(80);
      expect(combined.componentScores.trade).toBe(0);
    });

    it('should return neutral/zero when all signals null', () => {
      const combined = combineSignals('BTC', null, null, null);
      expect(combined.direction).toBe('neutral');
      expect(combined.confidenceScore).toBe(0);
    });

    it('should include accuracy in combined signal', () => {
      const combined = combineSignals('BTC', mockWhale, mockTrade, mockSentiment);
      expect(combined.accuracy).toBeGreaterThan(0);
      expect(combined.accuracy).toBeLessThanOrEqual(100);
    });
  });

  describe('getAverageAccuracy', () => {
    it('should return average accuracy from available signals', () => {
      const accuracy = getAverageAccuracy(mockWhale, mockTrade, mockSentiment);
      const expected = (SIGNAL_SCORING.BASE_ACCURACY.whale + SIGNAL_SCORING.BASE_ACCURACY.trade + SIGNAL_SCORING.BASE_ACCURACY.sentiment) / 3;
      expect(accuracy).toBeCloseTo(expected, 0);
    });

    it('should handle missing signals', () => {
      const accuracy = getAverageAccuracy(mockWhale, null, null);
      expect(accuracy).toBe(SIGNAL_SCORING.BASE_ACCURACY.whale);
    });

    it('should return 0 when all signals null', () => {
      const accuracy = getAverageAccuracy(null, null, null);
      expect(accuracy).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('full pipeline: validate → calculate → detect → apply penalty → combine', () => {
      const isValid = validateSignal(mockWhale) && validateSignal(mockTrade) && validateSignal(mockSentiment);
      expect(isValid).toBe(true);

      const combined = combineSignals('BTC', mockWhale, mockTrade, mockSentiment);
      expect(combined.symbol).toBe('BTC');
      expect(combined.direction).toBe('bullish');
      expect(combined.confidenceScore).toBeGreaterThan(70);
      expect(combined.createdAt).toBeGreaterThan(0);
    });

    it('realistic scenario: whale bullish, trade neutral, sentiment bearish → conflict penalty', () => {
      const neutral = { ...mockTrade, direction: 'neutral' as const };
      const bearish = { ...mockSentiment, direction: 'bearish' as const };

      const combined = combineSignals('ETH', mockWhale, neutral, bearish);
      expect(combined.hasConflict).toBe(true);
      expect(combined.confidenceScore).toBeLessThan(60); // Penalized for conflict
    });
  });
});
