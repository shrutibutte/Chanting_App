import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Modal, FlatList, StatusBar, ScrollView, TextInput, Alert } from 'react-native';
import Svg, { Circle, Path, Line, Rect, Polyline } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';
import { apiCall, syncOfflineCounter } from '../api/client';
import NetInfo from '@react-native-community/netinfo';

const GODS_LIST = [
  { id: '1', name: 'राधा' },
  { id: '2', name: 'श्री शिवाय नमस्तुभ्यम्' },
  { id: '3', name: 'राम' },
  { id: '4', name: 'महादेव' },
  { id: '5', name: 'ॐ नमः शिवाय' },
  { id: '6', name: 'ॐ गं गणपतये नमः' },
  { id: '7', name: 'ॐ कृष्णाय वासुदेवाय हरये परमात्मने । प्रणतः क्लेशनाशाय गोविंदाय नमो नमः ॥' },
  { id: '8', name: 'हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे, हरे राम हरे राम राम राम हरे हरे' },
  { id: '9', name: 'ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्' },
  { id: '10', name: 'ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् उर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय मामृतात्' },
  { id: '11', name: 'RADHA' },
  { id: '12', name: 'MAHADEV' },
  { id: '13', name: 'KRISHNA' },
  { id: '14', name: 'SHIV' },
  { id: '15', name: 'NARAYAN' },
  { id: '16', name: 'Om Namah Shivaya' },
  { id: '17', name: 'Om Gan Ganapataye Namaha' },
  { id: '18', name: 'Om Krishnaya Vasudevaya Haraye Paramatmane Pranata: Kleshanashaya Govindaya Namo Namah' },
  { id: '19', name: 'Hare Krishna Hare Krishna Krishna Krishna Hare Hare, Hare Rama Hare Rama Rama Rama Hare Hare' }
]

export default function DashboardScreen({ onStartChanting, onPressStreak }) {
  const { userToken, currentNaam, totalCount, todayCount, sessionCount, logout, dailyGoal, setStats, setNaam, incrementTap, addManualCount } = useStore();
  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isBlackoutMode, setIsBlackoutMode] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isNaamHidden, setIsNaamHidden] = useState(false);
  const [isTimerModalVisible, setIsTimerModalVisible] = useState(false);
  const [isLogMalaModalVisible, setIsLogMalaModalVisible] = useState(false);
  const [customCountInput, setCustomCountInput] = useState('');

  const handleBlackoutTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    incrementTap();

    const state = useStore.getState();
    if (state.unsyncedTaps >= 108 && !state.isSyncing) {
      syncOfflineCounter();
    }
  };

  const handleExitBlackout = () => {
    syncOfflineCounter();
    setIsBlackoutMode(false);
  };

  const handleSelectNaam = (god) => {
    setNaam({ name: god.name });
    setIsModalVisible(false);
  };

  const renderGodItem = ({ item }) => {
    const isSelected = currentNaam?.name === item.name;
    return (
      <TouchableOpacity
        style={[styles.godItem, isSelected && styles.godItemSelected]}
        onPress={() => handleSelectNaam(item)}
      >
        <View style={styles.godTextContainer}>
          <Text style={[styles.godName, isSelected && styles.godNameSelected]}>{item.name}</Text>
          {/* <Text style={styles.godSubtitle}>{item.subtitle}</Text> */}
        </View>
        {isSelected && (
          <View style={styles.checkCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [todayRes, summaryRes] = await Promise.all([
        apiCall('/stats/today'),
        apiCall('/stats/summary')
      ]);

      const totalEntries = summaryRes.records?.reduce((acc, curr) => acc + curr.count, 0) || 0;

      const store = useStore.getState();
      // Keep highest count to prevent stale backend data from overwriting active local chanting
      const safeTotal = Math.max(store.totalCount, totalEntries);
      const safeToday = Math.max(store.todayCount, todayRes.totalCount);

      setStats(safeTotal, safeToday, summaryRes.records || []);
      setSynced(true);
    } catch (error) {
      console.log("Offline mode, showing local stats", error.message);
      setSynced(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initDB = async () => {
      await syncOfflineCounter();
      fetchStats();
    };
    initDB();

    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        initDB();
      } else {
        setSynced(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const currentMalaProgress = todayCount % 108;
  const percentage = Math.floor((currentMalaProgress / 108) * 100);
  const displayTotalMalas = Math.floor(todayCount / 108);

  const size = 250;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Streak Calculation
  const groupedByDate = {};
  useStore.getState().historyRecords.forEach(r => {
    groupedByDate[r.date] = (groupedByDate[r.date] || 0) + r.count;
  });

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  groupedByDate[todayStr] = todayCount;

  let currentStreak = 0;
  let checkDate = new Date();
  let cDateStr = checkDate.toISOString().split('T')[0];
  if (!groupedByDate[cDateStr] || groupedByDate[cDateStr] === 0) {
    checkDate.setDate(checkDate.getDate() - 1);
    cDateStr = checkDate.toISOString().split('T')[0];
  }
  while (groupedByDate[cDateStr] > 0) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
    cDateStr = checkDate.toISOString().split('T')[0];
  }

  if (isBlackoutMode) {
    return (
      <View style={styles.blackoutContainer}>
        <StatusBar hidden />
        
        {/* Full screen tap area for chanting */}
        <TouchableOpacity 
          style={styles.blackoutTapArea} 
          activeOpacity={1} 
          onPress={handleBlackoutTap}
        />

        {/* Floating Back Button top left */}
        <TouchableOpacity style={styles.blackoutBackButton} onPress={handleExitBlackout}>
          <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 14L4 9l5-5" />
            <Path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
          </Svg>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Naam Jaap</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.streakBadgeWrapper} onPress={onPressStreak}>
            <View style={styles.streakCircle}>
              <Text style={styles.streakCircleText}>{currentStreak}</Text>
            </View>
            <Text style={styles.streakFlame}>🔥</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuVisible(true)}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!synced && (
        <View style={{ alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: '#FF6B35', fontSize: 12 }}>Offline - Syncing later</Text>
        </View>
      )}

      {/* Background sync indicator (optional, very subtle) */}
      {loading && (
        <ActivityIndicator size="small" color="#FF6B35" style={{ position: 'absolute', top: 20, right: 24 }} />
      )}

      <View style={styles.chantingInfo}>
        <Text 
          style={[
            styles.chantingName, 
            { 
              fontSize: (currentNaam?.name || 'Krishna').length > 40 ? 18 : (currentNaam?.name || 'Krishna').length > 15 ? 25 : 70,
              textAlign: 'center',
              paddingHorizontal: 20,
              opacity: isNaamHidden ? 0 : 1
            }
          ]}
          numberOfLines={4}
          adjustsFontSizeToFit
        >
          {currentNaam?.name || 'Krishna'}
        </Text>
        <TouchableOpacity onPress={() => setIsModalVisible(true)} disabled={isNaamHidden} style={{ opacity: isNaamHidden ? 0 : 1 }}>
          <Text style={styles.changeNameText}>Change Name</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.tapArea}
        activeOpacity={0.8}
        onPress={onStartChanting}
      >
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', marginBottom: 40 }}>
          <Svg width={size} height={size} style={{ position: 'absolute' }}>
            {/* Background Ring */}
            <Circle stroke="#FFE6D3" fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
            {/* Foreground Progress Ring */}
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
            <Text style={styles.countText}>{currentMalaProgress}/108</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.statsCardWrapper}>
        <View style={styles.statsCard}>
          <View style={styles.statColumn}>
            <Text style={styles.statNumber}>{displayTotalMalas}</Text>
            <Text style={styles.statLabel}>Malas</Text>
          </View>

          <View style={styles.verticalDivider} />

          <View style={styles.statColumn}>
            <Text style={styles.statNumber}>
              {todayCount}
              <Text style={{fontSize: 14, color: '#A0A0A0'}}>{` / ${dailyGoal || 108}`}</Text>
            </Text>
            <Text style={styles.statLabel}>Today's Goal</Text>
          </View>

          <View style={styles.verticalDivider} />

          <View style={styles.statColumn}>
            <Text style={styles.statNumber}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total Count</Text>
          </View>
        </View>
      </View>

      {/* Select God Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Naam</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={GODS_LIST}
              keyExtractor={(item) => item.id}
              renderItem={renderGodItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </View>
      </Modal>

      {/* Menu Modal */}
      <Modal
        visible={isMenuVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '42%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Options</Text>
              <TouchableOpacity onPress={() => setIsMenuVisible(false)}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {/* Log Physical Mala */}
            <TouchableOpacity 
              style={styles.menuOptionItem} 
              onPress={() => {
                setIsMenuVisible(false);
                setIsLogMalaModalVisible(true);
              }}
            >
              <View style={styles.menuIconContainer}>
                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="2.2">
                  <Circle cx="12" cy="5" r="2" />
                  <Circle cx="16.5" cy="7" r="2" />
                  <Circle cx="19" cy="11.5" r="2" />
                  <Circle cx="17.5" cy="16.5" r="2" />
                  <Circle cx="13" cy="19.5" r="2" />
                  <Circle cx="8" cy="19.5" r="2" />
                  <Circle cx="4.5" cy="15.5" r="2" />
                  <Circle cx="5" cy="10.5" r="2" />
                  <Circle cx="7.5" cy="6.5" r="2" />
                </Svg>
              </View>
              <View style={styles.menuOptionTextContainer}>
                <Text style={styles.menuOptionTitle}>Add Count</Text>
              </View>
            </TouchableOpacity>
            
            {/* Hide/Show Naam */}
            <TouchableOpacity 
              style={styles.menuOptionItem} 
              onPress={() => {
                setIsNaamHidden(!isNaamHidden);
                setIsMenuVisible(false);
              }}
            >
              <View style={styles.menuIconContainer}>
                {isNaamHidden ? (
                  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <Circle cx="12" cy="12" r="3" />
                  </Svg>
                ) : (
                  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <Line x1="1" y1="1" x2="23" y2="23" />
                  </Svg>
                )}
              </View>
              <View style={styles.menuOptionTextContainer}>
                <Text style={styles.menuOptionTitle}>{isNaamHidden ? 'Show Naam' : 'Hide Naam'}</Text>
              </View>
            </TouchableOpacity>

            {/* Set Timer */}
            <TouchableOpacity 
              style={styles.menuOptionItem} 
              onPress={() => {
                setIsMenuVisible(false);
                setIsTimerModalVisible(true);
              }}
            >
              <View style={styles.menuIconContainer}>
                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <Circle cx="12" cy="12" r="10" />
                  <Polyline points="12 6 12 12 16 14" />
                </Svg>
              </View>
              <View style={styles.menuOptionTextContainer}>
                <Text style={styles.menuOptionTitle}>Set Timer</Text>
              </View>
            </TouchableOpacity>

            {/* Blackout Mode */}
            <TouchableOpacity 
              style={styles.menuOptionItem} 
              onPress={() => {
                setIsMenuVisible(false);
                setIsBlackoutMode(true);
              }}
            >
              <View style={styles.menuIconContainer}>
                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <Circle cx="12" cy="12" r="10" fill="#333333" />
                </Svg>
              </View>
              <View style={styles.menuOptionTextContainer}>
                <Text style={styles.menuOptionTitle}>Blackout Mode</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Log Physical Mala Modal */}
      <Modal
        visible={isLogMalaModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsLogMalaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '55%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Log Count</Text>
              <TouchableOpacity onPress={() => setIsLogMalaModalVisible(false)}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* <Text style={styles.modalInstruction}>Select number of rounds (Malas of 108 beads) or enter custom count below:</Text> */}
              
              <View style={styles.quickMalaContainer}>
                <TouchableOpacity 
                  style={styles.quickMalaBtn}
                  onPress={() => {
                    addManualCount(108);
                    setIsLogMalaModalVisible(false);
                    setTimeout(() => syncOfflineCounter(), 500);
                  }}
                >
                  <Text style={styles.quickMalaBtnText}>+1 Mala</Text>
                  <Text style={styles.quickMalaBtnSub}>108 counts</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.quickMalaBtn}
                  onPress={() => {
                    addManualCount(216);
                    setIsLogMalaModalVisible(false);
                    setTimeout(() => syncOfflineCounter(), 500);
                  }}
                >
                  <Text style={styles.quickMalaBtnText}>+2 Malas</Text>
                  <Text style={styles.quickMalaBtnSub}>216 counts</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.quickMalaContainer}>
                <TouchableOpacity 
                  style={styles.quickMalaBtn}
                  onPress={() => {
                    addManualCount(432);
                    setIsLogMalaModalVisible(false);
                    setTimeout(() => syncOfflineCounter(), 500);
                  }}
                >
                  <Text style={styles.quickMalaBtnText}>+4 Malas</Text>
                  <Text style={styles.quickMalaBtnSub}>432 counts</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.quickMalaBtn}
                  onPress={() => {
                    addManualCount(864);
                    setIsLogMalaModalVisible(false);
                    setTimeout(() => syncOfflineCounter(), 500);
                  }}
                >
                  <Text style={styles.quickMalaBtnText}>+8 Malas</Text>
                  <Text style={styles.quickMalaBtnSub}>864 counts</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.customCountContainer}>
                <Text style={styles.customCountLabel}>Or enter custom counts:</Text>
                <TextInput
                  style={styles.customCountInput}
                  value={customCountInput}
                  onChangeText={setCustomCountInput}
                  keyboardType="numeric"
                  placeholder="e.g. 50 or 108"
                />
              </View>

              <TouchableOpacity 
                style={styles.submitCountBtn}
                onPress={() => {
                  const count = parseInt(customCountInput, 10);
                  if (!isNaN(count) && count > 0) {
                    addManualCount(count);
                    setCustomCountInput('');
                    setIsLogMalaModalVisible(false);
                    setTimeout(() => syncOfflineCounter(), 500);
                  } else {
                    Alert.alert('Invalid Count', 'Please enter a valid number of counts greater than 0.');
                  }
                }}
              >
                <Text style={styles.submitCountBtnText}>Add Count</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Timer Selection Modal */}
      <Modal
        visible={isTimerModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsTimerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '45%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Chanting Timer</Text>
              <TouchableOpacity onPress={() => setIsTimerModalVisible(false)}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <TouchableOpacity 
                style={styles.menuOptionItem} 
                onPress={() => {
                  setIsTimerModalVisible(false);
                  onStartChanting(0); // 0 means no timer
                }}
              >
                <Text style={[styles.menuOptionTitle, { color: '#FF6B35' }]}>No Timer (Chant Indefinitely)</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuOptionItem} 
                onPress={() => {
                  setIsTimerModalVisible(false);
                  onStartChanting(60); // 1 minute
                }}
              >
                <Text style={styles.menuOptionTitle}>1 Minute</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuOptionItem} 
                onPress={() => {
                  setIsTimerModalVisible(false);
                  onStartChanting(300); // 5 minutes
                }}
              >
                <Text style={styles.menuOptionTitle}>5 Minutes</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuOptionItem} 
                onPress={() => {
                  setIsTimerModalVisible(false);
                  onStartChanting(600); // 10 minutes
                }}
              >
                <Text style={styles.menuOptionTitle}>10 Minutes</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuOptionItem} 
                onPress={() => {
                  setIsTimerModalVisible(false);
                  onStartChanting(900); // 15 minutes
                }}
              >
                <Text style={styles.menuOptionTitle}>15 Minutes</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuOptionItem} 
                onPress={() => {
                  setIsTimerModalVisible(false);
                  onStartChanting(1200); // 20 minutes
                }}
              >
                <Text style={styles.menuOptionTitle}>20 Minutes</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuOptionItem} 
                onPress={() => {
                  setIsTimerModalVisible(false);
                  onStartChanting(1800); // 30 minutes
                }}
              >
                <Text style={styles.menuOptionTitle}>30 Minutes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF9', // Beautiful off-white peach
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    marginBottom: 10,
    marginTop: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    marginLeft: 5,
    // padding: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  blackoutContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  blackoutTapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blackoutBackButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  streakBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  streakCircle: {
    backgroundColor: '#D95F2B', // Darker orange as per screenshot for the circle
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  streakCircleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  streakFlame: {
    fontSize: 16,
  },
  tapArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chantingInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  chantingSub: {
    color: '#8E8E8E',
    fontSize: 16,
    marginBottom: 6,
  },
  chantingName: {
    color: '#FF6B35',
    // fontSize: 60,
    fontWeight: '800',
    marginBottom: 8,
  },
  changeNameText: {
    color: '#fc8f67ff',
    fontSize: 14,
    opacity: 0.8,
    // textDecorationLine: 'underline',
  },
  circleOuter: {
    width: 24,
    height: 24,
    borderRadius: 14,
    backgroundColor: '#FFFDF9',
    borderWidth: 20,
    borderColor: '#FFE6D3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  circleInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: '#FF6B35',
    fontSize: 40,
    fontWeight: 'bold',
    lineHeight: 80,
  },
  ofText: {
    color: '#8E8E8E',
    fontSize: 18,
    marginBottom: 4,
  },
  percentText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  tapStartHint: {
    marginTop: 15,
    color: '#FF6B35',
    opacity: 0.6,
    fontWeight: '600',
  },
  statsCardWrapper: {
    paddingHorizontal: 24,
    paddingBottom: 120, // increased padding to clear the absolute BottomTabBar
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#EEEEEE',
  },
  statNumber: {
    color: '#FF6B35',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#8E8E8E',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    height: '65%', // Similar to the screenshot 
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  closeModalText: {
    fontSize: 20,
    color: '#8E8E8E',
    fontWeight: 'bold',
  },
  godItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  godItemSelected: {
    backgroundColor: '#FFF2E6',
  },
  godTextContainer: {
    flex: 1,
  },
  godName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  godNameSelected: {
    color: '#FF6B35',
  },
  godSubtitle: {
    fontSize: 12,
    color: '#A0A0A0',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  menuIconContainer: {
    marginRight: 16,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOptionTextContainer: {
    flex: 1,
  },
  menuOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  modalInstruction: {
    fontSize: 14,
    color: '#8E8E8E',
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  quickMalaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quickMalaBtn: {
    flex: 1,
    backgroundColor: '#FFF2E6',
    borderWidth: 1,
    borderColor: '#FFE6D3',
    borderRadius: 16,
    paddingVertical: 14,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  quickMalaBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 2,
  },
  quickMalaBtnSub: {
    fontSize: 11,
    color: '#A89E94',
  },
  customCountContainer: {
    marginTop: 16,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  customCountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  customCountInput: {
    borderWidth: 1,
    borderColor: '#FFE6D3',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },
  submitCountBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitCountBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
