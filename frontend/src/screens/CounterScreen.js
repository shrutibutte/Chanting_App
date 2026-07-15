import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal, ScrollView, TextInput, TouchableWithoutFeedback, ActivityIndicator, StatusBar, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Line, Rect, Polyline } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { syncOfflineCounter } from '../api/client';
import { getTranslation } from '../utils/translations';
import { getTheme, THEMES } from '../utils/themes';
import DateTimePicker from '@react-native-community/datetimepicker';

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
    language,
    themeId,
    isNaamHidden,
    setIsNaamHidden,
    isBlackoutMode,
    setIsBlackoutMode,
    addManualCount,
    isDarkMode
  } = useStore();

  const theme = getTheme(themeId);
  const [timerSeconds, setTimerSeconds] = useState(initialTimerSeconds);
  const [secondsLeft, setSecondsLeft] = useState(initialTimerSeconds);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isTimerModalVisible, setIsTimerModalVisible] = useState(false);
  const [isLogMalaModalVisible, setIsLogMalaModalVisible] = useState(false);
  const [customCountInput, setCustomCountInput] = useState('');
  const [logDate, setLogDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    // Reset active session count when opening the chanting screen
    resetSession();
  }, []);

  useEffect(() => {
    setSecondsLeft(timerSeconds);
    if (timerSeconds <= 0) return;

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
  }, [timerSeconds]);

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

  const currentMalaProgress = todayCount % 108;
  const displayTotalMalas = Math.floor(todayCount / 108);

  const percentage = Math.floor((currentMalaProgress / 108) * 100);
  const size = 260;
  const strokeWidth = 12; // premium thicker ring style
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  if (isBlackoutMode) {
    return (
      <View style={styles.blackoutContainer}>
        <StatusBar hidden />

        {/* Full screen tap area for chanting */}
        <TouchableOpacity
          style={styles.blackoutTapArea}
          activeOpacity={1}
          onPress={handleTap}
        />

        {/* Floating Back Button top left */}
        <TouchableOpacity 
          style={styles.blackoutBackButton} 
          onPress={() => setIsBlackoutMode(false)}
        >
          <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 14L4 9l5-5" />
            <Path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
          </Svg>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.background }]}
      activeOpacity={0.95}
      onPress={handleTap}
    >
      <SafeAreaView style={styles.safeArea}>
        
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={[styles.exitButton, { borderColor: theme.accent, backgroundColor: theme.card }]} onPress={handleExit}>
            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <Path d="M9 14L4 9l5-5" />
              <Path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
            </Svg>
          </TouchableOpacity>
          <View style={styles.topBarRight}>
            {timerSeconds > 0 && (
              <View style={[styles.timerBadge, { backgroundColor: theme.id === 'darkTemple' ? '#111111' : '#FFF0F0', borderColor: theme.id === 'darkTemple' ? '#333333' : '#FFD3D3' }]}>
                <Text style={[styles.timerBadgeText, { color: theme.id === 'darkTemple' ? '#FFFFFF' : '#FF4D4D' }]}>⏱️ {formatTime(secondsLeft)}</Text>
              </View>
            )}
            {/* <View style={[styles.malaBadge, { backgroundColor: theme.id === 'darkTemple' ? '#111111' : '#FFF2E6', borderColor: theme.id === 'darkTemple' ? '#333333' : '#FFE6D3' }]}>
              <Text style={[styles.malaBadgeText, { color: theme.accent }]}>{getTranslation(language, 'malas')} {displayTotalMalas}</Text>
            </View> */}
            <TouchableOpacity 
              style={{ padding: 2, marginLeft: 8 }} 
              onPress={() => setIsMenuVisible(true)}
            >
              <Text style={{ fontSize: 20, color: theme.accent }}>☰</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chating Display */}
        <View style={styles.centerBox}>
          <Text 
            style={[
              styles.chantingName, 
              { 
                fontSize: (currentNaam?.name || 'Krishna').length > 20 ? 24 : 36,
                color: theme.accent,
                opacity: isNaamHidden ? 0 : 1
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
              <Circle stroke={theme.id === 'darkTemple' ? "#2D2D2D" : theme.border} fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
              {/* Active Progress Circle */}
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

            {/* Inner Content inside Circle */}
            <View style={styles.circleInner}>
              <Text style={[styles.countText, { color: theme.primaryText }]}>{currentMalaProgress}</Text>
              <Text style={[styles.ofText, { color: theme.secondaryText }]}>/ 108</Text>
            </View>
          </View>
          
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{getTranslation(language, 'tapToCount')}</Text>
        </View>

        {/* Stats Panel */}
        <View style={styles.statsCardWrapper}>
          <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.statColumn}>
              <Text style={[styles.statNumber, { color: theme.accent }]}>{displayTotalMalas}</Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>{getTranslation(language, 'malas')}</Text>
            </View>

            <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />

            <View style={styles.statColumn}>
              <Text style={[styles.statNumber, { color: theme.accent }]}>
                {todayCount}
              </Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>{getTranslation(language, 'today')}</Text>
            </View>

            <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />

            <View style={styles.statColumn}>
              <Text style={[styles.statNumber, { color: theme.accent }]}>{totalCount}</Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>{getTranslation(language, 'total')}</Text>
            </View>
          </View>
        </View>

      </SafeAreaView>

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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setIsLogMalaModalVisible(false)}
          >
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, isDarkMode && styles.darkModalContent, { height: Platform.OS === 'ios' ? '34%' : '38%' }]}>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, isDarkMode && styles.darkModalTitle, { fontSize: 20, fontWeight: 'bold' }]}>
                      Add Naam Logs
                    </Text>
                    <Text style={{ fontSize: 13, color: isDarkMode ? '#8E8E93' : '#666666', marginTop: 4 }}>
                      Adds to existing count if it already exists.
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsLogMalaModalVisible(false)} style={{ padding: 4 }}>
                    <Text style={[styles.closeModalText, isDarkMode && styles.darkCloseModalText, { fontSize: 20 }]}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ paddingHorizontal: 4, marginTop: 15 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    {/* Date Selector Box */}
                    <TouchableOpacity
                      style={{
                        flex: 1.1,
                        marginRight: 10,
                        borderWidth: 1,
                        borderColor: isDarkMode ? '#444444' : '#FFE6D3',
                        borderRadius: 12,
                        paddingVertical: 14,
                        paddingHorizontal: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
                      }}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={{ fontSize: 16, color: isDarkMode ? '#FFFFFF' : '#333333', fontWeight: '500' }}>
                        📅 {logDate.getDate()}/{logDate.getMonth() + 1}/{logDate.getFullYear()}
                      </Text>
                    </TouchableOpacity>

                    {/* Count Input Box */}
                    <TextInput
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: isDarkMode ? '#444444' : '#FFE6D3',
                        borderRadius: 12,
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        fontSize: 16,
                        color: isDarkMode ? '#FFFFFF' : '#333333',
                        backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
                      }}
                      value={customCountInput}
                      onChangeText={(text) => setCustomCountInput(text.replace(/[^0-9]/g, '').slice(0, 6))}
                      keyboardType="numeric"
                      placeholder={language === 'hi' ? '# संख्या दर्ज करें' : language === 'mr' ? '# संख्या प्रविष्ट करा' : '# Enter Count'}
                      placeholderTextColor={isDarkMode ? "#666" : "#A0A0A0"}
                    />
                  </View>

                  {/* Add Log Button */}
                  <TouchableOpacity
                    style={[
                      styles.submitCountBtn, 
                      isDarkMode && styles.darkSubmitCountBtn,
                      (!customCountInput || !/^\d{1,6}$/.test(customCountInput) || parseInt(customCountInput, 10) <= 0) && styles.submitCountBtnDisabled,
                      { borderRadius: 12, paddingVertical: 14 }
                    ]}
                    disabled={!customCountInput || !/^\d{1,6}$/.test(customCountInput) || parseInt(customCountInput, 10) <= 0}
                    onPress={() => {
                      const count = parseInt(customCountInput, 10);
                      if (!isNaN(count) && count > 0) {
                        const year = logDate.getFullYear();
                        const month = String(logDate.getMonth() + 1).padStart(2, '0');
                        const day = String(logDate.getDate()).padStart(2, '0');
                        const formattedDateStr = `${year}-${month}-${day}`;
                        
                        addManualCount(count, formattedDateStr);
                        setCustomCountInput('');
                        setIsLogMalaModalVisible(false);
                      }
                    }}
                  >
                    <Text style={[styles.submitCountBtnText, isDarkMode && styles.darkSubmitCountBtnText, { fontSize: 16, fontWeight: 'bold' }]}>
                      Add Log
                    </Text>
                  </TouchableOpacity>
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={logDate}
                    mode="date"
                    display="default"
                    maximumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        setLogDate(selectedDate);
                      }
                    }}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Timer Selection Modal */}
      <Modal
        visible={isTimerModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsTimerModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsTimerModalVisible(false)}
        >
          <TouchableWithoutFeedback>
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
                    setTimerSeconds(0); // 0 means no timer
                  }}
                >
                  <Text style={[styles.menuOptionTitle, { color: isDarkMode ? '#FFFFFF' : '#FF6B35' }]}>{getTranslation(language, 'noTimerOption')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuOptionItem, isDarkMode && styles.darkMenuOptionItem]}
                  onPress={() => {
                    setIsTimerModalVisible(false);
                    setTimerSeconds(60); // 1 minute
                  }}
                >
                  <Text style={[styles.menuOptionTitle, isDarkMode && styles.darkMenuOptionTitle]}>{getTranslation(language, 'oneMinute')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuOptionItem, isDarkMode && styles.darkMenuOptionItem]}
                  onPress={() => {
                    setIsTimerModalVisible(false);
                    setTimerSeconds(300); // 5 minutes
                  }}
                >
                  <Text style={[styles.menuOptionTitle, isDarkMode && styles.darkMenuOptionTitle]}>{getTranslation(language, 'fiveMinutes')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuOptionItem, isDarkMode && styles.darkMenuOptionItem]}
                  onPress={() => {
                    setIsTimerModalVisible(false);
                    setTimerSeconds(600); // 10 minutes
                  }}
                >
                  <Text style={[styles.menuOptionTitle, isDarkMode && styles.darkMenuOptionTitle]}>{getTranslation(language, 'tenMinutes')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuOptionItem, isDarkMode && styles.darkMenuOptionItem]}
                  onPress={() => {
                    setIsTimerModalVisible(false);
                    setTimerSeconds(900); // 15 minutes
                  }}
                >
                  <Text style={[styles.menuOptionTitle, isDarkMode && styles.darkMenuOptionTitle]}>{getTranslation(language, 'fifteenMinutes')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuOptionItem, isDarkMode && styles.darkMenuOptionItem]}
                  onPress={() => {
                    setIsTimerModalVisible(false);
                    setTimerSeconds(1200); // 20 minutes
                  }}
                >
                  <Text style={[styles.menuOptionTitle, isDarkMode && styles.darkMenuOptionTitle]}>{getTranslation(language, 'twentyMinutes')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuOptionItem, isDarkMode && styles.darkMenuOptionItem]}
                  onPress={() => {
                    setIsTimerModalVisible(false);
                    setTimerSeconds(1800); // 30 minutes
                  }}
                >
                  <Text style={[styles.menuOptionTitle, isDarkMode && styles.darkMenuOptionTitle]}>{getTranslation(language, 'thirtyMinutes')}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
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
    paddingVertical: 2,
    paddingHorizontal:6,
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
  // Blackout Mode styles
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
  // Modals and Options Menu styles
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
    height: '65%',
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
  submitCountBtnDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitCountBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
  darkMenuOptionItem: {
    backgroundColor: 'transparent',
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
  submitCountBtnDisabledDark: {
    backgroundColor: '#333333',
    borderColor: '#444444',
  },
  darkSubmitCountBtn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
  },
  darkSubmitCountBtnText: {
    color: '#000000',
  },
});