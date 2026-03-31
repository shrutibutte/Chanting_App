import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Modal, FlatList } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useStore } from '../store/useStore';
import { apiCall, syncOfflineCounter } from '../api/client';
import NetInfo from '@react-native-community/netinfo';

const GODS_LIST = [
  { id: '1', name: 'Radha', subtitle: 'Divine Consort of Krishna' },
  { id: '2', name: 'Krishna', subtitle: 'The Supreme Personality' },
  { id: '3', name: 'Ram', subtitle: 'Maryada Purushottam' },
  { id: '4', name: 'Shiva', subtitle: 'The Auspicious One' },
  { id: '5', name: 'Hanuman', subtitle: 'The Devoted Servant' },
  { id: '6', name: 'Ganesh', subtitle: 'Remover of Obstacles' },
];

export default function DashboardScreen({ onStartChanting, onPressStreak }) {
  const { totalCount, todayCount, logout, setStats, currentNaam, setNaam } = useStore();
  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleSelectNaam = (god) => {
    setNaam({ name: god.name, subtitle: god.subtitle });
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
          <Text style={styles.godSubtitle}>{item.subtitle}</Text>
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
      setStats(totalEntries, todayRes.totalCount, summaryRes.records || []);
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
  const displayTotalMalas = Math.floor(totalCount / 108);

  const size = 280;
  const strokeWidth = 20;
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Naam Jaap</Text>
        <TouchableOpacity style={styles.streakBadgeWrapper} onPress={onPressStreak}>
          <View style={styles.streakCircle}>
            <Text style={styles.streakCircleText}>{currentStreak}</Text>
          </View>
          <Text style={styles.streakFlame}>🔥</Text>
        </TouchableOpacity>
      </View>

      {!synced && (
        <View style={{ alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: '#FF6B35', fontSize: 12 }}>Offline - Syncing later</Text>
        </View>
      )}

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <>
          <View style={styles.chantingInfo}>
            <Text style={styles.chantingSub}>Chanting</Text>
            <Text style={styles.chantingName}>{currentNaam?.name || 'Krishna'}</Text>
            <TouchableOpacity onPress={() => setIsModalVisible(true)}>
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
                <Text style={styles.countText}>{currentMalaProgress}</Text>
                <Text style={styles.ofText}>of 108</Text>
                <Text style={styles.percentText}>{percentage}%</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.statsCardWrapper}>
            <View style={styles.statsCard}>
              <View style={styles.statColumn}>
                <Text style={styles.statNumber}>{displayTotalMalas}</Text>
                <Text style={styles.statLabel}>Malas Completed</Text>
              </View>
              
              <View style={styles.verticalDivider} />
              
              <View style={styles.statColumn}>
                <Text style={styles.statNumber}>{todayCount}</Text>
                <Text style={styles.statLabel}>Total Jaap Count</Text>
              </View>
            </View>
          </View>
        </>
      )}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0', // Beautiful off-white peach
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35', // Vibrant Orange
  },
  streakBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  streakCircle: {
    backgroundColor: '#D95F2B', // Darker orange as per screenshot for the circle
    width: 28,
    height: 28,
    borderRadius: 14,
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
    fontSize: 18,
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
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 8,
  },
  changeNameText: {
    color: '#FF6B35',
    fontSize: 14,
    opacity: 0.8,
    textDecorationLine: 'underline',
  },
  circleOuter: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#FFF8F0',
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
    fontSize: 72,
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
    borderRadius: 16,
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
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  godItemSelected: {
    backgroundColor: '#FFF8F0',
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
});
