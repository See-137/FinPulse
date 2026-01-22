/**
 * FinPulse V2: Notification Coordinator Service
 * Prevents notification fatigue with smart coordination rules
 */

import { NOTIFICATION_STORAGE_KEYS } from '../types/notifications';

type NotificationChannel = 'modal' | 'bell' | 'banner';

// NotificationEvent interface reserved for future use
// type: 'version_update' | 'new_feature' | 'maintenance' | 'offer' | 'announcement'
// id: string; channels: NotificationChannel[]

/**
 * Coordination Rules:
 * - Version updates: Modal (once) + Banner (7 days), NO bell (redundant)
 * - New features: Bell + Banner, NO modal (not version-level)
 * - Maintenance: Bell + Banner (warning)
 * - Offers: Bell + Banner (filtered by plan)
 * - Announcements: Bell + Banner
 */
class NotificationCoordinator {
  private suppressedNotifications: Map<string, NotificationChannel[]> = new Map();
  private lastVersionShown: string | null = null;

  constructor() {
    // Load suppression state
    this.lastVersionShown = localStorage.getItem(NOTIFICATION_STORAGE_KEYS.LAST_SEEN_CHANGELOG);
  }

  /**
   * Check if a notification should be shown on a specific channel
   */
  shouldShow(eventId: string, channel: NotificationChannel): boolean {
    const suppressed = this.suppressedNotifications.get(eventId);
    if (suppressed?.includes(channel)) {
      return false;
    }
    return true;
  }

  /**
   * Handle version update event
   * Shows modal once, suppresses bell (would be redundant with modal)
   */
  handleVersionUpdate(version: string): { showModal: boolean; showBanner: boolean } {
    const versionKey = `version_${version}`;
    
    // Check if this version was already shown
    if (this.lastVersionShown === version) {
      return { showModal: false, showBanner: false };
    }

    // Suppress bell for this version (modal takes priority)
    this.suppressedNotifications.set(versionKey, ['bell']);
    
    return { showModal: true, showBanner: true };
  }

  /**
   * Handle new feature event (not tied to version)
   * Shows in bell and banner, no modal
   */
  handleNewFeature(featureId: string): { showBell: boolean; showBanner: boolean } {
    // Features always go to bell and banner
    this.suppressedNotifications.set(featureId, ['modal']);
    return { showBell: true, showBanner: true };
  }

  /**
   * Handle maintenance notice
   * Shows in bell and banner (warning variant)
   */
  handleMaintenanceNotice(noticeId: string): { showBell: boolean; showBanner: boolean } {
    this.suppressedNotifications.set(noticeId, ['modal']);
    return { showBell: true, showBanner: true };
  }

  /**
   * Mark a notification as shown on a channel
   */
  markShown(eventId: string, channel: NotificationChannel): void {
    const current = this.suppressedNotifications.get(eventId) || [];
    if (!current.includes(channel)) {
      current.push(channel);
      this.suppressedNotifications.set(eventId, current);
    }
  }

  /**
   * Get priority for notification display
   * Modal > Banner > Bell
   */
  getPriority(channel: NotificationChannel): number {
    switch (channel) {
      case 'modal': return 3;   // Highest urgency
      case 'banner': return 2;  // Medium urgency
      case 'bell': return 1;    // Low urgency (persistent)
    }
  }

  /**
   * Check if user has seen onboarding
   */
  hasCompletedOnboarding(): boolean {
    return localStorage.getItem(NOTIFICATION_STORAGE_KEYS.ONBOARDING_COMPLETED) === 'true';
  }

  /**
   * Mark onboarding as completed
   */
  completeOnboarding(): void {
    localStorage.setItem(NOTIFICATION_STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
  }

  /**
   * Reset onboarding (for testing)
   */
  resetOnboarding(): void {
    localStorage.removeItem(NOTIFICATION_STORAGE_KEYS.ONBOARDING_COMPLETED);
  }

  /**
   * Clear all notification state (for testing)
   */
  resetAll(): void {
    Object.values(NOTIFICATION_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    this.suppressedNotifications.clear();
    this.lastVersionShown = null;
  }
}

// Singleton instance
export const notificationCoordinator = new NotificationCoordinator();

export default NotificationCoordinator;
