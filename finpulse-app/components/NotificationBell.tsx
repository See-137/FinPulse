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
  onNavigate?: (url: string) => void;
}

// Sample notifications (in production, fetch from API)
const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif_v2_launch',
    type: 'feature',
    title: 'FinPulse V2 is Live! 🚀',
    description: 'Explore the new AI Copilot, redesigned dashboard, and more.',
    timestamp: '2026-01-04T10:00:00Z',
    isRead: false,
    ctaText: 'Explore',
    ctaUrl: '#dashboard'
  },
  {
    id: 'notif_asset_selector',
    type: 'feature',
    title: 'New Asset Selector',
    description: 'Browse 35+ popular assets or search from thousands more.',
    timestamp: '2026-01-04T09:00:00Z',
    isRead: false
  },
  {
    id: 'notif_upgrade_offer',
    type: 'offer',
    title: 'Unlock Commodities Tracking',
    description: 'Track Gold, Oil, and more with ProPulse - just $9.90/month.',
    timestamp: '2026-01-03T14:00:00Z',
    isRead: false,
    ctaText: 'Upgrade',
    ctaUrl: '#pricing',
    targetPlans: ['FREE']
  },
  {
    id: 'notif_community',
    type: 'announcement',
    title: 'Community Features Enhanced',
    description: 'Share insights, discover strategies, and connect with other investors.',
    timestamp: '2026-01-02T11:00:00Z',
    isRead: false
  }
];

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

export const NotificationBell: React.FC<NotificationBellProps> = ({ userPlan, onNavigate }) => {
  const { t, isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications and read state
  useEffect(() => {
    const loadNotifications = () => {
      // Filter notifications by plan
      const filtered = DEFAULT_NOTIFICATIONS.filter(n => {
        if (!n.targetPlans) return true;
        return n.targetPlans.includes(userPlan);
      });

      // Load read state from localStorage
      const readIds = JSON.parse(localStorage.getItem(NOTIFICATION_STORAGE_KEYS.READ_NOTIFICATIONS) || '[]');
      
      setNotifications(filtered.map(n => ({
        ...n,
        isRead: readIds.includes(n.id)
      })));
    };

    loadNotifications();
  }, [userPlan]);

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
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => {
    const readIds = JSON.parse(localStorage.getItem(NOTIFICATION_STORAGE_KEYS.READ_NOTIFICATIONS) || '[]');
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem(NOTIFICATION_STORAGE_KEYS.READ_NOTIFICATIONS, JSON.stringify(readIds));
    }
    
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem(NOTIFICATION_STORAGE_KEYS.READ_NOTIFICATIONS, JSON.stringify(allIds));
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
