import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Switch, TouchableOpacity, Alert, ScrollView, Modal, TextInput } from 'react-native';
import { useStore } from '../store/useStore';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { requestNotificationPermissions, scheduleDailyReminder, cancelAllReminders } from '../utils/notifications';
import { getTranslation } from '../utils/translations';

export default function SettingsScreen() {
  const { 
    logout, 
    isReminderEnabled, 
    reminderTime, 
    setReminderSettings,
    dailyGoal,
    setDailyGoal,
    totalCount,
    isDarkMode,
    toggleDarkMode,
    language,
    setLanguage
  } = useStore();

  const [localTime, setLocalTime] = useState(() => {
    const timeToSplit = reminderTime || "08:00";
    const [hours, minutes] = timeToSplit.split(':');
    const d = new Date();
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return d;
  });

  const [isGoalModalVisible, setIsGoalModalVisible] = useState(false);
  const [tempGoal, setTempGoal] = useState('');
  
  const [isTimeModalVisible, setIsTimeModalVisible] = useState(false);
  const [tempTime, setTempTime] = useState('');

  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);

  const handleToggleReminder = async (enabled) => {
    if (enabled) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert(
          getTranslation(language, 'permissionRequired'),
          getTranslation(language, 'enableNotificationsAlert')
        );
        return;
      }

      try {
        await scheduleDailyReminder(reminderTime);
        setReminderSettings(true, reminderTime);
        Alert.alert(
          getTranslation(language, 'reminderOn'), 
          getTranslation(language, 'reminderSetTo', { time: formatDisplayTime(localTime) })
        );
      } catch (err) {
        Alert.alert(getTranslation(language, 'error'), 'Failed to schedule reminder. Please try again.');
      }
    } else {
      try {
        await cancelAllReminders();
        setReminderSettings(false, reminderTime);
      } catch (err) {
        Alert.alert(getTranslation(language, 'error'), 'Failed to cancel reminder. Please try again.');
      }
    }
  };

  const handlePressTime = () => {
    setTempTime(reminderTime || '08:00');
    setIsTimeModalVisible(true);
  };

  const formatDisplayTime = (dateObj) => {
    let hours = dateObj.getHours();
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
  };

  const handleSaveGoal = () => {
    const goalNum = parseInt(tempGoal, 10);
    if (!isNaN(goalNum) && goalNum > 0) {
      setDailyGoal(goalNum);
      setIsGoalModalVisible(false);
      Alert.alert(getTranslation(language, 'success'), getTranslation(language, 'goalUpdated'));
    } else {
      Alert.alert(getTranslation(language, 'invalidInput'), getTranslation(language, 'enterValidGoal'));
    }
  };

  const handleSaveTime = async () => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (timeRegex.test(tempTime)) {
      const [hours, minutes] = tempTime.split(':');
      const d = new Date();
      d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      setLocalTime(d);

      if (isReminderEnabled) {
        try {
          await scheduleDailyReminder(tempTime);
        } catch (err) {
          Alert.alert(getTranslation(language, 'error'), 'Failed to update reminder time. Please try again.');
        }
      }

      setReminderSettings(isReminderEnabled, tempTime);
      setIsTimeModalVisible(false);
      Alert.alert(getTranslation(language, 'success'), getTranslation(language, 'reminderUpdated'));
    } else {
      Alert.alert(getTranslation(language, 'invalidTime'), getTranslation(language, 'enterValidTime'));
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkHeaderTitle]}>
          {getTranslation(language, 'settings')}
        </Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* JAAP SETTINGS */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkSectionTitle]}>
            {getTranslation(language, 'jaapSettings')}
          </Text>
          <TouchableOpacity 
            style={[styles.cardRow, isDarkMode && styles.darkCardRow]} 
            activeOpacity={0.7} 
            onPress={() => {
              setTempGoal(dailyGoal ? dailyGoal.toString() : '108');
              setIsGoalModalVisible(true);
            }}
          >
            <View style={styles.iconContainer}>
               <Feather name="flag" size={20} color={isDarkMode ? "#FFFFFF" : "#FF6B35"} />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardTitle, isDarkMode && styles.darkCardTitle]}>
                {getTranslation(language, 'dailyGoal')}
              </Text>
              <Text style={[styles.cardSubtitle, isDarkMode && styles.darkCardSubtitle]}>
                {dailyGoal || 108} {getTranslation(language, 'counts')}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={isDarkMode ? "#FFFFFF" : "#A0A0A0"} />
          </TouchableOpacity>
        </View>

        {/* REMINDERS */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkSectionTitle]}>
            {getTranslation(language, 'reminders')}
          </Text>
          <View style={[styles.cardRow, isDarkMode && styles.darkCardRow]}>
            <View style={styles.iconContainer}>
              <Feather name="bell" size={20} color={isDarkMode ? "#FFFFFF" : "#FF6B35"} />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardTitle, isDarkMode && styles.darkCardTitle]}>
                {getTranslation(language, 'dailyReminder')}
              </Text>
              
              <TouchableOpacity onPress={handlePressTime}>
                 <Text style={isReminderEnabled ? (isDarkMode ? styles.darkCardSubtitleActive : styles.cardSubtitleActive) : (isDarkMode ? styles.darkCardSubtitle : styles.cardSubtitle)}>
                   {getTranslation(language, 'reminderSetTo', { time: formatDisplayTime(localTime) })}
                 </Text>
              </TouchableOpacity>
            </View>
            <Switch
              trackColor={{ false: isDarkMode ? '#222222' : '#F0F0F0', true: isDarkMode ? '#FFFFFF' : '#FFDDC8' }}
              thumbColor={isReminderEnabled ? (isDarkMode ? '#FFFFFF' : '#00BFA5') : '#FFFFFF'}
              ios_backgroundColor={isDarkMode ? '#222222' : '#F0F0F0'}
              onValueChange={handleToggleReminder}
              value={isReminderEnabled}
              style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
            />
          </View>
        </View> 

        {/* THEME */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkSectionTitle]}>
            {getTranslation(language, 'theme')}
          </Text>
          <View style={[styles.cardRow, isDarkMode && styles.darkCardRow]}>
            <View style={styles.iconContainer}>
              <Feather name="moon" size={20} color={isDarkMode ? "#FFFFFF" : "#FF6B35"} />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardTitle, isDarkMode && styles.darkCardTitle]}>
                {getTranslation(language, 'darkMode')}
              </Text>
              <Text style={[styles.cardSubtitle, isDarkMode && styles.darkCardSubtitle]}>
                {getTranslation(language, 'blackWhiteTheme')}
              </Text>
            </View>
            <Switch
              trackColor={{ false: isDarkMode ? '#222222' : '#F0F0F0', true: isDarkMode ? '#FFFFFF' : '#FFDDC8' }}
              thumbColor={isDarkMode ? '#FFFFFF' : '#FFFFFF'}
              ios_backgroundColor={isDarkMode ? '#222222' : '#F0F0F0'}
              onValueChange={toggleDarkMode}
              value={isDarkMode}
              style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
            />
          </View>
        </View>

        {/* LANGUAGE */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkSectionTitle]}>
            {getTranslation(language, 'language')}
          </Text>
          <TouchableOpacity 
            style={[styles.cardRow, isDarkMode && styles.darkCardRow]} 
            activeOpacity={0.7} 
            onPress={() => setIsLanguageModalVisible(true)}
          >
            <View style={styles.iconContainer}>
               <Ionicons name="globe-outline" size={20} color={isDarkMode ? "#FFFFFF" : "#FF6B35"} />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardTitle, isDarkMode && styles.darkCardTitle]}>
                {getTranslation(language, 'languageOption')}
              </Text>
              <Text style={[styles.cardSubtitle, isDarkMode && styles.darkCardSubtitle]}>
                {language === 'hi' ? 'हिन्दी (Hindi)' : language === 'mr' ? 'मराठी (Marathi)' : 'English'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={isDarkMode ? "#FFFFFF" : "#A0A0A0"} />
          </TouchableOpacity>
        </View>

        {/* Count */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkSectionTitle]}>
            {getTranslation(language, 'Total Jaap')}
          </Text>
          <View style={[styles.cardRow, isDarkMode && styles.darkCardRow]}>
            <View style={styles.aboutTextContainer}>
              {/* <Text style={[styles.aboutTitle, isDarkMode && styles.darkAboutTitle]}>
                {getTranslation(language, 'Total Jaap')}
              </Text> */}
              <Text style={[styles.countSubtitle, isDarkMode && styles.darkCountSubtitle]}>
                {totalCount}
              </Text>
            </View>
          </View>
        </View>

        {/* ABOUT */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkSectionTitle]}>
            {getTranslation(language, 'about')}
          </Text>
          <View style={[styles.cardRow, styles.aboutCard, isDarkMode && styles.darkCardRow]}>
            <View style={styles.aboutTextContainer}>
              <Text style={[styles.aboutTitle, isDarkMode && styles.darkAboutTitle]}>
                {getTranslation(language, 'appName')}
              </Text>
              <Text style={[styles.aboutDescription, isDarkMode && styles.darkAboutDescription]}>
                {getTranslation(language, 'naamJaapDesc')}
              </Text>
              <Text style={[styles.aboutVersion, isDarkMode && styles.darkAboutVersion]}>
                {getTranslation(language, 'version')} 1.0.0
              </Text>
            </View>
          </View>
        </View>

        {/* LOGOUT BUTTON */}
        <View style={[styles.cardRow, isDarkMode && styles.darkCardRow]}>
           <TouchableOpacity style={styles.logoutButton} onPress={logout}>
             <Ionicons name="log-out-outline" size={20} color={isDarkMode ? "#FFFFFF" : "#FF6B35"} style={{ marginRight: 8 }} />
             <Text style={[styles.logoutText, isDarkMode && styles.darkLogoutText]}>
               {getTranslation(language, 'logout')}
             </Text>
           </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Daily Goal Edit Modal */}
      <Modal
        visible={isGoalModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDarkMode && styles.darkModalContent]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkModalTitle]}>
              {getTranslation(language, 'setDailyGoal')}
            </Text>
            <TextInput
              style={[styles.modalInput, isDarkMode && styles.darkModalInput]}
              value={tempGoal}
              onChangeText={setTempGoal}
              keyboardType="numeric"
              placeholder={getTranslation(language, 'enterTargetNumber')}
              placeholderTextColor={isDarkMode ? "#666" : "#A0A0A0"}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtnCancel, isDarkMode && styles.darkModalBtnCancel]} onPress={() => setIsGoalModalVisible(false)}>
                <Text style={[styles.modalBtnCancelText, isDarkMode && styles.darkModalBtnCancelText]}>
                  {getTranslation(language, 'cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnSave, isDarkMode && styles.darkModalBtnSave]} onPress={handleSaveGoal}>
                <Text style={[styles.modalBtnSaveText, isDarkMode && styles.darkModalBtnSaveText]}>
                  {getTranslation(language, 'save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Daily Reminder Edit Modal */}
      <Modal
        visible={isTimeModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDarkMode && styles.darkModalContent]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkModalTitle]}>
              {getTranslation(language, 'setReminderTime')}
            </Text>
            <Text style={[{color: '#888', marginBottom: 16, fontSize: 13}, isDarkMode && styles.darkCardSubtitle]}>
              {getTranslation(language, 'enterTimeFormat')}
            </Text>
            <TextInput
              style={[styles.modalInput, isDarkMode && styles.darkModalInput]}
              value={tempTime}
              onChangeText={setTempTime}
              keyboardType="numbers-and-punctuation"
              placeholder="e.g. 08:00"
              placeholderTextColor={isDarkMode ? "#666" : "#A0A0A0"}
              maxLength={5}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtnCancel, isDarkMode && styles.darkModalBtnCancel]} onPress={() => setIsTimeModalVisible(false)}>
                <Text style={[styles.modalBtnCancelText, isDarkMode && styles.darkModalBtnCancelText]}>
                  {getTranslation(language, 'cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnSave, isDarkMode && styles.darkModalBtnSave]} onPress={handleSaveTime}>
                <Text style={[styles.modalBtnSaveText, isDarkMode && styles.darkModalBtnSaveText]}>
                  {getTranslation(language, 'save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={isLanguageModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDarkMode && styles.darkModalContent]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkModalTitle]}>
              {getTranslation(language, 'selectLanguage')}
            </Text>
            
            <TouchableOpacity 
              style={[styles.langSelectBtn, language === 'en' && (isDarkMode ? styles.langSelectBtnActiveDark : styles.langSelectBtnActive)]}
              onPress={() => {
                setLanguage('en');
                setIsLanguageModalVisible(false);
              }}
            >
              <Text style={[styles.langSelectText, isDarkMode && styles.darkCardTitle, language === 'en' && styles.langSelectTextActive]}>English</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.langSelectBtn, language === 'hi' && (isDarkMode ? styles.langSelectBtnActiveDark : styles.langSelectBtnActive)]}
              onPress={() => {
                setLanguage('hi');
                setIsLanguageModalVisible(false);
              }}
            >
              <Text style={[styles.langSelectText, isDarkMode && styles.darkCardTitle, language === 'hi' && styles.langSelectTextActive]}>हिन्दी (Hindi)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.langSelectBtn, language === 'mr' && (isDarkMode ? styles.langSelectBtnActiveDark : styles.langSelectBtnActive)]}
              onPress={() => {
                setLanguage('mr');
                setIsLanguageModalVisible(false);
              }}
            >
              <Text style={[styles.langSelectText, isDarkMode && styles.darkCardTitle, language === 'mr' && styles.langSelectTextActive]}>मराठी (Marathi)</Text>
            </TouchableOpacity>

            <View style={{ height: 16 }} />

            <TouchableOpacity 
              style={[styles.modalBtnCancel, isDarkMode && styles.darkModalBtnCancel, { width: '100%' }]} 
              onPress={() => setIsLanguageModalVisible(false)}
            >
              <Text style={[styles.modalBtnCancelText, isDarkMode && styles.darkModalBtnCancelText]}>
                {getTranslation(language, 'cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF9', // Beautiful off-white peach background
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    marginBottom: 10,
    marginTop:10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120, // To clear the bottom tab bar properly
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E8E',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginLeft: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    marginRight: 16,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#A0A0A0',
  },
   countSubtitle: {
    fontSize: 15,
    color: '#333333',
    fontWeight: 'bold',
  },
  cardSubtitleActive: {
    fontSize: 13,
    color: '#FF6B35',
    textDecorationLine: 'underline',
  },
  aboutCard: {
    alignItems: 'flex-start',
  },
  aboutTextContainer: {
    flex: 1,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 8,
  },
  aboutDescription: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
    marginBottom: 16,
  },
  aboutVersion: {
    fontSize: 12,
    color: '#B0B0B0',
  },
  logoutWrapper: {
    marginTop: 10,
    marginBottom: 40,
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    // paddingHorizontal: 24,
  },
  logoutText: {
    color: '#FF6B35', // Clean discreet gray for logout
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E0D6CB',
    borderRadius: 16,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
  },
  modalBtnSave: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
  },
  modalBtnCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalBtnSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // Dark Mode Styles
  darkContainer: {
    backgroundColor: '#000000',
  },
  darkHeaderTitle: {
    color: '#FFFFFF',
  },
  darkSectionTitle: {
    color: '#8E8E8E',
  },
  darkCardRow: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowOpacity: 0,
    elevation: 0,
  },
  darkCardTitle: {
    color: '#FFFFFF',
  },
  darkCardSubtitle: {
    color: '#8E8E8E',
  },
  darkCardSubtitleActive: {
    fontSize: 13,
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  darkAboutTitle: {
    color: '#FFFFFF',
  },
  darkAboutDescription: {
    color: '#CCCCCC',
  },
  darkAboutVersion: {
    color: '#8E8E8E',
  },
  darkCountSubtitle: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  darkLogoutText: {
    color: '#FFFFFF',
  },
  darkModalContent: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  darkModalTitle: {
    color: '#FFFFFF',
  },
  darkModalInput: {
    backgroundColor: '#000000',
    borderColor: '#FFFFFF',
    color: '#FFFFFF',
  },
  darkModalBtnCancel: {
    backgroundColor: '#333333',
  },
  darkModalBtnCancelText: {
    color: '#FFFFFF',
  },
  darkModalBtnSave: {
    backgroundColor: '#FFFFFF',
  },
  darkModalBtnSaveText: {
    color: '#000000',
  },
  langSelectBtn: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0D6CB',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  langSelectBtnActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF2E6',
  },
  langSelectBtnActiveDark: {
    borderColor: '#FFFFFF',
    backgroundColor: '#111111',
  },
  langSelectText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  langSelectTextActive: {
    fontWeight: 'bold',
    color: '#FF6B35',
  },
});
