import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';
import { syncOfflineCounter } from '../api/client';

export default function CounterScreen({ onExit }) {
  const { incrementTap, todayCount, totalCount } = useStore();

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

  const currentMalaProgress = todayCount % 108;
  const todayMalasCompleted = Math.floor(todayCount / 108);

  const percentage = Math.floor((currentMalaProgress / 108) * 100);
  const size = 280;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

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
          <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
            <Svg width={size} height={size} style={{ position: 'absolute' }}>
              <Circle stroke="#FFE6D3" fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
              <Circle 
                stroke="#FF6B35" 
                fill="none" 
                cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} 
                strokeDasharray={`${circumference} ${circumference}`} 
                strokeDashoffset={strokeDashoffset} 
                strokeLinecap="round" 
                transform={`rotate(-90, ${size / 2}, ${size / 2})`} 
              />
            </Svg>

            <View style={styles.circleInner}>
              <Text style={styles.countText}>{currentMalaProgress} / 108</Text>
            </View>
          </View>
          
          <Text style={styles.subtitle}>Tap anywhere to Jaap</Text>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Today's</Text>
          <Text style={styles.statsDetails}>
            Count: {todayCount} | Malas: {todayMalasCompleted}
          </Text>
          <Text style={styles.totalText}>Total: {totalCount}</Text>
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
  circleInner: {
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingInline: 10,
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
    fontWeight: "bold",
  },
  centerBox: {
    alignItems: 'center',
  },
  countText: {
    color: '#FF6B35',
    fontSize: 48,
    fontWeight: 'bold',
  },
  ofText: {
    color: '#8E8E8E',
    fontSize: 18,
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
    fontSize: 18,
    marginTop: 10,
  },
  statsContainer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  statsTitle: {
    color: '#8E8E8E',
    fontSize: 16,
    marginBottom: 4,
  },
  statsDetails: {
    color: '#333333',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  totalText: {
    color: '#8E8E8E',
    fontSize: 16,
  },
});