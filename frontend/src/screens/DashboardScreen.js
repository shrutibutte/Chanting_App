import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, ActivityIndicator, SafeAreaView, Modal, SectionList, FlatList, StatusBar, ScrollView, TextInput, Alert } from 'react-native';
import Svg, { Circle, Path, Line, Rect, Polyline } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { apiCall, syncOfflineCounter } from '../api/client';
import NetInfo from '@react-native-community/netinfo';
import { getLocalDateString } from '../utils/date.js';
import { getTranslation } from '../utils/translations';
import { getTheme, THEMES } from '../utils/themes';

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
  const { userToken, currentNaam, totalCount, todayCount, sessionCount, logout, dailyGoal, setStats, setNaam, incrementTap, addManualCount, lastUnlockedLevel, showLevelModal, unlockedLevelInfo, setShowLevelModal, isDarkMode, language, customNaams, fetchCustomNaams, addCustomNaam, isBlackoutMode, setIsBlackoutMode, themeId, goals } = useStore();
  const theme = getTheme(themeId);
  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isChanting, setIsChanting] = useState(false); // Placeholder or unused local sync
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isNaamHidden, setIsNaamHidden] = useState(false);
  const [isTimerModalVisible, setIsTimerModalVisible] = useState(false);
  const [isLogMalaModalVisible, setIsLogMalaModalVisible] = useState(false);
  const [customCountInput, setCustomCountInput] = useState('');

  // Custom Naam input modal states
  const [isAddCustomModalVisible, setIsAddCustomModalVisible] = useState(false);
  const [customNaamInput, setCustomNaamInput] = useState('');

  const handleSaveCustomNaam = async () => {
    if (!customNaamInput || customNaamInput.trim() === '') {
      return Alert.alert(
        getTranslation(language, 'appName'),
        getTranslation(language, 'nameCannotBeEmpty')
      );
    }

    try {
      await addCustomNaam(customNaamInput.trim());
      setCustomNaamInput('');
      setIsAddCustomModalVisible(false);
      fetchCustomNaams();
    } catch (err) {
      let errorMsg = err.message || 'Failed to save custom name';

      if (err.message && err.message.includes('already exists')) {
        errorMsg = getTranslation(language, 'customNameExists');
      }

      Alert.alert(
        getTranslation(language, 'appName'),
        errorMsg
      );
    }
  };

  useEffect(() => {
    if (userToken) {
      fetchCustomNaams();
    }
  }, [userToken]);

  useEffect(() => {
    if (isModalVisible && userToken) {
      fetchCustomNaams();
    }
  }, [isModalVisible]);

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
        style={[styles.godItem, isSelected && (isDarkMode ? styles.godItemSelectedDark : styles.godItemSelected), isDarkMode && styles.darkCardRow]}
        onPress={() => handleSelectNaam(item)}
      >
        <View style={styles.godTextContainer}>
          <Text style={[styles.godName, isSelected && (isDarkMode ? styles.godNameSelectedDark : styles.godNameSelected), isDarkMode && styles.darkCardTitle]}>{item.name}</Text>
        </View>
        {isSelected && (
          <View style={[styles.checkCircle, isDarkMode && styles.darkCheckCircle]}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Ensure daily reset runs locally before fetching
      useStore.getState().checkDailyReset();

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

  const currentMalaProgress = todayCount === 0 ? 0 : (todayCount % 108 === 0 ? 108 : todayCount % 108);
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
  const todayStr = getLocalDateString(today);
  groupedByDate[todayStr] = todayCount;

  let currentStreak = 0;
  let checkDate = new Date();
  let cDateStr = getLocalDateString(checkDate);
  if (!groupedByDate[cDateStr] || groupedByDate[cDateStr] === 0) {
    checkDate.setDate(checkDate.getDate() - 1);
    cDateStr = getLocalDateString(checkDate);
  }
  while (groupedByDate[cDateStr] > 0) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
    cDateStr = getLocalDateString(checkDate);
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.accent }]}>
          {getTranslation(language, 'appName')}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.streakBadgeWrapper} onPress={onPressStreak}>
            <View style={[styles.streakCircle, { backgroundColor: theme.accent }]}>
              <Text style={[styles.streakCircleText, { color: '#FFFFFF' }]}>{currentStreak}</Text>
            </View>
            <Text style={styles.streakFlame}>🔥</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuVisible(true)}>
            <Text style={[styles.menuIcon, { color: theme.accent }]}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!synced && (
        <View style={{ alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: theme.accent, fontSize: 12 }}>{getTranslation(language, 'offlineMode')}</Text>
        </View>
      )}

      {/* Background sync indicator (optional, very subtle) */}
      {loading && (
        <ActivityIndicator size="small" color={theme.accent} style={{ position: 'absolute', top: 20, right: 24 }} />
      )}

      <View style={styles.chantingInfo}>
        <Text
          style={[
            styles.chantingName,
            {
              fontSize: (currentNaam?.name || 'Krishna').length > 40 ? 18 : (currentNaam?.name || 'Krishna').length > 15 ? 25 : 70,
              textAlign: 'center',
              paddingHorizontal: 20,
              opacity: isNaamHidden ? 0 : 1,
              color: theme.accent
            }
          ]}
          numberOfLines={4}
          adjustsFontSizeToFit
        >
          {currentNaam?.name || 'Krishna'}
        </Text>
        <TouchableOpacity onPress={() => setIsModalVisible(true)} disabled={isNaamHidden} style={{ opacity: isNaamHidden ? 0 : 1 }}>
          <Text style={[styles.changeNameText, { color: theme.secondaryText }]}>{getTranslation(language, 'changeName')}</Text>
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
            <Circle stroke={theme.id === 'darkTemple' ? "#2D2D2D" : theme.border} fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
            {/* Foreground Progress Ring */}
            <Circle
              stroke={theme.accent}
              fill="none"
              cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90, ${size / 2}, ${size / 2})`}
            />
          </Svg>

          <View style={styles.circleInner}>
            <Text style={[styles.countText, { color: theme.primaryText }]}>{currentMalaProgress}/108</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.statsCardWrapper}>
        <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.statColumn}>
            <Text style={[styles.statNumber, { color: theme.accent }]}>{displayTotalMalas}</Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>{getTranslation(language, 'malas')}</Text>
          </View>

          <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />

          <View style={styles.statColumn}>
            {todayCount >= goals.daily ? (
              <>
                <Text style={[styles.statNumber, { color: theme.success }]}>
                  {todayCount}
                </Text>
                <Text style={[styles.statLabel, { color: theme.success, fontWeight: 'bold' }]}>✅ {getTranslation(language, 'goalMet')}</Text>
              </>
            ) : (
              <>
                <Text style={[styles.statNumber, { color: theme.accent }]}>
                  {todayCount}
                  <Text style={{ fontSize: 14, color: theme.secondaryText }}>{` / ${goals.daily || 108}`}</Text>
                </Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>{getTranslation(language, 'todayGoal')}</Text>
              </>
            )}
          </View>

          <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />

          <View style={styles.statColumn}>
            <Text style={[styles.statNumber, { color: theme.accent }]}>{totalCount}</Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>{getTranslation(language, 'totalCount')}</Text>
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
          <View style={[styles.modalContent, isDarkMode && styles.darkModalContent, { height: '80%', paddingBottom: 80 }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="chevron-back" size={24} color={isDarkMode ? "#FFFFFF" : "#FF6B35"} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, isDarkMode && styles.darkModalTitle]}>{getTranslation(language, 'selectMantra')}</Text>
              <TouchableOpacity onPress={() => setIsAddCustomModalVisible(true)} style={{ padding: 4 }}>
                <Ionicons name="add" size={28} color={isDarkMode ? "#FFFFFF" : "#FF6B35"} />
              </TouchableOpacity>
            </View>

            <SectionList
              sections={[
                {
                  title: getTranslation(language, 'custom'),
                  data: customNaams || [],
                },
                {
                  title: getTranslation(language, 'sanatan'),
                  data: GODS_LIST,
                }
              ]}
              keyExtractor={(item, index) => item.id || item.name + index}
              renderItem={renderGodItem}
              renderSectionHeader={({ section: { title, data } }) => {
                if (title === getTranslation(language, 'custom') && data.length === 0) {
                  return (
                    <View style={styles.sectionHeaderContainer}>
                      <Text style={[styles.sectionHeaderText, isDarkMode && styles.darkSectionHeaderText]}>{title}</Text>
                      <Text style={[styles.noCustomText, isDarkMode && styles.darkNoCustomText]}>No custom names yet. Tap + to add.</Text>
                    </View>
                  );
                }
                return (
                  <View style={styles.sectionHeaderContainer}>
                    <Text style={[styles.sectionHeaderText, isDarkMode && styles.darkSectionHeaderText]}>{title}</Text>
                  </View>
                );
              }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />

            {/* Cycle Language Floating Button inside modal */}
            <TouchableOpacity
              style={[styles.langCycleFloatingButton, isDarkMode && styles.darkLangCycleFloatingButton]}
              onPress={() => {
                const languages = ['en', 'hi', 'mr'];
                const nextIdx = (languages.indexOf(language) + 1) % languages.length;
                useStore.getState().setLanguage(languages[nextIdx]);
              }}
            >
              <Text style={[styles.langCycleFloatingText, isDarkMode && styles.darkLangCycleFloatingText]}>अ</Text>
            </TouchableOpacity>
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
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsMenuVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, isDarkMode && styles.darkModalContent, { height: 570 }]}>
              {/* Native Drag Handle */}
              <View style={[styles.modalDragHandle, isDarkMode && styles.darkModalDragHandle]} />

              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, isDarkMode && styles.darkModalTitle]}>{getTranslation(language, 'options')}</Text>
                <TouchableOpacity onPress={() => setIsMenuVisible(false)}>
                  <Ionicons name="close-circle-outline" size={24} color={isDarkMode ? "#FFFFFF" : "#8E8E8E"} />
                </TouchableOpacity>
              </View>

              {/* Log Physical Mala */}
              <TouchableOpacity
                style={[styles.menuOptionItem, isDarkMode && styles.darkMenuOptionItem]}
                onPress={() => {
                  setIsMenuVisible(false);
                  setIsLogMalaModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconWrapper, { backgroundColor: isDarkMode ? '#2C1B10' : '#FFF2E6' }]}>
                  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? "#FF8C5A" : "#FF6B35"} strokeWidth="2.2">
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
                  <Text style={[styles.menuOptionTitle, isDarkMode && styles.darkMenuOptionTitle]}>{getTranslation(language, 'addCount')}</Text>
                  <Text style={[styles.menuOptionSubtitle, isDarkMode && styles.darkMenuOptionSubtitle]}>{getTranslation(language, 'addCountSub')}</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={16} color={isDarkMode ? "#555555" : "#CCCCCC"} />
              </TouchableOpacity>

              {/* Hide/Show Naam */}
              <TouchableOpacity
                style={[styles.menuOptionItem, isDarkMode && styles.darkMenuOptionItem]}
                onPress={() => {
                  setIsNaamHidden(!isNaamHidden);
                  setIsMenuVisible(false);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconWrapper, { backgroundColor: isDarkMode ? '#1D2530' : '#EBF8FF' }]}>
                  {isNaamHidden ? (
                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? "#63B3ED" : "#3182CE"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <Circle cx="12" cy="12" r="3" />
                    </Svg>
                  ) : (
                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? "#63B3ED" : "#3182CE"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <Line x1="1" y1="1" x2="23" y2="23" />
                    </Svg>
                  )}
                </View>
                <View style={styles.menuOptionTextContainer}>
                  <Text style={[styles.menuOptionTitle, isDarkMode && styles.darkMenuOptionTitle]}>{isNaamHidden ? getTranslation(language, 'showNaam') : getTranslation(language, 'hideNaam')}</Text>
                  <Text style={[styles.menuOptionSubtitle, isDarkMode && styles.darkMenuOptionSubtitle]}>{isNaamHidden ? getTranslation(language, 'showNaamSub') : getTranslation(language, 'hideNaamSub')}</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={16} color={isDarkMode ? "#555555" : "#CCCCCC"} />
              </TouchableOpacity>

              {/* Set Timer */}
              <TouchableOpacity
                style={[styles.menuOptionItem, isDarkMode && styles.darkMenuOptionItem]}
                onPress={() => {
                  setIsMenuVisible(false);
                  setIsTimerModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconWrapper, { backgroundColor: isDarkMode ? '#241B35' : '#F3E8FF' }]}>
                  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? "#B794F4" : "#805AD5"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <Circle cx="12" cy="12" r="10" />
                    <Polyline points="12 6 12 12 16 14" />
                  </Svg>
                </View>
                <View style={styles.menuOptionTextContainer}>
                  <Text style={[styles.menuOptionTitle, isDarkMode && styles.darkMenuOptionTitle]}>{getTranslation(language, 'setTimer')}</Text>
                  <Text style={[styles.menuOptionSubtitle, isDarkMode && styles.darkMenuOptionSubtitle]}>{getTranslation(language, 'setTimerSub')}</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={16} color={isDarkMode ? "#555555" : "#CCCCCC"} />
              </TouchableOpacity>

              {/* Blackout Mode */}
              <TouchableOpacity
                style={[styles.menuOptionItem, isDarkMode && styles.darkMenuOptionItem]}
                onPress={() => {
                  setIsMenuVisible(false);
                  setIsBlackoutMode(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconWrapper, { backgroundColor: isDarkMode ? '#222222' : '#F7FAFC' }]}>
                  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? "#E2E8F0" : "#4A5568"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <Circle cx="12" cy="12" r="10" fill={isDarkMode ? "#E2E8F0" : "#4A5568"} />
                  </Svg>
                </View>
                <View style={styles.menuOptionTextContainer}>
                  <Text style={[styles.menuOptionTitle, isDarkMode && styles.darkMenuOptionTitle]}>{getTranslation(language, 'blackoutMode')}</Text>
                  <Text style={[styles.menuOptionSubtitle, isDarkMode && styles.darkMenuOptionSubtitle]}>{getTranslation(language, 'blackoutModeSub')}</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={16} color={isDarkMode ? "#555555" : "#CCCCCC"} />
              </TouchableOpacity>

              {/* App Theme Selector */}
              <View style={{ borderTopWidth: 1, borderTopColor: theme.border, marginTop: 12, paddingTop: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.secondaryText, marginBottom: 8, paddingHorizontal: 4 }}>
                  {language === 'hi' ? 'ऐप थीम बदलें' : 'SELECT APP THEME'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
                  {Object.values(THEMES).map((t) => {
                    const isSelected = t.id === themeId;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={{
                          width: 110,
                          height: 54,
                          borderRadius: 12,
                          backgroundColor: t.background,
                          borderColor: isSelected ? t.accent : t.border,
                          borderWidth: isSelected ? 2.5 : 1,
                          padding: 8,
                          marginRight: 10,
                          justifyContent: 'space-between'
                        }}
                        onPress={() => useStore.getState().setThemeId(t.id)}
                      >
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.accent, alignSelf: 'flex-end' }} />
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: t.primaryText }}>{t.name.split(' ')[0]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>


      {/* Log Physical Mala Modal */}
      <Modal
        visible={isLogMalaModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsLogMalaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDarkMode && styles.darkModalContent, { height: '55%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDarkMode && styles.darkModalTitle]}>{getTranslation(language, 'addLogCount')}</Text>
              <TouchableOpacity onPress={() => setIsLogMalaModalVisible(false)}>
                <Text style={[styles.closeModalText, isDarkMode && styles.darkCloseModalText]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.quickMalaContainer}>
                <TouchableOpacity
                  style={[styles.quickMalaBtn, isDarkMode && styles.darkQuickMalaBtn]}
                  onPress={() => {
                    addManualCount(108);
                    setIsLogMalaModalVisible(false);
                    setTimeout(() => syncOfflineCounter(), 500);
                  }}
                >
                  <Text style={[styles.quickMalaBtnText, isDarkMode && styles.darkQuickMalaBtnText]}>+1 {getTranslation(language, 'malas')}</Text>
                  <Text style={[styles.quickMalaBtnSub, isDarkMode && styles.darkQuickMalaBtnSub]}>108 {getTranslation(language, 'counts')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickMalaBtn, isDarkMode && styles.darkQuickMalaBtn]}
                  onPress={() => {
                    addManualCount(216);
                    setIsLogMalaModalVisible(false);
                    setTimeout(() => syncOfflineCounter(), 500);
                  }}
                >
                  <Text style={[styles.quickMalaBtnText, isDarkMode && styles.darkQuickMalaBtnText]}>+2 {getTranslation(language, 'malas')}</Text>
                  <Text style={[styles.quickMalaBtnSub, isDarkMode && styles.darkQuickMalaBtnSub]}>216 {getTranslation(language, 'counts')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.quickMalaContainer}>
                <TouchableOpacity
                  style={[styles.quickMalaBtn, isDarkMode && styles.darkQuickMalaBtn]}
                  onPress={() => {
                    addManualCount(432);
                    setIsLogMalaModalVisible(false);
                    setTimeout(() => syncOfflineCounter(), 500);
                  }}
                >
                  <Text style={[styles.quickMalaBtnText, isDarkMode && styles.darkQuickMalaBtnText]}>+4 {getTranslation(language, 'malas')}</Text>
                  <Text style={[styles.quickMalaBtnSub, isDarkMode && styles.darkQuickMalaBtnSub]}>432 {getTranslation(language, 'counts')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickMalaBtn, isDarkMode && styles.darkQuickMalaBtn]}
                  onPress={() => {
                    addManualCount(864);
                    setIsLogMalaModalVisible(false);
                    setTimeout(() => syncOfflineCounter(), 500);
                  }}
                >
                  <Text style={[styles.quickMalaBtnText, isDarkMode && styles.darkQuickMalaBtnText]}>+8 {getTranslation(language, 'malas')}</Text>
                  <Text style={[styles.quickMalaBtnSub, isDarkMode && styles.darkQuickMalaBtnSub]}>864 {getTranslation(language, 'counts')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.customCountContainer}>
                <Text style={[styles.customCountLabel, isDarkMode && styles.darkCustomCountLabel]}>{getTranslation(language, 'orEnterCustomCounts')}</Text>
                <TextInput
                  style={[styles.customCountInput, isDarkMode && styles.darkCustomCountInput]}
                  value={customCountInput}
                  onChangeText={setCustomCountInput}
                  keyboardType="numeric"
                  placeholder="e.g. 50 or 108"
                  placeholderTextColor={isDarkMode ? "#666" : "#A0A0A0"}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitCountBtn, isDarkMode && styles.darkSubmitCountBtn]}
                onPress={() => {
                  const count = parseInt(customCountInput, 10);
                  if (!isNaN(count) && count > 0) {
                    addManualCount(count);
                    setCustomCountInput('');
                    setIsLogMalaModalVisible(false);
                    setTimeout(() => syncOfflineCounter(), 500);
                  } else {
                    Alert.alert(getTranslation(language, 'invalidCount'), getTranslation(language, 'enterValidCountMsg'));
                  }
                }}
              >
                <Text style={[styles.submitCountBtnText, isDarkMode && styles.darkSubmitCountBtnText]}>{getTranslation(language, 'addCount')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Level-Up Celebration Modal */}
      <Modal
        visible={showLevelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLevelModal(false)}
      >
        <View style={styles.levelOverlay}>
          <View style={[styles.levelCard, isDarkMode && styles.darkLevelCard]}>
            <Text style={[styles.levelTitleText, isDarkMode && styles.darkLevelTitleText]}>{getTranslation(language, 'levelUnlockedTitle')}</Text>

            <View style={styles.levelCelebrationIconContainer}>
              <Text style={styles.levelCelebrationIcon}>{unlockedLevelInfo?.icon || '🌱'}</Text>
            </View>

            <Text style={[styles.levelCongratulationText, isDarkMode && styles.darkLevelCongratulationText]}>
              {getTranslation(language, 'levelCongratulationText')}
            </Text>

            <View style={[styles.levelHighlightBox, isDarkMode && styles.darkLevelHighlightBox]}>
              <Text style={[styles.levelHighlightTitle, isDarkMode && styles.darkLevelHighlightTitle]}>{getTranslation(language, 'newLevelLabel')}</Text>
              <Text style={[styles.levelHighlightVal, isDarkMode && styles.darkLevelHighlightVal]}>
                {unlockedLevelInfo?.name ? (() => {
                  const name = unlockedLevelInfo.name;
                  const match = name.match(/^(Ananda Master|Koti Master)\s+Lvl\s+(\d+)$/);
                  if (match) {
                    const key = match[1] === 'Koti Master' ? 'level_KotiMaster' : 'level_AnandaMaster';
                    return `${getTranslation(language, key)} Lvl ${match[2]}`;
                  }
                  return getTranslation(language, `level_${name.replace(/\s+/g, '')}`);
                })() : ''}
              </Text>
              <Text style={[styles.levelHighlightSub, isDarkMode && styles.darkLevelHighlightSub]}>
                {getTranslation(language, 'unlockedAtLabel', { target: unlockedLevelInfo?.target.toLocaleString() })}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.continueJourneyButton, isDarkMode && styles.darkContinueJourneyButton]}
              onPress={() => setShowLevelModal(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.continueJourneyButtonText, isDarkMode && styles.darkContinueJourneyButtonText]}>{getTranslation(language, 'continueJourney')}</Text>
            </TouchableOpacity>
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
          <View style={[styles.modalContent, isDarkMode && styles.darkModalContent, { height: '45%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDarkMode && styles.darkModalTitle]}>{getTranslation(language, 'setChantingTimer')}</Text>
              <TouchableOpacity onPress={() => setIsTimerModalVisible(false)}>
                <Text style={[styles.closeModalText, isDarkMode && styles.darkCloseModalText]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <TouchableOpacity
                style={[styles.menuOptionItem, isDarkMode && styles.darkMenuOptionItem]}
                onPress={() => {
                  setIsTimerModalVisible(false);
                  onStartChanting(0); // 0 means no timer
                }}
              >
                <Text style={[styles.menuOptionTitle, { color: isDarkMode ? '#FFFFFF' : '#FF6B35' }]}>{getTranslation(language, 'noTimerOption')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuOptionItem, isDarkMode && styles.darkMenuOptionItem]}
                onPress={() => {
                  setIsTimerModalVisible(false);
                  onStartChanting(60); // 1 minute
                }}
              >
                <Text style={[styles.menuOptionTitle, isDarkMode && styles.darkMenuOptionTitle]}>{getTranslation(language, 'oneMinute')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuOptionItem, isDarkMode && styles.darkMenuOptionItem]}
                onPress={() => {
                  setIsTimerModalVisible(false);
                  onStartChanting(300); // 5 minutes
                }}
              >
                <Text style={[styles.menuOptionTitle, isDarkMode && styles.darkMenuOptionTitle]}>{getTranslation(language, 'fiveMinutes')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuOptionItem, isDarkMode && styles.darkMenuOptionItem]}
                onPress={() => {
                  setIsTimerModalVisible(false);
                  onStartChanting(600); // 10 minutes
                }}
              >
                <Text style={[styles.menuOptionTitle, isDarkMode && styles.darkMenuOptionTitle]}>{getTranslation(language, 'tenMinutes')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuOptionItem, isDarkMode && styles.darkMenuOptionItem]}
                onPress={() => {
                  setIsTimerModalVisible(false);
                  onStartChanting(900); // 15 minutes
                }}
              >
                <Text style={[styles.menuOptionTitle, isDarkMode && styles.darkMenuOptionTitle]}>{getTranslation(language, 'fifteenMinutes')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuOptionItem, isDarkMode && styles.darkMenuOptionItem]}
                onPress={() => {
                  setIsTimerModalVisible(false);
                  onStartChanting(1200); // 20 minutes
                }}
              >
                <Text style={[styles.menuOptionTitle, isDarkMode && styles.darkMenuOptionTitle]}>{getTranslation(language, 'twentyMinutes')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuOptionItem, isDarkMode && styles.darkMenuOptionItem]}
                onPress={() => {
                  setIsTimerModalVisible(false);
                  onStartChanting(1800); // 30 minutes
                }}
              >
                <Text style={[styles.menuOptionTitle, isDarkMode && styles.darkMenuOptionTitle]}>{getTranslation(language, 'thirtyMinutes')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Custom Naam Modal */}
      <Modal
        visible={isChanting ? false : isAddCustomModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsAddCustomModalVisible(false)}
      >
        <View style={styles.centerModalOverlay}>
          <View style={[styles.customModalContent, isDarkMode && styles.darkCustomModalContent]}>
            <Text style={[styles.customModalTitle, isDarkMode && styles.darkCustomModalTitle]}>
              {getTranslation(language, 'addCustomMantra')}
            </Text>

            <Text style={[styles.customModalSubtitle, isDarkMode && styles.darkCustomModalSubtitle]}>
              {getTranslation(language, 'addCustomSubtitle')}
            </Text>

            <TextInput
              style={[styles.customModalInput, isDarkMode && styles.darkCustomModalInput]}
              value={customNaamInput}
              onChangeText={setCustomNaamInput}
              placeholder={getTranslation(language, 'mantraPlaceholder')}
              placeholderTextColor={isDarkMode ? "#666" : "#A89E94"}
              maxLength={100}
              autoFocus
            />

            {/* Suggestions Header */}
            <Text style={[styles.suggestionsHeader, isDarkMode && styles.darkSuggestionsHeader]}>
              ✨ {getTranslation(language, 'suggestions')}
            </Text>

            {/* Suggestion Chips */}
            <View style={styles.suggestionsContainer}>
              {(language === 'hi' || language === 'mr'
                ? ['राधे कृष्ण', 'श्री राम', 'ॐ नमः शिवाय', 'हरे कृष्ण', 'ॐ नमो नारायणाय']
                : ['Radhe Krishna', 'Shri Ram', 'Om Namah Shivaya', 'Hare Krishna', 'Om Namo Narayanaya']
              ).map((sug) => (
                <TouchableOpacity
                  key={sug}
                  style={[
                    styles.suggestionChip,
                    isDarkMode && styles.darkSuggestionChip,
                    customNaamInput.trim() === sug && (isDarkMode ? styles.darkSuggestionChipSelected : styles.suggestionChipSelected)
                  ]}
                  onPress={() => setCustomNaamInput(sug)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.suggestionChipText,
                    isDarkMode && styles.darkSuggestionChipText,
                    customNaamInput.trim() === sug && (isDarkMode ? styles.darkSuggestionChipTextSelected : styles.suggestionChipTextSelected)
                  ]}>
                    {sug}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.customModalButtons}>
              <TouchableOpacity
                style={[styles.customModalBtnCancel, isDarkMode && styles.darkCustomModalBtnCancel]}
                onPress={() => {
                  setCustomNaamInput('');
                  setIsAddCustomModalVisible(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.customModalBtnCancelText, isDarkMode && styles.darkCustomModalBtnCancelText]}>
                  {getTranslation(language, 'cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.customModalBtnSave, isDarkMode && styles.darkCustomModalBtnSave]}
                onPress={handleSaveCustomNaam}
                activeOpacity={0.8}
              >
                <Text style={[styles.customModalBtnSaveText, isDarkMode && styles.darkCustomModalBtnSaveText]}>
                  {getTranslation(language, 'save')}
                </Text>
              </TouchableOpacity>
            </View>
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
    marginTop: 30,
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    height: '65%', // Similar to the screenshot 
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  darkModalDragHandle: {
    backgroundColor: '#444444',
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
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 6,
  },
  menuIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuOptionTextContainer: {
    flex: 1,
  },
  menuOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
  },
  menuOptionSubtitle: {
    fontSize: 11,
    color: '#718096',
    marginTop: 2,
  },
  darkMenuOptionSubtitle: {
    color: '#A0AEC0',
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
  // Dark Mode Styles
  darkContainer: {
    backgroundColor: '#000000',
  },
  darkHeaderTitle: {
    color: '#FFFFFF',
  },
  darkStreakCircle: {
    backgroundColor: '#FFFFFF',
  },
  darkStreakCircleText: {
    color: '#000000',
  },
  darkMenuIcon: {
    color: '#FFFFFF',
  },
  darkChantingName: {
    color: '#FFFFFF',
  },
  darkChangeNameText: {
    color: '#FFFFFF',
  },
  darkCountText: {
    color: '#FFFFFF',
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
  darkModalContent: {
    backgroundColor: '#121212',
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: '#2D3748',
  },
  darkModalTitle: {
    color: '#FFFFFF',
  },
  darkCloseModalText: {
    color: '#FFFFFF',
  },
  darkMenuOptionTitle: {
    color: '#FFFFFF',
  },
  darkQuickMalaBtn: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  darkQuickMalaBtnText: {
    color: '#FFFFFF',
  },
  darkQuickMalaBtnSub: {
    color: '#8E8E8E',
  },
  darkCustomCountLabel: {
    color: '#FFFFFF',
  },
  darkCustomCountInput: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    color: '#FFFFFF',
  },
  darkSubmitCountBtn: {
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0,
    elevation: 0,
  },
  darkSubmitCountBtnText: {
    color: '#000000',
  },
  levelOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelCard: {
    width: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  levelTitleText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  levelCelebrationIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF2E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFE6D3',
  },
  levelCelebrationIcon: {
    fontSize: 48,
  },
  levelCongratulationText: {
    fontSize: 14,
    color: '#7A726A',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  levelHighlightBox: {
    width: '100%',
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#F4EFEA',
    alignItems: 'center',
    marginBottom: 28,
  },
  levelHighlightTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A89E94',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  levelHighlightVal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
    textAlign: 'center',
  },
  levelHighlightSub: {
    fontSize: 12,
    color: '#8E8E8E',
  },
  continueJourneyButton: {
    width: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueJourneyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  darkLevelCard: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  darkLevelTitleText: {
    color: '#FFFFFF',
  },
  darkLevelCongratulationText: {
    color: '#CCCCCC',
  },
  darkLevelHighlightBox: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  darkLevelHighlightTitle: {
    color: '#8E8E8E',
  },
  darkLevelHighlightVal: {
    color: '#FFFFFF',
  },
  darkLevelHighlightSub: {
    color: '#CCCCCC',
  },
  darkContinueJourneyButton: {
    backgroundColor: '#FFFFFF',
  },
  darkContinueJourneyButtonText: {
    color: '#000000',
  },
  darkMenuOptionItem: {
    backgroundColor: 'transparent',
  },
  godItemSelectedDark: {
    backgroundColor: '#222222',
  },
  godNameSelectedDark: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  darkCheckCircle: {
    backgroundColor: '#FFFFFF',
  },
  sectionHeaderContainer: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#8E8E8E',
    letterSpacing: 1.2,
    marginTop: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  noCustomText: {
    fontSize: 13,
    color: '#A0A0A0',
    marginTop: 8,
    fontStyle: 'italic',
    paddingLeft: 12,
  },
  langCycleFloatingButton: {
    position: 'absolute',
    left: 20,
    bottom: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0D6CB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 9999,
  },
  langCycleFloatingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  darkLangCycleFloatingButton: {
    backgroundColor: '#111111',
    borderColor: '#333333',
  },
  darkLangCycleFloatingText: {
    color: '#FFFFFF',
  },
  darkSectionHeaderText: {
    color: '#8E8E8E',
  },
  darkNoCustomText: {
    color: '#666666',
  },
  centerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  customModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  customModalSubtitle: {
    fontSize: 13,
    color: '#8E8E8E',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  customModalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#FFE6D3',
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 20,
  },
  suggestionsHeader: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E8E',
    marginBottom: 10,
    paddingLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 24,
    width: '100%',
  },
  suggestionChip: {
    backgroundColor: '#FFF2E6',
    borderWidth: 1,
    borderColor: '#FFE6D3',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
  },
  suggestionChipSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  suggestionChipText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionChipTextSelected: {
    color: '#FFFFFF',
  },
  customModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  customModalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },
  customModalBtnSave: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  customModalBtnCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  customModalBtnSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  darkCustomModalContent: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  darkCustomModalTitle: {
    color: '#FFFFFF',
  },
  darkCustomModalSubtitle: {
    color: '#CCCCCC',
  },
  darkCustomModalInput: {
    backgroundColor: '#000000',
    borderColor: '#FFFFFF',
    color: '#FFFFFF',
  },
  darkSuggestionsHeader: {
    color: '#FFFFFF',
  },
  darkSuggestionChip: {
    backgroundColor: '#111111',
    borderColor: '#333333',
  },
  darkSuggestionChipSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  darkSuggestionChipText: {
    color: '#FFFFFF',
  },
  darkSuggestionChipTextSelected: {
    color: '#000000',
  },
  darkCustomModalBtnCancel: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#333333',
  },
  darkCustomModalBtnCancelText: {
    color: '#FFFFFF',
  },
  darkCustomModalBtnSave: {
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0,
    elevation: 0,
  },
  darkCustomModalBtnSaveText: {
    color: '#000000',
  },
});
