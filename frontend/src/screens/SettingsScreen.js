import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView, Modal, TextInput, TouchableWithoutFeedback, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { requestNotificationPermissions, scheduleDailyReminder, cancelAllReminders } from '../utils/notifications';
import { getTranslation } from '../utils/translations';
import { getTheme } from '../utils/themes';
import { syncOfflineCounter } from '../api/client';

export default function SettingsScreen() {
  const { 
    logout, 
    resetCount,
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
    setThemeId,
    email
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

  const handleLogoutPress = () => {
    const { unsyncedTaps } = useStore.getState();
    
    const performLogout = async () => {
      await logout();
    };

    const performSyncAndLogout = async () => {
      if (unsyncedTaps > 0) {
        try {
          await syncOfflineCounter();
        } catch (e) {
          console.log("Failed to sync during logout", e.message);
        }
      }
      
      const updatedState = useStore.getState();
      if (updatedState.unsyncedTaps > 0) {
        Alert.alert(
          language === 'hi' ? 'असिंक्रनाइज़्ड गिनती' : language === 'mr' ? 'असिंक्रोनाइझ्ड संख्या' : 'Unsynced Counts',
          language === 'hi'
            ? `सिंक विफल रहा। ${email ? `(${email}) ` : ''}लॉगआउट करने पर ये गिनती स्थायी रूप से मिट जाएंगी। क्या आप अभी भी लॉगआउट करना चाहते हैं?`
            : language === 'mr'
            ? `सिंक अपयशी ठरला. ${email ? `(${email}) ` : ''}लॉगआउट केल्यास या संख्या कायमच्या नष्ट होतील. तुम्हाला अजूनही लॉगआउट करायचे आहे का?`
            : `Sync failed. Logging out now will permanently delete unsynced counts for ${email ? email : 'this account'} from this device. Do you still want to log out?`,
          [
            { text: getTranslation(language, 'cancel'), style: 'cancel' },
            { 
              text: language === 'hi' ? 'हाँ, लॉगआउट करें' : language === 'mr' ? 'होय, लॉगआउट करा' : 'Yes, Log Out', 
              style: 'destructive', 
              onPress: performLogout 
            }
          ]
        );
      } else {
        await performLogout();
      }
    };

    Alert.alert(
      getTranslation(language, 'logout'),
      (language === 'hi' 
        ? 'क्या आप वाकई लॉगआउट करना चाहते हैं?' 
        : language === 'mr' 
        ? 'तुम्हाला नक्की लॉगआउट करायचे आहे का?' 
        : 'Are you sure you want to log out?') + 
      (email ? `\n(${email})` : ''),
      [
        { text: getTranslation(language, 'cancel'), style: 'cancel' },
        { 
          text: getTranslation(language, 'logout'), 
          style: 'destructive',
          onPress: performSyncAndLogout
        }
      ]
    );
  };

  const handleResetCount = () => {
    Alert.alert(
      language === 'hi' ? 'गिनती रीसेट करें' : language === 'mr' ? 'संख्या रीसेट करा' : 'Reset Count',
      language === 'hi' 
        ? 'क्या आप वाकई अपनी कुल जाप संख्या को रीसेट करना चाहते हैं? इसे वापस नहीं लिया जा सकता।' 
        : language === 'mr' 
        ? 'तुम्हाला नक्की तुमची एकूण जाप संख्या रीसेट करायची आहे का? हे पूर्ववत केले जाऊ शकत नाही.' 
        : 'Are you sure you want to reset your total count? This action cannot be undone.',
      [
        { text: getTranslation(language, 'cancel'), style: 'cancel' },
        {
          text: language === 'hi' ? 'रीसेट करें' : language === 'mr' ? 'रीसेट करा' : 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetCount();
              Alert.alert(
                getTranslation(language, 'success'),
                language === 'hi' ? 'गिनती सफलतापूर्वक रीसेट कर दी गई है।' : language === 'mr' ? 'संख्या यशस्वीरित्या रीसेट केली आहे.' : 'Count reset successfully.'
              );
            } catch (error) {
              Alert.alert(getTranslation(language, 'error'), error.message);
            }
          }
        }
      ]
    );
  };

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

  const getFormattedPreview = (timeStr) => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeStr)) {
      const parts = timeStr.split(':');
      const hoursInt = parseInt(parts[0], 10);
      if (!isNaN(hoursInt) && hoursInt >= 0 && hoursInt <= 23) {
        const ampm = hoursInt >= 12 ? 'PM' : 'AM';
        const displayHours = hoursInt % 12 === 0 ? 12 : hoursInt % 12;
        if (parts[1] && parts[1].length > 0) {
          const minsInt = parseInt(parts[1], 10);
          if (!isNaN(minsInt) && minsInt >= 0 && minsInt <= 59) {
            const displayMins = parts[1].padStart(2, '0');
            return `${displayHours}:${displayMins} ${ampm}`;
          }
        }
        return `${displayHours}:00 ${ampm}`;
      }
      return null;
    }
    const [hours, minutes] = timeStr.split(':');
    const hoursInt = parseInt(hours, 10);
    const ampm = hoursInt >= 12 ? 'PM' : 'AM';
    const displayHours = hoursInt % 12 === 0 ? 12 : hoursInt % 12;
    return `${displayHours}:${minutes} ${ampm}`;
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

        {/* RESET COUNT BUTTON */}
        <TouchableOpacity 
          style={[styles.cardRow, { backgroundColor: theme.card, borderColor: theme.border, justifyContent: 'center', paddingVertical: 14, marginBottom: 12 }]} 
          onPress={handleResetCount}
        >
          <Ionicons name="refresh-outline" size={20} color={theme.accent} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutText, { color: theme.accent }]}>
            {language === 'hi' ? 'गिनती रीसेट करें' : language === 'mr' ? 'संख्या रीसेट करा' : 'Reset Count'}
          </Text>
        </TouchableOpacity>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity 
          style={[styles.cardRow, { backgroundColor: theme.card, borderColor: theme.border, justifyContent: 'center', paddingVertical: 14 }]} 
          onPress={handleLogoutPress}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.accent} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutText, { color: theme.accent }]}>
            {getTranslation(language, 'logout')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={isGoalModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsGoalModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsGoalModalVisible(false)}
        >
          <TouchableWithoutFeedback>
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
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={isTimeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsTimeModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsTimeModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
              <Text style={[styles.modalTitle, { color: theme.primaryText }]}>
                {getTranslation(language, 'setReminderTime')}
              </Text>
              <Text style={{ color: theme.secondaryText, marginBottom: 16, fontSize: 13 }}>
                {getTranslation(language, 'enterTimeFormat')}
              </Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.primaryText, marginBottom: 12 }]}
                value={tempTime}
                onChangeText={setTempTime}
                keyboardType="numbers-and-punctuation"
                placeholder="e.g. 08:00"
                placeholderTextColor={theme.secondaryText}
                maxLength={5}
              />
              {getFormattedPreview(tempTime) && (
                <Text style={{ color: theme.accent, fontSize: 14, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
                  {language === 'hi' ? 'यानी: ' : language === 'mr' ? 'म्हणजे: ' : 'Equivalent to: '}{getFormattedPreview(tempTime)}
                </Text>
              )}
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
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={isLanguageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsLanguageModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsLanguageModalVisible(false)}
        >
          <TouchableWithoutFeedback>
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
                style={{
                  width: '100%',
                  paddingVertical: 12,
                  alignItems: 'center',
                  borderRadius: 16,
                  backgroundColor: theme.id === 'darkTemple' ? '#333333' : '#F0F0F0'
                }} 
                onPress={() => setIsLanguageModalVisible(false)}
              >
                <Text style={[styles.modalBtnCancelText, { color: theme.primaryText }]}>
                  {getTranslation(language, 'close')}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
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
    paddingTop: 12,
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
