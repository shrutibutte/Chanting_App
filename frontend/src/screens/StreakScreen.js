import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useStore } from '../store/useStore';
import { getLocalDateString } from '../utils/date.js';
import { getTranslation } from '../utils/translations';
import { getTheme } from '../utils/themes';

export default function StreakScreen({onExit}) {
  const { historyRecords, todayCount, language, themeId } = useStore();
  const theme = getTheme(themeId);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  const { groupedByDate, currentStreak, bestStreak, weekTicks } = useMemo(() => {
    const grouped = {};
    historyRecords.forEach(r => {
      grouped[r.date] = (grouped[r.date] || 0) + r.count;
    });

    const today = new Date();
    const todayStr = getLocalDateString(today);
    grouped[todayStr] = todayCount;

    // Calculate Best Streak
    let best = 0;
    let tempStreak = 0;
    
    // Sort all dates we have
    const allDates = Object.keys(grouped).filter(d => grouped[d] > 0).sort();
    
    if (allDates.length > 0) {
      tempStreak = 1;
      best = 1;
      for (let i = 1; i < allDates.length; i++) {
        const prev = new Date(allDates[i-1]);
        const curr = new Date(allDates[i]);
        
        // Difference in days
        const diffTime = Math.abs(curr - prev);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays === 1) {
          tempStreak++;
          if (tempStreak > best) best = tempStreak;
        } else {
          tempStreak = 1; // reset
        }
      }
    }

    // Calculate Current Streak
    let streak = 0;
    let checkDate = new Date();
    let cDateStr = getLocalDateString(checkDate);
    
    // If today is 0, start checking yesterday
    if (!grouped[cDateStr] || grouped[cDateStr] === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
      cDateStr = getLocalDateString(checkDate);
    }
    
    while (grouped[cDateStr] > 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
      cDateStr = getLocalDateString(checkDate);
    }

    if (streak > best) best = streak;

    // Calculate This Week (Mon to Sun)
    // Get Monday of current week
    const currentDay = today.getDay(); // 0 = Sun, 1 = Mon ...
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const mondayDate = new Date(today);
    mondayDate.setDate(today.getDate() + diffToMonday);
    
    const weekArr = [];
    const dayNames = [
      getTranslation(language, 'mon'),
      getTranslation(language, 'tue'),
      getTranslation(language, 'wed'),
      getTranslation(language, 'thu'),
      getTranslation(language, 'fri'),
      getTranslation(language, 'sat'),
      getTranslation(language, 'sun')
    ];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + i);
      const dateStr = getLocalDateString(d);
      
      weekArr.push({
        label: dayNames[i],
        active: (grouped[dateStr] || 0) > 0,
        isFuture: d > today // To gray out future days differently if needed
      });
    }

    return { 
      groupedByDate: grouped, 
      currentStreak: streak, 
      bestStreak: best,
      weekTicks: weekArr
    };
  }, [historyRecords, todayCount]);

  // Calendar Logic
  const generateCalendarDays = () => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    
    // 0 = Sunday, 1 = Monday
    const firstDayOfMonth = new Date(year, month, 1).getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Fill empty slots for first row
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      // Create local date string YYYY-MM-DD
      const d = new Date(year, month, i);
      const dateStr = getLocalDateString(d);
      
      days.push({
        dayNumber: i,
        dateStr: dateStr,
        active: (groupedByDate[dateStr] || 0) > 0
      });
    }
    return days;
  };

  const nextMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.setMonth(currentMonthDate.getMonth() + 1)));
  };

  const prevMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.setMonth(currentMonthDate.getMonth() - 1)));
  };

  const locale = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-US';
  const monthName = currentMonthDate.toLocaleString(locale, { month: 'long', year: 'numeric' });
  const calDays = generateCalendarDays();
  const dayHeaders = [
    getTranslation(language, 'sun'),
    getTranslation(language, 'mon'),
    getTranslation(language, 'tue'),
    getTranslation(language, 'wed'),
    getTranslation(language, 'thu'),
    getTranslation(language, 'fri'),
    getTranslation(language, 'sat')
  ];
 const handleExit = () => {
    // Trigger batch sync immediately upon exiting the counter screen
    onExit();
  };
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        {/* back button  */}
        <TouchableOpacity style={[styles.exitButton, { borderColor: theme.accent, backgroundColor: theme.card }]} onPress={handleExit}>
          <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 14L4 9l5-5" />
            <Path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
          </Svg>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>{getTranslation(language, 'streak')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Streak Row */}
        <View style={styles.streakRow}>
          {/* Current Streak Card */}
          <View style={[styles.streakBox, { backgroundColor: theme.accent, marginRight: 6 }]}>
            <View style={styles.streakBoxHeader}>
              <Text style={styles.flameIcon}>🔥</Text>
              <Text style={[styles.currentStreakTitle, { color: '#FFFFFF' }]}>{getTranslation(language, 'current')}</Text>
            </View>
            <Text style={[styles.currentStreakNumber, { color: '#FFFFFF' }]}>{currentStreak}</Text>
            <Text style={[styles.currentStreakDays, { color: 'rgba(255,255,255,0.7)' }]}>{getTranslation(language, 'days')}</Text>
          </View>

          {/* Best Streak Card */}
          <View style={[styles.streakBox, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, marginLeft: 6 }]}>
            <View style={styles.streakBoxHeader}>
              <Text style={styles.trophyIcon}>🏆</Text>
              <Text style={[styles.bestStreakTitle, { color: theme.secondaryText }]}>{getTranslation(language, 'best')}</Text>
            </View>
            <Text style={[styles.bestStreakNumber, { color: theme.primaryText }]}>{bestStreak}</Text>
            <Text style={[styles.bestStreakDays, { color: theme.secondaryText }]}>{getTranslation(language, 'days')}</Text>
          </View>
        </View>

        {/* This Week Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
          <Text style={[styles.cardHeader, { color: theme.primaryText }]}>🔥 {getTranslation(language, 'thisWeek')}</Text>

          <View style={styles.ticksContainer}>
            {weekTicks.map((tick, index) => (
              <View key={index} style={styles.tickCol}>
                <Text style={[styles.tickLabel, { color: theme.secondaryText }]}>{tick.label}</Text>
                <View style={[
                  styles.tickCircle, 
                  tick.active 
                    ? { backgroundColor: theme.accent } 
                    : { backgroundColor: theme.id === 'darkTemple' ? '#111111' : '#F7F7F7', borderColor: theme.border, borderWidth: theme.id === 'darkTemple' ? 1 : 0 }
                ]}>
                  {tick.active ? (
                    <Text style={[styles.tickCheck, { color: '#FFFFFF' }]}>✓</Text>
                  ) : (
                    <Text style={[styles.tickClock, { color: theme.id === 'darkTemple' ? '#555555' : '#D0D0D0' }]}>◷</Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Motivational Footer */}
          <View style={[styles.motivationalBox, { backgroundColor: theme.id === 'darkTemple' ? '#111111' : '#FFF2E6', borderColor: theme.id === 'darkTemple' ? '#222222' : '#FFE6D3' }]}>
            <Text style={[styles.motivationalText, { color: theme.accent }]}>🔥 {getTranslation(language, 'keepStreak')} 🔥</Text>
          </View>
        </View>

        {/* Calendar Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={prevMonth} style={[styles.navButton, { backgroundColor: theme.id === 'darkTemple' ? '#222222' : '#F0EBE5' }]}>
              <Text style={[styles.navButtonText, { color: theme.primaryText }]}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={[styles.calendarTitle, { color: theme.primaryText }]}>{monthName}</Text>
            <TouchableOpacity onPress={nextMonth} style={[styles.navButton, { backgroundColor: theme.id === 'darkTemple' ? '#222222' : '#F0EBE5' }]}>
              <Text style={[styles.navButtonText, { color: theme.primaryText }]}>{'>'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.calendarGrid}>
            {/* Days of week */}
            {dayHeaders.map((day, idx) => (
              <View key={idx} style={styles.calHeaderCell}>
                <Text style={[styles.calHeaderText, { color: theme.secondaryText }]}>{day}</Text>
              </View>
            ))}
            
            {/* Calendar Days */}
            {calDays.map((dayObj, idx) => (
              <View key={idx} style={styles.calDayCell}>
                {dayObj ? (
                  <View style={[
                    styles.calDayCircle, 
                    dayObj.active 
                      ? { backgroundColor: theme.accent }
                      : null
                  ]}>
                    <Text style={[
                      styles.calDayText, 
                      { color: dayObj.active ? '#FFFFFF' : theme.primaryText },
                      dayObj.active && { fontWeight: 'bold' }
                    ]}>
                      {dayObj.dayNumber}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 10,
    marginTop: 10,
    position: 'relative',
  },
  exitButton: {
    position: 'absolute',
    left: 20,
    top: 38,
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
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333', 
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  streakBox: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  currentStreakBox: {
    backgroundColor: '#FF6B35',
    marginRight: 6,
  },
  bestStreakBox: {
    backgroundColor: '#FFFFFF',
    marginLeft: 6,
  },
  streakBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  flameIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  trophyIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  currentStreakTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
  },
  bestStreakTitle: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  currentStreakNumber: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: 'bold',
    lineHeight: 46,
  },
  bestStreakNumber: {
    color: '#333333',
    fontSize: 42,
    fontWeight: 'bold',
    lineHeight: 46,
  },
  currentStreakDays: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  bestStreakDays: {
    color: '#999',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  ticksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  tickCol: {
    alignItems: 'center',
  },
  tickLabel: {
    color: '#8E8E8E',
    fontSize: 12,
    marginBottom: 4,
  },
  tickCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickActive: {
    backgroundColor: '#FF6B35',
  },
  tickInactive: {
    backgroundColor: '#F7F7F7',
  },
  tickCheck: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tickClock: {
    color: '#D0D0D0',
    fontSize: 14,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#F0EBE5',
    borderRadius: 8,
  },
  navButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calHeaderCell: {
    width: '14.28%',
    alignItems: 'center',
    marginBottom: 6,
  },
  calHeaderText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
  },
  calDayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  calDayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayActive: {
    backgroundColor: '#FF6B35',
  },
  calDayText: {
    color: '#333',
    fontSize: 14,
  },
  calDayTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  motivationalBox: {
    backgroundColor: '#FFF2E6',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#FFE6D3',
  },
  motivationalText: {
    color: '#FF6B35',
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  // Dark Mode Styles
  darkContainer: {
    backgroundColor: '#000000',
  },
  darkExitButton: {
    borderColor: '#FFFFFF',
    backgroundColor: '#000000',
  },
  darkHeaderTitle: {
    color: '#FFFFFF',
  },
  darkCurrentStreakBox: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  darkBestStreakBox: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  darkStreakTitle: {
    color: '#FFFFFF',
  },
  darkBestStreakTitle: {
    color: '#FFFFFF',
  },
  darkStreakNumber: {
    color: '#FFFFFF',
  },
  darkBestStreakNumber: {
    color: '#FFFFFF',
  },
  darkStreakDays: {
    color: '#8E8E8E',
  },
  darkBestStreakDays: {
    color: '#8E8E8E',
  },
  darkCard: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  darkCardHeader: {
    color: '#FFFFFF',
  },
  darkTickLabel: {
    color: '#8E8E8E',
  },
  darkTickActive: {
    backgroundColor: '#FFFFFF',
  },
  darkTickInactive: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#333333',
  },
  darkTickCheck: {
    color: '#000000',
  },
  darkTickClock: {
    color: '#666666',
  },
  darkMotivationalBox: {
    backgroundColor: '#000000',
    borderColor: '#FFFFFF',
  },
  darkMotivationalText: {
    color: '#FFFFFF',
  },
  darkNavButton: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  darkNavButtonText: {
    color: '#FFFFFF',
  },
  darkCalendarTitle: {
    color: '#FFFFFF',
  },
  darkCalHeaderText: {
    color: '#8E8E8E',
  },
  darkCalDayActive: {
    backgroundColor: '#FFFFFF',
  },
  darkCalDayText: {
    color: '#FFFFFF',
  },
  darkCalDayTextActive: {
    color: '#000000',
    fontWeight: 'bold',
  },
});
