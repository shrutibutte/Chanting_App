import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity, Text, SafeAreaView, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from './src/store/useStore';
import { syncOfflineCounter } from './src/api/client';
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CounterScreen from './src/screens/CounterScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import StreakScreen from './src/screens/StreakScreen';

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
  const userToken = useStore((state) => state.userToken);
  const appState = useRef(AppState.currentState);

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
    </View>
  );
}

// pushing code 

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F', // Default dark
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
  tabIcon: {
    fontSize: 20,
    // opacity: 0.4, // Inactive
  },
  tabIconActive: {
    opacity: 1,
  }
});
