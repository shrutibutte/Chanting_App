import React, { useState } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { useStore } from './src/store/useStore';
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CounterScreen from './src/screens/CounterScreen';
import ProgressScreen from './src/screens/ProgressScreen';

function BottomTabBar({ activeTab, onTabSelect }) {
  return (
    <View style={styles.tabContainer}>
      <TouchableOpacity style={styles.tabItem} onPress={() => onTabSelect('home')}>
        <Text style={[styles.tabIcon, activeTab === 'home' && styles.tabIconActive]}>⚙️</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.tabItem} onPress={() => onTabSelect('chart')}>
        <Text style={[styles.tabIcon, activeTab === 'chart' && styles.tabIconActive]}>📊</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.tabItem} onPress={() => onTabSelect('book')}>
        <Text style={[styles.tabIcon, activeTab === 'book' && styles.tabIconActive]}>📖</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const [isChanting, setIsChanting] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const userToken = useStore((state) => state.userToken);

  // Very lean conditional rendering approach as requested
  if (!userToken) {
    return (
      <View style={[styles.container, { backgroundColor: '#FFF8F0' }]}>
        <StatusBar barStyle="dark-content" />
        <AuthScreen />
      </View>
    );
  }

  if (isChanting) {
    return (
      <View style={[styles.container, { backgroundColor: '#000000' }]}>
        <StatusBar hidden />
        <CounterScreen onExit={() => setIsChanting(false)} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#FFF8F0' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF8F0" />
      
      {activeTab === 'home' && (
        <DashboardScreen 
          onStartChanting={() => setIsChanting(true)} 
          onPressStreak={() => setActiveTab('chart')} 
        />
      )}
      {activeTab === 'chart' && <ProgressScreen />}
      {activeTab === 'book' && (
         <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center'}}>
           <Text style={{color: '#FF6B35', fontSize: 20}}>Audio Stories Coming Soon!</Text>
         </SafeAreaView>
      )}

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
