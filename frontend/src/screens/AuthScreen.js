import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useStore } from '../store/useStore';
import { apiCall } from '../api/client';
import { getTranslation } from '../utils/translations';
import { getTheme } from '../utils/themes';

// Fallback dynamic loading to prevent crashing in Expo Go since native code is missing there
let GoogleSignin = null;
let isGoogleAvailable = false;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  isGoogleAvailable = !!GoogleSignin;
} catch (e) {
  console.log('[Auth] Google Sign-In is not supported in Expo Go environment.');
}

// Configure your Google Cloud Console Web Client ID here (under credentials page)
const GOOGLE_WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const setLogin = useStore((state) => state.login);
  const language = useStore((state) => state.language);
  const themeId = useStore((state) => state.themeId);
  const theme = getTheme(themeId);

  useEffect(() => {
    if (isGoogleAvailable && GoogleSignin) {
      try {
        GoogleSignin.configure({
          webClientId: GOOGLE_WEB_CLIENT_ID,
          offlineAccess: true,
        });
      } catch (err) {
        console.warn('Failed to configure Google Sign-In:', err);
      }
    }
  }, []);

  const handleGoogleLogin = async () => {
    if (!isGoogleAvailable || !GoogleSignin) {
      Alert.alert(
        'Development Build Required',
        'Google Sign-In requires a custom development build (npx expo run:android or run:ios). It is not supported in standard Expo Go.'
      );
      return;
    }
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken || userInfo.idToken;

      if (!idToken) {
        throw new Error('Google Sign-In completed successfully but did not return an ID token.');
      }

      // Call backend Google login endpoint
      const data = await apiCall('/auth/google-login', 'POST', { idToken });
      setLogin(data.token, data.user.email);
    } catch (error) {
      console.error('[Google Sign-In Error]:', error);
      let errorMsg = error.message;
      if (error.code === 'SIGN_IN_CANCELLED') {
        errorMsg = 'Google Sign-In was cancelled.';
      } else if (error.code === 'IN_PROGRESS') {
        errorMsg = 'Google Sign-In is already in progress.';
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        errorMsg = 'Google Play Services are not available or outdated.';
      }
      Alert.alert(getTranslation(language, 'error'), errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginMock = async () => {
    setLoading(true);
    try {
      // Direct mock API verification using the developer bypass token
      const data = await apiCall('/auth/google-login', 'POST', { idToken: 'mock_developer_bypass_token' });
      setLogin(data.token, data.user.email);
      Alert.alert('Developer Mode Logged In', `Successfully logged in as: ${data.user.email}`);
    } catch (error) {
      console.error('[Developer Mode Google Login Error]:', error);
      Alert.alert('Developer Mode Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email.includes('@')) return Alert.alert(getTranslation(language, 'invalidEmail'), getTranslation(language, 'enterValidEmail'));
    setLoading(true);
    try {
      await apiCall('/auth/send-otp', 'POST', { email });
      setIsOtpSent(true);
      Alert.alert(getTranslation(language, 'otpSent'), getTranslation(language, 'checkEmailOtp'));
    } catch (error) {
      Alert.alert(getTranslation(language, 'error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return Alert.alert(getTranslation(language, 'invalidOtp'), getTranslation(language, 'enterSixDigitOtp'));
    setLoading(true);
    try {
      const data = await apiCall('/auth/verify-otp', 'POST', { email, otp });
      setLogin(data.token, data.user.email);
    } catch (error) {
      Alert.alert(getTranslation(language, 'error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.accent }]}>
        {getTranslation(language, 'appName')}
      </Text>
      <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
        {getTranslation(language, 'beginJourney')}
      </Text>

      <Text style={[styles.label, { color: theme.secondaryText }]}>
        {getTranslation(language, 'emailAddress')}
      </Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.primaryText }]}
        placeholder={getTranslation(language, 'enterEmail')}
        placeholderTextColor={theme.secondaryText}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        editable={!isOtpSent}
      />

      {isOtpSent && (
        <>
          <Text style={[styles.label, { color: theme.secondaryText }]}>
            {getTranslation(language, 'otp')}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.primaryText }]}
            placeholder={getTranslation(language, 'enterOtp')}
            placeholderTextColor={theme.secondaryText}
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            maxLength={6}
          />
        </>
      )}

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: theme.accent }]} 
        onPress={isOtpSent ? handleVerifyOtp : handleSendOtp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>
            {isOtpSent ? getTranslation(language, 'verifyLogin') : getTranslation(language, 'sendOtp')}
          </Text>
        )}
      </TouchableOpacity>

      {!isOtpSent && (
        <TouchableOpacity 
          style={[styles.googleButton, { backgroundColor: theme.id === 'darkTemple' ? '#1E1E1E' : '#FFFFFF', borderColor: theme.border, borderWidth: 1 }]} 
          onPress={handleGoogleLogin}
          onLongPress={handleGoogleLoginMock}
          delayLongPress={1500}
          disabled={loading}
        >
          <Text style={[styles.googleButtonText, { color: theme.primaryText }]}>
            Sign in with Google
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF9', // Beautiful off-white peach
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B35', // Vibrant Orange
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E8E',
    textAlign: 'center',
    marginBottom: 48,
  },
  label: {
    color: '#8E8E8E',
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#333333',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFE6D3', // Subtle orange tint border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  button: {
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Dark Mode
  darkContainer: {
    backgroundColor: '#000000',
  },
  darkTitle: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#8E8E8E',
  },
  darkLabel: {
    color: '#8E8E8E',
  },
  darkInput: {
    backgroundColor: '#000000',
    color: '#FFFFFF',
    borderColor: '#FFFFFF',
    shadowOpacity: 0,
    elevation: 0,
  },
  darkButton: {
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0,
    elevation: 0,
  },
  darkButtonText: {
    color: '#000000',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  }
});
