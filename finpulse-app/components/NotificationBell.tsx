/**
 * FinPulse V2: Notification Bell Component
 * Persistent header notification center with unread badge
 */

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Sparkles, Wrench, Tag, Megaphone, ExternalLink, Check } from 'lucide-react';
import { Notification, NOTIFICATION_STORAGE_KEYS } from '../types/notifications';
import { useLanguage } from '../i18n';
import { PlanType } from '../types';

interface NotificationBellProps {
  userPlan: PlanType;
  userId?: string;
  onNavigate?: (url: string) => void;
}

// Generate user-specific storage key
const getUserStorageKey = (userId?: string) => {
  const base = NOTIFICATION_STORAGE_KEYS.READ_NOTIFICATIONS;
  return userId ? `${base}_${userId}` : base;
};

const getUserSignupKey = (userId?: string) => {
  const base = NOTIFICATION_STORAGE_KEYS.USER_SIGNUP_DATE;
  return userId ? `${base}_${userId}` : base;
};

// Dynamic notification generator based on user context
function generateNotifications(userPlan: PlanType, userId?: string): Notification[] {
  const notifications: Notification[] = [];
  const now = new Date();

  // Get user's first seen date to determine which notifications to show
  const userSignupKey = getUserSignupKey(userId);
  const userSignupStr = localStorage.getItem(userSignupKey);
  const userSignup = userSignupStr ? new Date(userSignupStr) : now;

  // Record signup date if not already recorded
  if (!userSignupStr) {
    localStorage.setItem(userSignupKey, now.toISOString());
  }

  const daysSinceSignup = Math.floor((now.getTime() - userSignup.getTime()) / (1000 * 60 * 60 * 24));

  // Welcome notification (only for new users within 7 days)
  if (daysSinceSignup <= 7) {
    notifications.push({
      id: 'welcome',
      type: 'feature',
      title: 'Welcome to FinPulse!',
      description: 'Add your first assets to start tracking your portfolio.',
      timestamp: userSignup.toISOString(),
      isRead: false,
      ctaText: 'Add Assets',
      ctaUrl: '#portfolio'
    });
  }

  // Community tip (show after 1 day)
  if (daysSinceSignup >= 1 && daysSinceSignup <= 14) {
    notifications.push({
      id: 'community_tip',
      type: 'announcement',
      title: 'Join the Community',
      description: 'Share insights and learn from other investors.',
      timestamp: new Date(userSignup.getTime() + 1000 * 60 * 60 * 24).toISOString(),
      isRead: false,
      ctaText: 'Explore',
      ctaUrl: '#community'
    });
  }

  // Whale tracking tip (show after 2 days)
  if (daysSinceSignup >= 2 && daysSinceSignup <= 14) {
    notifications.push({
      id: 'whale_tip',
      type: 'feature',
      title: 'Track Influencers',
      description: 'See what crypto influencers are saying in the Whales tab.',
      timestamp: new Date(userSignup.getTime() + 1000 * 60 * 60 * 48).toISOString(),
      isRead: false,
      ctaText: 'View Whales',
      ctaUrl: '#whales'
    });
  }

  // Upgrade prompt for FREE users (show after 5 days)
  if (userPlan === 'FREE' && daysSinceSignup >= 5) {
    notifications.push({
      id: 'upgrade_prompt',
      type: 'offer',
      title: 'Unlock More Features',
      description: 'Track commodities, get more AI queries, and access advanced analytics.',
      timestamp: new Date(userSignup.getTime() + 1000 * 60 * 60 * 120).toISOString(),
      isRead: false,
      ctaText: 'View Plans',
      ctaUrl: '#pricing',
      targetPlans: ['FREE']
    });
  }

  // Sort by timestamp (newest first)
  return notifications.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'feature': return <Sparkles className="w-4 h-4 text-[#00e5ff]" />;
    case 'maintenance': return <Wrench className="w-4 h-4 text-yellow-500" />;
    case 'offer': return <Tag className="w-4 h-4 text-green-500" />;
    case 'announcement': return <Megaphone className="w-4 h-4 text-purple-500" />;
  }
};

const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  
  // Guard against future-dated notifications (negative time diff)
  if (diffMs < 0) {
    return date.toLocaleDateString();
  }
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ userPlan, userId, onNavigate }) => {
  const { t, isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const storageKey = getUserStorageKey(userId);

  // Load notifications and read state
  useEffect(() => {
    const loadNotifications = () => {
      // Generate dynamic notifications based on user context
      const generated = generateNotifications(userPlan, userId);

      // Filter notifications by plan
      const filtered = generated.filter(n => {
        if (!n.targetPlans) return true;
        return n.targetPlans.includes(userPlan);
      });

      // Load read state from user-scoped localStorage
      const readIds = JSON.parse(localStorage.getItem(storageKey) || '[]');

      setNotifications(filtered.map(n => ({
        ...n,
        isRead: readIds.includes(n.id)
      })));
    };

    loadNotifications();
  }, [userPlan, userId, storageKey]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => {
    const readIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem(storageKey, JSON.stringify(readIds));
    }

    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem(storageKey, JSON.stringify(allIds));
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.ctaUrl && onNavigate) {
      onNavigate(notification.ctaUrl);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-[#00e5ff] transition-colors"
        aria-label={t('notifications.title')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className={`absolute top-full mt-2 ${isRTL ? 'left-0' : 'right-0'} w-80 sm:w-96 bg-white dark:bg-[#151921] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {t('notifications.title')}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-[#00e5ff] hover:underline flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  {t('notifications.markAllRead')}
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500">{t('notifications.empty')}</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-slate-100 dark:border-white/5 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${
                    !notification.isRead ? 'bg-[#00e5ff]/5' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`p-2 rounded-xl ${!notification.isRead ? 'bg-white dark:bg-[#0b0e14]' : 'bg-slate-100 dark:bg-white/5'}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-semibold ${!notification.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-[#00e5ff] rounded-full shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 line-clamp-2">
                        {notification.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-slate-400">
                          {formatTimeAgo(notification.timestamp)}
                        </span>
                        {notification.ctaText && (
                          <span className="text-xs text-[#00e5ff] font-semibold flex items-center gap-1">
                            {notification.ctaText}
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
