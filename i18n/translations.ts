/**
 * FinPulse Internationalization
 * Supports English (en) and Hebrew (he)
 */

export type Language = 'en' | 'he';

export const translations = {
  en: {
    // Navigation
    nav: {
      mirror: 'Mirror',
      watchlist: 'Watchlist',
      community: 'Community',
      settings: 'Settings',
      admin: 'Admin',
      node: 'Node',
    },
    
    // Common
    common: {
      search: 'Search',
      add: 'Add',
      edit: 'Edit',
      delete: 'Delete',
      cancel: 'Cancel',
      save: 'Save',
      close: 'Close',
      loading: 'Loading...',
      live: 'Live',
      delayed: 'Delayed',
      all: 'All',
      filter: 'Filter',
      export: 'Export',
      upgrade: 'Upgrade',
      logout: 'Logout',
    },
    
    // Portfolio/Mirror
    portfolio: {
      title: 'Your Mirror',
      subtitle: 'Real-time tracking of your digital wealth',
      addAsset: 'Add Asset',
      totalValue: 'Total Value',
      dayChange: '24h Change',
      holdings: 'Holdings',
      noHoldings: 'No holdings yet',
      addFirstAsset: 'Add your first asset to start tracking',
      privateMode: 'Private Mode',
      publicMode: 'Public Mode',
      exportCsv: 'Export CSV',
      assetName: 'Asset Name',
      symbol: 'Symbol',
      type: 'Type',
      quantity: 'Quantity',
      avgCost: 'Avg Cost',
      marketPrice: 'Market Price',
      totalValueCol: 'Total Value',
      plPercent: 'P/L %',
      actions: 'Actions',
      crypto: 'Crypto',
      stock: 'Stock',
      commodity: 'Commodity',
      allTypes: 'All Types',
      searchPlaceholder: 'Search holdings...',
      limitReached: 'Limit Reached',
      upgradeMessage: 'Your {plan} plan allows only {max} assets. Please upgrade to unlock more slots.',
    },
    
    // Watchlist
    watchlist: {
      title: 'Watchlist',
      subtitle: 'Track assets without adding to portfolio',
      addAsset: 'Add Asset',
      empty: 'Your Watchlist is Empty',
      emptyDesc: 'Add assets to your watchlist to track their prices without adding them to your portfolio.',
      addFirst: 'Add Your First Asset',
      addToMirror: 'Add to Mirror',
      priceAlert: 'Price Alert',
      setAlert: 'Set Alert',
      removeAlert: 'Remove Alert',
      above: 'Above',
      below: 'Below',
      triggered: 'Triggered!',
      currentPrice: 'Current price',
      searchAssets: 'Search assets...',
    },
    
    // Community
    community: {
      title: 'Global Insight',
      subtitle: 'Anonymized strategies from the world\'s most disciplined mirrors.',
      feedTitle: 'Global Pulse Feed',
      broadcast: 'Broadcast Insight',
      searchPlaceholder: 'Search posts, tickers, tags...',
      allPosts: 'All Posts',
      discussion: 'Discussion',
      analysis: 'Analysis',
      tradeIdea: 'Trade Idea',
      question: 'Question',
      noPosts: 'No posts found',
      leaderboard: 'Global Leaderboard',
      privateMessage: 'Your mirror is currently private. Public mirroring allows others to observe your performance without revealing absolute values.',
      enableBroadcast: 'Enable Public Broadcast',
    },
    
    // AI Assistant
    ai: {
      title: 'AI Assistant',
      placeholder: 'Ask about your portfolio...',
      thinking: 'Thinking...',
      error: 'Failed to get response',
    },
    
    // Settings
    settings: {
      title: 'Settings',
      account: 'Account',
      appearance: 'Appearance',
      language: 'Language',
      currency: 'Currency',
      theme: 'Theme',
      themeLight: 'Light',
      themeDark: 'Dark',
      themeSystem: 'System',
      plan: 'Current Plan',
      upgradePlan: 'Upgrade Plan',
      dangerZone: 'Danger Zone',
      deleteAccount: 'Delete Account',
    },
    
    // News
    news: {
      title: 'Market Pulse',
      subtitle: 'Latest financial news',
      readMore: 'Read More',
      minutesAgo: '{n}m ago',
      hoursAgo: '{n}h ago',
      daysAgo: '{n}d ago',
      justNow: 'just now',
    },
    
    // Time
    time: {
      justNow: 'just now',
      minutesAgo: '{n}m ago',
      hoursAgo: '{n}h ago',
      daysAgo: '{n}d ago',
    },
    
    // Plans
    plans: {
      free: 'Free',
      pro: 'Pro',
      enterprise: 'Enterprise',
    },
  },
  
  he: {
    // Navigation
    nav: {
      mirror: 'מראה',
      watchlist: 'רשימת מעקב',
      community: 'קהילה',
      settings: 'הגדרות',
      admin: 'ניהול',
      node: 'צומת',
    },
    
    // Common
    common: {
      search: 'חיפוש',
      add: 'הוסף',
      edit: 'ערוך',
      delete: 'מחק',
      cancel: 'ביטול',
      save: 'שמור',
      close: 'סגור',
      loading: 'טוען...',
      live: 'חי',
      delayed: 'מושהה',
      all: 'הכל',
      filter: 'סינון',
      export: 'ייצוא',
      upgrade: 'שדרג',
      logout: 'התנתק',
    },
    
    // Portfolio/Mirror
    portfolio: {
      title: 'המראה שלך',
      subtitle: 'מעקב בזמן אמת אחר העושר הדיגיטלי שלך',
      addAsset: 'הוסף נכס',
      totalValue: 'שווי כולל',
      dayChange: 'שינוי 24ש',
      holdings: 'אחזקות',
      noHoldings: 'אין אחזקות עדיין',
      addFirstAsset: 'הוסף את הנכס הראשון שלך כדי להתחיל לעקוב',
      privateMode: 'מצב פרטי',
      publicMode: 'מצב ציבורי',
      exportCsv: 'ייצוא CSV',
      assetName: 'שם הנכס',
      symbol: 'סימול',
      type: 'סוג',
      quantity: 'כמות',
      avgCost: 'עלות ממוצעת',
      marketPrice: 'מחיר שוק',
      totalValueCol: 'שווי כולל',
      plPercent: 'רווח/הפסד %',
      actions: 'פעולות',
      crypto: 'קריפטו',
      stock: 'מניה',
      commodity: 'סחורה',
      allTypes: 'כל הסוגים',
      searchPlaceholder: 'חפש אחזקות...',
      limitReached: 'הגעת למגבלה',
      upgradeMessage: 'התוכנית {plan} שלך מאפשרת רק {max} נכסים. אנא שדרג כדי לפתוח עוד משבצות.',
    },
    
    // Watchlist
    watchlist: {
      title: 'רשימת מעקב',
      subtitle: 'עקוב אחר נכסים מבלי להוסיף לתיק',
      addAsset: 'הוסף נכס',
      empty: 'רשימת המעקב שלך ריקה',
      emptyDesc: 'הוסף נכסים לרשימת המעקב כדי לעקוב אחר המחירים שלהם מבלי להוסיף אותם לתיק.',
      addFirst: 'הוסף את הנכס הראשון שלך',
      addToMirror: 'הוסף למראה',
      priceAlert: 'התראת מחיר',
      setAlert: 'קבע התראה',
      removeAlert: 'הסר התראה',
      above: 'מעל',
      below: 'מתחת',
      triggered: 'הופעל!',
      currentPrice: 'מחיר נוכחי',
      searchAssets: 'חפש נכסים...',
    },
    
    // Community
    community: {
      title: 'תובנה גלובלית',
      subtitle: 'אסטרטגיות אנונימיות מהמראות הממושמעות ביותר בעולם.',
      feedTitle: 'פיד הדופק הגלובלי',
      broadcast: 'שדר תובנה',
      searchPlaceholder: 'חפש פוסטים, טיקרים, תגיות...',
      allPosts: 'כל הפוסטים',
      discussion: 'דיון',
      analysis: 'ניתוח',
      tradeIdea: 'רעיון מסחר',
      question: 'שאלה',
      noPosts: 'לא נמצאו פוסטים',
      leaderboard: 'טבלת מובילים גלובלית',
      privateMessage: 'המראה שלך כרגע פרטית. שיקוף ציבורי מאפשר לאחרים לצפות בביצועים שלך מבלי לחשוף ערכים מוחלטים.',
      enableBroadcast: 'אפשר שידור ציבורי',
    },
    
    // AI Assistant
    ai: {
      title: 'עוזר AI',
      placeholder: 'שאל על התיק שלך...',
      thinking: 'חושב...',
      error: 'נכשל בקבלת תגובה',
    },
    
    // Settings
    settings: {
      title: 'הגדרות',
      account: 'חשבון',
      appearance: 'מראה',
      language: 'שפה',
      currency: 'מטבע',
      theme: 'ערכת נושא',
      themeLight: 'בהיר',
      themeDark: 'כהה',
      themeSystem: 'מערכת',
      plan: 'תוכנית נוכחית',
      upgradePlan: 'שדרג תוכנית',
      dangerZone: 'אזור סכנה',
      deleteAccount: 'מחק חשבון',
    },
    
    // News
    news: {
      title: 'דופק השוק',
      subtitle: 'חדשות פיננסיות אחרונות',
      readMore: 'קרא עוד',
      minutesAgo: 'לפני {n} דקות',
      hoursAgo: 'לפני {n} שעות',
      daysAgo: 'לפני {n} ימים',
      justNow: 'עכשיו',
    },
    
    // Time
    time: {
      justNow: 'עכשיו',
      minutesAgo: 'לפני {n}ד',
      hoursAgo: 'לפני {n}ש',
      daysAgo: 'לפני {n}י',
    },
    
    // Plans
    plans: {
      free: 'חינם',
      pro: 'פרו',
      enterprise: 'ארגוני',
    },
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
