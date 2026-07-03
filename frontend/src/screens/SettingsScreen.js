import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Switch, TouchableOpacity, Alert, ScrollView, Modal, TextInput } from 'react-native';
import { useStore } from '../store/useStore';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { requestNotificationPermissions, scheduleDailyReminder, cancelAllReminders } from '../utils/notifications';
import { getTranslation } from '../utils/translations';
import { getTheme } from '../utils/themes';

export default function SettingsScreen() {
  const { 
    logout, 
    isReminderEnabled, 
    reminderTime, 
    setReminderSettings,
    goals,
    setGoals,
    autoCalculateGoals,
    setAutoCalculateGoals,
    totalCount,
    language,
    setLanguage,
    themeId,
    setThemeId
  } = useStore();

  const theme = getTheme(themeId);

  const [localTime, setLocalTime] = useState(() => {
    const timeToSplit = reminderTime || "08:00";
    const [hours, minutes] = timeToSplit.split(':');
    const d = new Date();
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return d;
  });

  // Goal modal settings
  const [isGoalModalVisible, setIsGoalModalVisible] = useState(false);
  const [activeGoalKey, setActiveGoalKey] = useState('daily'); // 'daily' | 'weekly' | 'monthly' | 'yearly'
  const [tempGoalText, setTempGoalText] = useState('');
  
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

  const handleOpenGoalModal = (goalKey) => {
    setActiveGoalKey(goalKey);
    setTempGoalText(goals[goalKey]?.toString() || '108');
    setIsGoalModalVisible(true);
  };

  const handleSaveGoal = () => {
    const goalNum = parseInt(tempGoalText, 10);
    if (!isNaN(goalNum) && goalNum > 0) {
      const newGoals = {};
      newGoals[activeGoalKey] = goalNum;

      if (activeGoalKey === 'daily') {
        newGoals.weekly = goalNum * 7;
        newGoals.monthly = goalNum * 30;
        newGoals.yearly = goalNum * 365;
      }

      setGoals(newGoals);
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

  const getGoalTitle = (key) => {
    switch (key) {
      case 'weekly':
        return language === 'hi' ? 'साप्ताहिक लक्ष्य' : 'Weekly Goal';
      case 'monthly':
        return language === 'hi' ? 'मासिक लक्ष्य' : 'Monthly Goal';
      case 'yearly':
        return language === 'hi' ? 'वार्षिक लक्ष्य' : 'Yearly Goal';
      default:
        return getTranslation(language, 'dailyGoal');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>
          {getTranslation(language, 'settings')}
        </Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >


        {/* JAAP GOAL SETTINGS */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            {getTranslation(language, 'jaapSettings')}
          </Text>

          {/* Daily Goal row */}
          <TouchableOpacity 
            style={[styles.cardRow, { backgroundColor: theme.card, borderColor: theme.border }]} 
            activeOpacity={0.7} 
            onPress={() => handleOpenGoalModal('daily')}
          >
            <View style={styles.iconContainer}>
               <Feather name="flag" size={20} color={theme.accent} />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardTitle, { color: theme.primaryText }]}>
                {getGoalTitle('daily')}
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.secondaryText }]}>
                {goals.daily} {getTranslation(language, 'counts')}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.accent} />
          </TouchableOpacity>


        </View>

        {/* REMINDERS */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            {getTranslation(language, 'reminders')}
          </Text>
          <View style={[styles.cardRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.iconContainer}>
              <Feather name="bell" size={20} color={theme.accent} />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardTitle, { color: theme.primaryText }]}>
                {getTranslation(language, 'dailyReminder')}
              </Text>
              
              <TouchableOpacity onPress={handlePressTime}>
                 <Text style={[styles.cardSubtitleActive, { color: isReminderEnabled ? theme.accent : theme.secondaryText }]}>
                   {getTranslation(language, 'reminderSetTo', { time: formatDisplayTime(localTime) })}
                 </Text>
              </TouchableOpacity>
            </View>
            <Switch
              trackColor={{ false: theme.border, true: theme.id === 'darkTemple' ? '#333' : '#FFDDC8' }}
              thumbColor={isReminderEnabled ? theme.accent : '#F5F5F5'}
              onValueChange={handleToggleReminder}
              value={isReminderEnabled}
            />
          </View>
        </View> 

        {/* LANGUAGE */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            {getTranslation(language, 'language')}
          </Text>
          <TouchableOpacity 
            style={[styles.cardRow, { backgroundColor: theme.card, borderColor: theme.border }]} 
            activeOpacity={0.7} 
            onPress={() => setIsLanguageModalVisible(true)}
          >
            <View style={styles.iconContainer}>
               <Ionicons name="globe-outline" size={20} color={theme.accent} />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardTitle, { color: theme.primaryText }]}>
                {getTranslation(language, 'languageOption')}
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.secondaryText }]}>
                {language === 'hi' ? 'हिन्दी (Hindi)' : language === 'mr' ? 'मराठी (Marathi)' : 'English'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.accent} />
          </TouchableOpacity>
        </View>

        {/* Total lifetime count */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            {getTranslation(language, 'Total Jaap')}
          </Text>
          <View style={[styles.cardRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.aboutTextContainer}>
              <Text style={[styles.countSubtitle, { color: theme.primaryText }]}>
                {totalCount.toLocaleString()} {language === 'hi' ? 'जाप' : 'chants'}
              </Text>
            </View>
          </View>
        </View>

        {/* ABOUT */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            {getTranslation(language, 'about')}
          </Text>
          <View style={[styles.cardRow, styles.aboutCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.aboutTextContainer}>
              <Text style={[styles.aboutTitle, { color: theme.accent }]}>
                {getTranslation(language, 'appName')}
              </Text>
              <Text style={[styles.aboutDescription, { color: theme.primaryText }]}>
                {getTranslation(language, 'naamJaapDesc')}
              </Text>
              <Text style={[styles.aboutVersion, { color: theme.secondaryText }]}>
                {getTranslation(language, 'version')} 1.0.0
              </Text>
            </View>
          </View>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={[styles.cardRow, { backgroundColor: theme.card, borderColor: theme.border, justifyContent: 'center', paddingVertical: 14 }]} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={theme.accent} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutText, { color: theme.accent }]}>
            {getTranslation(language, 'logout')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Goal Edit Modal */}
      <Modal
        visible={isGoalModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsGoalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={[styles.modalTitle, { color: theme.primaryText }]}>
              {getGoalTitle(activeGoalKey)}
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.primaryText }]}
              value={tempGoalText}
              onChangeText={setTempGoalText}
              keyboardType="numeric"
              placeholder={getTranslation(language, 'enterTargetNumber')}
              placeholderTextColor={theme.secondaryText}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtnCancel, { backgroundColor: theme.id === 'darkTemple' ? '#333333' : '#F0F0F0' }]} onPress={() => setIsGoalModalVisible(false)}>
                <Text style={[styles.modalBtnCancelText, { color: theme.primaryText }]}>
                  {getTranslation(language, 'cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnSave, { backgroundColor: theme.accent }]} onPress={handleSaveGoal}>
                <Text style={styles.modalBtnSaveText}>
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
        onRequestClose={() => setIsTimeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={[styles.modalTitle, { color: theme.primaryText }]}>
              {getTranslation(language, 'setReminderTime')}
            </Text>
            <Text style={{ color: theme.secondaryText, marginBottom: 16, fontSize: 13 }}>
              {getTranslation(language, 'enterTimeFormat')}
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.primaryText }]}
              value={tempTime}
              onChangeText={setTempTime}
              keyboardType="numbers-and-punctuation"
              placeholder="e.g. 08:00"
              placeholderTextColor={theme.secondaryText}
              maxLength={5}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtnCancel, { backgroundColor: theme.id === 'darkTemple' ? '#333333' : '#F0F0F0' }]} onPress={() => setIsTimeModalVisible(false)}>
                <Text style={[styles.modalBtnCancelText, { color: theme.primaryText }]}>
                  {getTranslation(language, 'cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnSave, { backgroundColor: theme.accent }]} onPress={handleSaveTime}>
                <Text style={styles.modalBtnSaveText}>
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
        onRequestClose={() => setIsLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={[styles.modalTitle, { color: theme.primaryText }]}>
              {getTranslation(language, 'selectLanguage')}
            </Text>
            
            <TouchableOpacity 
              style={[
                styles.langSelectBtn, 
                { backgroundColor: theme.card, borderColor: theme.border },
                language === 'en' && { borderColor: theme.accent, backgroundColor: theme.id === 'darkTemple' ? '#111111' : '#FFF2E6' }
              ]}
              onPress={() => {
                setLanguage('en');
                setIsLanguageModalVisible(false);
              }}
            >
              <Text style={[styles.langSelectText, { color: theme.primaryText }, language === 'en' && { color: theme.accent, fontWeight: 'bold' }]}>English</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.langSelectBtn, 
                { backgroundColor: theme.card, borderColor: theme.border },
                language === 'hi' && { borderColor: theme.accent, backgroundColor: theme.id === 'darkTemple' ? '#111111' : '#FFF2E6' }
              ]}
              onPress={() => {
                setLanguage('hi');
                setIsLanguageModalVisible(false);
              }}
            >
              <Text style={[styles.langSelectText, { color: theme.primaryText }, language === 'hi' && { color: theme.accent, fontWeight: 'bold' }]}>हिन्दी (Hindi)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.langSelectBtn, 
                { backgroundColor: theme.card, borderColor: theme.border },
                language === 'mr' && { borderColor: theme.accent, backgroundColor: theme.id === 'darkTemple' ? '#111111' : '#FFF2E6' }
              ]}
              onPress={() => {
                setLanguage('mr');
                setIsLanguageModalVisible(false);
              }}
            >
              <Text style={[styles.langSelectText, { color: theme.primaryText }, language === 'mr' && { color: theme.accent, fontWeight: 'bold' }]}>मराठी (Marathi)</Text>
            </TouchableOpacity>

            <View style={{ height: 16 }} />

            <TouchableOpacity 
              style={[styles.modalBtnCancel, { backgroundColor: theme.id === 'darkTemple' ? '#333333' : '#F0F0F0', width: '100%' }]} 
              onPress={() => setIsLanguageModalVisible(false)}
            >
              <Text style={[styles.modalBtnCancelText, { color: theme.primaryText }]}>
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
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    marginBottom: 10,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginLeft: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
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
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
  },
  countSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardSubtitleActive: {
    fontSize: 13,
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
    marginBottom: 8,
  },
  aboutDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  aboutVersion: {
    fontSize: 12,
  },
  logoutText: {
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
    borderRadius: 24,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
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
  },
  modalBtnSave: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 16,
  },
  modalBtnCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalBtnSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  langSelectBtn: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 10,
  },
  langSelectText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Theme Horizontal Selector Styles
  themePreviewCard: {
    width: 130,
    height: 70,
    borderRadius: 16,
    padding: 10,
    marginRight: 10,
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  themeAccentDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignSelf: 'flex-end',
  },
  themePreviewName: {
    fontSize: 12,
    fontWeight: 'bold',
  }
});
