import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { NotificationStorage, StoredNotification } from '@/utils/notificationStorage';
import { useFocusEffect } from '@react-navigation/native';

// Import the IconSymbolName type from the IconSymbol component
type IconSymbolName = React.ComponentProps<typeof IconSymbol>['name'];

// Use the StoredNotification type from our storage utility
type Notification = StoredNotification;

interface NotificationIcon {
  name: IconSymbolName;
  color: string;
  backgroundColor: string;
}

// Real notifications are now managed by the notification system
// This page will show notification history when available
const notifications: Notification[] = [];

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const theme = {
    background: isDarkMode ? '#1a1625' : '#faf8ff',
    cardBackground: isDarkMode ? '#2d1b3d' : '#ffffff',
    textPrimary: isDarkMode ? '#ffffff' : '#1f2937',
    textSecondary: isDarkMode ? '#e4d4f4' : '#374151',
    textMuted: isDarkMode ? '#b794c8' : '#6b7280',
    border: isDarkMode ? '#4c1d95' : '#e0e7ff',
    primary: '#6366f1',
    violetLight: isDarkMode ? '#2d1b3d' : '#eef2ff',
  };
  
  const [notificationHistory, setNotificationHistory] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = async () => {
    setRefreshing(true);
    try {
      // One-time cleanup: Clear all old duplicate notifications from the previous system
      // This will run once to clean up the 72 duplicate notifications
      const currentNotifications = await NotificationStorage.getStoredNotifications();
      if (currentNotifications.length > 50) { // If there are too many notifications, likely duplicates
        console.log('[Notifications] Detected', currentNotifications.length, 'notifications - clearing old duplicates');
        await NotificationStorage.clearAllAndStartFresh();
      } else {
        // Clean up any old scheduled notifications that were never actually pushed
        await NotificationStorage.clearUnpushedScheduledNotifications();
      }

      const storedNotifications = await NotificationStorage.getStoredNotifications();
      setNotificationHistory(storedNotifications);
      console.log('[Notifications] Loaded', storedNotifications.length, 'stored notifications');
    } catch (error) {
      console.error('[Notifications] Error loading notifications:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Reload notifications when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const onRefresh = () => {
    fetchNotifications();
  };

  const markAsRead = async (id: string) => {
    try {
      await NotificationStorage.markAsRead(id);
      setNotificationHistory(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('[Notifications] Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await NotificationStorage.markAllAsRead();
      setNotificationHistory(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('[Notifications] Error marking all as read:', error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await NotificationStorage.clearAllAndStartFresh();
      setNotificationHistory([]);
      console.log('[Notifications] Cleared all notifications');
    } catch (error) {
      console.error('[Notifications] Error clearing all notifications:', error);
    }
  };

  const filteredNotifications = filter === 'unread'
    ? notificationHistory.filter(notification => !notification.read)
    : notificationHistory;

  const unreadCount = notificationHistory.filter(notification => !notification.read).length;

  const getNotificationIcon = (type: string): NotificationIcon => {
    switch(type) {
      case 'reminder':
        return { 
          name: 'clock.fill', 
          color: '#3B82F6', 
          backgroundColor: '#EFF6FF' 
        };
      case 'missed':
        return { 
          name: 'exclamationmark.triangle.fill', 
          color: '#EF4444', 
          backgroundColor: '#FEF2F2' 
        };
      case 'motivation':
        return {
          name: 'lightbulb.fill',
          color: '#F59E0B',
          backgroundColor: '#FFFBEB'
        };
      case 'achievement':
        return {
          name: 'star.fill',
          color: '#F59E0B',
          backgroundColor: '#FFFBEB'
        };
      case 'info':
        return {
          name: 'info.circle.fill',
          color: '#6366f1',
          backgroundColor: '#eef2ff'
        };
      case 'update':
        return {
          name: 'bell.fill',
          color: '#10B981',
          backgroundColor: '#F0FDF4'
        };
      default:
        return {
          name: 'bell.fill',
          color: theme.primary,
          backgroundColor: theme.cardBackground
        };
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return Math.floor(seconds) + ' seconds ago';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header - keeping original spacing */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <ThemedText type="title" style={styles.headerTitle}>Notifications</ThemedText>
          <ThemedText type="subtitle" style={styles.headerSubtitle}>
            {unreadCount > 0 ? `You have ${unreadCount} unread notifications` : 'All caught up!'}
          </ThemedText>
        </View>
      </View>

      {/* Filter and Actions - keeping original layout */}
      <View style={styles.actionsContainer}>
        <View style={styles.filterButtons}>
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
                borderWidth: 1,
              },
              filter === 'all' && { backgroundColor: theme.primary }
            ]}
            onPress={() => setFilter('all')}
            activeOpacity={0.7}
          >
            <ThemedText style={{
              color: filter === 'all' ? '#ffffff' : theme.textPrimary,
              fontWeight: filter === 'all' ? '600' : 'normal'
            }}>
              All
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
                borderWidth: 1,
              },
              filter === 'unread' && { backgroundColor: theme.primary }
            ]}
            onPress={() => setFilter('unread')}
            activeOpacity={0.7}
          >
            <ThemedText style={{
              color: filter === 'unread' ? '#ffffff' : theme.textPrimary,
              fontWeight: filter === 'unread' ? '600' : 'normal'
            }}>
              Unread
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.actionButtons}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={markAllAsRead}
              activeOpacity={0.7}
            >
              <ThemedText style={{ color: theme.primary, fontWeight: '500' }}>
                Mark all as read
              </ThemedText>
            </TouchableOpacity>
          )}

          {notificationHistory.length > 0 && (
            <TouchableOpacity
              style={[styles.clearAllButton, { marginLeft: unreadCount > 0 ? 12 : 0 }]}
              onPress={clearAllNotifications}
              activeOpacity={0.7}
            >
              <ThemedText style={{ color: '#ef4444', fontWeight: '500' }}>
                Clear All
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notifications List - keeping original structure */}
      <ScrollView
        style={styles.notificationsList}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredNotifications.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.cardBackground }]}>
            <IconSymbol name="bell.slash" size={40} color={theme.textMuted} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </ThemedText>
          </View>
        ) : (
          filteredNotifications.map(notification => {
            const { name: iconName, color: iconColor, backgroundColor } = getNotificationIcon(notification.type);
            
            return (
              <TouchableOpacity 
                key={notification.id} 
                style={[
                  styles.notificationCard, 
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.border,
                    borderWidth: 1,
                  },
                  !notification.read && styles.unreadNotification
                ]}
                onPress={() => markAsRead(notification.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor }]}>
                  <IconSymbol name={iconName} size={24} color={iconColor} />
                </View>
                
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <ThemedText type="subtitle" style={styles.notificationTitle}>
                      {notification.title}
                    </ThemedText>
                    {!notification.read && (
                      <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
                    )}
                  </View>

                  <ThemedText style={[styles.notificationMessage, { color: theme.textPrimary }]}>
                    {notification.message}
                  </ThemedText>

                  <ThemedText style={[styles.timestamp, { color: theme.textSecondary }]}>
                    {formatTimeAgo(notification.timestamp)}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginTop: Platform.OS === 'ios' ? 60 : 40,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  headerContent: {
    // Keep original header structure
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  filterButtons: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  markAllButton: {
    paddingVertical: 8,
  },
  notificationsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for tab bar
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
  },
  emptyState: {
    borderRadius: 16,
    padding: 32,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
});