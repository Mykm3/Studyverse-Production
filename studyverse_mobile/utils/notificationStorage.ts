import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StoredNotification {
  id: string;
  title: string;
  message: string;
  type: 'reminder' | 'achievement' | 'info' | 'update';
  timestamp: Date;
  read: boolean;
  sessionId?: string;
  data?: any;
}

const NOTIFICATIONS_STORAGE_KEY = 'stored_notifications';
const MAX_STORED_NOTIFICATIONS = 100; // Limit to prevent storage bloat

export class NotificationStorage {
  // Get all stored notifications
  static async getStoredNotifications(): Promise<StoredNotification[]> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (!stored) return [];
      
      const notifications = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return notifications.map((notif: any) => ({
        ...notif,
        timestamp: new Date(notif.timestamp)
      }));
    } catch (error) {
      console.error('[NotificationStorage] Error getting stored notifications:', error);
      return [];
    }
  }

  // Add a new notification to storage
  static async addNotification(notification: Omit<StoredNotification, 'id' | 'timestamp' | 'read'>): Promise<void> {
    try {
      const existingNotifications = await this.getStoredNotifications();
      
      const newNotification: StoredNotification = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        read: false,
        ...notification
      };

      // Add to beginning of array (newest first)
      const updatedNotifications = [newNotification, ...existingNotifications];
      
      // Limit the number of stored notifications
      const limitedNotifications = updatedNotifications.slice(0, MAX_STORED_NOTIFICATIONS);
      
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(limitedNotifications));
      
      console.log('[NotificationStorage] Added notification:', newNotification.title);
    } catch (error) {
      console.error('[NotificationStorage] Error adding notification:', error);
    }
  }

  // Mark a notification as read
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const updatedNotifications = notifications.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      );
      
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updatedNotifications));
      console.log('[NotificationStorage] Marked notification as read:', notificationId);
    } catch (error) {
      console.error('[NotificationStorage] Error marking notification as read:', error);
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const updatedNotifications = notifications.map(notif => ({ ...notif, read: true }));
      
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updatedNotifications));
      console.log('[NotificationStorage] Marked all notifications as read');
    } catch (error) {
      console.error('[NotificationStorage] Error marking all notifications as read:', error);
    }
  }

  // Delete a notification
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const updatedNotifications = notifications.filter(notif => notif.id !== notificationId);
      
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updatedNotifications));
      console.log('[NotificationStorage] Deleted notification:', notificationId);
    } catch (error) {
      console.error('[NotificationStorage] Error deleting notification:', error);
    }
  }

  // Clear all notifications
  static async clearAllNotifications(): Promise<void> {
    try {
      await AsyncStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
      console.log('[NotificationStorage] Cleared all notifications');
    } catch (error) {
      console.error('[NotificationStorage] Error clearing notifications:', error);
    }
  }

  // Clear all old/duplicate notifications and start fresh
  static async clearAllAndStartFresh(): Promise<void> {
    try {
      await AsyncStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
      console.log('[NotificationStorage] Cleared all old notifications - starting fresh with new system');
    } catch (error) {
      console.error('[NotificationStorage] Error clearing old notifications:', error);
    }
  }

  // Clear old scheduled notifications that were never actually pushed
  // This should be called periodically to clean up notifications that were scheduled but never delivered
  static async clearUnpushedScheduledNotifications(): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const now = new Date();

      // Filter out notifications that were scheduled but the scheduled time has passed
      // We identify these as notifications with timestamps very close to when they were scheduled
      // rather than when they were actually received
      const validNotifications = notifications.filter(notification => {
        // Keep achievement and info notifications (these are added immediately)
        if (notification.type === 'achievement' || notification.type === 'info') {
          return true;
        }

        // For reminder notifications, check if they were likely actually pushed
        // If the notification timestamp is more than 1 hour old and it's a reminder,
        // it was likely scheduled but never pushed
        if (notification.type === 'reminder') {
          const hoursSinceTimestamp = (now.getTime() - notification.timestamp.getTime()) / (1000 * 60 * 60);
          // Keep notifications that are less than 1 hour old (likely just pushed)
          // or more than 24 hours old (definitely pushed in the past)
          return hoursSinceTimestamp < 1 || hoursSinceTimestamp > 24;
        }

        return true;
      });

      if (validNotifications.length !== notifications.length) {
        await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(validNotifications));
        console.log('[NotificationStorage] Cleaned up', notifications.length - validNotifications.length, 'unpushed scheduled notifications');
      }
    } catch (error) {
      console.error('[NotificationStorage] Error clearing unpushed notifications:', error);
    }
  }

  // Get unread count
  static async getUnreadCount(): Promise<number> {
    try {
      const notifications = await this.getStoredNotifications();
      return notifications.filter(notif => !notif.read).length;
    } catch (error) {
      console.error('[NotificationStorage] Error getting unread count:', error);
      return 0;
    }
  }

  // Add a session reminder notification (called when notification is actually pushed)
  static async addPushedSessionReminder(sessionId: string, sessionSubject: string, reminderMinutes: number, pushedAt: Date): Promise<void> {
    const newNotification: StoredNotification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: '📚 Study Session Reminder',
      message: `${sessionSubject} starts in ${reminderMinutes} minutes!`,
      type: 'reminder',
      timestamp: pushedAt, // Use the actual push time
      read: false,
      sessionId,
      data: { reminderMinutes, sessionSubject }
    };

    const existingNotifications = await this.getStoredNotifications();
    const updatedNotifications = [newNotification, ...existingNotifications];
    const limitedNotifications = updatedNotifications.slice(0, MAX_STORED_NOTIFICATIONS);

    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(limitedNotifications));
    console.log('[NotificationStorage] Added pushed session reminder:', newNotification.title);
  }

  // Add a pushed info notification (called when notification is actually pushed)
  static async addPushedInfo(title: string, message: string, pushedAt: Date): Promise<void> {
    const newNotification: StoredNotification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title,
      message,
      type: 'info',
      timestamp: pushedAt, // Use the actual push time
      read: false
    };

    const existingNotifications = await this.getStoredNotifications();
    const updatedNotifications = [newNotification, ...existingNotifications];
    const limitedNotifications = updatedNotifications.slice(0, MAX_STORED_NOTIFICATIONS);

    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(limitedNotifications));
    console.log('[NotificationStorage] Added pushed info notification:', newNotification.title);
  }

  // Add an achievement notification (these are added immediately, not scheduled)
  static async addAchievement(title: string, message: string): Promise<void> {
    await this.addNotification({
      title,
      message,
      type: 'achievement'
    });
  }

  // Legacy methods (kept for backward compatibility but should not be used for scheduled notifications)
  // Add a session reminder notification (called when notification is scheduled) - DEPRECATED
  static async addSessionReminder(sessionId: string, sessionSubject: string, reminderMinutes: number): Promise<void> {
    console.warn('[NotificationStorage] addSessionReminder is deprecated. Use addPushedSessionReminder instead.');
    await this.addNotification({
      title: '📚 Study Session Reminder',
      message: `${sessionSubject} starts in ${reminderMinutes} minutes!`,
      type: 'reminder',
      sessionId,
      data: { reminderMinutes, sessionSubject }
    });
  }

  // Add an info notification - DEPRECATED for scheduled notifications
  static async addInfo(title: string, message: string): Promise<void> {
    console.warn('[NotificationStorage] addInfo is deprecated for scheduled notifications. Use addPushedInfo instead.');
    await this.addNotification({
      title,
      message,
      type: 'info'
    });
  }
}
