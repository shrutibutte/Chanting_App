import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { LineChart } from 'react-native-chart-kit';
import { getLocalDateString } from '../utils/date.js';
import { getTranslation } from '../utils/translations';
import { getTheme } from '../utils/themes';
import { getWeekKey, getMonthKey, getYearKey, getWeeklyChants, getMonthlyChants, getYearlyChants } from '../utils/goals.js';

const screenWidth = Dimensions.get('window').width;

// Helper to determine heat colors based on active theme
function getIntensityColor(count, dailyGoal, theme) {
  if (count <= 0) {
    return theme.intensityLevels?.none || '#E2E8F0';
  }
  const ratio = count / dailyGoal;
  if (ratio < 0.25) {
    return theme.intensityLevels?.low || '#FFD4C2';
  }
  if (ratio < 0.50) {
    return theme.intensityLevels?.medium || '#FFA685';
  }
  if (ratio < 1.0) {
    return theme.intensityLevels?.high || '#FF885C';
  }
  return theme.intensityLevels?.completed || theme.accent;
}

function getStreakOnDay(dateStr, grouped) {
  let streak = 0;
  let checkDate = new Date(dateStr + 'T00:00:00');
  let cStr = getLocalDateString(checkDate);

  while (grouped[cStr] > 0) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
    cStr = getLocalDateString(checkDate);
  }
  return streak;
}

export default function ProgressScreen() {
  const { historyRecords, todayCount, dailyGoal, themeId, language, goals } = useStore();
  const theme = getTheme(themeId);

  const fallbackGoals = useMemo(() => {
    const d = goals?.daily || dailyGoal || 108;
    return {
      daily: d,
      weekly: goals?.weekly || d * 7,
      monthly: goals?.monthly || d * 30,
      yearly: goals?.yearly || d * 365
    };
  }, [goals, dailyGoal]);

  const [timeRange, setTimeRange] = useState('weekly'); // 'weekly', 'monthly', 'yearly'
  const [offset, setOffset] = useState(0);
  const [activeView, setActiveView] = useState('chart'); // 'chart', 'calendar', 'history'
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);

  // Day detail modal state
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [isDayModalVisible, setIsDayModalVisible] = useState(false);

  useEffect(() => {
    setSelectedIdx(null);
    setSelectedPoint(null);
  }, [timeRange, offset]);

  // Aggregate counts by date
  const groupedByDate = useMemo(() => {
    const grouped = {};
    historyRecords.forEach(r => {
      grouped[r.date] = (grouped[r.date] || 0) + r.count;
    });
    const todayStr = getLocalDateString(new Date());
    grouped[todayStr] = todayCount;
    return grouped;
  }, [historyRecords, todayCount]);

  // Reset navigation when switching tabs to ensure clean state
  useEffect(() => {
    if (activeView === 'calendar') {
      setTimeRange('monthly');
      setOffset(0);
    }
  }, [activeView]);

  // Calendar Heatmap calculations
  const calendarCells = useMemo(() => {
    if (activeView !== 'calendar') return [];

    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const leadingEmptyCells = firstWeekday === 0 ? 6 : firstWeekday - 1;

    const cells = [];
    for (let i = 0; i < leadingEmptyCells; i++) {
      cells.push({ isEmpty: true, key: `empty-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateStr = getLocalDateString(d);
      const count = groupedByDate[dateStr] || 0;
      cells.push({
        isEmpty: false,
        key: dateStr,
        date: d,
        dateStr,
        count,
        dayNum: day
      });
    }
    return cells;
  }, [activeView, offset, groupedByDate]);

  // Split calendar cells into weeks (rows of 7 days)
  const calendarWeeks = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < calendarCells.length; i += 7) {
      weeks.push(calendarCells.slice(i, i + 7));
    }
    return weeks;
  }, [calendarCells]);

  // Comprehensive Statistics Calculations
  const stats = useMemo(() => {
    const datesWithChants = Object.keys(groupedByDate).filter(d => groupedByDate[d] > 0).sort();

    let totalAllTime = 0;
    let bestDayCount = 0;
    let bestDayStr = 'N/A';

    datesWithChants.forEach(d => {
      const count = groupedByDate[d];
      totalAllTime += count;
      if (count > bestDayCount) {
        bestDayCount = count;
        bestDayStr = d;
      }
    });

    // Best Streak (Consecutive days)
    let bestStreak = 0;
    let tempStreak = 0;

    if (datesWithChants.length > 0) {
      tempStreak = 1;
      bestStreak = 1;
      for (let i = 1; i < datesWithChants.length; i++) {
        const prev = new Date(datesWithChants[i - 1] + 'T00:00:00');
        const curr = new Date(datesWithChants[i] + 'T00:00:00');
        const diffDays = Math.ceil(Math.abs(curr - prev) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
          if (tempStreak > bestStreak) bestStreak = tempStreak;
        } else {
          tempStreak = 1;
        }
      }
    }

    // Current Streak
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

    if (currentStreak > bestStreak) bestStreak = currentStreak;

    const activeDaysCount = datesWithChants.length;
    const avgDay = activeDaysCount > 0 ? Math.round(totalAllTime / activeDaysCount) : 0;
    const avgWeek = avgDay * 7;
    const avgMonth = avgDay * 30;
    const totalMalas = Math.floor(totalAllTime / 108);

    let bestDayFormatted = 'N/A';
    if (bestDayStr !== 'N/A') {
      const bd = new Date(bestDayStr + 'T00:00:00');
      bestDayFormatted = bd.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    return {
      currentStreak,
      longestStreak: bestStreak,
      bestDayCount,
      bestDayFormatted,
      avgDay,
      avgWeek,
      avgMonth,
      totalMalas,
      totalSessions: activeDaysCount,
      totalAllTime
    };
  }, [groupedByDate, language]);

  // Contribution Heatmap Calculations (Last 52 weeks)
  const contributionGrid = useMemo(() => {
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight

    // Start date is exactly 364 days ago
    const startDate = new Date(today.getTime() - 364 * 86400000);

    // Shift start date back to the nearest Monday to align rows nicely
    const day = startDate.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    startDate.setDate(startDate.getDate() + diffToMonday);

    const totalDays = 52 * 7;
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate.getTime() + i * 86400000);
      const dateStr = getLocalDateString(d);
      const count = groupedByDate[dateStr] || 0;
      data.push({
        date: d,
        dateStr,
        count
      });
    }

    const weeks = [];
    for (let w = 0; w < 52; w++) {
      const weekDays = [];
      for (let d = 0; d < 7; d++) {
        weekDays.push(data[w * 7 + d]);
      }
      weeks.push(weekDays);
    }
    return weeks;
  }, [groupedByDate]);

  // Total chants logged in the last year (sum of contributionGrid cells)
  const totalChantsLastYear = useMemo(() => {
    let sum = 0;
    contributionGrid.forEach(week => {
      week.forEach(day => {
        sum += day.count;
      });
    });
    return sum;
  }, [contributionGrid]);

  // Labels for months to show above the 52-week horizontal grid columns
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    let lastWeekIdx = -99;

    contributionGrid.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0]?.date;
      if (firstDayOfWeek) {
        const currentMonth = firstDayOfWeek.getMonth();
        if (currentMonth !== lastMonth) {
          // Only add month label if it's at least 3 weeks away from the previous label
          if (weekIndex - lastWeekIdx >= 3) {
            labels.push({
              weekIndex,
              name: firstDayOfWeek.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', { month: 'short' })
            });
            lastMonth = currentMonth;
            lastWeekIdx = weekIndex;
          }
        }
      }
    });
    return labels;
  }, [contributionGrid, language]);

  // Multi-Goal details
  const weeklyTotal = useMemo(() => getWeeklyChants(historyRecords, todayCount), [historyRecords, todayCount]);
  const monthlyTotal = useMemo(() => getMonthlyChants(historyRecords, todayCount), [historyRecords, todayCount]);
  const yearlyTotal = useMemo(() => getYearlyChants(historyRecords, todayCount), [historyRecords, todayCount]);

  const goalsSummary = useMemo(() => {
    const list = [
      {
        key: 'daily',
        title: language === 'hi' ? 'दैनिक लक्ष्य' : 'Daily Goal',
        current: todayCount,
        target: fallbackGoals.daily,
        unit: getTranslation(language, 'counts')
      },
      {
        key: 'weekly',
        title: language === 'hi' ? 'साप्ताहिक लक्ष्य' : 'Weekly Goal',
        current: weeklyTotal,
        target: fallbackGoals.weekly,
        unit: language === 'hi' ? 'जाप' : 'chants'
      },
      {
        key: 'monthly',
        title: language === 'hi' ? 'मासिक लक्ष्य' : 'Monthly Goal',
        current: monthlyTotal,
        target: fallbackGoals.monthly,
        unit: language === 'hi' ? 'जाप' : 'chants'
      },
      {
        key: 'yearly',
        title: language === 'hi' ? 'वार्षिक लक्ष्य' : 'Yearly Goal',
        current: yearlyTotal,
        target: fallbackGoals.yearly,
        unit: language === 'hi' ? 'जाप' : 'chants'
      }
    ];

    return list.map(g => {
      const percentage = Math.min(100, Math.round((g.current / g.target) * 100)) || 0;
      const isMet = g.current >= g.target;
      const remaining = Math.max(0, g.target - g.current);
      return { ...g, percentage, isMet, remaining };
    });
  }, [todayCount, weeklyTotal, monthlyTotal, yearlyTotal, fallbackGoals, language]);

  // Chart data calculations
  const { labels, dataPoints, dateRangeText, totalCount, dailyAverage, highestDaily, listItems } = useMemo(() => {
    const locale = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-US';
    let chartLabels = [];
    let chartData = [];
    let dText = '';
    let total = 0;
    let avg = 0;
    let maxDay = 0;
    let listItems = [];

    const today = new Date();

    if (timeRange === 'weekly') {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (offset * 7));
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);

      dText = `${startDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`;

      for (let i = 6; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(d.getDate() - i);
        const dateStr = getLocalDateString(d);
        const count = groupedByDate[dateStr] || 0;
        chartLabels.push(d.toLocaleDateString(locale, { weekday: 'short' }));
        chartData.push(count);
        total += count;
      }

      for (let i = 0; i < 7; i++) {
        const d = new Date(endDate);
        d.setDate(d.getDate() - i);
        const dateStr = getLocalDateString(d);
        const count = groupedByDate[dateStr] || 0;
        listItems.push({
          key: dateStr,
          title: d.toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' }),
          count: count,
          isGoalMet: count >= dailyGoal,
        });
      }

      avg = Math.round(total / 7);
      maxDay = Math.max(...chartData, 0);
    } else if (timeRange === 'monthly') {
      const targetMonth = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      dText = targetMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

      const year = targetMonth.getFullYear();
      const month = targetMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month, day);
        const dateStr = getLocalDateString(d);
        const count = groupedByDate[dateStr] || 0;
        chartData.push(count);
        total += count;

        if (day === 1 || day === 6 || day === 12 || day === 18 || day === 24 || day === daysInMonth) {
          chartLabels.push(day.toString());
        } else {
          chartLabels.push("");
        }
      }

      for (let day = daysInMonth; day >= 1; day--) {
        const d = new Date(year, month, day);
        const dateStr = getLocalDateString(d);
        const count = groupedByDate[dateStr] || 0;
        if (count > 0) {
          listItems.push({
            key: dateStr,
            title: d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' }),
            count: count,
            isGoalMet: count >= dailyGoal,
          });
        }
      }

      avg = Math.round(total / daysInMonth);
      maxDay = Math.max(...chartData, 0);
    } else if (timeRange === 'yearly') {
      const currentYear = today.getFullYear();
      const startYear = currentYear - 2 + (offset * 3);

      chartLabels = [];
      chartData = [];
      for (let y = startYear; y <= startYear + 2; y++) {
        chartLabels.push(y.toString());
        chartData.push(0);
      }

      dText = `${startYear} - ${startYear + 2}`;

      Object.keys(groupedByDate).forEach(dateStr => {
        const d = new Date(dateStr + 'T00:00:00');
        const y = d.getFullYear();
        const idx = y - startYear;
        if (idx >= 0 && idx < 3) {
          const count = groupedByDate[dateStr];
          chartData[idx] += count;
          total += count;

          if (count > maxDay) {
            maxDay = count;
          }
        }
      });
      avg = Math.round(total / 3);

      for (let idx = 2; idx >= 0; idx--) {
        const yr = startYear + idx;
        const count = chartData[idx];
        if (count > 0) {
          listItems.push({
            key: `${yr}`,
            title: `${yr} ${getTranslation(language, 'totalCount')}`,
            count: count,
            isGoalMet: count >= (dailyGoal * 200),
            isYearly: true,
          });
        }
      }
    }

    return {
      labels: chartLabels,
      dataPoints: chartData,
      dateRangeText: dText,
      totalCount: total,
      dailyAverage: avg,
      highestDaily: maxDay,
      listItems
    };
  }, [groupedByDate, timeRange, offset, dailyGoal, language]);

  const activeIdx = selectedIdx !== null && selectedIdx < dataPoints.length ? selectedIdx : dataPoints.length - 1;
  const selectedCount = dataPoints[activeIdx] || 0;

  const getSelectedLabel = (idx) => {
    if (timeRange === 'monthly') {
      return `Day ${idx + 1}`;
    }
    return labels[idx] || '';
  };

  const handleDayPress = (dayData) => {
    const checkStreak = getStreakOnDay(dayData.dateStr, groupedByDate);
    const formattedDate = dayData.date.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    setSelectedCalendarDay({
      ...dayData,
      formattedDate,
      streak: checkStreak,
      malas: Math.floor(dayData.count / 108),
      isGoalMet: dayData.count >= fallbackGoals.daily
    });
    setIsDayModalVisible(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>{getTranslation(language, 'progressTitle')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* View Selection Segment Tabs */}
        <View style={[styles.viewSegmentedContainer, { backgroundColor: theme.id === 'darkTemple' ? '#111111' : '#EFEAE4' }]}>
          <TouchableOpacity
            style={[styles.viewSegmentBtn, activeView === 'chart' && { backgroundColor: theme.card }]}
            onPress={() => setActiveView('chart')}
          >
            <Ionicons name="stats-chart" size={16} color={activeView === 'chart' ? theme.accent : theme.secondaryText} style={{ marginRight: 6 }} />
            <Text style={[styles.viewSegmentText, { color: activeView === 'chart' ? theme.primaryText : theme.secondaryText }, activeView === 'chart' && { fontWeight: 'bold' }]}>
              {getTranslation(language, 'trendChart')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewSegmentBtn, activeView === 'calendar' && { backgroundColor: theme.card }]}
            onPress={() => setActiveView('calendar')}
          >
            <Ionicons name="calendar" size={16} color={activeView === 'calendar' ? theme.accent : theme.secondaryText} style={{ marginRight: 6 }} />
            <Text style={[styles.viewSegmentText, { color: activeView === 'calendar' ? theme.primaryText : theme.secondaryText }, activeView === 'calendar' && { fontWeight: 'bold' }]}>
              {language === 'hi' ? 'जाप कैलेंडर' : 'Heatmap'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewSegmentBtn, activeView === 'history' && { backgroundColor: theme.card }]}
            onPress={() => setActiveView('history')}
          >
            <Ionicons name="list" size={16} color={activeView === 'history' ? theme.accent : theme.secondaryText} style={{ marginRight: 6 }} />
            <Text style={[styles.viewSegmentText, { color: activeView === 'history' ? theme.primaryText : theme.secondaryText }, activeView === 'history' && { fontWeight: 'bold' }]}>
              {getTranslation(language, 'historyLog')}
            </Text>
          </TouchableOpacity>
        </View>

        {activeView === 'chart' && (
          <>
            {/* Capsule Range Switcher */}
            <View style={[styles.segmentedControlContainer, { backgroundColor: theme.id === 'darkTemple' ? '#111111' : '#EFEAE4' }]}>
              <TouchableOpacity
                style={[styles.segmentBtn, timeRange === 'weekly' && { backgroundColor: theme.card }]}
                onPress={() => { setTimeRange('weekly'); setOffset(0); }}
              >
                <Text style={[styles.segmentText, { color: timeRange === 'weekly' ? theme.accent : theme.secondaryText }, timeRange === 'weekly' && { fontWeight: 'bold' }]}>
                  {getTranslation(language, 'weekly')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, timeRange === 'monthly' && { backgroundColor: theme.card }]}
                onPress={() => { setTimeRange('monthly'); setOffset(0); }}
              >
                <Text style={[styles.segmentText, { color: timeRange === 'monthly' ? theme.accent : theme.secondaryText }, timeRange === 'monthly' && { fontWeight: 'bold' }]}>
                  {getTranslation(language, 'monthly')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, timeRange === 'yearly' && { backgroundColor: theme.card }]}
                onPress={() => { setTimeRange('yearly'); setOffset(0); }}
              >
                <Text style={[styles.segmentText, { color: timeRange === 'yearly' ? theme.accent : theme.secondaryText }, timeRange === 'yearly' && { fontWeight: 'bold' }]}>
                  {getTranslation(language, 'yearly')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Date Navigation */}
            <View style={styles.dateNavRow}>
              <TouchableOpacity onPress={() => setOffset(o => o - 1)} style={[styles.navArrowCircle, { backgroundColor: theme.id === 'darkTemple' ? '#111111' : '#FFF2E6', borderColor: theme.border, borderWidth: 1 }]}>
                <Text style={[styles.navArrowText, { color: theme.accent }]}>‹</Text>
              </TouchableOpacity>
              <View style={styles.dateRangeContainer}>
                <Text style={[styles.dateRangeText, { color: theme.primaryText }]}>{dateRangeText}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setOffset(o => o + 1)}
                disabled={offset === 0}
                style={[styles.navArrowCircle, { backgroundColor: theme.id === 'darkTemple' ? '#111111' : '#FFF2E6', borderColor: theme.border, borderWidth: 1 }, offset === 0 && styles.navArrowCircleDisabled]}
              >
                <Text style={[styles.navArrowText, { color: theme.accent }, offset === 0 && styles.navArrowTextDisabled]}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Stats Cards */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                <Text style={[styles.statValue, { color: theme.accent }]}>{totalCount}</Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>{getTranslation(language, 'totalPeriod')}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                <Text style={[styles.statValue, { color: theme.accent }]}>{dailyAverage}</Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>{getTranslation(language, 'dailyAvg')}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                <Text style={[styles.statValue, { color: theme.accent }]}>{highestDaily}</Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>{getTranslation(language, 'highestDay')}</Text>
              </View>
            </View>

            {/* Chart Rendering */}
            <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
              {dataPoints.length === 0 || dataPoints.every(v => v === 0) ? (
                <View style={styles.noDataContainer}>
                  <Ionicons name="analytics-outline" size={48} color={theme.border} style={{ marginBottom: 12 }} />
                  <Text style={[styles.noDataText, { color: theme.primaryText }]}>{getTranslation(language, 'noChantsPeriod')}</Text>
                  <Text style={[styles.noDataSubtext, { color: theme.secondaryText }]}>{getTranslation(language, 'beginJourneyHome')}</Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center', width: '100%' }}>
                  <LineChart
                    data={{
                      labels: labels,
                      datasets: [{ data: dataPoints }]
                    }}
                    width={screenWidth - 32}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    fromZero={true}
                    withInnerLines={false}
                    bezier
                    onDataPointClick={(data) => {
                      setSelectedIdx(data.index);
                      setSelectedPoint({
                        x: data.x,
                        y: data.y,
                        value: data.value,
                        index: data.index
                      });
                    }}
                    chartConfig={{
                      backgroundColor: theme.card,
                      backgroundGradientFrom: theme.card,
                      backgroundGradientTo: theme.card,
                      decimalPlaces: 0,
                      color: (opacity = 1) => theme.accent,
                      labelColor: (opacity = 1) => theme.secondaryText,
                      propsForDots: {
                        r: "5",
                        strokeWidth: "2",
                        stroke: theme.accent
                      },
                      fillShadowGradient: theme.accent,
                      fillShadowGradientOpacity: 0.15,
                      propsForBackgroundLines: {
                        stroke: theme.border,
                        strokeDasharray: '4',
                        strokeWidth: 1
                      }
                    }}
                    style={{
                      marginVertical: 8,
                      alignSelf: 'center',
                      borderRadius: 16
                    }}
                  />

                  {selectedPoint && (
                    <View
                      style={{
                        position: 'absolute',
                        left: selectedPoint.x,
                        top: selectedPoint.y - 12,
                        backgroundColor: theme.primaryText,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        transform: [{ translateX: -10 }, { translateY: -10 }],
                        pointerEvents: 'none',
                        zIndex: 10
                      }}
                    >
                      <Text style={{ color: theme.card, fontWeight: 'bold', fontSize: 13 }}>
                        {selectedPoint.value}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.detailContainer, { borderTopColor: theme.border }]}>
                    <Text style={[styles.detailLabel, { color: theme.primaryText }]}>{getSelectedLabel(activeIdx)}</Text>
                    <Text style={[styles.detailText, { color: theme.secondaryText }]}>
                      {getTranslation(language, 'count')}: <Text style={{ color: theme.accent, fontWeight: 'bold' }}>{selectedCount}</Text> | {getTranslation(language, 'malas')}: <Text style={{ color: theme.accent, fontWeight: 'bold' }}>{Math.floor(selectedCount / 108)}</Text>
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Premium Multi-Goal System Cards */}
            <View style={styles.dashboardSection}>
              <Text style={[styles.sectionHeading, { color: theme.primaryText }]}>
                {language === 'hi' ? 'भक्ति लक्ष्य प्रगति' : 'Goal Target Dashboard'}
              </Text>
              {goalsSummary
                .filter(item => item.key === timeRange)
                .map((item) => (
                  <View key={item.key} style={[styles.goalCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                    <View style={styles.goalCardHeader}>
                      <Text style={[styles.goalCardTitle, { color: theme.primaryText }]}>{item.title}</Text>
                      <View style={[styles.goalCardBadge, { backgroundColor: item.isMet ? (theme.id === 'darkTemple' ? '#252525' : '#E8F5E9') : (theme.id === 'darkTemple' ? '#222' : '#FFF2E6') }]}>
                        <Text style={[styles.goalCardBadgeText, { color: item.isMet ? theme.success : theme.accent }]}>
                          {item.isMet ? 'Goal Met ✓' : 'In Progress'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.progressDetailRow}>
                      <Text style={[styles.progressNumber, { color: theme.accent }]}>
                        {item.current.toLocaleString()} <Text style={{ fontSize: 13, color: theme.secondaryText }}>/ {item.target.toLocaleString()} {item.unit}</Text>
                      </Text>
                      <Text style={[styles.percentageText, { color: theme.accent }]}>{item.percentage}%</Text>
                    </View>

                    <View style={[styles.progressOuterBar, { backgroundColor: theme.id === 'darkTemple' ? '#222' : '#F0F0F0' }]}>
                      <View style={[styles.progressInnerFill, { backgroundColor: theme.accent, width: `${item.percentage}%` }]} />
                    </View>

                    {!item.isMet ? (
                      <Text style={[styles.remainingText, { color: theme.secondaryText }]}>
                        ⚠️ {item.remaining.toLocaleString()} {getTranslation(language, 'counts')} remaining to complete.
                      </Text>
                    ) : (
                      <Text style={[styles.remainingText, { color: theme.success, fontWeight: 'bold' }]}>
                        🎉 target met successfully! Keep up the regular devotion.
                      </Text>
                    )}
                  </View>
                ))}
            </View>

            {/* Detailed Statistics Section */}
            <View style={styles.dashboardSection}>
              <Text style={[styles.sectionHeading, { color: theme.primaryText }]}>
                {language === 'hi' ? 'आध्यात्मिक सांख्यिकी' : 'Spiritual Journey Statistics'}
              </Text>

              <View style={styles.statsCardGrid}>
                <View style={[styles.statsGridItem, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                  <Text style={[styles.gridItemVal, { color: theme.accent }]}>{stats.currentStreak} 🔥</Text>
                  <Text style={[styles.gridItemLabel, { color: theme.secondaryText }]}>{getTranslation(language, 'currentStreak')}</Text>
                </View>
                <View style={[styles.statsGridItem, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                  <Text style={[styles.gridItemVal, { color: theme.accent }]}>{stats.longestStreak} 🏆</Text>
                  <Text style={[styles.gridItemLabel, { color: theme.secondaryText }]}>Longest Streak</Text>
                </View>
              </View>

              <View style={styles.statsCardGrid}>
                <View style={[styles.statsGridItem, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                  <Text style={[styles.gridItemVal, { color: theme.accent }]}>{stats.bestDayCount} 🌸</Text>
                  <Text style={[styles.gridItemLabel, { color: theme.secondaryText }]}>Best Day ({stats.bestDayFormatted})</Text>
                </View>
                <View style={[styles.statsGridItem, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                  <Text style={[styles.gridItemVal, { color: theme.accent }]}>{stats.totalSessions} 📅</Text>
                  <Text style={[styles.gridItemLabel, { color: theme.secondaryText }]}>Active Days</Text>
                </View>
              </View>

              <View style={styles.statsCardGrid}>
                <View style={[styles.statsGridItem, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                  <Text style={[styles.gridItemVal, { color: theme.accent }]}>{stats.avgDay}</Text>
                  <Text style={[styles.gridItemLabel, { color: theme.secondaryText }]}>Avg Daily Chants</Text>
                </View>
                <View style={[styles.statsGridItem, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                  <Text style={[styles.gridItemVal, { color: theme.accent }]}>{stats.avgWeek}</Text>
                  <Text style={[styles.gridItemLabel, { color: theme.secondaryText }]}>Avg Weekly Chants</Text>
                </View>
              </View>

              <View style={styles.statsCardGrid}>
                <View style={[styles.statsGridItem, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                  <Text style={[styles.gridItemVal, { color: theme.accent }]}>{stats.avgMonth}</Text>
                  <Text style={[styles.gridItemLabel, { color: theme.secondaryText }]}>Avg Monthly Chants</Text>
                </View>
                <View style={[styles.statsGridItem, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                  <Text style={[styles.gridItemVal, { color: theme.accent }]}>{stats.totalMalas} 📿</Text>
                  <Text style={[styles.gridItemLabel, { color: theme.secondaryText }]}>Lifetime Malas Completed</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {activeView === 'calendar' && (
          <>
            {/* 1. Monthly Heatmap Card */}
            <View style={[styles.gridContainerCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, marginBottom: 20 }]}>
              <Text style={[styles.sectionHeading, { color: theme.primaryText }]}>
                {language === 'hi' ? 'मासिक भक्ति रिकॉर्ड' : 'Monthly Devotion Heatmap'}
              </Text>

              {/* Date Navigation */}
              <View style={[styles.dateNavRow, { marginTop: 12, marginBottom: 16 }]}>
                <TouchableOpacity
                  onPress={() => setOffset(o => o - 1)}
                  style={[styles.navArrowCircle, { backgroundColor: theme.id === 'darkTemple' ? '#111111' : '#FFF2E6', borderColor: theme.border, borderWidth: 1 }]}
                >
                  <Text style={[styles.navArrowText, { color: theme.accent }]}>‹</Text>
                </TouchableOpacity>
                <View style={styles.dateRangeContainer}>
                  <Text style={[styles.dateRangeText, { color: theme.primaryText }]}>{dateRangeText}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setOffset(o => o + 1)}
                  disabled={offset === 0}
                  style={[
                    styles.navArrowCircle,
                    { backgroundColor: theme.id === 'darkTemple' ? '#111111' : '#FFF2E6', borderColor: theme.border, borderWidth: 1 },
                    offset === 0 && styles.navArrowCircleDisabled
                  ]}
                >
                  <Text style={[styles.navArrowText, { color: theme.accent }, offset === 0 && styles.navArrowTextDisabled]}>›</Text>
                </TouchableOpacity>
              </View>

              {/* Weekday Labels (Explicitly styled width boxes matching cells) */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, marginBottom: 8 }}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((dayLabel, idx) => (
                  <View key={idx} style={{ width: (screenWidth - 64) / 7 - 4, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.secondaryText }}>{dayLabel}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar Grid (Guaranteed row layouts to prevent wrapping issues) */}
              <View style={styles.calendarGrid}>
                {calendarWeeks.map((week, weekIdx) => (
                  <View key={weekIdx} style={styles.calendarRow}>
                    {week.map((cell) => {
                      if (cell.isEmpty) {
                        return <View key={cell.key} style={styles.calendarCellEmpty} />;
                      }
                      const color = getIntensityColor(cell.count, fallbackGoals.daily, theme);
                      const isToday = getLocalDateString(new Date()) === cell.dateStr;
                      return (
                        <TouchableOpacity
                          key={cell.key}
                          style={[
                            styles.calendarCell,
                            { backgroundColor: color },
                            isToday && { borderColor: theme.accent, borderWidth: 2 }
                          ]}
                          onPress={() => handleDayPress(cell)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.calendarCellText,
                            { color: cell.count > 0 ? (theme.id === 'darkTemple' ? '#0F1115' : '#FFFFFF') : theme.primaryText, fontWeight: isToday ? 'bold' : 'normal' }
                          ]}>
                            {cell.dayNum}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* Heatmap Legend */}
              <View style={[styles.legendRow, { marginTop: 20 }]}>
                <Text style={[styles.legendLabel, { color: theme.secondaryText }]}>Less</Text>
                <View style={[styles.legendCell, { backgroundColor: theme.intensityLevels.none }]} />
                <View style={[styles.legendCell, { backgroundColor: theme.intensityLevels.low }]} />
                <View style={[styles.legendCell, { backgroundColor: theme.intensityLevels.medium }]} />
                <View style={[styles.legendCell, { backgroundColor: theme.intensityLevels.high }]} />
                <View style={[styles.legendCell, { backgroundColor: theme.intensityLevels.completed }]} />
                <Text style={[styles.legendLabel, { color: theme.secondaryText }]}>More (Goal Met)</Text>
              </View>
            </View>

            {/* 2. Yearly GitHub Style Heatmap Card */}
            <View style={[styles.gridContainerCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
              {/* GitHub Header style: total chants in the last year */}
              <Text style={{ fontSize: 13, color: theme.secondaryText, marginBottom: 4 }}>
                {language === 'hi'
                  ? `पिछले वर्ष में ${totalChantsLastYear.toLocaleString()} जाप`
                  : `${totalChantsLastYear.toLocaleString()} chants in the last year`}
              </Text>

              <Text style={[styles.sectionHeading, { color: theme.primaryText, marginBottom: 12 }]}>
                {language === 'hi' ? 'वार्षिक भक्ति रिकॉर्ड' : 'Spiritual Heatmap'}
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
                <View style={{ flexDirection: 'column' }}>
                  {/* Month Labels Row */}
                  <View style={{ flexDirection: 'row', marginLeft: 30, marginBottom: 6, height: 16 }}>
                    {contributionGrid.map((week, weekIndex) => {
                      const label = monthLabels.find(l => l.weekIndex === weekIndex);
                      return (
                        <View key={weekIndex} style={{ width: 14, marginRight: 3 }}>
                          {label && (
                            <Text style={{ fontSize: 9, color: theme.secondaryText, position: 'absolute', width: 40, fontWeight: '700' }}>
                              {label.name}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Grid Row */}
                  <View style={{ flexDirection: 'row' }}>
                    {/* Weekdays Labels on left (Uses matching height cells to prevent misalignment) */}
                    <View style={{ flexDirection: 'column', marginRight: 6, justifyContent: 'center' }}>
                      {Array.from({ length: 7 }).map((_, idx) => (
                        <View key={idx} style={{ height: 14, marginVertical: 1.5, justifyContent: 'center' }}>
                          {idx === 1 && <Text style={{ fontSize: 9, color: theme.secondaryText }}>Mon</Text>}
                          {idx === 3 && <Text style={{ fontSize: 9, color: theme.secondaryText }}>Wed</Text>}
                          {idx === 5 && <Text style={{ fontSize: 9, color: theme.secondaryText }}>Fri</Text>}
                        </View>
                      ))}
                    </View>

                    {/* Weeks */}
                    {contributionGrid.map((week, weekIndex) => (
                      <View key={weekIndex} style={{ flexDirection: 'column', marginRight: 3 }}>
                        {week.map((dayData, dayIndex) => {
                          const color = getIntensityColor(dayData.count, fallbackGoals.daily, theme);
                          return (
                            <TouchableOpacity
                              key={dayIndex}
                              style={{
                                width: 14,
                                height: 14,
                                backgroundColor: color,
                                borderRadius: 2,
                                marginVertical: 1.5,
                              }}
                              onPress={() => handleDayPress(dayData)}
                              activeOpacity={0.7}
                            />
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Heatmap Legend */}
              <View style={[styles.legendRow, { marginTop: 10 }]}>
                <Text style={[styles.legendLabel, { color: theme.secondaryText }]}>Less</Text>
                <View style={[styles.legendCell, { backgroundColor: theme.intensityLevels.none }]} />
                <View style={[styles.legendCell, { backgroundColor: theme.intensityLevels.low }]} />
                <View style={[styles.legendCell, { backgroundColor: theme.intensityLevels.medium }]} />
                <View style={[styles.legendCell, { backgroundColor: theme.intensityLevels.high }]} />
                <View style={[styles.legendCell, { backgroundColor: theme.intensityLevels.completed }]} />
                <Text style={[styles.legendLabel, { color: theme.secondaryText }]}>More (Goal Met)</Text>
              </View>
            </View>
          </>
        )}

        {activeView === 'history' && (
          /* History Log List */
          <View style={styles.historySection}>
            <Text style={[styles.sectionHeader, { color: theme.primaryText }]}>{getTranslation(language, 'historyLog')}</Text>
            {listItems.length === 0 || (timeRange === 'weekly' && listItems.every(item => item.count === 0)) ? (
              <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                <Ionicons name="flower" size={48} color={theme.border} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyText, { color: theme.primaryText }]}>{getTranslation(language, 'noChantsPeriod')}</Text>
                <Text style={{ color: theme.secondaryText }}>{getTranslation(language, 'beginJourneyHome')}</Text>
              </View>
            ) : (
              listItems.map((item) => {
                if (item.count === 0 && timeRange !== 'weekly') return null;
                return (
                  <View key={item.key} style={[styles.historyRow, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                    <View style={styles.rowLeft}>
                      <View style={[styles.iconCircle, { backgroundColor: item.count > 0 ? (theme.id === 'darkTemple' ? '#222222' : '#FFF2E6') : (theme.id === 'darkTemple' ? '#111' : '#F5F5F5') }]}>
                        <Ionicons
                          name={item.count > 0 ? (item.isGoalMet ? "ribbon" : "checkmark") : "ellipse-outline"}
                          size={18}
                          color={item.count > 0 ? theme.accent : theme.secondaryText}
                        />
                      </View>
                      <View style={styles.rowTextContainer}>
                        <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{item.title}</Text>
                        {item.count > 0 && !item.isYearly && (
                          <Text style={{ fontSize: 12, color: theme.secondaryText }}>
                            {getTranslation(language, 'dailyGoal')}: {dailyGoal}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={[styles.rowCountText, { color: item.count > 0 ? theme.accent : theme.secondaryText }, item.count === 0 && { fontWeight: 'normal' }]}>
                        {item.count > 0 ? `${item.count}` : '0'}
                      </Text>
                      {item.count > 0 && (
                        <View style={[styles.goalBadge, { backgroundColor: item.isGoalMet ? (theme.id === 'darkTemple' ? '#272727' : '#E8F5E9') : (theme.id === 'darkTemple' ? '#1c1c1c' : '#FFF2E6') }]}>
                          <Text style={[styles.goalBadgeText, { color: item.isGoalMet ? theme.success : theme.accent }]}>
                            {item.isGoalMet ? getTranslation(language, 'goalMet') : getTranslation(language, 'active')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

      </ScrollView>

      {/* Day Details Modal Popup */}
      <Modal
        visible={isDayModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDayModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          {selectedCalendarDay && (
            <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.modalDateText, { color: theme.accent }]}>
                {selectedCalendarDay.formattedDate}
              </Text>

              <View style={[styles.modalStatRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
                <Text style={[styles.modalStatLabel, { color: theme.secondaryText }]}>Chants Logged:</Text>
                <Text style={[styles.modalStatValue, { color: theme.primaryText }]}>
                  {selectedCalendarDay.count.toLocaleString()}
                </Text>
              </View>

              <View style={[styles.modalStatRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
                <Text style={[styles.modalStatLabel, { color: theme.secondaryText }]}>Malas Completed:</Text>
                <Text style={[styles.modalStatValue, { color: theme.primaryText }]}>
                  {selectedCalendarDay.malas}
                </Text>
              </View>

              <View style={[styles.modalStatRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
                <Text style={[styles.modalStatLabel, { color: theme.secondaryText }]}>Streak on Day:</Text>
                <Text style={[styles.modalStatValue, { color: theme.primaryText }]}>
                  {selectedCalendarDay.streak} days
                </Text>
              </View>

              <View style={[styles.modalStatRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
                <Text style={[styles.modalStatLabel, { color: theme.secondaryText }]}>Daily Goal Status:</Text>
                <Text style={[styles.modalStatValue, { color: selectedCalendarDay.isGoalMet ? theme.success : theme.accent, fontWeight: 'bold' }]}>
                  {selectedCalendarDay.isGoalMet ? 'Goal Met ✅' : 'Pending ⏳'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: theme.accent }]}
                onPress={() => setIsDayModalVisible(false)}
              >
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF9',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  header: {
    paddingTop: 40,
    marginBottom: 20,
    marginTop: 10,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  segmentedControlContainer: {
    flexDirection: 'row',
    backgroundColor: '#EFEAE4',
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  segmentText: {
    fontSize: 14,
    color: '#7A726A',
    fontWeight: '600',
  },
  dateNavRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  navArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF2E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrowCircleDisabled: {
    backgroundColor: '#F5F5F5',
    opacity: 0.5,
  },
  navArrowText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF6B35',
    lineHeight: 24,
  },
  navArrowTextDisabled: {
    color: '#CCCCCC',
  },
  dateRangeContainer: {
    flex: 1,
    alignItems: 'center',
  },
  dateRangeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A423A',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E8E',
    fontWeight: '600',
  },
  historySection: {
    marginTop: 8,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A423A',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowTextContainer: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowCountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  goalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  goalBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4A423A',
    marginBottom: 4,
    textAlign: 'center',
  },
  viewSegmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#EFEAE4',
    borderRadius: 24,
    padding: 3,
    marginBottom: 20,
  },
  viewSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  viewSegmentText: {
    fontSize: 13,
    color: '#7A726A',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataContainer: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  noDataText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4A423A',
    marginBottom: 4,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 12,
    color: '#8E8E8E',
    textAlign: 'center',
  },
  detailContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F4EFEA',
    width: '90%',
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#7A726A',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#4A423A',
  },

  // Heatmap Grid styling
  gridContainerCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 12,
    marginBottom: 10,
  },
  heatmapCell: {
    width: 13,
    height: 13,
    borderRadius: 2.5,
    marginHorizontal: 2.2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingRight: 4,
  },
  legendLabel: {
    fontSize: 10,
    marginHorizontal: 6,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginHorizontal: 1.5,
  },

  // Multi-Goal System Cards Styling
  dashboardSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  goalCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  goalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  goalCardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  goalCardBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  progressNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressOuterBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressInnerFill: {
    height: '100%',
    borderRadius: 5,
  },
  remainingText: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Stats Grid Styling
  statsCardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statsGridItem: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  gridItemVal: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  gridItemLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Modal Day Detail Styling
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: screenWidth * 0.85,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  modalDateText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  modalStatLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  calendarWeekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  calendarWeekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'column',
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  calendarCell: {
    width: (screenWidth - 64) / 7 - 4,
    height: (screenWidth - 64) / 7 - 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  calendarCellEmpty: {
    width: (screenWidth - 64) / 7 - 4,
    height: (screenWidth - 64) / 7 - 4,
  },
  calendarCellText: {
    fontSize: 12,
    fontWeight: '600',
  }
});
