import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { studySessionsApi, StudySession, ApiError } from '@/utils/api';


const { width } = Dimensions.get('window');

// Import the IconSymbolName type from the IconSymbol component
type IconSymbolName = React.ComponentProps<typeof IconSymbol>['name'];

interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: IconSymbolName;
  iconColor?: string;
  iconBg: string;
  onPress: () => void;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const { user, logout } = useAuth();

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

  // State for user statistics
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    totalHours: 0,
    uniqueSubjects: 0
  });

  // Fetch user statistics
  const fetchUserStats = async () => {
    try {
      console.log('[Profile] Fetching user statistics for:', user?.email);
      const fetchedSessions = await studySessionsApi.getSessions();
      setSessions(fetchedSessions);

      // Calculate statistics
      const totalSessions = fetchedSessions.length;
      const completedSessions = fetchedSessions.filter(s => s.status === 'completed').length;

      // Calculate total study hours from completed sessions
      const totalHours = fetchedSessions
        .filter(s => s.status === 'completed')
        .reduce((total, session) => {
          const start = new Date(session.startTime);
          const end = new Date(session.endTime);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          return total + hours;
        }, 0);

      // Count unique subjects
      const uniqueSubjects = [...new Set(fetchedSessions.map(s => s.subject))].length;

      setUserStats({
        totalSessions,
        completedSessions,
        totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal place
        uniqueSubjects
      });

      console.log('[Profile] User stats calculated:', {
        totalSessions,
        completedSessions,
        totalHours: Math.round(totalHours * 10) / 10,
        uniqueSubjects
      });
    } catch (error) {
      console.error('[Profile] Error fetching user stats:', error);
      if (error instanceof ApiError && error.status !== 401) {
        Alert.alert('Error', 'Failed to load user statistics.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load user stats on component mount
  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Settings handlers
  const handleAccountSettings = () => {
    Alert.alert(
      'Account Settings',
      'Manage your account information',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit Profile',
          onPress: () => {
            Alert.prompt(
              'Display Name',
              'Enter your new display name:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Update',
                  onPress: (newName) => {
                    if (newName && newName.trim()) {
                      Alert.alert('Success', `Display name updated to: ${newName.trim()}`);
                      // Here you would typically update the user profile via API
                    }
                  }
                }
              ],
              'plain-text',
              user?.displayName || user?.name || ''
            );
          }
        }
      ]
    );
  };

  const handleNotificationSettings = () => {
    router.push('/pages/NotificationSettings');
  };

  const handleSyncSettings = () => {
    Alert.alert(
      'Sync Settings',
      'Synchronize your data across devices',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync Now',
          onPress: async () => {
            Alert.alert('Syncing...', 'Your data is being synchronized');
            // Refresh user stats
            await fetchUserStats();
            Alert.alert('Success', 'Data synchronized successfully!');
          }
        }
      ]
    );
  };

  const handleThemeToggle = () => {
    Alert.alert(
      'Theme Settings',
      'Theme is automatically set based on your device settings. You can change it in your device\'s display settings.',
      [
        { text: 'OK' },
        {
          text: 'Device Settings',
          onPress: () => Alert.alert('Theme', 'Go to Settings > Display > Theme to change your device theme')
        }
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About StudyVerse',
      `StudyVerse Mobile App\nVersion 1.0.0\n\nA comprehensive study session management app to help you organize and track your learning progress.\n\nDeveloped with ❤️ for students everywhere.`,
      [
        { text: 'OK' },
        {
          text: 'Contact Support',
          onPress: () => Alert.alert('Support', 'Email: support@studyverse.app\nWe\'d love to hear from you!')
        }
      ]
    );
  };

  const menuItems: MenuItem[] = [
    {
      id: 'account',
      title: 'Account Settings',
      subtitle: 'Manage your personal information',
      icon: 'person.fill',
      iconColor: '#6366F1',
      iconBg: '#EEF2FF',
      onPress: handleAccountSettings,
    },
    {
      id: 'notifications',
      title: 'Notification Preferences',
      subtitle: 'Control your notification settings',
      icon: 'bell.fill',
      iconColor: '#F59E0B',
      iconBg: '#FEF3C7',
      onPress: handleNotificationSettings,
    },
    {
      id: 'theme',
      title: 'Theme Settings',
      subtitle: `Currently using ${colorScheme === 'dark' ? 'Dark' : 'Light'} theme`,
      icon: colorScheme === 'dark' ? 'moon.fill' : 'sun.max.fill',
      iconColor: '#6366F1',
      iconBg: '#EEF2FF',
      onPress: handleThemeToggle,
    },
    {
      id: 'sync',
      title: 'Sync Settings',
      subtitle: 'Manage data synchronization',
      icon: 'arrow.triangle.2.circlepath',
      iconColor: '#10B981',
      iconBg: '#ECFDF5',
      onPress: handleSyncSettings,
    },
    {
      id: 'about',
      title: 'About StudyVerse',
      subtitle: 'App information and support',
      icon: 'info.circle.fill',
      iconColor: '#8B5CF6',
      iconBg: '#F3E8FF',
      onPress: handleAbout,
    },
  ];

  const StatCard = ({ title, value, icon, color }: { title: string; value: string; icon: IconSymbolName; color: string }) => (
    <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <IconSymbol name={icon} size={24} color={color} />
      </View>
      <ThemedText style={[styles.statValue, { color }]}>{value}</ThemedText>
      <ThemedText style={[styles.statTitle, { color: theme.textSecondary }]}>{title}</ThemedText>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with Gradient Background */}
      <LinearGradient
        colors={isDarkMode ? ['#1a1625', '#2d1b3d'] : ['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <ThemedText type="title" style={styles.headerTitle}>Profile</ThemedText>
        
        {/* User Profile Section */}
        <View style={styles.profileSection}>
          {user?.picture ? (
            <View style={styles.profileImageContainer}>
              <Image 
                source={{ uri: user.picture }} 
                style={styles.profileImage} 
              />
              <View style={styles.profileImageBorder} />
            </View>
          ) : (
            <View style={styles.profileImageContainer}>
              <View style={[styles.profileImagePlaceholder, { backgroundColor: '#fff' }]}>
                <ThemedText style={styles.profileInitial}>
                  {(user?.displayName || user?.name)?.charAt(0) || 'U'}
                </ThemedText>
              </View>
              <View style={styles.profileImageBorder} />
            </View>
          )}
          
          <View style={styles.profileInfo}>
            <ThemedText style={styles.profileName}>
              {user?.displayName || user?.name || 'User'}
            </ThemedText>
            <ThemedText style={styles.profileEmail}>
              {user?.email || 'user@example.com'}
            </ThemedText>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.contentContainer}>
        {/* Enhanced Stats Section */}
        <View style={styles.statsSection}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Study Overview
          </ThemedText>
          
          <View style={styles.statsGrid}>
            {isLoading ? (
              <View style={styles.statsLoadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
                  Loading your stats...
                </ThemedText>
              </View>
            ) : (
              <>
                <StatCard
                  title="Sessions"
                  value={userStats.completedSessions.toString()}
                  icon="calendar"
                  color="#6366F1"
                />
                <StatCard
                  title="Hours"
                  value={userStats.totalHours.toString()}
                  icon="clock.fill"
                  color="#F59E0B"
                />
                <StatCard
                  title="Subjects"
                  value={userStats.uniqueSubjects.toString()}
                  icon="book.fill"
                  color="#10B981"
                />
              </>
            )}
          </View>
        </View>

        {/* Enhanced Menu Section */}
        <View style={styles.menuSection}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Settings
          </ThemedText>
          
          <View style={[styles.menuContainer, { backgroundColor: theme.cardBackground }]}>
            {menuItems.map((item, index) => (
              <React.Fragment key={item.id}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIconContainer, { backgroundColor: item.iconBg ? item.iconBg : '#fff' }]}>
                    <IconSymbol name={item.icon} size={22} color={item.iconColor} />
                  </View>
                  
                  <View style={styles.menuContent}>
                    <ThemedText style={[styles.menuTitle, { color: theme.textPrimary }]}>
                      {item.title}
                    </ThemedText>
                    {item.subtitle && (
                      <ThemedText style={[styles.menuSubtitle, { color: theme.textSecondary }]}>
                        {item.subtitle}
                      </ThemedText>
                    )}
                  </View>
                  
                  <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
                
                {index < menuItems.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>



        {/* Enhanced Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.logoutGradient}
          >
            <IconSymbol name="arrow.right.square" size={20} color="#fff" />
            <ThemedText style={styles.logoutText}>Log Out</ThemedText>
          </LinearGradient>
        </TouchableOpacity>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <ThemedText style={[styles.versionText, { color: theme.textSecondary }]}>
            StudyVerse Mobile v1.0.0
          </ThemedText>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for tab bar
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  profileSection: {
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageBorder: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileInitial: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  menuSection: {
    marginBottom: 30,
  },
  menuContainer: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginLeft: 76,
  },
  logoutButton: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  versionText: {
    fontSize: 14,
    textAlign: 'center',
  },
  statsLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
});