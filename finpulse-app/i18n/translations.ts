/**
 * FinPulse Internationalization
 * Supports English (en) and Hebrew (he)
 */

export type Language = 'en' | 'he';

export const translations = {
  en: {
    // Navigation
    nav: {
      mirror: 'Live Pulse',
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
    
    // Portfolio/Pulse
    portfolio: {
      title: 'Your Pulse',
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
      addToMirror: 'Add to Pulse',
      priceAlert: 'Price Alert',
      setAlert: 'Set Alert',
      removeAlert: 'Remove Alert',
      above: 'Above',
      below: 'Below',
      triggered: 'Triggered!',
      currentPrice: 'Current price',
      searchAssets: 'Search assets...',
    },
    
    // Global Pulse Feed
    community: {
      title: 'Global Pulse Feed',
      subtitle: 'Anonymized signal insights from disciplined market observers.',
      feedTitle: 'Global Pulse',
      broadcast: 'Share Signal',
      searchPlaceholder: 'Search signals, tickers, tags...',
      allPosts: 'All Signals',
      discussion: 'Discussion',
      analysis: 'Analysis',
      tradeIdea: 'Trade Idea',
      question: 'Question',
      noPosts: 'No signals found',
      leaderboard: 'Leaderboard - Signal Accuracy',
      privateMessage: 'Your signals are currently private. Sharing signals allows others to observe and learn from your analysis.',
      enableBroadcast: 'Share Signals Publicly',
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
      holdings: 'Holdings',
      xFeed: 'X Feed',
      all: 'All',
      marketNews: 'Market News',
      live: 'LIVE',
      cached: 'CACHED',
      recent: 'RECENT',
      cachedTooltip: 'Showing recently fetched data — refreshes automatically',
      offline: 'OFFLINE',
      noNewsHoldings: 'No news for your holdings',
      noNewsAvailable: 'No news available',
      addAssetsForNews: 'Add assets to see relevant news',
      checkBackLater: 'Check back later',
      noSource: 'No source available',
    },

    // Premium Analytics
    analytics: {
      title: 'Premium Analytics',
      subtitle: 'Advanced portfolio insights and risk metrics',
      noData: 'No Data Available',
      noDataDesc: 'Add some assets to your portfolio to see analytics.',
      unlockDesc: 'Unlock advanced portfolio insights, risk metrics, and performance tracking with SuperPulse.',
      upgradeToSuper: 'Upgrade to SuperPulse',
      priceInfo: '$29.90/month \u2022 Cancel anytime',
      simulated: 'Simulated',
      estimated: 'Estimated',
      aiInsight: 'AI Portfolio Insight',
      liveAnalysis: 'Live Analysis',
      totalPL: 'Total P/L',
      volatility: 'Volatility',
      annualized: 'annualized',
      volatilityDesc: 'Annualized standard deviation of daily returns - measures price fluctuation risk',
      sharpeRatio: 'Sharpe Ratio',
      sharpeGood: 'Good',
      sharpeFair: 'Fair',
      sharpePoor: 'Poor',
      sharpeDesc: 'Risk-adjusted return metric - higher is better (>1 is good, >2 is excellent)',
      maxDrawdown: 'Max Drawdown',
      maxDrawdownDesc: 'Largest peak-to-trough decline in the selected period',
      totalReturnDollar: 'Total Return $',
      unrealizedPL: 'Unrealized P&L',
      totalReturnDollarDesc: 'Total unrealized profit/loss in dollars across all holdings',
      totalReturnPercent: 'Total Return %',
      portfolioGainLoss: 'Portfolio gain/loss',
      totalReturnPercentDesc: 'Portfolio-level return percentage relative to total cost basis',
      avgHoldingAge: 'Avg Holding Age',
      avgInvestTime: 'Avg investment time',
      avgHoldingAgeDesc: 'Average time assets have been held in your portfolio',
      portfolioTrend: 'Portfolio Trend',
      estimatedTrendDesc: 'Estimated from current allocation with simulated variance. Real historical data will appear after a few days of tracking.',
      riskAnalysis: 'Risk Analysis',
      riskMetricsDesc: 'Risk metrics based on historical data',
      overallRisk: 'Overall Risk Level',
      riskLow: 'Low',
      riskModerate: 'Moderate',
      riskHigh: 'High',
      riskConservative: 'Conservative',
      riskBalanced: 'Balanced',
      riskAggressive: 'Aggressive',
      bestDay: 'Best Day',
      bestDayDesc: 'Highest single-day gain',
      worstDay: 'Worst Day',
      worstDayDesc: 'Largest single-day loss',
      diversification: 'Diversification',
      diversificationDesc: 'Portfolio balance score',
      topPerformers: 'Top Performers',
      noGainersYet: 'No gainers yet',
      addMoreAssets: 'Add more assets to track performance',
      underperformers: 'Underperformers',
      assetAllocation: 'Asset Allocation',
      days: 'Days',
    },

    // AI Assistant
    aiAssistant: {
      title: 'Market Intelligence',
      subtitle: 'Market observations based on available data. No predictions.',
      welcomeMessage: 'How can I assist your Pulse Node today?',
      welcomeSubtitle: 'Ask about markets, crypto, stocks, or economic trends',
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
      typeCommoditySymbol: 'Type commodity symbol (e.g. GLD, SLV)',
    },
    
    // Pricing Modal
    pricing: {
      title: 'Choose Your Plan',
      subtitle: 'Unlock powerful features to maximize your pulse',
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

    // Subscription Banners
    subscription: {
      pastDue: 'Payment failed — please update your payment method to avoid losing access.',
      cancelled: 'Your plan will end on {date}. Resubscribe anytime to keep your features.',
      updatePayment: 'Update Payment',
      resubscribe: 'Resubscribe',
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
      yourMirror: 'Your Pulse',
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

    // Empty Portfolio
    emptyPortfolio: {
      title: 'Start Your First Pulse',
      description: 'Your dashboard is waiting for a heartbeat. Add your first crypto, stock, or commodity to bring your portfolio to life.',
      cta: 'Capture Your First Asset',
      noFilterMatch: 'No assets match your filters.',
      allocationTitle: 'Start Building',
      allocationDesc: 'Add assets to see your portfolio breakdown',
    },

    // Upgrade Prompts
    upgrade: {
      availableOn: 'Available on',
      upgradeNow: 'Upgrade Now',
      assetLimit: 'Asset Limit Reached',
      assetLimitDesc: 'Your current plan allows a limited number of assets. Upgrade to ProPulse or SuperPulse for more slots.',
      commoditiesLocked: 'Commodities Locked',
      commoditiesLockedDesc: 'Gold, Oil, and other commodities are available on ProPulse and SuperPulse plans.',
      csvExport: 'CSV Export',
      csvExportDesc: 'Export your portfolio data to CSV for backup and analysis in spreadsheets.',
      csvImport: 'CSV Import',
      csvImportDesc: 'Import holdings from other platforms via CSV file.',
      premiumAnalytics: 'Premium Analytics',
      premiumAnalyticsDesc: 'Advanced portfolio analytics including risk metrics, correlation analysis, and performance attribution.',
    },

    // Toast Messages
    toast: {
      exportFailed: 'Export failed. Please check your browser permissions and try again.',
      importPartial: 'Imported assets. Some were skipped.',
      importSuccess: 'Successfully imported assets!',
      exportDataFailed: 'Failed to export data. Please try again.',
      accountDeleted: 'Your account has been deleted. Thank you for using FinPulse.',
      deleteAccountFailed: 'Failed to delete account. Please contact support.',
    },

    // Share
    share: {
      button: 'Share',
      title: 'Share Your Achievement',
      description: 'Let others know about your portfolio tracking journey.',
      messageTemplate: "I'm tracking assets on FinPulse — real-time portfolio tracking for crypto, stocks & commodities. Check it out!",
      shareNative: 'Share',
      copyLink: 'Copy Link',
      copied: 'Link copied to clipboard!',
      copyFailed: 'Failed to copy link.',
    },
  },

  he: {
    // Navigation
    nav: {
      mirror: 'פעימה חיה',
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
    
    // Portfolio/Pulse
    portfolio: {
      title: 'הפעימה שלך',
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
      addToMirror: 'הוסף לפעימה',
      priceAlert: 'התראת מחיר',
      setAlert: 'קבע התראה',
      removeAlert: 'הסר התראה',
      above: 'מעל',
      below: 'מתחת',
      triggered: 'הופעל!',
      currentPrice: 'מחיר נוכחי',
      searchAssets: 'חפש נכסים...',
    },
    
    // Global Pulse Feed
    community: {
      title: 'פיד הדופק הגלובלי',
      subtitle: 'תובנות אותות אנונימיות מצופים שוק משמעותיים.',
      feedTitle: 'הדופק הגלובלי',
      broadcast: 'שתף אות',
      searchPlaceholder: 'חפש אותות, טיקרים, תגיות...',
      allPosts: 'כל האותות',
      discussion: 'דיון',
      analysis: 'ניתוח',
      tradeIdea: 'רעיון מסחר',
      question: 'שאלה',
      noPosts: 'לא נמצאו אותות',
      leaderboard: 'טבלת דירוג - דיוק אות',
      privateMessage: 'האותות שלך כרגע פרטיים. שיתוף אותות מאפשר לאחרים ללמוד מהניתוח שלך.',
      enableBroadcast: 'שתף אותות בפומבי',
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
      holdings: 'אחזקות',
      xFeed: 'פיד X',
      all: 'הכל',
      marketNews: 'חדשות שוק',
      live: 'חי',
      cached: 'מטמון',
      recent: 'עדכני',
      cachedTooltip: 'מציג נתונים אחרונים — מתרענן אוטומטית',
      offline: 'לא מקוון',
      noNewsHoldings: 'אין חדשות לאחזקות שלך',
      noNewsAvailable: 'אין חדשות זמינות',
      addAssetsForNews: 'הוסף נכסים כדי לראות חדשות רלוונטיות',
      checkBackLater: 'בדוק שוב מאוחר יותר',
      noSource: 'אין מקור זמין',
    },

    // Premium Analytics
    analytics: {
      title: 'ניתוח פרמיום',
      subtitle: 'תובנות תיק מתקדמות ומדדי סיכון',
      noData: 'אין נתונים זמינים',
      noDataDesc: 'הוסף נכסים לתיק כדי לראות ניתוח.',
      unlockDesc: 'פתח תובנות תיק מתקדמות, מדדי סיכון ומעקב ביצועים עם סופרפאלס.',
      upgradeToSuper: 'שדרג לסופרפאלס',
      priceInfo: '$29.90/חודש • בטל בכל עת',
      simulated: 'מדומה',
      estimated: 'משוער',
      aiInsight: 'תובנת AI לתיק',
      liveAnalysis: 'ניתוח חי',
      totalPL: 'רווח/הפסד כולל',
      volatility: 'תנודתיות',
      annualized: 'שנתי',
      volatilityDesc: 'סטיית תקן שנתית של תשואות יומיות - מודדת סיכון תנודות מחיר',
      sharpeRatio: 'יחס שארפ',
      sharpeGood: 'טוב',
      sharpeFair: 'סביר',
      sharpePoor: 'חלש',
      sharpeDesc: 'מדד תשואה מותאם סיכון - גבוה יותר עדיף (מעל 1 טוב, מעל 2 מעולה)',
      maxDrawdown: 'ירידה מקסימלית',
      maxDrawdownDesc: 'הירידה הגדולה ביותר מהשיא לשפל בתקופה הנבחרת',
      totalReturnDollar: 'תשואה כוללת $',
      unrealizedPL: 'רווח/הפסד לא ממומש',
      totalReturnDollarDesc: 'סך רווח/הפסד לא ממומש בדולרים בכל האחזקות',
      totalReturnPercent: 'תשואה כוללת %',
      portfolioGainLoss: 'רווח/הפסד תיק',
      totalReturnPercentDesc: 'אחוז תשואה ברמת התיק ביחס לבסיס העלות הכולל',
      avgHoldingAge: 'גיל אחזקה ממוצע',
      avgInvestTime: 'זמן השקעה ממוצע',
      avgHoldingAgeDesc: 'זמן ממוצע שנכסים מוחזקים בתיק שלך',
      portfolioTrend: 'מגמת תיק',
      estimatedTrendDesc: 'משוער מההקצאה הנוכחית עם שונות מדומה. נתונים היסטוריים אמיתיים יופיעו לאחר מספר ימי מעקב.',
      riskAnalysis: 'ניתוח סיכונים',
      riskMetricsDesc: 'מדדי סיכון המבוססים על נתונים היסטוריים',
      overallRisk: 'רמת סיכון כוללת',
      riskLow: 'נמוך',
      riskModerate: 'בינוני',
      riskHigh: 'גבוה',
      riskConservative: 'שמרני',
      riskBalanced: 'מאוזן',
      riskAggressive: 'אגרסיבי',
      bestDay: 'היום הטוב ביותר',
      bestDayDesc: 'הרווח הגבוה ביותר ביום אחד',
      worstDay: 'היום הגרוע ביותר',
      worstDayDesc: 'ההפסד הגדול ביותר ביום אחד',
      diversification: 'פיזור',
      diversificationDesc: 'ציון איזון תיק',
      topPerformers: 'מובילים בביצועים',
      noGainersYet: 'אין מרוויחים עדיין',
      addMoreAssets: 'הוסף עוד נכסים למעקב ביצועים',
      underperformers: 'בעלי ביצועים חלשים',
      assetAllocation: 'הקצאת נכסים',
      days: 'ימים',
    },

    // AI Assistant
    aiAssistant: {
      title: 'מודיעין שוק',
      subtitle: 'תצפיות שוק המבוססות על נתונים זמינים. ללא תחזיות.',
      welcomeMessage: 'כיצד אוכל לסייע לצומת הפאלס שלך היום?',
      welcomeSubtitle: 'שאל על שווקים, קריפטו, מניות או מגמות כלכליות',
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
      typeCommoditySymbol: 'הקלד סימול סחורה (למשל GLD, SLV)',
    },
    
    // Pricing Modal
    pricing: {
      title: 'בחר את התוכנית שלך',
      subtitle: 'פתח תכונות חזקות כדי למקסם את הפעימה שלך',
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

    // Subscription Banners
    subscription: {
      pastDue: 'התשלום נכשל — אנא עדכן את אמצעי התשלום שלך כדי למנוע איבוד גישה.',
      cancelled: 'התוכנית שלך תסתיים ב-{date}. הירשם מחדש בכל עת כדי לשמור על התכונות.',
      updatePayment: 'עדכן תשלום',
      resubscribe: 'הירשם מחדש',
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
      yourMirror: 'הפעימה שלך',
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

    // Empty Portfolio
    emptyPortfolio: {
      title: 'התחל את הפולס הראשון שלך',
      description: 'הדשבורד שלך מחכה לפעימה. הוסף את הקריפטו, המניה או הסחורה הראשונה שלך כדי להחיות את התיק.',
      cta: 'לכוד את הנכס הראשון שלך',
      noFilterMatch: 'אין נכסים שתואמים את המסננים.',
      allocationTitle: 'התחל לבנות',
      allocationDesc: 'הוסף נכסים כדי לראות את פירוט התיק שלך',
    },

    // Upgrade Prompts
    upgrade: {
      availableOn: 'זמין ב',
      upgradeNow: 'שדרג עכשיו',
      assetLimit: 'הגעת למגבלת הנכסים',
      assetLimitDesc: 'התוכנית הנוכחית שלך מאפשרת מספר מוגבל של נכסים. שדרג לפרופאלס או סופרפאלס.',
      commoditiesLocked: 'סחורות נעולות',
      commoditiesLockedDesc: 'זהב, נפט וסחורות אחרות זמינים בתוכניות פרופאלס וסופרפאלס.',
      csvExport: 'ייצוא CSV',
      csvExportDesc: 'ייצא את נתוני התיק שלך ל-CSV לגיבוי וניתוח.',
      csvImport: 'ייבוא CSV',
      csvImportDesc: 'ייבא אחזקות מפלטפורמות אחרות באמצעות קובץ CSV.',
      premiumAnalytics: 'ניתוח פרמיום',
      premiumAnalyticsDesc: 'ניתוח תיק מתקדם כולל מדדי סיכון, ניתוח מתאם ויחס ביצועים.',
    },

    // Toast Messages
    toast: {
      exportFailed: 'הייצוא נכשל. בדוק את הרשאות הדפדפן ונסה שוב.',
      importPartial: 'יובאו נכסים. חלקם דולגו.',
      importSuccess: 'נכסים יובאו בהצלחה!',
      exportDataFailed: 'ייצוא הנתונים נכשל. נסה שוב.',
      accountDeleted: 'החשבון שלך נמחק. תודה שהשתמשת בפינפאלס.',
      deleteAccountFailed: 'מחיקת החשבון נכשלה. צור קשר עם התמיכה.',
    },

    // Share
    share: {
      button: 'שתף',
      title: 'שתף את ההישג שלך',
      description: 'ספר לאחרים על מסע מעקב התיק שלך.',
      messageTemplate: 'אני עוקב אחרי נכסים בפינפאלס — מעקב תיק בזמן אמת לקריפטו, מניות וסחורות. בדקו את זה!',
      shareNative: 'שתף',
      copyLink: 'העתק קישור',
      copied: 'הקישור הועתק!',
      copyFailed: 'העתקת הקישור נכשלה.',
    },
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
