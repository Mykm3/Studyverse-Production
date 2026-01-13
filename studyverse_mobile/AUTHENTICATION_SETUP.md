# Authentication Setup Guide

## Overview
The StudyVerse Mobile app now has a complete authentication system with Google OAuth support and a fallback development mode.

## Features
- ✅ Google OAuth authentication
- ✅ Secure token storage with expo-secure-store
- ✅ Automatic authentication state management
- ✅ Development mode fallback for testing
- ✅ Proper logout functionality
- ✅ Authentication flow protection

## Setup Instructions

### 1. Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Google OAuth Configuration
# Get these from Google Cloud Console: https://console.cloud.google.com/
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_android_client_id_here
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=your_expo_client_id_here

# API Configuration (optional - for backend integration)
EXPO_PUBLIC_API_URL=your_api_url_here
```

### 2. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and create OAuth 2.0 Client IDs:
   - **Android Client ID**: For Android devices
   - **Web Client ID**: For Expo development and web

### 3. Development Mode
If Google Auth is not configured, the app will automatically fall back to development mode:
- Shows a "Continue (Test Mode)" button
- Uses mock user data for testing
- Works in Expo Go without configuration

## How It Works

### Authentication Flow
1. **App Launch**: Checks for existing authentication tokens
2. **Login Screen**: Shows Google sign-in or test mode button
3. **Authentication**: Handles Google OAuth or mock login
4. **Token Storage**: Securely stores tokens using expo-secure-store
5. **Navigation**: Automatically redirects to main app or login

### Components
- `AuthContext`: Manages authentication state
- `useAuth`: Hook for accessing auth functions
- `useGoogleAuth`: Handles Google OAuth flow
- `Login`: Login screen with fallback support

### Security
- Tokens stored securely using expo-secure-store
- Automatic token validation on app launch
- Proper logout with token cleanup

## Usage

### In Components
```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginScreen />;
  }
  
  return <UserDashboard user={user} />;
}
```

### Google Auth Hook
```typescript
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

function LoginScreen() {
  const { signInWithGoogle, isLoading } = useGoogleAuth();
  
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
}
```

## Troubleshooting

### Common Issues
1. **Google Auth not working**: Check environment variables and Google Cloud Console setup
2. **Development mode not working**: Ensure you're in development mode (`__DEV__` is true)
3. **Token storage issues**: Check expo-secure-store permissions

### Debug Mode
The app logs authentication status and errors to the console. Check the logs for debugging information.

## Production Deployment
1. Configure proper Google OAuth credentials for production
2. Set up proper redirect URIs in Google Cloud Console
3. Test authentication flow on real devices
4. Remove development mode warnings if needed
