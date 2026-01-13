# Push Notifications Setup Guide

## Overview

To solve the notification scheduling issue where sessions created on the web app don't trigger mobile notifications, we need to implement push notifications that tell the mobile app to sync and reschedule notifications.

## Architecture

```
Web App → Backend → Push Service → Mobile App → Sync & Reschedule
```

## Backend Integration Required

### 1. Store Push Tokens

Add an endpoint to store user push tokens:

```javascript
// POST /api/user/push-token
app.post('/api/user/push-token', async (req, res) => {
  const { token, platform } = req.body;
  const userId = req.user.id;
  
  // Store token in database
  await User.findByIdAndUpdate(userId, {
    pushToken: token,
    platform: platform // 'ios' or 'android'
  });
  
  res.json({ success: true });
});
```

### 2. Send Push Notifications

When sessions are created/updated/deleted on the web app:

```javascript
// After session creation/update/deletion
const sendSyncNotification = async (userId) => {
  const user = await User.findById(userId);
  if (!user.pushToken) return;
  
  const message = {
    to: user.pushToken,
    sound: 'default',
    title: 'StudyVerse',
    body: 'Your study schedule has been updated',
    data: {
      type: 'sync_sessions',
      action: 'sync'
    }
  };
  
  // Send via Expo Push API
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message)
  });
};

// Call this after session operations
app.post('/api/study-sessions', async (req, res) => {
  // Create session logic...
  const session = await StudySession.create(sessionData);
  
  // Notify mobile app to sync
  await sendSyncNotification(req.user.id);
  
  res.json(session);
});
```

### 3. Session Reminder Push (Alternative)

Instead of local scheduling, send direct reminders:

```javascript
// Cron job or scheduled task
const sendSessionReminders = async () => {
  const now = new Date();
  const reminderTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
  
  const upcomingSessions = await StudySession.find({
    startTime: {
      $gte: reminderTime,
      $lt: new Date(reminderTime.getTime() + 60000) // 1 minute window
    },
    status: 'scheduled'
  }).populate('userId');
  
  for (const session of upcomingSessions) {
    if (session.userId.pushToken) {
      const message = {
        to: session.userId.pushToken,
        sound: 'default',
        title: '📚 Study Session Reminder',
        body: `${session.subject} starts in 10 minutes!`,
        data: {
          type: 'session_reminder',
          sessionId: session._id,
          url: 'https://studyverse.com'
        }
      };
      
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });
    }
  }
};

// Run every minute
setInterval(sendSessionReminders, 60000);
```

## Mobile App Implementation

The mobile app is already set up to:

1. **Register for push notifications** and send token to backend
2. **Handle incoming push notifications** and sync sessions
3. **Reschedule local notifications** when sync occurs
4. **Open web app** when session reminder is tapped

## Testing

1. **Register Push Token**: Use the "Register Push Notifications" button in settings
2. **Check Console**: Verify token is generated and would be sent to backend
3. **Simulate Backend Push**: Once backend is implemented, test by creating sessions on web app
4. **Verify Sync**: Mobile app should receive push and reschedule notifications

## Benefits

- ✅ **Real-time sync**: Sessions created on web app immediately sync to mobile
- ✅ **No user action required**: Automatic background sync
- ✅ **Reliable notifications**: Works even if app hasn't been opened
- ✅ **Flexible**: Can send direct reminders or sync commands
- ✅ **Cross-platform**: Works on iOS and Android

## Next Steps

1. Implement backend endpoints for push token storage
2. Add push notification sending to session CRUD operations
3. Test with real backend integration
4. Consider adding direct session reminders via push (optional)
