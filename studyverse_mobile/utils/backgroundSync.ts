import { AppState, AppStateStatus } from 'react-native';
import { studySessionsApi } from './api';
import { NotificationService } from './notifications';

export class BackgroundSyncService {
  private static appStateSubscription: any = null;
  private static lastSyncTime: number = 0;
  private static readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

  // Initialize background sync
  static initialize(): void {
    console.log('[BackgroundSync] Initializing background sync service');
    
    // Listen for app state changes
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );

    // Perform initial sync
    this.syncNotifications();
  }

  // Cleanup
  static cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  // Handle app state changes
  private static handleAppStateChange = (nextAppState: AppStateStatus): void => {
    console.log('[BackgroundSync] App state changed to:', nextAppState);
    
    if (nextAppState === 'active') {
      // App came to foreground - check if we need to sync
      const now = Date.now();
      const timeSinceLastSync = now - this.lastSyncTime;
      
      if (timeSinceLastSync > this.SYNC_INTERVAL) {
        console.log('[BackgroundSync] App foregrounded, syncing notifications');
        this.syncNotifications();
      }
    }
  };

  // Sync notifications with backend
  static async syncNotifications(): Promise<void> {
    try {
      console.log('[BackgroundSync] Starting notification sync...');
      this.lastSyncTime = Date.now();

      // Fetch latest sessions from backend
      const sessions = await studySessionsApi.getUserStudySessions();
      console.log('[BackgroundSync] Fetched', sessions.length, 'sessions from backend');

      // Cancel all existing notifications
      await NotificationService.cancelAllReminders();
      console.log('[BackgroundSync] Cancelled existing notifications');

      // Re-schedule notifications for all upcoming sessions
      await NotificationService.scheduleSessionReminders(sessions);
      console.log('[BackgroundSync] Re-scheduled notifications for upcoming sessions');

      console.log('[BackgroundSync] Notification sync completed successfully');
    } catch (error) {
      console.error('[BackgroundSync] Error syncing notifications:', error);
    }
  }

  // Force sync (can be called manually)
  static async forcSync(): Promise<void> {
    console.log('[BackgroundSync] Force sync requested');
    await this.syncNotifications();
  }

  // Check if sync is needed
  static needsSync(): boolean {
    const now = Date.now();
    const timeSinceLastSync = now - this.lastSyncTime;
    return timeSinceLastSync > this.SYNC_INTERVAL;
  }

  // Get last sync time
  static getLastSyncTime(): Date | null {
    return this.lastSyncTime > 0 ? new Date(this.lastSyncTime) : null;
  }
}
