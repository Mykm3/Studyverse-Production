import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from 'expo-secure-store';
import { authApi, ApiError, getAuthToken } from '@/utils/api';

export interface User {
    id: string;
    email: string;
    displayName: string;
    name?: string; // For backward compatibility
    picture?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, displayName: string) => Promise<void>;
    logout: () => Promise<void>;
    initializeAuth: () => Promise<void>;
    refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Store user data securely
    const storeUserData = async (userData: User) => {
        try {
            await SecureStore.setItemAsync('userData', JSON.stringify(userData));
        } catch (error) {
            console.error('Error storing user data:', error);
        }
    };

    // Get stored user data
    const getStoredUserData = async (): Promise<User | null> => {
        try {
            const userData = await SecureStore.getItemAsync('userData');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error getting stored user data:', error);
            return null;
        }
    };

    // Clear stored user data
    const clearUserData = async () => {
        try {
            await SecureStore.deleteItemAsync('userData');
        } catch (error) {
            console.error('Error clearing user data:', error);
        }
    };

    // Login with email and password
    const login = async (email: string, password: string) => {
        try {
            setIsLoading(true);
            console.log('[AuthContext] Attempting login for:', email);

            const response = await authApi.login(email, password);

            // Transform user data to match our interface
            const userData: User = {
                id: response.user.id,
                email: response.user.email,
                displayName: response.user.displayName,
                name: response.user.displayName, // For backward compatibility
            };

            await storeUserData(userData);
            setUser(userData);
            setIsAuthenticated(true);

            console.log('[AuthContext] Login successful for user:', userData.email);
        } catch (error) {
            console.error('[AuthContext] Login failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Register new user
    const register = async (email: string, password: string, displayName: string) => {
        try {
            setIsLoading(true);
            console.log('[AuthContext] Attempting registration for:', email);

            const response = await authApi.register(email, password, displayName);

            // Transform user data to match our interface
            const userData: User = {
                id: response.user.id,
                email: response.user.email,
                displayName: response.user.displayName,
                name: response.user.displayName, // For backward compatibility
            };

            await storeUserData(userData);
            setUser(userData);
            setIsAuthenticated(true);

            console.log('[AuthContext] Registration successful for user:', userData.email);
        } catch (error) {
            console.error('[AuthContext] Registration failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Logout
    const logout = async () => {
        try {
            console.log('[AuthContext] Logging out user');
            await authApi.logout();
        } catch (error) {
            console.error('[AuthContext] Logout API call failed:', error);
            // Continue with local logout even if API call fails
        } finally {
            await clearUserData();
            setUser(null);
            setIsAuthenticated(false);
            console.log('[AuthContext] User logged out successfully');
        }
    };

    // Refresh token
    const refreshToken = async () => {
        try {
            console.log('[AuthContext] Refreshing token');
            await authApi.refreshToken();
            console.log('[AuthContext] Token refreshed successfully');
        } catch (error) {
            console.error('[AuthContext] Token refresh failed:', error);
            // If refresh fails, logout the user
            await logout();
            throw error;
        }
    };

    // Initialize authentication on app start
    const initializeAuth = async () => {
        try {
            setIsLoading(true);
            console.log('[AuthContext] Initializing authentication');

            const token = await getAuthToken();
            const storedUserData = await getStoredUserData();

            if (token && storedUserData) {
                console.log('[AuthContext] Found stored token and user data');

                try {
                    // Validate token by fetching user profile
                    const profileData = await authApi.getProfile();

                    // Update user data if profile fetch is successful
                    const userData: User = {
                        id: profileData.id || storedUserData.id,
                        email: profileData.email || storedUserData.email,
                        displayName: profileData.displayName || storedUserData.displayName,
                        name: profileData.displayName || storedUserData.displayName,
                        picture: profileData.photoUrl,
                        createdAt: profileData.createdAt,
                        updatedAt: profileData.updatedAt,
                    };

                    await storeUserData(userData);
                    setUser(userData);
                    setIsAuthenticated(true);

                    console.log('[AuthContext] Authentication initialized successfully for:', userData.email);
                } catch (error) {
                    console.error('[AuthContext] Token validation failed:', error);

                    if (error instanceof ApiError && error.status === 401) {
                        // Token is invalid, clear stored data
                        await clearUserData();
                        console.log('[AuthContext] Invalid token, cleared stored data');
                    } else {
                        // Network error or other issue, use stored data
                        setUser(storedUserData);
                        setIsAuthenticated(true);
                        console.log('[AuthContext] Using stored user data due to network error');
                    }
                }
            } else {
                console.log('[AuthContext] No stored token or user data found');
            }
        } catch (error) {
            console.error('[AuthContext] Auth initialization error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        initializeAuth();
    }, []);

    const value = {
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        initializeAuth,
        refreshToken,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

