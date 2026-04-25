import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useStore } from '../store/useStore';
import { apiCall } from '../api/client';
import auth from '@react-native-firebase/auth';

export default function AuthScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmResult, setConfirmResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const setLogin = useStore((state) => state.login);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(val => val - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async () => {
    if (phoneNumber.length < 10) return Alert.alert('Invalid Number', 'Please enter a valid mobile number.');
    
    // Auto-prepend generic country code if missing
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
    
    setLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(formattedPhone);
      setConfirmResult(confirmation);
      setResendTimer(30);
      Alert.alert('OTP Sent', `A secret code was sent to ${formattedPhone}`);
    } catch (error) {
      console.error(error);
      Alert.alert('Error Sending OTP', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP.');
    setLoading(true);
    try {
      // 1. Confirm the OTP locally with Firebase
      await confirmResult.confirm(otp);
      
      // 2. Fetch the newly granted secure JWT from Firebase
      const idToken = await auth().currentUser.getIdToken(true);
      
      // 3. Send token to Node.js boundary to spawn your Postgres JWT
      const data = await apiCall('/auth/verify-otp', 'POST', { firebaseToken: idToken });
      
      setLogin(data.token, data.user.phoneNumber);
    } catch (error) {
      console.error(error);
      Alert.alert('Invalid Code', 'The OTP code entered is incorrect or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Naam Jaap</Text>
      <Text style={styles.subtitle}>Begin your spiritual journey</Text>

      <Text style={styles.label}>Mobile Number</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your mobile number"
        placeholderTextColor="#666"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        editable={!confirmResult} // locked during verify phase
      />

      {confirmResult && (
        <>
          <Text style={styles.label}>OTP</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit OTP"
            placeholderTextColor="#666"
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            maxLength={6}
          />
        </>
      )}

      <TouchableOpacity 
        style={styles.button} 
        onPress={confirmResult ? handleVerifyOtp : handleSendOtp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>{confirmResult ? "Verify & Login" : "Send OTP"}</Text>
        )}
      </TouchableOpacity>

      {confirmResult && (
        <TouchableOpacity 
          style={[styles.resendButton, resendTimer > 0 && { opacity: 0.5 }]} 
          onPress={resendTimer === 0 ? handleSendOtp : null}
          disabled={resendTimer > 0 || loading}
        >
          <Text style={styles.resendText}>
            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0', // Beautiful off-white peach
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
    borderRadius: 12,
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
    borderRadius: 12,
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
  resendButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
});
