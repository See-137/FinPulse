// FinPulse API Service
// Handles all backend API calls with authentication

import { config } from '../config';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

class ApiService {
  private baseUrl: string;
  private idToken: string | null = null;

  constructor() {
    this.baseUrl = config.apiUrl;
    // Restore Cognito idToken from localStorage
    this.idToken = localStorage.getItem('finpulse_id_token');
  }

  /**
   * Set Cognito ID token for subsequent API calls
   * Called after successful Cognito authentication
   */
  setIdToken(token: string | null) {
    this.idToken = token;
    if (token) {
      localStorage.setItem('finpulse_id_token', token);
    } else {
      localStorage.removeItem('finpulse_id_token');
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  setAccessToken(token: string | null) {
    this.setIdToken(token);
  }

  /**
   * Internal method: Add auth headers to all requests
   * Automatically includes Cognito idToken as Authorization header
   */
  private buildHeaders(options: RequestInit = {}): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Step 5: Auto-include idToken in all API requests
    if (this.idToken) {
      (headers as Record<string, string>)['Authorization'] = this.idToken;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers = this.buildHeaders(options);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          error: data?.message || `HTTP ${response.status}`,
          status: response.status,
        };
      }

      return { data, status: response.status };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  // ============== Market Data ==============
  async getMarketPrices(symbols?: string[]): Promise<ApiResponse<MarketPrice[]>> {
    const query = symbols ? `?symbols=${symbols.join(',')}` : '';
    return this.request<MarketPrice[]>(`${config.endpoints.market}${query}`);
  }

  // ============== FX Rates ==============
  async getFxRates(base: string = 'USD'): Promise<ApiResponse<FxRates>> {
    return this.request<FxRates>(`${config.endpoints.fx}?base=${base}`);
  }

  // ============== Portfolio ==============
  async getPortfolio(): Promise<ApiResponse<Portfolio>> {
    return this.request<Portfolio>(config.endpoints.portfolio);
  }

  async addAsset(asset: AssetInput): Promise<ApiResponse<Asset>> {
    return this.request<Asset>(config.endpoints.portfolio, {
      method: 'POST',
      body: JSON.stringify(asset),
    });
  }

  async updateAsset(assetId: string, updates: Partial<AssetInput>): Promise<ApiResponse<Asset>> {
    return this.request<Asset>(`${config.endpoints.portfolio}/${assetId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteAsset(assetId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${config.endpoints.portfolio}/${assetId}`, {
      method: 'DELETE',
    });
  }

  // ============== News ==============
  async getNews(category?: string): Promise<ApiResponse<NewsItem[]>> {
    const query = category ? `?category=${category}` : '';
    return this.request<NewsItem[]>(`${config.endpoints.news}${query}`);
  }

  // ============== Community ==============
  async getCommunityPosts(limit: number = 20): Promise<ApiResponse<CommunityPost[]>> {
    return this.request<CommunityPost[]>(`${config.endpoints.community}?limit=${limit}`);
  }

  async createPost(content: string): Promise<ApiResponse<CommunityPost>> {
    return this.request<CommunityPost>(config.endpoints.community, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async likePost(postId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${config.endpoints.community}/${postId}/like`, {
      method: 'POST',
    });
  }
}

// Types
export interface MarketPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
  lastUpdated: string;
}

export interface FxRates {
  base: string;
  rates: Record<string, number>;
  lastUpdated: string;
}

export interface Asset {
  assetId: string;
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice?: number;
  createdAt: string;
}

export interface AssetInput {
  symbol: string;
  quantity: number;
  avgCost: number;
}

export interface Portfolio {
  userId: string;
  assets: Asset[];
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  lastUpdated: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  category: string;
}

export interface CommunityPost {
  postId: string;
  userId: string;
  userName: string;
  content: string;
  likes: number;
  likedByUser: boolean;
  createdAt: string;
}

// Export singleton instance
export const api = new ApiService();
export default api;
