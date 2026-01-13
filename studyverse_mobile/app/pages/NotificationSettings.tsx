import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import NotificationSettingsComponent from '@/components/NotificationSettings';

export default function NotificationSettingsPage() {
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
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Notification Settings
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Description */}
        <View style={[styles.descriptionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.descriptionHeader}>
            <Text style={styles.descriptionIcon}>🔔</Text>
            <Text style={[styles.descriptionTitle, { color: theme.textPrimary }]}>
              Study Session Reminders
            </Text>
          </View>
          <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>
            Configure when you want to receive notifications before your study sessions. 
            Notifications will open the StudyVerse web app where you can start your session.
          </Text>
        </View>

        {/* Notification Settings Component */}
        <NotificationSettingsComponent isDarkMode={isDarkMode} />

        {/* Additional Information */}
        <View style={[styles.infoCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={[styles.infoTitle, { color: theme.textPrimary }]}>
              How It Works
            </Text>
          </View>
          
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoBullet, { color: theme.primary }]}>•</Text>
              <Text style={[styles.infoItemText, { color: theme.textSecondary }]}>
                Notifications are scheduled locally on your device
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoBullet, { color: theme.primary }]}>•</Text>
              <Text style={[styles.infoItemText, { color: theme.textSecondary }]}>
                Tapping a notification opens the StudyVerse web app
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoBullet, { color: theme.primary }]}>•</Text>
              <Text style={[styles.infoItemText, { color: theme.textSecondary }]}>
                Only upcoming sessions will trigger notifications
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoBullet, { color: theme.primary }]}>•</Text>
              <Text style={[styles.infoItemText, { color: theme.textSecondary }]}>
                Settings are automatically saved and synced
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  headerSpacer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 40, // Extra padding for better scrolling
  },
  descriptionCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  descriptionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoBullet: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  infoItemText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  bottomSpacing: {
    height: 40,
  },
});
