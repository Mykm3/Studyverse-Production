import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useColorScheme, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { studySessionsApi, StudySession, ApiError } from '@/utils/api';
import { NotificationService } from '@/utils/notifications';
import { PushNotificationService } from '@/utils/pushNotifications';

// Achievement helper functions
const getAchievementColor = (completed: number, theme: any) => {
  if (completed === 0) return theme.primary + '80'; // Semi-transparent
  if (completed >= 5) return '#10b981'; // Green for excellent
  if (completed >= 3) return '#f59e0b'; // Amber for great
  if (completed >= 2) return theme.primary; // Primary for good
  return theme.primary + 'CC'; // Slightly transparent for minimal
};

const getAchievementEmojiSize = (completed: number) => {
  if (completed >= 5) return 32;
  if (completed >= 3) return 28;
  if (completed >= 2) return 24;
  return 20;
};

const getAchievementEmoji = (completed: number, remaining: number) => {
  if (completed === 0 && remaining > 0) return '📚'; // Ready to start
  if (completed === 0) return '💤'; // No sessions today
  if (completed >= 5) return '🏆'; // Champion
  if (completed >= 3) return '🌟'; // Star performer
  if (completed >= 2) return '🎯'; // On target
  return '🚀'; // Getting started
};

const getAchievementTitle = (completed: number, remaining: number) => {
  if (completed === 0 && remaining > 0) return 'Ready to Study!';
  if (completed === 0) return 'Plan Your Day';
  if (completed >= 5) return 'Outstanding Work!';
  if (completed >= 3) return 'Excellent Progress!';
  if (completed >= 2) return 'Great Work!';
  return 'Good Start!';
};

const getAchievementSubtitle = (stats: { completed: number; remaining: number; totalStudyTime: number }) => {
  const { completed, remaining, totalStudyTime } = stats;

  if (completed === 0 && remaining > 0) {
    return `${remaining} session${remaining > 1 ? 's' : ''} scheduled for today`;
  }
  if (completed === 0) {
    return 'Schedule your first study session to get started';
  }

  let subtitle = `${completed} session${completed > 1 ? 's' : ''} completed`;
  if (totalStudyTime > 0) {
    subtitle += ` • ${totalStudyTime}h studied`;
  }
  if (remaining > 0) {
    subtitle += ` • ${remaining} more to go`;
  }
  return subtitle;
};

export default function StudyAppRedesign() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const { user } = useAuth();

  // State for study sessions
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [todayStats, setTodayStats] = useState({
    completed: 0,
    remaining: 0,
    totalStudyTime: 0
  });

  const theme = isDarkMode ? darkTheme : lightTheme;

  // Fetch study sessions
  const fetchSessions = async () => {
    try {
      console.log('[Home] Fetching study sessions for user:', user?.email);
      const fetchedSessions = await studySessionsApi.getSessions();
      setSessions(fetchedSessions);
      calculateTodayStats(fetchedSessions);

      // Schedule notifications for upcoming sessions
      await NotificationService.scheduleSessionReminders(fetchedSessions);

      console.log('[Home] Successfully fetched', fetchedSessions.length, 'sessions');
    } catch (error) {
      console.error('[Home] Error fetching sessions:', error);
      if (error instanceof ApiError && error.status !== 401) {
        Alert.alert('Error', 'Failed to load study sessions. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate today's statistics
  const calculateTodayStats = (sessions: StudySession[]) => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const todaySessions = sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= todayStart && sessionDate < todayEnd;
    });

    const completed = todaySessions.filter(s => s.status === 'completed').length;
    const remaining = todaySessions.filter(s => s.status === 'scheduled').length;

    const totalStudyTime = todaySessions.reduce((total, session) => {
      if (session.status === 'completed') {
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);
        return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Convert to hours
      }
      return total;
    }, 0);

    setTodayStats({
      completed,
      remaining,
      totalStudyTime: Math.round(totalStudyTime * 10) / 10 // Round to 1 decimal place
    });
  };

  // Handle refresh
  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchSessions();
    setIsRefreshing(false);
  };

  // Mark session as complete
  const handleMarkComplete = async (sessionId: string) => {
    try {
      console.log('[Home] Marking session complete:', sessionId);
      await studySessionsApi.markComplete(sessionId);

      // Update local state
      setSessions(prevSessions =>
        prevSessions.map(session =>
          session._id === sessionId
            ? { ...session, status: 'completed' as const, progress: 100 }
            : session
        )
      );

      // Recalculate stats
      const updatedSessions = sessions.map(session =>
        session._id === sessionId
          ? { ...session, status: 'completed' as const, progress: 100 }
          : session
      );
      calculateTodayStats(updatedSessions);

      Alert.alert('Success', 'Study session marked as complete!');
    } catch (error) {
      console.error('[Home] Error marking session complete:', error);
      Alert.alert('Error', 'Failed to mark session as complete. Please try again.');
    }
  };

  // Get upcoming sessions (next 3 sessions)
  const getUpcomingSessions = () => {
    const now = new Date();
    return sessions
      .filter(session => {
        const sessionStart = new Date(session.startTime);
        return sessionStart > now && session.status === 'scheduled';
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 3);
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format date for display
  const formatDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Load data on component mount
  useEffect(() => {
    if (user) {
      // Initialize notifications and fetch sessions
      NotificationService.requestPermissions();
      PushNotificationService.registerForPushNotifications();
      fetchSessions();
    }
  }, [user]);

  // Helper functions for UI
  const getSubjectColor = (subject: string) => {
    const colors = {
      'Mathematics': '#3b82f6',
      'Math': '#3b82f6',
      'Physics': '#8b5cf6',
      'Chemistry': '#10b981',
      'Biology': '#f59e0b',
      'English': '#ef4444',
      'History': '#8b5cf6',
      'Computer Science': '#06b6d4',
      'Programming': '#06b6d4',
    };
    return colors[subject as keyof typeof colors] || '#6b7280';
  };

  const getSubjectIcon = (subject: string) => {
    const icons = {
      'Mathematics': '📊',
      'Math': '📊',
      'Physics': '⚡',
      'Chemistry': '🧪',
      'Biology': '🧬',
      'English': '📝',
      'History': '📜',
      'Computer Science': '💻',
      'Programming': '💻',
    };
    return icons[subject as keyof typeof icons] || '📚';
  };

  const upcomingSessions = getUpcomingSessions();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={theme.primary} 
      />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* Header Card */}
        <View style={[styles.headerCard, { backgroundColor: theme.primary }]}>
          <View style={styles.headerContent}>
            <View style={styles.greetingSection}>
              <Text style={[styles.greeting, { color: theme.headerText }]}>
                {getGreeting()}
              </Text>
              <Text style={[styles.userName, { color: theme.headerText }]}>
                {user?.displayName || user?.name || 'Student'}
              </Text>
              <Text style={[styles.date, { color: theme.headerSubtext }]}>
                {formatDate()}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.notificationButton, { backgroundColor: theme.notificationBackground }]}
              onPress={() => router.push('/notifications')}
            >
              <Text style={styles.bellIcon}>🔔</Text>
              {upcomingSessions.length > 0 && <View style={styles.notificationDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Progress - Redesigned */}
        <View style={[styles.progressCard, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressIcon}>📈</Text>
            <Text style={[styles.progressTitle, { color: theme.cardTitle }]}>Today's Progress</Text>
            {isLoading && (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginLeft: 8 }} />
            )}
          </View>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.statValue, { color: theme.primary }]}>{todayStats.completed}</Text>
              <Text style={[styles.statLabel, { color: theme.cardSubtext }]}>Completed</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.statValue, { color: theme.primary }]}>{todayStats.remaining}</Text>
              <Text style={[styles.statLabel, { color: theme.cardSubtext }]}>Remaining</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.statValue, { color: theme.primary }]}>{todayStats.totalStudyTime}h</Text>
              <Text style={[styles.statLabel, { color: theme.cardSubtext }]}>Study Time</Text>
            </View>
          </View>
        </View>

        {/* Weekly Stats Row */}
        <View style={styles.weeklyStatsRow}>
          <View style={[styles.weeklyCard, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.weeklyCardHeader}>
              <Text style={styles.weeklyIcon}>📊</Text>
              <Text style={[styles.weeklyTitle, { color: theme.cardTitle }]}>Weekly</Text>
            </View>
            <View style={styles.weeklyProgress}>
              <Text style={[styles.weeklyFraction, { color: theme.primary }]}>
                {sessions.filter(s => {
                  const sessionDate = new Date(s.startTime);
                  const weekStart = new Date();
                  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                  const weekEnd = new Date(weekStart);
                  weekEnd.setDate(weekEnd.getDate() + 7);
                  return sessionDate >= weekStart && sessionDate < weekEnd && s.status === 'completed';
                }).length}
                <Text style={[styles.fractionSeparator, { color: theme.cardSubtext }]}>
                  /{sessions.filter(s => {
                    const sessionDate = new Date(s.startTime);
                    const weekStart = new Date();
                    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 7);
                    return sessionDate >= weekStart && sessionDate < weekEnd;
                  }).length}
                </Text>
              </Text>
              <Text style={[styles.weeklyDesc, { color: theme.cardSubtext }]}>sessions</Text>
            </View>
          </View>

          <View style={[styles.weeklyCard, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.weeklyCardHeader}>
              <Text style={styles.weeklyIcon}>🔥</Text>
              <Text style={[styles.weeklyTitle, { color: theme.cardTitle }]}>Streak</Text>
            </View>
            <View style={styles.weeklyProgress}>
              <Text style={[styles.weeklyFraction, { color: theme.primary }]}>
                {sessions.filter(s => s.status === 'completed').length}
              </Text>
              <Text style={[styles.weeklyDesc, { color: theme.cardSubtext }]}>total</Text>
            </View>
          </View>
        </View>

        {/* Upcoming Sessions - Enhanced */}
        <View style={[styles.sessionsCard, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.sessionsHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionIcon}>📅</Text>
              <Text style={[styles.sectionTitle, { color: theme.cardTitle }]}>Upcoming Sessions</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/pages/UpcomingSessions')}>
              <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sessionsList}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.cardSubtext }]}>
                  Loading your study sessions...
                </Text>
              </View>
            ) : upcomingSessions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📚</Text>
                <Text style={[styles.emptyTitle, { color: theme.cardTitle }]}>
                  No upcoming sessions
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.cardSubtext }]}>
                  Create your first study session to get started!
                </Text>
              </View>
            ) : (
              upcomingSessions.map((session, index) => {
                const isToday = new Date(session.startTime).toDateString() === new Date().toDateString();

                return (
                  <View key={session._id} style={[styles.sessionItem, {
                    backgroundColor: theme.background,
                    borderColor: theme.primary + '20',
                  }]}>
                    <View style={styles.sessionContent}>
                      <View style={[styles.sessionIconContainer, { backgroundColor: theme.primary }]}>
                        <Text style={styles.sessionIcon}>
                          {getSubjectIcon(session.subject)}
                        </Text>
                      </View>
                      
                      <View style={styles.sessionDetails}>
                        <View style={styles.sessionTopRow}>
                          <View style={[styles.subjectTag, { backgroundColor: theme.primary + '20' }]}>
                            <Text style={[styles.subjectTagText, { color: theme.primary }]}>
                              {session.subject}
                            </Text>
                          </View>
                          {isToday && (
                            <View style={[styles.todayBadge, { backgroundColor: theme.primary }]}>
                              <Text style={styles.todayBadgeText}>Today</Text>
                            </View>
                          )}
                        </View>
                        
                        <Text style={[styles.sessionTitle, { color: theme.cardTitle }]}>
                          {session.description || session.subject}
                        </Text>
                        
                        <View style={styles.sessionMeta}>
                          <View style={styles.timeInfo}>
                            <Text style={styles.clockIcon}>🕐</Text>
                            <Text style={[styles.timeText, { color: theme.cardSubtext }]}>
                              {formatTime(session.startTime)} - {formatTime(session.endTime)}
                            </Text>
                          </View>

                          <View style={[styles.statusBadge, {
                            backgroundColor: session.status === 'completed' ? '#10b981' : theme.primary + '20'
                          }]}>
                            <Text style={[styles.statusText, {
                              color: session.status === 'completed' ? 'white' : theme.primary
                            }]}>
                              {session.status === 'completed' ? 'Completed' : 'Upcoming'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Achievement Section - Dynamic & Responsive */}
        <View style={[styles.achievementBanner, {
          backgroundColor: getAchievementColor(todayStats.completed, theme),
          opacity: todayStats.completed === 0 ? 0.6 : 1,
        }]}>
          <View style={styles.achievementContent}>
            <Text style={[styles.achievementEmoji, {
              fontSize: getAchievementEmojiSize(todayStats.completed),
            }]}>
              {getAchievementEmoji(todayStats.completed, todayStats.remaining)}
            </Text>
            <View style={styles.achievementTextContainer}>
              <Text style={[styles.achievementTitle, { color: theme.achievementTitle }]}>
                {getAchievementTitle(todayStats.completed, todayStats.remaining)}
              </Text>
              <Text style={[styles.achievementSubtitle, { color: theme.achievementSubtitle }]}>
                {getAchievementSubtitle(todayStats)}
              </Text>
              {todayStats.completed > 0 && todayStats.remaining > 0 && (
                <Text style={[styles.achievementProgress, { color: theme.achievementSubtitle }]}>
                  {Math.round((todayStats.completed / (todayStats.completed + todayStats.remaining)) * 100)}% of today's sessions complete
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

// Light Theme
const lightTheme = {
  background: '#f8fafc',
  primary: '#6366f1',
  cardBackground: '#ffffff',
  cardTitle: '#1e293b',
  cardSubtext: '#64748b',
  headerText: '#ffffff',
  headerSubtext: '#e2e8f0',
  statsBackground: 'rgba(255,255,255,0.1)',
  statsTitle: '#e2e8f0',
  statsNumber: '#ffffff',
  statsLabel: '#e2e8f0',
  toggleBackground: 'rgba(255,255,255,0.1)',
  notificationBackground: 'rgba(255,255,255,0.2)',
  achievementTitle: '#ffffff',
  achievementSubtitle: 'rgba(255,255,255,0.9)',
};

// Dark Theme - Matching violet theme from other pages
const darkTheme = {
  background: '#1a1625', // Violet dark background
  primary: '#6366f1',
  cardBackground: '#2d1b3d', // Violet card background
  cardTitle: '#ffffff', // White text for readability
  cardSubtext: '#e4d4f4', // Light violet for secondary text
  headerText: '#ffffff',
  headerSubtext: '#c7d2fe',
  statsBackground: 'rgba(99,102,241,0.1)', // Violet-tinted stats
  statsTitle: '#c7d2fe',
  statsNumber: '#ffffff',
  statsLabel: '#c7d2fe',
  toggleBackground: 'rgba(99,102,241,0.1)',
  notificationBackground: 'rgba(99,102,241,0.1)',
  // Heavy violet for session cards in dark mode
  sessionBackground: '#2d1b3d', // Dark violet session background
  sessionBorder: '#4c1d95', // Violet session border
  sessionTagBackground: '#4c1d95', // Violet tag background
  todayTagBackground: '#6366f1', // Violet today tag
  todayTagText: '#ffffff', // White text on violet
  achievementBackground: '#6366f1', // Violet achievement background
  achievementIconBackground: 'rgba(255,255,255,0.1)',
  achievementTitle: '#ffffff',
  achievementSubtitle: 'rgba(255,255,255,0.9)',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  
  // Header Card
  headerCard: {
    margin: 20,
    marginTop: 60,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingSection: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 20,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f97316',
  },

  // Progress Card
  progressCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Weekly Stats
  weeklyStatsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  weeklyCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  weeklyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  weeklyIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  weeklyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  weeklyProgress: {
    alignItems: 'center',
  },
  weeklyFraction: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  fractionSeparator: {
    fontSize: 16,
    fontWeight: 'normal',
  },
  weeklyDesc: {
    fontSize: 12,
    marginTop: 2,
  },

  // Sessions Card
  sessionsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sessionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sessionsList: {
    gap: 12,
  },
  sessionItem: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sessionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sessionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionIcon: {
    fontSize: 18,
  },
  sessionDetails: {
    flex: 1,
  },
  sessionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  subjectTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subjectTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  documentsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Achievement Banner
  achievementBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  achievementContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  achievementTextContainer: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  achievementSubtitle: {
    fontSize: 13,
  },
  achievementProgress: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },

  // Loading and Empty States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  bottomSpacing: {
    height: 20,
  },
});

});
});
});
});