import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useStore } from '../store/useStore';
import { apiCall } from '../api/client';
import { getTranslation } from '../utils/translations';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const setLogin = useStore((state) => state.login);
  const isDarkMode = useStore((state) => state.isDarkMode);
  const language = useStore((state) => state.language);

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
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <Text style={[styles.title, isDarkMode && styles.darkTitle]}>
        {getTranslation(language, 'appName')}
      </Text>
      <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]}>
        {getTranslation(language, 'beginJourney')}
      </Text>

      <Text style={[styles.label, isDarkMode && styles.darkLabel]}>
        {getTranslation(language, 'emailAddress')}
      </Text>
      <TextInput
        style={[styles.input, isDarkMode && styles.darkInput]}
        placeholder={getTranslation(language, 'enterEmail')}
        placeholderTextColor={isDarkMode ? "#666666" : "#8E8E8E"}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        editable={!isOtpSent}
      />

      {isOtpSent && (
        <>
          <Text style={[styles.label, isDarkMode && styles.darkLabel]}>
            {getTranslation(language, 'otp')}
          </Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.darkInput]}
            placeholder={getTranslation(language, 'enterOtp')}
            placeholderTextColor={isDarkMode ? "#666666" : "#8E8E8E"}
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            maxLength={6}
          />
        </>
      )}

      <TouchableOpacity 
        style={[styles.button, isDarkMode && styles.darkButton]} 
        onPress={isOtpSent ? handleVerifyOtp : handleSendOtp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={isDarkMode ? "#000000" : "#FFFFFF"} />
        ) : (
          <Text style={[styles.buttonText, isDarkMode && styles.darkButtonText]}>
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
