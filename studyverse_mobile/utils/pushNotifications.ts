import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { NotificationService } from './notifications';
import { studySessionsApi } from './api';

export interface PushNotificationData {
  type: 'session_reminder' | 'session_update' | 'session_deleted' | 'sync_sessions';
  sessionId?: string;
  message?: string;
  action?: string;
}

export class PushNotificationService {
  private static pushToken: string | null = null;

  // Register for push notifications and get token
  static async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if running on physical device
      if (!Device.isDevice) {
        console.log('[PushNotifications] Must use physical device for push notifications');
        return null;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[PushNotifications] Permission not granted for push notifications');
        return null;
      }

      // Get push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.log('[PushNotifications] No project ID found');
        return null;
      }

      const pushTokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.pushToken = pushTokenData.data;
      console.log('[PushNotifications] Push token obtained:', this.pushToken);

      // Send token to backend
      await this.sendTokenToBackend(this.pushToken);

      return this.pushToken;
    } catch (error) {
      console.error('[PushNotifications] Error registering for push notifications:', error);
      return null;
    }
  }

  // Send push token to backend
  private static async sendTokenToBackend(token: string): Promise<void> {
    try {
      // TODO: Implement API call to send token to backend
      // await api.post('/user/push-token', { token, platform: Platform.OS });
      console.log('[PushNotifications] Would send token to backend:', token);
    } catch (error) {
      console.error('[PushNotifications] Error sending token to backend:', error);
    }
  }

  // Handle incoming push notifications
  static setupPushNotificationHandlers(): void {
    // Handle notifications received while app is in foreground
    Notifications.addNotificationReceivedListener(notification => {
      console.log('[PushNotifications] Notification received:', notification);
      this.handlePushNotification(notification.request.content.data as PushNotificationData);
    });

    // Handle notification responses (when user taps notification)
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[PushNotifications] Notification response:', response);
      this.handlePushNotificationResponse(response.notification.request.content.data as PushNotificationData);
    });
  }

  // Handle push notification data
  private static async handlePushNotification(data: PushNotificationData): Promise<void> {
    try {
      console.log('[PushNotifications] Handling push notification:', data);

      switch (data.type) {
        case 'sync_sessions':
          // Backend tells app to sync sessions and reschedule notifications
          await this.syncSessionsAndReschedule();
          break;

        case 'session_reminder':
          // Direct session reminder from backend
          if (data.sessionId && data.message) {
            // This is a direct reminder, no need to schedule locally
            console.log('[PushNotifications] Direct session reminder received');
          }
          break;

        case 'session_update':
          // Session was updated, need to reschedule
          await this.syncSessionsAndReschedule();
          break;

        case 'session_deleted':
          // Session was deleted, need to reschedule
          await this.syncSessionsAndReschedule();
          break;

        default:
          console.log('[PushNotifications] Unknown notification type:', data.type);
      }
    } catch (error) {
      console.error('[PushNotifications] Error handling push notification:', error);
    }
  }

  // Handle notification response (when user taps)
  private static async handlePushNotificationResponse(data: PushNotificationData): Promise<void> {
    try {
      console.log('[PushNotifications] Handling notification response:', data);

      // For session reminders, open the web app
      if (data.type === 'session_reminder') {
        // Open web app (handled by existing notification service)
        const { Linking } = require('expo-linking');
        await Linking.openURL('https://studyverse.com'); // Update with your web app URL
      }

      // For other types, might want to navigate to specific screens
      // TODO: Add navigation logic based on notification type
    } catch (error) {
      console.error('[PushNotifications] Error handling notification response:', error);
    }
  }

  // Sync sessions and reschedule local notifications
  private static async syncSessionsAndReschedule(): Promise<void> {
    try {
      console.log('[PushNotifications] Syncing sessions and rescheduling notifications...');

      // Fetch latest sessions from backend
      const sessions = await studySessionsApi.getUserStudySessions();
      
      // Cancel all existing local notifications
      await NotificationService.cancelAllReminders();
      
      // Reschedule notifications for all upcoming sessions
      await NotificationService.scheduleSessionReminders(sessions);
      
      console.log('[PushNotifications] Successfully synced and rescheduled notifications');
    } catch (error) {
      console.error('[PushNotifications] Error syncing sessions:', error);
    }
  }

  // Get current push token
  static getPushToken(): string | null {
    return this.pushToken;
  }

  // Send a test push notification (for development)
  static async sendTestPushNotification(): Promise<void> {
    try {
      if (!this.pushToken) {
        console.log('[PushNotifications] No push token available');
        return;
      }

      // TODO: Implement test push via your backend
      console.log('[PushNotifications] Would send test push to token:', this.pushToken);
    } catch (error) {
      console.error('[PushNotifications] Error sending test push:', error);
    }
  }
}

// Initialize push notifications
PushNotificationService.setupPushNotificationHandlers();
