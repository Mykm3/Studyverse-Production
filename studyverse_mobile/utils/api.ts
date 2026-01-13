import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get the API URL from Constants
let API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000';

// Log the original API URL for debugging
console.log('Original API URL:', API_URL);

// Handle different device types for API URL
if (Platform.OS !== 'web') {
  if (API_URL.includes('localhost') || API_URL.includes('10.0.2.2')) {
    // For physical devices, use the computer's network IP
    // You can find this by running `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
    API_URL = 'http://10.232.51.115:5000'; // Your computer's network IP
    console.log('Modified API URL for physical device:', API_URL);
  }
}

export { API_URL };

// API Response types
export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  token?: string;
  user?: any;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

export interface RegisterResponse {
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

// API Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Get stored JWT token
export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('userToken');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

// Store JWT token
export async function setAuthToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync('userToken', token);
  } catch (error) {
    console.error('Error storing auth token:', error);
    throw error;
  }
}

// Remove JWT token
export async function removeAuthToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync('userToken');
  } catch (error) {
    console.error('Error removing auth token:', error);
  }
}

// Main API call function with JWT authentication
export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  // Add Authorization header if token exists
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  console.log(`[API] Making ${config.method || 'GET'} request to: ${API_URL}${endpoint}`);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);

    console.log(`[API] Response status: ${response.status}`);

    // Handle different response types
    let responseData: any;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      console.error(`[API] Error response:`, responseData);

      // Handle authentication errors
      if (response.status === 401) {
        console.log('[API] Token expired or invalid, removing stored token');
        await removeAuthToken();
        throw new ApiError('Authentication failed', 401, responseData);
      }

      // Handle other errors
      const errorMessage = responseData?.message || responseData || `HTTP ${response.status}`;
      throw new ApiError(errorMessage, response.status, responseData);
    }

    console.log(`[API] Success response received`);
    return responseData;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error('[API] Network or parsing error:', error);
    throw new ApiError('Network error', 0, error);
  }
}

// Authentication API calls
export const authApi = {
  // Login with email and password
  async login(email: string, password: string): Promise<LoginResponse> {
    console.log('[Auth API] Attempting login for:', email);

    const response = await apiCall<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.token) {
      await setAuthToken(response.token);
      console.log('[Auth API] Login successful, token stored');
    }

    return response;
  },

  // Register new user
  async register(email: string, password: string, displayName: string): Promise<RegisterResponse> {
    console.log('[Auth API] Attempting registration for:', email);

    const response = await apiCall<RegisterResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });

    if (response.token) {
      await setAuthToken(response.token);
      console.log('[Auth API] Registration successful, token stored');
    }

    return response;
  },

  // Get user profile (validates token)
  async getProfile(): Promise<any> {
    console.log('[Auth API] Fetching user profile');
    return await apiCall('/api/auth/profile');
  },

  // Logout
  async logout(): Promise<void> {
    console.log('[Auth API] Logging out');
    try {
      await apiCall('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('[Auth API] Logout API call failed:', error);
      // Continue with local logout even if API call fails
    } finally {
      await removeAuthToken();
      console.log('[Auth API] Token removed from storage');
    }
  },

  // Refresh token
  async refreshToken(): Promise<{ token: string }> {
    console.log('[Auth API] Refreshing token');
    const response = await apiCall<{ token: string }>('/api/auth/refresh', {
      method: 'POST',
    });

    if (response.token) {
      await setAuthToken(response.token);
      console.log('[Auth API] Token refreshed and stored');
    }

    return response;
  },
};

// Study Sessions API
export interface StudySession {
  _id: string;
  subject: string;
  startTime: string;
  endTime: string;
  description: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  progress: number;
  isAIGenerated: boolean;
  documents?: Array<{
    id: string;
    title: string;
    fileUrl: string | null;
    type: string;
  }>;
}

export interface StudySessionsResponse {
  sessions: StudySession[];
  totalSessions: number;
}

export const studySessionsApi = {
  // Get all study sessions for the authenticated user
  async getSessions(): Promise<StudySession[]> {
    console.log('[Study Sessions API] Fetching user study sessions');
    const response = await apiCall<StudySession[]>('/api/study-sessions');
    console.log('[Study Sessions API] Fetched sessions:', response.length);
    return response;
  },

  // Get a single study session by ID
  async getSession(sessionId: string): Promise<StudySession> {
    console.log('[Study Sessions API] Fetching session:', sessionId);
    return await apiCall<StudySession>(`/api/study-sessions/${sessionId}`);
  },

  // Create a new study session
  async createSession(sessionData: {
    subject: string;
    startTime: string;
    endTime: string;
    description?: string;
    documentId?: string;
    isAIGenerated?: boolean;
  }): Promise<StudySession> {
    console.log('[Study Sessions API] Creating new session:', sessionData);
    return await apiCall<StudySession>('/api/study-sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  },

  // Update a study session
  async updateSession(sessionId: string, updates: {
    subject?: string;
    startTime?: string;
    endTime?: string;
    description?: string;
    documentId?: string;
    progress?: number;
    status?: 'scheduled' | 'completed' | 'cancelled';
  }): Promise<StudySession> {
    console.log('[Study Sessions API] Updating session:', sessionId, updates);
    return await apiCall<StudySession>(`/api/study-sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Mark session as complete
  async markComplete(sessionId: string): Promise<StudySession> {
    console.log('[Study Sessions API] Marking session complete:', sessionId);
    return await this.updateSession(sessionId, {
      status: 'completed',
      progress: 100
    });
  },

  // Delete a study session
  async deleteSession(sessionId: string): Promise<void> {
    console.log('[Study Sessions API] Deleting session:', sessionId);
    await apiCall(`/api/study-sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },
};
