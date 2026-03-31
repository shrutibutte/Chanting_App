import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Switch, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useStore } from '../store/useStore';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { 
    logout, 
    isReminderEnabled, 
    reminderTime, 
    setReminderSettings,
    dailyGoal,
    totalCount
  } = useStore();

  const [localTime, setLocalTime] = useState(() => {
    const timeToSplit = reminderTime || "08:00";
    const [hours, minutes] = timeToSplit.split(':');
    const d = new Date();
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return d;
  });

  const handleToggleReminder = (enabled) => {
    setReminderSettings(enabled, reminderTime);
    if (enabled) {
      Alert.alert(
        'Reminder On', 
        `Daily Reminder set to ${formatDisplayTime(localTime)}. (Running in Expo Go simulated mode)`
      );
    }
  };

  const handlePressTime = () => {
    Alert.alert(
      'Custom Dev Client Required',
      'The custom native time picker will be available automatically once you compile the native Android app using EAS! Defaulting to 8:00 AM for now.'
    );
  };

  const formatDisplayTime = (dateObj) => {
    let hours = dateObj.getHours();
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* JAAP SETTINGS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>JAAP SETTINGS</Text>
          <TouchableOpacity style={styles.cardRow} activeOpacity={0.7} onPress={() => Alert.alert('Coming Soon', 'Custom goal editing coming soon!')}>
            <View style={styles.iconContainer}>
               <Feather name="flag" size={20} color="#FF6B35" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Daily Goal</Text>
              <Text style={styles.cardSubtitle}>{dailyGoal || 108} counts</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#A0A0A0" />
          </TouchableOpacity>
        </View>

        {/* REMINDERS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>REMINDERS</Text>
          <View style={styles.cardRow}>
            <View style={styles.iconContainer}>
              <Feather name="bell" size={20} color="#FF6B35" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Daily Reminder</Text>
              
              <TouchableOpacity onPress={handlePressTime}>
                 <Text style={isReminderEnabled ? styles.cardSubtitleActive : styles.cardSubtitle}>
                   Get notified at {formatDisplayTime(localTime)}
                 </Text>
              </TouchableOpacity>
            </View>
            <Switch
              trackColor={{ false: '#F0F0F0', true: '#FFDDC8' }}
              thumbColor={isReminderEnabled ? '#00BFA5' : '#FFFFFF'}
              ios_backgroundColor="#F0F0F0"
              onValueChange={handleToggleReminder}
              value={isReminderEnabled}
              style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
            />
          </View>
        </View> 

          {/*  Count*/}
          <View style={styles.section}>
          <Text style={styles.sectionTitle}>Count</Text>
          <View style={styles.cardRow}>
            <View style={styles.aboutTextContainer}>
              <Text style={styles.aboutTitle}>Total Jaap</Text>
              <Text style={styles.countSubtitle}>
                {totalCount}
              </Text>
            </View>
          </View>
        </View>

        {/* ABOUT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <View style={[styles.cardRow, styles.aboutCard]}>
            <View style={styles.aboutTextContainer}>
              <Text style={styles.aboutTitle}>Naam Jaap</Text>
              <Text style={styles.aboutDescription}>
                A spiritual app for Hindu devotional chanting. 
                Track your jaap, maintain streaks, and deepen your spiritual practice.
              </Text>
              <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            </View>
          </View>
        </View>

    
        {/* LOGOUT BUTTON */}
        
        <View style={styles.cardRow}>
           <TouchableOpacity style={styles.logoutButton} onPress={logout}>
             <Ionicons name="log-out-outline" size={20} color="#FF6B35" style={{ marginRight: 8 }} />
             <Text style={styles.logoutText}>Logout</Text>
           </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0', // Beautiful off-white peach background
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
    color: '#FF6B35', // Match the image orange
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
    fontSize: 13,
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
});
