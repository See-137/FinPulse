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
      propulse: 'ProPulse',
      superpulse: 'SuperPulse',
    },
    
    // Asset Selector
    assetSelector: {
      selectAsset: 'Select Asset',
      searchAssets: 'Search assets...',
      popularAssets: 'Popular Assets',
      noAssetsFound: 'No assets found',
      typeToSearch: 'Type to search for assets',
      searchPoweredBy: 'Search powered by',
    },
    
    // Pricing Modal
    pricing: {
      title: 'Choose Your Plan',
      subtitle: 'Unlock powerful features to maximize your mirror',
      popular: 'Most Popular',
      currentPlan: 'Current Plan',
      month: 'month',
      assets: 'Assets',
      aiQueries: 'AI Queries',
      day: 'day',
      upgrade: 'Upgrade Now',
      downgrade: 'Manage Plan',
      manageBilling: 'Manage Billing',
      freeForever: 'Free Forever',
      securePayment: 'Secure payment powered by',
      cancelAnytime: 'Cancel anytime. No hidden fees.',
    },
    
    // Changelog Modal
    changelog: {
      whatsNew: "What's New",
      newFeatures: 'New Features',
      bugFixes: 'Bug Fixes',
      improvements: 'Improvements',
      gotIt: 'Got it!',
    },
    
    // Notifications
    notifications: {
      title: 'Notifications',
      markAllRead: 'Mark all read',
      empty: 'No notifications yet',
    },
    
    // Onboarding
    onboarding: {
      skip: 'Skip',
      back: 'Back',
      next: 'Next',
      getStarted: 'Get Started',
      welcomeDesc: 'Track your crypto, stocks, and commodities in one beautiful dashboard with real-time prices.',
      yourMirror: 'Your Mirror',
      dashboardDesc: 'Track all your assets with real-time prices, performance metrics, and AI-powered insights.',
      searchAssets: 'Search for any asset...',
      addAssetDesc: 'Choose from 35+ popular assets or search thousands more from our database.',
      nextRefresh: 'until next refresh',
      livePricesDesc: 'Prices update automatically. Upgrade to ProPulse for faster 30-second refresh rates.',
      aiCopilot: 'AI Copilot',
      unlockAI: 'Unlock AI Insights',
      availableOn: 'Available on',
      aiDesc: 'Get instant answers about market trends, portfolio analysis, and investment opportunities.',
      globalPulse: 'Global Pulse Feed',
      communityDesc: 'See what successful investors are tracking and share your own insights.',
      recommended: 'Recommended',
      comparePlans: 'Compare all plans',
    },
    
    // Milestones
    milestones: {
      congratulations: 'Congratulations! 🎉',
      headsUp: 'Heads Up!',
      maybeLater: 'Maybe Later',
    },
    
    // Locked Features
    lockedFeature: {
      unlockWith: 'Unlock with',
      availableOn: 'Available on',
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
      propulse: 'פרופאלס',
      superpulse: 'סופרפאלס',
    },
    
    // Asset Selector
    assetSelector: {
      selectAsset: 'בחר נכס',
      searchAssets: 'חפש נכסים...',
      popularAssets: 'נכסים פופולריים',
      noAssetsFound: 'לא נמצאו נכסים',
      typeToSearch: 'הקלד לחיפוש נכסים',
      searchPoweredBy: 'חיפוש מופעל על ידי',
    },
    
    // Pricing Modal
    pricing: {
      title: 'בחר את התוכנית שלך',
      subtitle: 'פתח תכונות חזקות כדי למקסם את המראה שלך',
      popular: 'הכי פופולרי',
      currentPlan: 'תוכנית נוכחית',
      month: 'חודש',
      assets: 'נכסים',
      aiQueries: 'שאילתות AI',
      day: 'יום',
      upgrade: 'שדרג עכשיו',
      downgrade: 'נהל תוכנית',
      manageBilling: 'נהל חיוב',
      freeForever: 'חינם לנצח',
      securePayment: 'תשלום מאובטח באמצעות',
      cancelAnytime: 'בטל בכל עת. ללא עמלות נסתרות.',
    },
    
    // Changelog Modal
    changelog: {
      whatsNew: 'מה חדש',
      newFeatures: 'תכונות חדשות',
      bugFixes: 'תיקוני באגים',
      improvements: 'שיפורים',
      gotIt: 'הבנתי!',
    },
    
    // Notifications
    notifications: {
      title: 'התראות',
      markAllRead: 'סמן הכל כנקרא',
      empty: 'אין התראות עדיין',
    },
    
    // Onboarding
    onboarding: {
      skip: 'דלג',
      back: 'חזור',
      next: 'הבא',
      getStarted: 'בואו נתחיל',
      welcomeDesc: 'עקוב אחר הקריפטו, המניות והסחורות שלך בדשבורד יפה אחד עם מחירים בזמן אמת.',
      yourMirror: 'המראה שלך',
      dashboardDesc: 'עקוב אחר כל הנכסים שלך עם מחירים בזמן אמת, מדדי ביצועים ותובנות מונעות AI.',
      searchAssets: 'חפש כל נכס...',
      addAssetDesc: 'בחר מ-35+ נכסים פופולריים או חפש אלפים נוספים ממסד הנתונים שלנו.',
      nextRefresh: 'עד הרענון הבא',
      livePricesDesc: 'המחירים מתעדכנים אוטומטית. שדרג לפרופאלס לקצב רענון מהיר יותר של 30 שניות.',
      aiCopilot: 'AI קופילוט',
      unlockAI: 'פתח תובנות AI',
      availableOn: 'זמין ב',
      aiDesc: 'קבל תשובות מיידיות על מגמות שוק, ניתוח תיק והזדמנויות השקעה.',
      globalPulse: 'פיד הדופק הגלובלי',
      communityDesc: 'ראה מה משקיעים מצליחים עוקבים ושתף את התובנות שלך.',
      recommended: 'מומלץ',
      comparePlans: 'השווה את כל התוכניות',
    },
    
    // Milestones
    milestones: {
      congratulations: 'מזל טוב! 🎉',
      headsUp: 'שים לב!',
      maybeLater: 'אולי אחר כך',
    },
    
    // Locked Features
    lockedFeature: {
      unlockWith: 'פתח עם',
      availableOn: 'זמין ב',
    },
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
