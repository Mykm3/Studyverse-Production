import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StudySession } from './api';
import { NotificationStorage } from './notificationStorage';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationSettings {
  enabled: boolean;
  reminderMinutes: number; // 5, 10, 15, 30 minutes before
}

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';
const WEB_APP_URL = 'https://studyverse.com'; // Update with your actual web app URL

// Default notification settings
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  reminderMinutes: 10,
};

export class NotificationService {
  // Request notification permissions
  static async requestPermissions(): Promise<boolean> {
    try {
      console.log('[Notifications] Requesting permissions...');
      
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('study-reminders', {
          name: 'Study Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366f1',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      console.log('[Notifications] Permission status:', finalStatus);
      return finalStatus === 'granted';
    } catch (error) {
      console.error('[Notifications] Error requesting permissions:', error);
      return false;
    }
  }

  // Get notification settings
  static async getSettings(): Promise<NotificationSettings> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('[Notifications] Error getting settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  // Save notification settings
  static async saveSettings(settings: NotificationSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
      console.log('[Notifications] Settings saved:', settings);
    } catch (error) {
      console.error('[Notifications] Error saving settings:', error);
    }
  }

  // Schedule notification for a study session
  static async scheduleSessionReminder(session: StudySession): Promise<string | null> {
    try {
      const settings = await this.getSettings();

      if (!settings.enabled) {
        console.log('[Notifications] Notifications disabled, skipping');
        return null;
      }

      const sessionStart = new Date(session.startTime);
      const reminderTime = new Date(sessionStart.getTime() - settings.reminderMinutes * 60 * 1000);
      const now = new Date();

      console.log('[Notifications] Debug info:', {
        sessionId: session._id,
        sessionSubject: session.subject,
        sessionStart: sessionStart.toISOString(),
        reminderTime: reminderTime.toISOString(),
        now: now.toISOString(),
        reminderMinutes: settings.reminderMinutes,
        isPastReminder: reminderTime <= now,
        isPastSession: sessionStart <= now,
        timeDiffMinutes: Math.round((sessionStart.getTime() - now.getTime()) / (1000 * 60)),
        reminderDiffMinutes: Math.round((reminderTime.getTime() - now.getTime()) / (1000 * 60))
      });

      // Don't schedule if reminder time is in the past
      if (reminderTime <= now) {
        console.log('[Notifications] Reminder time is in the past, skipping session:', session._id);
        return null;
      }

      // Don't schedule if session has already started
      if (sessionStart <= now) {
        console.log('[Notifications] Session has already started, skipping:', session._id);
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📚 Study Session Reminder',
          body: `${session.subject} starts in ${settings.reminderMinutes} minutes!`,
          data: {
            sessionId: session._id,
            sessionSubject: session.subject,
            reminderMinutes: settings.reminderMinutes,
            url: WEB_APP_URL,
            type: 'session_reminder'
          },
          sound: true,
        },
        trigger: {
          type: 'date',
          date: reminderTime,
        },
      });

      console.log('[Notifications] Scheduled reminder for session:', session._id, 'at', reminderTime);
      return notificationId;
    } catch (error) {
      console.error('[Notifications] Error scheduling reminder:', error);
      return null;
    }
  }

  // Schedule reminders for multiple sessions
  static async scheduleSessionReminders(sessions: StudySession[]): Promise<void> {
    try {
      console.log('[Notifications] Scheduling reminders for', sessions.length, 'sessions');
      
      // Filter for upcoming sessions only
      const now = new Date();
      const upcomingSessions = sessions.filter(session => {
        const sessionStart = new Date(session.startTime);
        return sessionStart > now && session.status === 'scheduled';
      });

      // Schedule reminders for each session
      const promises = upcomingSessions.map(session => 
        this.scheduleSessionReminder(session)
      );
      
      await Promise.all(promises);
      console.log('[Notifications] Scheduled reminders for', upcomingSessions.length, 'upcoming sessions');
    } catch (error) {
      console.error('[Notifications] Error scheduling reminders:', error);
    }
  }

  // Cancel all scheduled notifications
  static async cancelAllReminders(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[Notifications] Cancelled all scheduled reminders');
    } catch (error) {
      console.error('[Notifications] Error cancelling reminders:', error);
    }
  }

  // Setup notification listeners
  static setupNotificationHandler(): void {
    // Handle when notification is received (actually pushed to device)
    Notifications.addNotificationReceivedListener(notification => {
      console.log('[Notifications] Notification received:', notification);

      const { type, sessionId, sessionSubject, reminderMinutes } = notification.request.content.data;

      // Store the notification in local storage when it's actually received
      if (type === 'session_reminder') {
        NotificationStorage.addPushedSessionReminder(
          sessionId,
          sessionSubject,
          reminderMinutes,
          new Date() // Actual push time
        );
      } else if (type === 'test') {
        NotificationStorage.addPushedInfo(
          notification.request.content.title || 'Test Notification',
          notification.request.content.body || 'Test notification body',
          new Date()
        );
      }
    });

    // Handle notification response (when user taps notification)
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[Notifications] Notification tapped:', response);

      const { url, sessionId, type } = response.notification.request.content.data;

      if (type === 'session_reminder' && url) {
        console.log('[Notifications] Opening web app for session:', sessionId);
        Linking.openURL(url);
      }
    });
  }

  // Get scheduled notifications count (for debugging)
  static async getScheduledCount(): Promise<number> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      return scheduled.length;
    } catch (error) {
      console.error('[Notifications] Error getting scheduled count:', error);
      return 0;
    }
  }

  // Debug: Get all scheduled notifications with details
  static async getScheduledNotifications(): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log('[Notifications] Currently scheduled notifications:', scheduled.length);

      scheduled.forEach((notification, index) => {
        const trigger = notification.trigger as any;
        console.log(`[Notifications] ${index + 1}:`, {
          id: notification.identifier,
          title: notification.content.title,
          body: notification.content.body,
          triggerDate: trigger.type === 'date' ? new Date(trigger.date).toISOString() : 'Unknown',
          timeUntilTrigger: trigger.type === 'date'
            ? Math.round((new Date(trigger.date).getTime() - Date.now()) / (1000 * 60)) + ' minutes'
            : 'Unknown'
        });
      });
    } catch (error) {
      console.error('[Notifications] Error getting scheduled notifications:', error);
    }
  }

  // Test notification (for debugging)
  static async sendTestNotification(): Promise<void> {
    try {
      console.log('[Notifications] Sending test notification...');

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'This is a test notification from StudyVerse!',
          data: {
            type: 'test'
          },
          sound: true,
        },
        trigger: {
          type: 'date',
          date: new Date(Date.now() + 10000), // 10 seconds from now
        },
      });

      console.log('[Notifications] Test notification scheduled for 10 seconds from now');
    } catch (error) {
      console.error('[Notifications] Error sending test notification:', error);
    }
  }

  // Test session reminder (triggers in 30 seconds)
  static async sendTestSessionReminder(): Promise<void> {
    try {
      console.log('[Notifications] Sending test session reminder...');

      const reminderTime = new Date(Date.now() + 30000); // 30 seconds from now

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📚 Study Session Reminder',
          body: 'Test Mathematics session starts in 10 minutes!',
          data: {
            sessionId: 'test-session',
            url: WEB_APP_URL,
            type: 'session_reminder'
          },
          sound: true,
        },
        trigger: {
          type: 'date',
          date: reminderTime,
        },
      });

      // Store the test session reminder
      await NotificationStorage.addSessionReminder(
        'test-session',
        'Test Mathematics',
        10
      );

      console.log('[Notifications] Test session reminder scheduled for 30 seconds from now');
    } catch (error) {
      console.error('[Notifications] Error sending test session reminder:', error);
    }
  }
}

// Initialize notification handler
NotificationService.setupNotificationHandler();
