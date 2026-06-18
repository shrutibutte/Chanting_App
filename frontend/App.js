import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity, Text, SafeAreaView, AppState, Dimensions, Animated, Easing, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useStore } from './src/store/useStore';
import { syncOfflineCounter } from './src/api/client';
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CounterScreen from './src/screens/CounterScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import StreakScreen from './src/screens/StreakScreen';
import { requestNotificationPermissions, scheduleDailyReminder, updateTargetReminder } from './src/utils/notifications';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CONFETTI_COLORS = ['#FF6B35', '#FFB380', '#4ECDC4', '#FFD166', '#118AB2', '#06D6A0', '#FF4A75'];
const SPARKLE_CONFIG = [
  { top: -12, left: 10, size: 24, delay: 0 },
  { top: 5, left: -25, size: 16, delay: 200 },
  { top: -20, right: 20, size: 28, delay: 400 },
  { top: 40, right: -25, size: 20, delay: 150 },
  { bottom: 5, left: -20, size: 18, delay: 350 },
  { bottom: -20, left: 20, size: 26, delay: 100 },
  { bottom: -15, right: 10, size: 14, delay: 500 },
  { bottom: 40, right: -20, size: 22, delay: 300 },
];

// Create static configuration for 40 confetti pieces
const confettiParticles = Array.from({ length: 40 }).map((_, i) => {
  const startX = Math.random() * screenWidth;
  const endX = startX + (Math.random() * 120 - 60); // Drift left or right
  const delay = Math.random() * 1000; // staggered delay
  const duration = 2000 + Math.random() * 1500; // fall duration
  const rotation = Math.random() * 360;
  const size = 6 + Math.random() * 8; // random width/height
  const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
  const isCircle = Math.random() > 0.5;

  return {
    id: i,
    startX,
    endX,
    delay,
    duration,
    rotation,
    size,
    color,
    isCircle,
  };
});

function BottomTabBar({ activeTab, onTabSelect }) {
  return (
    <View style={styles.tabContainer}>
      <TouchableOpacity style={styles.tabItem} onPress={() => onTabSelect('home')}>
        <Ionicons 
          name={activeTab === 'home' ? 'home' : 'home-outline'} 
          size={24} 
          color={activeTab === 'home' ? '#FF6B35' : '#B0B0B0'} 
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.tabItem} onPress={() => onTabSelect('chart')}>
        <Ionicons 
          name={activeTab === 'chart' ? 'stats-chart' : 'stats-chart-outline'} 
          size={24} 
          color={activeTab === 'chart' ? '#FF6B35' : '#B0B0B0'} 
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.tabItem} onPress={() => onTabSelect('book')}>
        <Ionicons 
          name={activeTab === 'book' ? 'book' : 'book-outline'} 
          size={24} 
          color={activeTab === 'book' ? '#FF6B35' : '#B0B0B0'} 
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.tabItem} onPress={() => onTabSelect('settings')}>
        <Ionicons 
          name={activeTab === 'settings' ? 'settings' : 'settings-outline'} 
          size={24} 
          color={activeTab === 'settings' ? '#FF6B35' : '#B0B0B0'} 
        />
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const [isChanting, setIsChanting] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [chantingTimer, setChantingTimer] = useState(0);
  const appState = useRef(AppState.currentState);

  const {
    userToken,
    todayCount,
    dailyGoal,
    historyRecords,
    showCelebrationModal,
    setShowCelebrationModal,
    lastStreakMaintainedPopupDate,
    setLastStreakMaintainedPopupDate,
    isReminderEnabled,
    reminderTime
  } = useStore();

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const toastY = useRef(new Animated.Value(-150)).current;

  // Confetti Animations
  const fallAnims = useRef(confettiParticles.map(() => new Animated.Value(0))).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const badgeRotate = useRef(new Animated.Value(0)).current;

  // Sparkle & Glow Animations
  const sparkleAnims = useRef(SPARKLE_CONFIG.map(() => new Animated.Value(0))).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Calculate Current Streak
  const currentStreak = useMemo(() => {
    const groupedByDate = {};
    historyRecords.forEach(r => {
      groupedByDate[r.date] = (groupedByDate[r.date] || 0) + r.count;
    });

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    groupedByDate[todayStr] = todayCount;

    let streak = 0;
    let checkDate = new Date();
    let cDateStr = checkDate.toISOString().split('T')[0];

    // If today is 0, start checking yesterday
    if (!groupedByDate[cDateStr] || groupedByDate[cDateStr] === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
      cDateStr = checkDate.toISOString().split('T')[0];
    }

    while (groupedByDate[cDateStr] > 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
      cDateStr = checkDate.toISOString().split('T')[0];
    }

    return streak;
  }, [historyRecords, todayCount]);

  useEffect(() => {
    // 1. AppState Listener for Background/Close Sync
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        // App went to background - trigger sync
        syncOfflineCounter();
      }
      appState.current = nextAppState;
    });

    // 2. Interval Backup Sync (Every 60 seconds)
    const intervalId = setInterval(() => {
      const state = useStore.getState();
      if (state.unsyncedTaps > 0 && !state.isSyncing) {
        syncOfflineCounter();
      }
    }, 60000);

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, []);

  // Request notification permission and schedule default daily reminder
  useEffect(() => {
    if (userToken && isReminderEnabled) {
      const initDefaultReminder = async () => {
        const hasPermission = await requestNotificationPermissions();
        if (hasPermission) {
          await scheduleDailyReminder(reminderTime);
        }
      };
      initDefaultReminder();
    }
  }, [userToken, isReminderEnabled, reminderTime]);

  const wasCompletedRef = useRef(false);

  // Request notification permission and schedule 8:00 PM target reminder
  useEffect(() => {
    if (!userToken) return;

    const isCompleted = todayCount >= dailyGoal;
    
    // We update the target reminder if:
    // 1. It is the first run / app launch
    // 2. Or isReminderEnabled changed
    // 3. Or dailyGoal changed
    // 4. Or the completion status changed (e.g. from not completed to completed)
    if (isReminderEnabled) {
      updateTargetReminder(todayCount, dailyGoal);
    }
    
    wasCompletedRef.current = isCompleted;
  }, [userToken, isReminderEnabled, dailyGoal, todayCount >= dailyGoal]);

  // One-time Toast Trigger on Mount
  useEffect(() => {
    if (userToken) {
      const currentDate = new Date().toISOString().split('T')[0];
      // Check if goal is already met today and the popup wasn't shown today
      if (todayCount >= dailyGoal && lastStreakMaintainedPopupDate !== currentDate) {
        const timer = setTimeout(() => {
          setShowToast(true);
          setLastStreakMaintainedPopupDate(currentDate);
        }, 1500); // 1.5s delay for smooth entry after load
        return () => clearTimeout(timer);
      }
    }
  }, [userToken, todayCount, dailyGoal, lastStreakMaintainedPopupDate]);

  // Slide down / up Toast Animation
  useEffect(() => {
    if (showToast) {
      Animated.sequence([
        Animated.spring(toastY, {
          toValue: 50,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.delay(4500), // Hold for 4.5s
        Animated.timing(toastY, {
          toValue: -150,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        setShowToast(false);
      });
    }
  }, [showToast]);

  // Celebration Animation Trigger
  useEffect(() => {
    if (showCelebrationModal) {
      // Reset values
      fallAnims.forEach(anim => anim.setValue(0));
      badgeScale.setValue(0);
      badgeRotate.setValue(0);
      sparkleAnims.forEach(anim => anim.setValue(0));
      glowAnim.setValue(0);

      const confettiAnimations = confettiParticles.map((p, idx) => {
        return Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(fallAnims[idx], {
            toValue: 1,
            duration: p.duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          })
        ]);
      });

      // Loop Sparkles (stars)
      const sparkleAnimations = SPARKLE_CONFIG.map((s, idx) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(s.delay),
            Animated.timing(sparkleAnims[idx], {
              toValue: 1,
              duration: 700,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(sparkleAnims[idx], {
              toValue: 0,
              duration: 700,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.delay(200),
          ])
        );
      });

      // Loop Pulsing Glow Ring
      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          })
        ])
      );

      // Animate badge spring scale & spin, and start loops
      Animated.parallel([
        Animated.spring(badgeScale, {
          toValue: 1,
          tension: 30,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(badgeRotate, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.parallel(confettiAnimations),
        Animated.parallel(sparkleAnimations),
        glowAnimation,
      ]).start();
    }
  }, [showCelebrationModal]);

  // Very lean conditional rendering approach as requested
  if (!userToken) {
    return (
      <View style={[styles.container, { backgroundColor: '#FFFDF9' }]}>
        <StatusBar barStyle="dark-content" />
        <AuthScreen />
      </View>
    );
  }

  if (isChanting) {
    return (
      <View style={[styles.container, { backgroundColor: '#000000' }]}>
        <StatusBar hidden />
        <CounterScreen initialTimerSeconds={chantingTimer} onExit={() => setIsChanting(false)} />
      </View>
    );
  }

  const badgeRotateInterpolate = badgeRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { backgroundColor: '#FFFDF9' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFDF9" />

      {activeTab === 'home' && (
        <DashboardScreen
          onStartChanting={(timerSecs = 0) => {
            setChantingTimer(timerSecs);
            setIsChanting(true);
          }}
          onPressStreak={() => setActiveTab('streak')}
        />
      )}
      {activeTab === 'streak' && <StreakScreen onExit={() => setActiveTab('home')} />}
      {activeTab === 'chart' && <ProgressScreen />}
      {activeTab === 'book' && (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFDF9' }}>
          <View style={{ paddingHorizontal: 24, paddingTop: 40, marginBottom: 10, marginTop: 10 }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#FF6B35' }}>Stories</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FF6B35', fontSize: 20 }}>Audio Stories Coming Soon!</Text>
          </View>
        </SafeAreaView>
      )}
      {activeTab === 'settings' && <SettingsScreen />}

      <BottomTabBar activeTab={activeTab} onTabSelect={setActiveTab} />

      {/* Floating / Sliding Daily Toast Popup */}
      {showToast && (
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastY }] }]}>
          <Ionicons name="flame" size={24} color="#FFF" style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.toastTitle}>Streak Maintained!</Text>
            <Text style={styles.toastMessage}>Great job, you've already completed today's chanting and secured your streak.</Text>
          </View>
        </Animated.View>
      )}

      {/* Full-screen Celebration Modal */}
      <Modal
        visible={showCelebrationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCelebrationModal(false)}
      >
        <View style={styles.celebrationOverlay}>
          {/* Confetti Rendering */}
          {confettiParticles.map((p, idx) => {
            const translateY = fallAnims[idx].interpolate({
              inputRange: [0, 1],
              outputRange: [-50, screenHeight + 50],
            });
            const translateX = fallAnims[idx].interpolate({
              inputRange: [0, 1],
              outputRange: [0, p.endX - p.startX],
            });
            const rotate = fallAnims[idx].interpolate({
              inputRange: [0, 1],
              outputRange: [`${p.rotation}deg`, `${p.rotation + 360}deg`],
            });

            return (
              <Animated.View
                key={p.id}
                style={[
                  styles.confetti,
                  {
                    left: p.startX,
                    width: p.size,
                    height: p.isCircle ? p.size : p.size * 1.5,
                    borderRadius: p.isCircle ? p.size / 2 : 2,
                    backgroundColor: p.color,
                    transform: [{ translateY }, { translateX }, { rotate }],
                  },
                ]}
              />
            );
          })}

          {/* Celebration Card */}
          <SafeAreaView style={styles.celebrationContent}>
            <View style={styles.celebrationCard}>
              
              {/* Badge & Glow Container */}
              <View style={{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginBottom: 28, position: 'relative' }}>
                
                {/* Glowing pulsing background ring */}
                <Animated.View 
                  style={[
                    styles.glowRing,
                    {
                      transform: [
                        { scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.3] }) }
                      ],
                      opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] })
                    }
                  ]}
                />

                <Animated.View 
                  style={[
                    styles.badgeGlow,
                    { transform: [{ scale: badgeScale }, { rotate: badgeRotateInterpolate }], marginBottom: 0 }
                  ]}
                >
                  <View style={styles.badgeCircle}>
                    <Text style={styles.badgeEmoji}>🔥</Text>
                    <View style={styles.streakBadgeTextContainer}>
                      <Text style={styles.streakBadgeTextVal}>{currentStreak}</Text>
                      <Text style={styles.streakBadgeTextLabel}>DAYS</Text>
                    </View>
                  </View>
                </Animated.View>

                {/* Floating sparkling diamond stars */}
                {SPARKLE_CONFIG.map((s, idx) => {
                  const scale = sparkleAnims[idx].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1.1],
                  });
                  const opacity = sparkleAnims[idx].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  });
                  const rotate = sparkleAnims[idx].interpolate({
                    inputRange: [0, 1],
                    outputRange: ['45deg', '135deg'],
                  });

                  return (
                    <Animated.View
                      key={idx}
                      style={{
                        position: 'absolute',
                        top: s.top,
                        left: s.left,
                        right: s.right,
                        bottom: s.bottom,
                        width: s.size,
                        height: s.size,
                        opacity,
                        transform: [{ scale }, { rotate }],
                        pointerEvents: 'none',
                      }}
                    >
                      <Svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none">
                        <Path 
                          d="M12 0L15.5 8.5L24 12L15.5 15.5L12 24L8.5 15.5L0 12L8.5 8.5L12 0Z" 
                          fill="#FFD166" 
                        />
                      </Svg>
                    </Animated.View>
                  );
                })}

              </View>

              <Text style={styles.celebrationTitle}>🎉 Congratulations!</Text>
              
              <Text style={styles.celebrationMessage}>
                You have successfully completed today's chanting target and maintained your streak!
              </Text>

              <View style={styles.streakHighlightBox}>
                <Text style={styles.streakHighlightTitle}>CURRENT STREAK</Text>
                <Text style={styles.streakHighlightVal}>{currentStreak} Days</Text>
              </View>

              <TouchableOpacity 
                style={styles.continueButton} 
                onPress={() => setShowCelebrationModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF9', // Matched premium off-white peach
  },
  tabContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingBottom: 32, // Safe area bottom
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  toastTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  toastMessage: {
    color: '#FFE6D3',
    fontSize: 13,
    lineHeight: 16,
  },
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 12, 10, 0.9)', // Deep premium dark backdrop
    justifyContent: 'center',
    alignItems: 'center',
  },
  confetti: {
    position: 'absolute',
    top: 0,
    opacity: 0.85,
  },
  celebrationContent: {
    width: '100%',
    alignItems: 'center',
  },
  celebrationCard: {
    width: screenWidth * 0.88,
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // Matched photo's 24px border radius for main cards
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  badgeGlow: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFF2E6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFDDC8',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
    zIndex: 2,
  },
  glowRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 6,
    zIndex: 1,
  },
  badgeCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeEmoji: {
    fontSize: 48,
    lineHeight: 52,
    position: 'absolute',
    top: 8,
  },
  streakBadgeTextContainer: {
    position: 'absolute',
    bottom: 12,
    alignItems: 'center',
  },
  streakBadgeTextVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  streakBadgeTextLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFF2E6',
    letterSpacing: 0.5,
  },
  celebrationTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 16,
  },
  celebrationMessage: {
    fontSize: 15,
    color: '#7A726A',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
    marginBottom: 28,
  },
  streakHighlightBox: {
    width: '100%',
    backgroundColor: '#FFFDF9',
    borderRadius: 16, // Matched photo's 16px border radius for inside cards
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F4EFEA',
    alignItems: 'center',
    marginBottom: 28,
  },
  streakHighlightTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A89E94',
    letterSpacing: 1,
    marginBottom: 4,
  },
  streakHighlightVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF6B35',
  },
  continueButton: {
    width: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 16, // Matched photo's 16px border radius for buttons
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
