import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, useColorScheme, View, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { studySessionsApi, StudySession, ApiError } from '@/utils/api';
import Ionicons from '@expo/vector-icons/Ionicons';

interface GroupedSessions {
  [date: string]: StudySession[];
}

export default function UpcomingSessions() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const { user } = useAuth();
  
  // State
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const theme = {
    background: isDarkMode ? '#1a1625' : '#faf8ff', // Violet-tinted backgrounds
    cardBackground: isDarkMode ? '#2d1b3d' : '#ffffff',
    textPrimary: isDarkMode ? '#ffffff' : '#1f2937', // Black text for light mode, white for dark
    textSecondary: isDarkMode ? '#e4d4f4' : '#374151', // Dark grey for secondary text
    textMuted: isDarkMode ? '#b794c8' : '#6b7280',
    border: '#e0e7ff', // Light violet border
    chipBackground: '#f8faff', // Very light violet
    chipBorder: '#e0e7ff',
    selectedChip: '#6366f1', // Violet for selected items
    primary: '#6366f1', // Violet primary color
    violetLight: '#eef2ff', // Light violet backgrounds
    violetMedium: '#c7d2fe', // Medium violet accents
    scheduleBoxBg: '#faf8ff',
    scheduleBoxBorder: '#e0e7ff',
  };

  // Fetch study sessions
  const fetchSessions = async () => {
    try {
      console.log('[UpcomingSessions] Fetching study sessions for user:', user?.email);
      const fetchedSessions = await studySessionsApi.getSessions();

      // Get all sessions (not just upcoming ones for calendar view)
      setSessions(fetchedSessions);

      // Set default selected date to today
      setSelectedDate(new Date());

      console.log('[UpcomingSessions] Successfully fetched', fetchedSessions.length, 'sessions');
    } catch (error) {
      console.error('[UpcomingSessions] Error fetching sessions:', error);
      if (error instanceof ApiError && error.status !== 401) {
        Alert.alert('Error', 'Failed to load study sessions. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
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
      console.log('[UpcomingSessions] Marking session complete:', sessionId);
      await studySessionsApi.markComplete(sessionId);
      
      // Remove from upcoming sessions list
      setSessions(prevSessions => 
        prevSessions.filter(session => session._id !== sessionId)
      );
      
      Alert.alert('Success', 'Study session marked as complete!');
    } catch (error) {
      console.error('[UpcomingSessions] Error marking session complete:', error);
      Alert.alert('Error', 'Failed to mark session as complete. Please try again.');
    }
  };

  // Helper functions
  const formatDateKey = (date: Date) => {
    return date.toDateString(); // Use toDateString for consistent date comparison
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

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

  // Get sessions for a specific date
  const getSessionsForDate = (date: Date): StudySession[] => {
    return sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return isSameDay(sessionDate, date);
    }).sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  };

  // Check if a date has sessions
  const hasSessionsOnDate = (date: Date): boolean => {
    return sessions.some(session => {
      const sessionDate = new Date(session.startTime);
      return isSameDay(sessionDate, date);
    });
  };

  // Get motivational message for days without sessions
  const getMotivationalMessage = () => {
    const messages = [
      "You have no sessions today, focus on sleeping and getting well rested for another day",
      "Take a break today! Rest is just as important as studying",
      "No sessions scheduled - perfect time for self-care and relaxation",
      "Free day ahead! Use it to recharge and prepare for upcoming sessions",
      "Rest day! Your mind needs time to process and consolidate learning"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // Load data on component mount
  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const calendarDays = getDaysInMonth(currentMonth);
  const selectedSessions = getSessionsForDate(selectedDate);
  const monthName = getMonthName(currentMonth);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={theme.background} 
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Upcoming Sessions
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* Month Header */}
        <View style={[styles.monthHeader, {
          backgroundColor: theme.primary + '15',
          borderColor: theme.primary + '30',
          borderWidth: 1,
        }]}>
          <TouchableOpacity
            onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            style={[styles.monthNavButton, { backgroundColor: theme.primary + '20' }]}
          >
            <Ionicons name="chevron-back" size={20} color={theme.primary} />
          </TouchableOpacity>

          <Text style={[styles.monthTitle, { color: theme.primary, fontWeight: 'bold' }]}>
            {monthName}
          </Text>

          <TouchableOpacity
            onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            style={[styles.monthNavButton, { backgroundColor: theme.primary + '20' }]}
          >
            <Ionicons name="chevron-forward" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={[styles.calendarContainer, {
          backgroundColor: theme.cardBackground,
          borderColor: theme.primary + '20',
          borderWidth: 1,
        }]}>
          {/* Day Headers */}
          <View style={styles.dayHeadersRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <Text key={day} style={[styles.dayHeader, {
                color: theme.primary,
                fontWeight: '600',
                backgroundColor: theme.primary + '10',
                borderRadius: 6,
                paddingVertical: 6,
              }]}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Days */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.calendarDay,
                  day && isSameDay(day, selectedDate) && { backgroundColor: theme.primary },
                  day && isSameDay(day, new Date()) && !isSameDay(day, selectedDate) && {
                    backgroundColor: theme.primary + '20',
                    borderColor: theme.primary,
                    borderWidth: 1
                  }
                ]}
                onPress={() => day && setSelectedDate(day)}
                disabled={!day}
              >
                {day && (
                  <>
                    <Text style={[
                      styles.calendarDayText,
                      {
                        color: isSameDay(day, selectedDate)
                          ? '#ffffff'
                          : isSameDay(day, new Date())
                          ? theme.primary
                          : theme.textPrimary
                      }
                    ]}>
                      {day.getDate()}
                    </Text>
                    {hasSessionsOnDate(day) && (
                      <View style={[
                        styles.sessionIndicator,
                        { backgroundColor: isSameDay(day, selectedDate) ? '#ffffff' : theme.primary }
                      ]} />
                    )}
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Selected Date Sessions */}
        <View style={styles.sessionsContainer}>
          <Text style={[styles.selectedDateTitle, { color: theme.textPrimary }]}>
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Loading your sessions...
              </Text>
            </View>
          ) : selectedSessions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>�</Text>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                Rest Day
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                {getMotivationalMessage()}
              </Text>
            </View>
          ) : (
            selectedSessions.map((session) => {
              const subjectIcon = getSubjectIcon(session.subject);

              return (
                <View
                  key={session._id}
                  style={[
                    styles.sessionCard,
                    {
                      backgroundColor: theme.primary + '08', // Very light violet background
                      borderColor: theme.primary + '40', // Violet border
                      borderWidth: 1.5,
                      shadowColor: theme.primary,
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.15,
                      shadowRadius: 6,
                      elevation: 4,
                    }
                  ]}
                >
                  <View style={styles.sessionHeader}>
                    <View style={[styles.subjectIcon, {
                      backgroundColor: theme.primary,
                      shadowColor: theme.primary,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.4,
                      shadowRadius: 4,
                      elevation: 4,
                    }]}>
                      <Text style={styles.subjectIconText}>{subjectIcon}</Text>
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={[styles.sessionSubject, {
                        color: theme.primary,
                        fontWeight: '700',
                        fontSize: 13,
                      }]}>
                        {session.subject}
                      </Text>
                      <Text style={[styles.sessionTitle, {
                        color: theme.textPrimary, // Black text for main title
                        fontWeight: '600',
                        fontSize: 17,
                      }]}>
                        {session.description || session.subject}
                      </Text>
                      <Text style={[styles.sessionTime, {
                        color: theme.textSecondary, // Dark grey for time
                        fontWeight: '500',
                      }]}>
                        {formatTime(session.startTime)} - {formatTime(session.endTime)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, {
                    backgroundColor: session.status === 'completed' ? theme.primary : theme.primary + 'DD',
                    shadowColor: theme.primary,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 3,
                    elevation: 3,
                  }]}>
                    <Text style={[styles.statusText, { fontWeight: '600' }]}>
                      {session.status === 'completed' ? 'Completed' : 'Upcoming'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
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
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  monthNavButton: {
    padding: 8,
    borderRadius: 8,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  calendarContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  dayHeadersRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
    position: 'relative',
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  sessionIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  sessionsContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
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
    paddingHorizontal: 20,
  },
  sessionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subjectIconText: {
    fontSize: 16,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionSubject: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});
