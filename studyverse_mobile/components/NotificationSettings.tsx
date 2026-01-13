import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { NotificationService, NotificationSettings } from '@/utils/notifications';
import { PushNotificationService } from '@/utils/pushNotifications';

interface NotificationSettingsProps {
  isDarkMode: boolean;
}

const REMINDER_OPTIONS = [
  { label: '5 minutes before', value: 5 },
  { label: '10 minutes before', value: 10 },
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
];

export default function NotificationSettingsComponent({ isDarkMode }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    reminderMinutes: 10,
  });
  const [loading, setLoading] = useState(true);

  const theme = {
    background: isDarkMode ? '#2d1b3d' : '#ffffff',
    textPrimary: isDarkMode ? '#ffffff' : '#1f2937',
    textSecondary: isDarkMode ? '#e4d4f4' : '#374151',
    border: isDarkMode ? '#4c1d95' : '#e0e7ff',
    primary: '#6366f1',
    optionBackground: isDarkMode ? '#1a1625' : '#f8faff',
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await NotificationService.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    try {
      if (enabled) {
        // Request permissions when enabling
        const hasPermission = await NotificationService.requestPermissions();
        if (!hasPermission) {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive study reminders.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      const newSettings = { ...settings, enabled };
      setSettings(newSettings);
      await NotificationService.saveSettings(newSettings);
      
      if (enabled) {
        Alert.alert('Success', 'Study reminders enabled! You\'ll receive notifications before your sessions.');
      } else {
        // Cancel all notifications when disabled
        await NotificationService.cancelAllReminders();
        Alert.alert('Disabled', 'Study reminders have been turned off.');
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings.');
    }
  };

  const handleReminderTimeChange = async (minutes: number) => {
    try {
      const newSettings = { ...settings, reminderMinutes: minutes };
      setSettings(newSettings);
      await NotificationService.saveSettings(newSettings);
      
      Alert.alert(
        'Updated',
        `You'll now receive reminders ${minutes} minutes before your study sessions.`
      );
    } catch (error) {
      console.error('Error updating reminder time:', error);
      Alert.alert('Error', 'Failed to update reminder time.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading notification settings...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>
        Study Session Reminders
      </Text>
      
      <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>
            Enable Reminders
          </Text>
          <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
            Get notified before your study sessions
          </Text>
        </View>
        <Switch
          value={settings.enabled}
          onValueChange={handleToggleEnabled}
          trackColor={{ false: '#767577', true: theme.primary }}
          thumbColor={settings.enabled ? '#ffffff' : '#f4f3f4'}
        />
      </View>

      {settings.enabled && (
        <View style={styles.reminderOptions}>
          <Text style={[styles.optionsTitle, { color: theme.textPrimary }]}>
            Reminder Time
          </Text>
          
          {REMINDER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionRow,
                {
                  backgroundColor: settings.reminderMinutes === option.value 
                    ? theme.primary + '20' 
                    : theme.optionBackground,
                  borderColor: settings.reminderMinutes === option.value 
                    ? theme.primary 
                    : theme.border,
                }
              ]}
              onPress={() => handleReminderTimeChange(option.value)}
            >
              <Text style={[
                styles.optionText,
                {
                  color: settings.reminderMinutes === option.value 
                    ? theme.primary 
                    : theme.textPrimary,
                  fontWeight: settings.reminderMinutes === option.value ? '600' : 'normal',
                }
              ]}>
                {option.label}
              </Text>
              {settings.reminderMinutes === option.value && (
                <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.testButton, { backgroundColor: theme.primary }]}
        onPress={async () => {
          await NotificationService.sendTestNotification();
          Alert.alert('Test Sent', 'A test notification will appear in 10 seconds!');
        }}
      >
        <Text style={styles.testButtonText}>Send Test Notification</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.testButton, { backgroundColor: '#10b981' }]}
        onPress={async () => {
          await NotificationService.sendTestSessionReminder();
          Alert.alert('Test Session Reminder', 'A session reminder will appear in 30 seconds!');
        }}
      >
        <Text style={styles.testButtonText}>Test Session Reminder (30s)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.testButton, { backgroundColor: '#8b5cf6' }]}
        onPress={async () => {
          const token = await PushNotificationService.registerForPushNotifications();
          if (token) {
            Alert.alert('Push Token', `Push notifications registered!\nToken: ${token.substring(0, 20)}...`);
          } else {
            Alert.alert('Push Error', 'Failed to register for push notifications. Check console for details.');
          }
        }}
      >
        <Text style={styles.testButtonText}>Register Push Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.debugButton, { backgroundColor: '#f59e0b' }]}
        onPress={async () => {
          await NotificationService.getScheduledNotifications();
          const count = await NotificationService.getScheduledCount();
          Alert.alert('Debug Info', `${count} notifications scheduled. Check console for details.`);
        }}
      >
        <Text style={styles.testButtonText}>Debug Scheduled Notifications</Text>
      </TouchableOpacity>

      <Text style={[styles.description, { color: theme.textSecondary }]}>
        Notifications will open the StudyVerse web app where you can start your study session.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    marginVertical: 8,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  reminderOptions: {
    marginBottom: 16,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  debugButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
