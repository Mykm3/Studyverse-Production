import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/utils/api';
import AntDesign from '@expo/vector-icons/AntDesign';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';

export default function Login() {
  const { login, register, isLoading } = useAuth();
  const theme = useColorScheme() ?? 'light';
  const themeColors = Colors[theme];

  // Form state
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Email is required');
      return false;
    }

    if (!validateEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    if (!password.trim()) {
      Alert.alert('Validation Error', 'Password is required');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long');
      return false;
    }

    if (!isLoginMode) {
      if (!displayName.trim()) {
        Alert.alert('Validation Error', 'Display name is required');
        return false;
      }

      if (displayName.length < 2) {
        Alert.alert('Validation Error', 'Display name must be at least 2 characters long');
        return false;
      }

      if (!confirmPassword.trim()) {
        Alert.alert('Validation Error', 'Please confirm your password');
        return false;
      }

      if (password !== confirmPassword) {
        Alert.alert('Validation Error', 'Passwords do not match');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setFormLoading(true);
    try {
      if (isLoginMode) {
        console.log('[Login] Attempting login for:', email);
        await login(email, password);
      } else {
        console.log('[Login] Attempting registration for:', email);
        await register(email, password, displayName);
      }
    } catch (error) {
      console.error('[Login] Authentication failed:', error);

      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      Alert.alert(
        isLoginMode ? 'Login Failed' : 'Registration Failed',
        errorMessage
      );
    } finally {
      setFormLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    // Clear form when switching modes
    setEmail('');
    setPassword('');
    setDisplayName('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const isButtonLoading = isLoading || formLoading;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require('@/assets/images/Learning-cuate.png')}
          style={styles.image}
          resizeMode="contain"
        />

        <View style={styles.content}>
          <ThemedText style={styles.title}>
            {isLoginMode ? 'Welcome Back' : 'Join StudyVerse'}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {isLoginMode
              ? 'Sign in to continue your learning journey'
              : 'Create your account to get started'
            }
          </ThemedText>

          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={themeColors.text}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, {
                  color: themeColors.text,
                  borderColor: themeColors.text + '30'
                }]}
                placeholder="Email address"
                placeholderTextColor={themeColors.text + '60'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isButtonLoading}
              />
            </View>

            {/* Display Name Input (Register only) */}
            {!isLoginMode && (
              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={themeColors.text}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, {
                    color: themeColors.text,
                    borderColor: themeColors.text + '30'
                  }]}
                  placeholder="Display name"
                  placeholderTextColor={themeColors.text + '60'}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isButtonLoading}
                />
              </View>
            )}

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={themeColors.text}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, {
                  color: themeColors.text,
                  borderColor: themeColors.text + '30'
                }]}
                placeholder="Password"
                placeholderTextColor={themeColors.text + '60'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isButtonLoading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isButtonLoading}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={themeColors.text + '60'}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Input (Register only) */}
            {!isLoginMode && (
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={themeColors.text}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, {
                    color: themeColors.text,
                    borderColor: themeColors.text + '30'
                  }]}
                  placeholder="Confirm password"
                  placeholderTextColor={themeColors.text + '60'}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isButtonLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isButtonLoading}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={themeColors.text + '60'}
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: themeColors.tint },
                isButtonLoading && styles.disabledButton
              ]}
              onPress={handleSubmit}
              disabled={isButtonLoading}
            >
              {isButtonLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isLoginMode ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle Mode Button */}
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleMode}
              disabled={isButtonLoading}
            >
              <ThemedText style={styles.toggleButtonText}>
                {isLoginMode
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"
                }
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 250,
    height: 180,
    marginBottom: 32,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.8,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  eyeIcon: {
    padding: 4,
  },
  submitButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: 14,
    opacity: 0.8,
  },
});