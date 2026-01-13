import React, { useContext, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { AuthContext } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

// Define types for our data
interface StudySession {
  _id: string;
  subject: string;
  topic: string;
  startTime: Date;
  endTime: Date;
  description: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface ProgressData {
  today: number;
  week: number;
  totalSessions: number;
  completedSessions: number;
}

// Mock data for development - will be replaced with API calls
const mockSessions: StudySession[] = [
  {
    _id: '1',
    subject: 'Mathematics',
    topic: 'Calculus',
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2 hours from now
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 3), // 3 hours from now
    description: 'Integration techniques',
    status: 'scheduled',
  },
  {
    _id: '2',
    subject: 'Physics',
    topic: 'Mechanics',
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 5), // 5 hours from now
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 6), // 6 hours from now
    description: 'Newton\'s laws of motion',
    status: 'scheduled',
  },
  {
    _id: '3',
    subject: 'Computer Science',
    topic: 'Algorithms',
    startTime: new Date(Date.now() - 1000 * 60 * 60 * 1), // 1 hour ago
    endTime: new Date(Date.now() - 1000 * 60 * 60 * 0), // Just ended
    description: 'Sorting algorithms',
    status: 'completed',
  }
];

const mockProgress: ProgressData = {
  today: 2,
  week: 8,
  totalSessions: 15,
  completedSessions: 10,
};

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme || 'light'];
  
  const [sessions, setSessions] = useState<StudySession[]>(mockSessions);
  const [progress, setProgress] = useState<ProgressData>(mockProgress);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = new Animated.Value(0);

  // Animation values
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  const headerTranslate = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  // This would be replaced with actual API call
  const fetchSessions = async () => {
    // Mock API call
    setRefreshing(true);
    setTimeout(() => {
      setSessions(mockSessions);
      setRefreshing(false);
    }, 1000);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const onRefresh = () => {
    fetchSessions();
  };

  const formatSessionTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const formatSessionDate = (date: Date): string => {
    if (isToday(date)) {
      return 'Today';
    }
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const markAsComplete = (sessionId: string): void => {
    setSessions(sessions.map(session => 
      session._id === sessionId 
        ? { ...session, status: 'completed' } 
        : session
    ));
  };

  const upcomingSessions = sessions.filter(session => 
    session.status === 'scheduled' && session.startTime > new Date()
  );

  const completedSessions = sessions.filter(session => 
    session.status === 'completed'
  );

  // Get time of day greeting
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Navigate to the detailed schedules page
  const goToSchedules = () => {
    router.navigate('/schedules');
  };

  return (
    <Animated.ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false }
      )}
      scrollEventThrottle={16}
    >
      {/* Header with greeting */}
      <LinearGradient
        colors={[colors.primary + '80', colors.background]}
        style={styles.headerGradient}
      >
        <Animated.View 
          style={[
            styles.header, 
            { 
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslate }]
            }
          ]}
        >
          <ThemedText type="title" style={styles.greeting}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Student'}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.date}>
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </ThemedText>
        </Animated.View>
      </LinearGradient>

      {/* Progress Overview */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        <ThemedText type="subtitle">Progress Overview</ThemedText>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressItem}>
            <View style={[styles.progressCircle, { borderColor: colors.primary }]}>
              <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
                {progress.today}
              </ThemedText>
            </View>
            <ThemedText>Today</ThemedText>
          </View>
          
          <View style={styles.progressItem}>
            <View style={[styles.progressCircle, { borderColor: colors.primary }]}>
              <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
                {progress.week}
              </ThemedText>
            </View>
            <ThemedText>This Week</ThemedText>
          </View>
          
          <View style={styles.progressItem}>
            <View style={[styles.progressCircle, { borderColor: colors.primary }]}>
              <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
                {Math.round((progress.completedSessions / progress.totalSessions) * 100)}%
              </ThemedText>
            </View>
            <ThemedText>Completion</ThemedText>
          </View>
        </View>
      </View>

      {/* Upcoming Sessions */}
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle">Upcoming Sessions</ThemedText>
        <TouchableOpacity onPress={goToSchedules}>
          <ThemedText style={{ color: colors.primary }}>See All</ThemedText>
        </TouchableOpacity>
      </View>

      {upcomingSessions.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.cardBackground }]}>
          <IconSymbol name="calendar" size={40} color={colors.muted} />
          <ThemedText style={{ textAlign: 'center', marginTop: 10 }}>
            No upcoming sessions scheduled
          </ThemedText>
        </View>
      ) : (
        upcomingSessions.map((session, index) => (
          <Animated.View 
            key={session._id} 
            style={[
              styles.sessionCard, 
              { 
                backgroundColor: colors.cardBackground,
                transform: [{ 
                  translateX: scrollY.interpolate({
                    inputRange: [0, 100],
                    outputRange: [0, index % 2 === 0 ? -10 : 10],
                    extrapolate: 'clamp',
                  }) 
                }]
              }
            ]}
          >
            <LinearGradient
              colors={[colors.accent + '30', colors.cardBackground]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sessionGradient}
            />
            <View style={styles.sessionHeader}>
              <View style={[styles.subjectTag, { backgroundColor: colors.accent }]}>
                <ThemedText style={{ color: colors.accentForeground, fontWeight: '500' }}>
                  {session.subject}
                </ThemedText>
              </View>
              <ThemedText style={{ color: colors.mutedForeground }}>
                {formatSessionDate(session.startTime)}
              </ThemedText>
            </View>
            
            <ThemedText type="subtitle" style={{ marginVertical: 8 }}>
              {session.topic}
            </ThemedText>
            
            <ThemedText>{session.description}</ThemedText>
            
            <View style={styles.sessionFooter}>
              <View style={styles.timeContainer}>
                <IconSymbol name="clock" size={16} color={colors.mutedForeground} />
                <ThemedText style={{ color: colors.mutedForeground, marginLeft: 4 }}>
                  {formatSessionTime(session.startTime)} - {formatSessionTime(session.endTime)}
                </ThemedText>
              </View>
              
              <TouchableOpacity 
                style={[styles.completeButton, { backgroundColor: colors.primary }]}
                onPress={() => markAsComplete(session._id)}
              >
                <ThemedText style={{ color: colors.primaryForeground, fontWeight: '500' }}>
                  Mark Complete
                </ThemedText>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ))
      )}

      {/* Recently Completed */}
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle">Recently Completed</ThemedText>
      </View>

      {completedSessions.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.cardBackground }]}>
          <IconSymbol name="checkmark.circle" size={40} color={colors.muted} />
          <ThemedText style={{ textAlign: 'center', marginTop: 10 }}>
            No completed sessions yet
          </ThemedText>
        </View>
      ) : (
        completedSessions.slice(0, 2).map((session, index) => (
          <Animated.View 
            key={session._id} 
            style={[
              styles.sessionCard, 
              { 
                backgroundColor: colors.cardBackground,
                opacity: scrollY.interpolate({
                  inputRange: [0, 200],
                  outputRange: [1, 0.7],
                  extrapolate: 'clamp',
                })
              }
            ]}
          >
            <LinearGradient
              colors={[colors.secondary + '30', colors.cardBackground]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sessionGradient}
            />
            <View style={styles.sessionHeader}>
              <View style={[styles.subjectTag, { backgroundColor: colors.secondary }]}>
                <ThemedText style={{ color: colors.secondaryForeground, fontWeight: '500' }}>
                  {session.subject}
                </ThemedText>
              </View>
              <ThemedText style={{ color: colors.mutedForeground }}>
                {formatSessionDate(session.startTime)}
              </ThemedText>
            </View>
            
            <ThemedText type="subtitle" style={{ marginVertical: 8 }}>
              {session.topic}
            </ThemedText>
            
            <ThemedText>{session.description}</ThemedText>
            
            <View style={styles.sessionFooter}>
              <View style={styles.timeContainer}>
                <IconSymbol name="clock" size={16} color={colors.mutedForeground} />
                <ThemedText style={{ color: colors.mutedForeground, marginLeft: 4 }}>
                  {formatSessionTime(session.startTime)} - {formatSessionTime(session.endTime)}
                </ThemedText>
              </View>
              
              <View style={styles.completedBadge}>
                <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
                <ThemedText style={{ color: colors.success, marginLeft: 4, fontWeight: '500' }}>
                  Completed
                </ThemedText>
              </View>
            </View>
          </Animated.View>
        ))
      )}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    marginBottom: 10,
  },
  greeting: {
    fontSize: 28,
    marginBottom: 4,
  },
  date: {
    opacity: 0.7,
  },
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sessionCard: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  sessionGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
