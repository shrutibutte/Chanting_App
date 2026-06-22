import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';
import { syncOfflineCounter } from '../api/client';
import { getTranslation } from '../utils/translations';

const screenWidth = Dimensions.get('window').width;

export default function CounterScreen({ initialTimerSeconds = 0, onExit }) {
  const { 
    incrementTap, 
    todayCount, 
    totalCount, 
    dailyGoal, 
    currentNaam, 
    sessionCount, 
    resetSession,
    isDarkMode,
    language
  } = useStore();

  const [secondsLeft, setSecondsLeft] = useState(initialTimerSeconds);

  useEffect(() => {
    // Reset active session count when opening the chanting screen
    resetSession();
  }, []);

  useEffect(() => {
    if (initialTimerSeconds <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          alert(getTranslation(language, 'excellentCompleteSession'));
          handleExit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [initialTimerSeconds]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    incrementTap();
    
    // Automatic milestone sync (1 Mala)
    const state = useStore.getState();
    if (state.unsyncedTaps >= 108 && !state.isSyncing) {
      syncOfflineCounter();
    }
  };

  const handleExit = () => {
    syncOfflineCounter();
    onExit();
  };

  const currentMalaProgress = todayCount === 0 ? 0 : (todayCount % 108 === 0 ? 108 : todayCount % 108);
  const currentMalaNumber = todayCount === 0 ? 1 : Math.floor((todayCount - 1) / 108) + 1;

  const percentage = Math.floor((currentMalaProgress / 108) * 100);
  const size = 260;
  const strokeWidth = 12; // premium thicker ring style
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <TouchableOpacity
      style={[styles.container, isDarkMode && styles.darkContainer]}
      activeOpacity={0.95}
      onPress={handleTap}
    >
      <SafeAreaView style={styles.safeArea}>
        
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={[styles.exitButton, isDarkMode && styles.darkExitButton]} onPress={handleExit}>
            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? "#FFFFFF" : "#FF6B35"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <Path d="M9 14L4 9l5-5" />
              <Path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
            </Svg>
          </TouchableOpacity>
          <View style={styles.topBarRight}>
            {initialTimerSeconds > 0 && (
              <View style={[styles.timerBadge, isDarkMode && styles.darkBadge]}>
                <Text style={[styles.timerBadgeText, isDarkMode && styles.darkBadgeText]}>⏱️ {formatTime(secondsLeft)}</Text>
              </View>
            )}
            <View style={[styles.malaBadge, isDarkMode && styles.darkBadge]}>
              <Text style={[styles.malaBadgeText, isDarkMode && styles.darkBadgeText]}>{getTranslation(language, 'malas')} {Math.floor(todayCount / 108)}</Text>
            </View>
          </View>
        </View>

        {/* Chanting Display */}
        <View style={styles.centerBox}>
          <Text 
            style={[
              styles.chantingName, 
              { 
                fontSize: (currentNaam?.name || 'Krishna').length > 20 ? 24 : 36,
                color: isDarkMode ? '#FFFFFF' : '#FF6B35'
              }
            ]}
            numberOfLines={2}
          >
            {currentNaam?.name || 'Krishna'}
          </Text>

          {/* Central Chanting Circle */}
          <View style={styles.circleOuterContainer}>
            <Svg width={size} height={size}>
              {/* Background Circle */}
              <Circle stroke={isDarkMode ? "#333333" : "#FFE6D3"} fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
              {/* Active Progress Circle */}
              <Circle 
                stroke={isDarkMode ? "#FFFFFF" : "#FF6B35"} 
                fill="none" 
                cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} 
                strokeDasharray={`${circumference} ${circumference}`} 
                strokeDashoffset={strokeDashoffset} 
                strokeLinecap="round" 
                transform={`rotate(-90, ${size / 2}, ${size / 2})`} 
              />
            </Svg>

            {/* Inner Content inside Circle */}
            <View style={styles.circleInner}>
              <Text style={[styles.countText, isDarkMode && styles.darkCountText]}>{currentMalaProgress}</Text>
              <Text style={[styles.ofText, isDarkMode && styles.darkOfText]}>/ 108</Text>
            </View>
          </View>
          
          <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]}>{getTranslation(language, 'tapToCount')}</Text>
        </View>

        {/* Stats Panel */}
        <View style={styles.statsCardWrapper}>
          <View style={[styles.statsCard, isDarkMode && styles.darkCardRow]}>
            <View style={styles.statColumn}>
              <Text style={[styles.statNumber, isDarkMode && styles.darkStatNumber]}>{Math.floor(todayCount / 108)}</Text>
              <Text style={[styles.statLabel, isDarkMode && styles.darkStatLabel]}>{getTranslation(language, 'malas')}</Text>
            </View>

            <View style={[styles.verticalDivider, isDarkMode && { backgroundColor: '#333333' }]} />

            <View style={styles.statColumn}>
              <Text style={[styles.statNumber, isDarkMode && styles.darkStatNumber]}>
                {todayCount}
              </Text>
              <Text style={[styles.statLabel, isDarkMode && styles.darkStatLabel]}>{getTranslation(language, 'today')}</Text>
            </View>

            <View style={[styles.verticalDivider, isDarkMode && { backgroundColor: '#333333' }]} />

            <View style={styles.statColumn}>
              <Text style={[styles.statNumber, isDarkMode && styles.darkStatNumber]}>{totalCount}</Text>
              <Text style={[styles.statLabel, isDarkMode && styles.darkStatLabel]}>{getTranslation(language, 'total')}</Text>
            </View>
          </View>
        </View>

      </SafeAreaView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF9',
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    height: 80,
  },
  exitButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#FF6B35',
    backgroundColor: '#FFFDF9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerBadge: {
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FFD3D3',
    marginRight: 8,
  },
  timerBadgeText: {
    color: '#FF4D4D',
    fontWeight: 'bold',
    fontSize: 14,
  },
  malaBadge: {
    backgroundColor: '#FFF2E6',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FFE6D3',
  },
  malaBadgeText: {
    color: '#FF6B35',
    fontWeight: 'bold',
    fontSize: 14,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  chantingName: {
    color: '#FF6B35',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    letterSpacing: 0.5,
  },
  circleOuterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  circleInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: '#FF6B35',
    fontSize: 64,
    fontWeight: 'bold',
    lineHeight: 68,
  },
  ofText: {
    color: '#8A7D71',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  beadsLabel: {
    color: '#A89E94',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  subtitle: {
    color: '#8A7D71',
    fontSize: 15,
    marginTop: 36,
    fontWeight: '500',
    opacity: 0.8,
  },
  statsCardWrapper: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: '50%',
    backgroundColor: '#EFEAE4',
  },
  statNumber: {
    color: '#FF6B35',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statSubText: {
    fontSize: 12,
    color: '#8E8E8E',
    fontWeight: 'normal',
  },
  statLabel: {
    color: '#8E8E8E',
    fontSize: 12,
    fontWeight: '600',
  },
  // Dark Mode Styles
  darkContainer: {
    backgroundColor: '#000000',
  },
  darkExitButton: {
    borderColor: '#FFFFFF',
    backgroundColor: '#000000',
  },
  darkBadge: {
    backgroundColor: '#000000',
    borderColor: '#FFFFFF',
  },
  darkBadgeText: {
    color: '#FFFFFF',
  },
  darkCountText: {
    color: '#FFFFFF',
  },
  darkOfText: {
    color: '#CCCCCC',
  },
  darkSubtitle: {
    color: '#CCCCCC',
  },
  darkCardRow: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowOpacity: 0,
    elevation: 0,
  },
  darkStatNumber: {
    color: '#FFFFFF',
  },
  darkStatLabel: {
    color: '#8E8E8E',
  },
});