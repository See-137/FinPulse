// Canonical news types - single source of truth
// Matches AWS Lambda /news/latest response format

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content?: string;
  source: string;
  url: string;
  image?: string;
  publishedAt: string; // ISO 8601
  category: string;
}

export interface NewsApiResponse {
  success: boolean;
  articles: NewsArticle[];
  count: number;
  source: 'gnews' | 'newsapi' | 'static';
  cached: boolean;
  timestamp: string;
}

export type NewsSource = 'live' | 'cached' | 'offline';

export interface UseNewsReturn {
  articles: NewsArticle[];
  loading: boolean;
  error: string | null;
  source: NewsSource;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

// Holdings keyword mappings for filtering news by user's portfolio
export const SYMBOL_KEYWORDS: Record<string, string[]> = {
  // Crypto
  'BTC': ['bitcoin', 'btc', 'crypto'],
  'ETH': ['ethereum', 'eth', 'ether'],
  'SOL': ['solana', 'sol'],
  'AVAX': ['avalanche', 'avax'],
  'DOGE': ['dogecoin', 'doge'],
  'XRP': ['ripple', 'xrp'],
  'ADA': ['cardano', 'ada'],
  'DOT': ['polkadot', 'dot'],
  'LINK': ['chainlink', 'link'],
  'MATIC': ['polygon', 'matic'],
  'ATOM': ['cosmos', 'atom'],
  'UNI': ['uniswap', 'uni'],
  'LTC': ['litecoin', 'ltc'],
  'SHIB': ['shiba', 'shib'],
  'DN': ['deepnode', 'dn'],
  'LAVA': ['lava network', 'lava'],
  // Stocks
  'NVDA': ['nvidia', 'nvda', 'gpu', 'ai chip'],
  'MSTR': ['microstrategy', 'mstr', 'saylor'],
  'AAPL': ['apple', 'aapl', 'iphone', 'ipad', 'mac'],
  'MSFT': ['microsoft', 'msft', 'azure', 'windows'],
  'GOOGL': ['google', 'alphabet', 'googl', 'youtube'],
  'GOOG': ['google', 'alphabet', 'goog', 'youtube'],
  'TSLA': ['tesla', 'tsla', 'musk', 'ev'],
  'PLTR': ['palantir', 'pltr'],
  'AMD': ['amd', 'advanced micro', 'radeon', 'ryzen'],
  'COIN': ['coinbase', 'coin'],
  'AMZN': ['amazon', 'amzn', 'aws', 'prime'],
  'META': ['meta', 'facebook', 'instagram', 'whatsapp'],
  'NFLX': ['netflix', 'nflx'],
  'CRM': ['salesforce', 'crm'],
  'INTC': ['intel', 'intc'],
  'PYPL': ['paypal', 'pypl'],
  'SQ': ['square', 'block', 'sq'],
  'SHOP': ['shopify', 'shop'],
  'UBER': ['uber'],
  'LYFT': ['lyft'],
  'SNAP': ['snapchat', 'snap'],
  'TWTR': ['twitter', 'twtr', 'x.com'],
  'DIS': ['disney', 'dis'],
  'BA': ['boeing', 'ba'],
  'JPM': ['jpmorgan', 'jpm', 'chase'],
  'V': ['visa'],
  'MA': ['mastercard', 'ma'],
};

// Filter articles based on user's holdings
export const filterArticlesByHoldings = (
  articles: NewsArticle[],
  symbols: string[]
): NewsArticle[] => {
  if (symbols.length === 0) return [];

  return articles.filter(article => {
    const text = `${article.title} ${article.description} ${article.category}`.toLowerCase();
    return symbols.some(symbol => {
      const upperSymbol = symbol.toUpperCase();
      const keywords = SYMBOL_KEYWORDS[upperSymbol] || [symbol.toLowerCase()];
      return keywords.some(kw => text.includes(kw.toLowerCase()));
    });
  });
};

// Format relative time from ISO timestamp
export const formatNewsTime = (dateString?: string): string => {
  if (!dateString) return 'Just Now';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};
