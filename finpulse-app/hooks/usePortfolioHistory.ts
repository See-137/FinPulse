/**
 * Hook to fetch portfolio history snapshots from the backend.
 * Returns daily portfolio value data for charting and analytics.
 *
 * Falls back gracefully: if the API returns no data (table doesn't exist yet,
 * or user has <7 days of history), returns an empty array so the caller
 * can fall back to synthetic/estimated data.
 */

import { useState, useEffect, useCallback } from 'react';
import { config } from '../config';

export interface PortfolioSnapshot {
  date: string;
  totalValue: number;
  holdings: Array<{
    symbol: string;
    type: string;
    quantity: number;
    price: number;
    value: number;
  }>;
}

interface UsePortfolioHistoryResult {
  data: PortfolioSnapshot[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** True if we have enough real data points (>=7) for meaningful analytics */
  hasRealData: boolean;
}

export function usePortfolioHistory(days: number = 30): UsePortfolioHistoryResult {
  const [data, setData] = useState<PortfolioSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => setFetchKey(k => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('finpulse_id_token');
        if (!token) {
          setData([]);
          setLoading(false);
          return;
        }

        const response = await fetch(
          `${config.apiUrl}/portfolio/history?days=${days}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (!cancelled) {
          if (response.ok) {
            const result = await response.json();
            setData(result.data || []);
          } else {
            // Non-fatal: API might not have the snapshots table yet
            setData([]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          // Network errors are non-fatal for this feature
          console.warn('[usePortfolioHistory] Fetch failed, using fallback:', (err as Error).message);
          setData([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => { cancelled = true; };
  }, [days, fetchKey]);

  return {
    data,
    loading,
    error,
    refetch,
    hasRealData: data.length >= 7
  };
}
