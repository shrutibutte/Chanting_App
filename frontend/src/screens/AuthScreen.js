import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useStore } from '../store/useStore';
import { apiCall } from '../api/client';
import { getTranslation } from '../utils/translations';

import { getTheme } from '../utils/themes';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(600); // 10 minutes (600 seconds)
  const setLogin = useStore((state) => state.login);
  const language = useStore((state) => state.language);
  const themeId = useStore((state) => state.themeId);
  const theme = getTheme(themeId);

  useEffect(() => {
    let interval;
    if (isOtpSent && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOtpSent, otpTimer]);

  const formatOtpTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendOtp = async () => {
    if (!email.includes('@')) return Alert.alert(getTranslation(language, 'invalidEmail'), getTranslation(language, 'enterValidEmail'));
    setLoading(true);
    try {
      await apiCall('/auth/send-otp', 'POST', { email });
      setIsOtpSent(true);
      setOtpTimer(600);
      setOtp('');
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
          {otpTimer > 0 ? (
            <Text style={{ textAlign: 'center', color: theme.secondaryText, marginBottom: 24, fontSize: 14 }}>
              {language === 'hi' ? `ओटीपी ${formatOtpTime(otpTimer)} में समाप्त होगा` : language === 'mr' ? `ओटीपी ${formatOtpTime(otpTimer)} मध्ये कालबाह्य होईल` : `OTP expires in ${formatOtpTime(otpTimer)}`}
            </Text>
          ) : (
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: theme.card, borderColor: theme.accent, borderWidth: 1.5, marginBottom: 24 }]} 
              onPress={handleSendOtp}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: theme.accent }]}>
                {language === 'hi' ? 'ओटीपी पुनः भेजें' : language === 'mr' ? 'ओटीपी पुन्हा पाठवा' : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          )}
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
});
