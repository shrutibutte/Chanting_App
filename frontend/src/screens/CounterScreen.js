import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';
import { syncOfflineCounter } from '../api/client';

export default function CounterScreen({ onExit }) {
  const { sessionCount, incrementTap, resetSession } = useStore();

  useEffect(() => {
    // Reset session whenever the screen is opened
    resetSession();
  }, []);

  const handleTap = () => {
    // Vibration feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Increment local state instantly for zero-latency UI
    incrementTap();
  };

  const handleExit = () => {
    // Trigger batch sync immediately upon exiting the counter screen
    syncOfflineCounter();
    onExit();
  };

  const currentMalaProgress = sessionCount % 108;
  const malasCompleted = Math.floor(sessionCount / 108);

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={0.9} 
      onPress={handleTap}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
            <Text style={styles.exitText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.malaText}>
            {currentMalaProgress} / 108
          </Text>
        </View>

        <View style={styles.centerBox}>
          <Text style={styles.countText}>{sessionCount}</Text>
          <Text style={styles.subtitle}>Tap anywhere to Jaap</Text>
        </View>

        <View style={styles.bottomBar}>
          <Text style={styles.totalMalasText}>Malas Completed: {malasCompleted}</Text>
        </View>
      </SafeAreaView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',

  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 40,
    width: '100%',
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exitButton: {
    paddingInline:10,
    // paddingBlock:5,
    backgroundColor: '#FFF8F0',
    borderRadius: 8,
    borderWidth: 1,
    color: '#FF6B35',
    borderColor: 'rgba(226, 84, 13, 1)8F0',
  },
  exitText: {
    color: '#FF6B35',
    fontSize: 20,
    fontWeight: 'bold',
  },
  malaText: {
    color: '#FF6B35',
    fontSize: 18,
    fontWeight:"bold",
  },
  centerBox: {
    alignItems: 'center',
  },
  countText: {
    color: '#FF6B35',
    fontSize: 140,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#666',
    fontSize: 18,
    marginTop: 10,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 50,
  },
  totalMalasText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35', 
  },
});
