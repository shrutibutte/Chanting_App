import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { LineChart } from 'react-native-chart-kit';
import { getLocalDateString } from '../utils/date.js';
import { getTranslation } from '../utils/translations';

const screenWidth = Dimensions.get('window').width;

export default function ProgressScreen() {
  const { historyRecords, todayCount, dailyGoal, isDarkMode, language } = useStore();
  const [timeRange, setTimeRange] = useState('weekly'); // 'weekly', 'monthly', 'yearly'
  const [offset, setOffset] = useState(0);
  const [activeView, setActiveView] = useState('chart'); // 'chart', 'history'
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);

  useEffect(() => {
    setSelectedIdx(null);
    setSelectedPoint(null);
  }, [timeRange, offset])

  const { labels, dataPoints, dateRangeText, totalCount, dailyAverage, highestDaily, listItems } = useMemo(() => {
    const groupedByDate = {};
    historyRecords.forEach(r => {
      groupedByDate[r.date] = (groupedByDate[r.date] || 0) + r.count;
    });

    const today = new Date();
    const todayStr = getLocalDateString(today);
    groupedByDate[todayStr] = todayCount;

    const locale = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-US';
    let chartLabels = [];
    let chartData = [];
    let dText = '';
    let total = 0;
    let avg = 0;
    let maxDay = 0;
    let listItems = [];

    if (timeRange === 'weekly') {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (offset * 7));
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);

      dText = `${startDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`;

      // Chronological for chart (oldest to newest)
      for (let i = 6; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(d.getDate() - i);
        const dateStr = getLocalDateString(d);
        const count = groupedByDate[dateStr] || 0;
        chartLabels.push(d.toLocaleDateString(locale, { weekday: 'short' }));
        chartData.push(count);
        total += count;
      }

      // Newest first for list
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

      // Chronological for chart (Day 1 to daysInMonth)
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month, day);
        const dateStr = getLocalDateString(d);
        const count = groupedByDate[dateStr] || 0;
        chartData.push(count);
        total += count;

        // Sparse labels (first, last, and every 6 days) showing just day numbers
        if (day === 1 || day === 6 || day === 12 || day === 18 || day === 24 || day === daysInMonth) {
          chartLabels.push(day.toString());
        } else {
          chartLabels.push("");
        }
      }

      // Newest first for list
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
        const d = new Date(dateStr);
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
  }, [historyRecords, todayCount, timeRange, offset, dailyGoal]);

  const activeIdx = selectedIdx !== null && selectedIdx < dataPoints.length ? selectedIdx : dataPoints.length - 1;
  const selectedCount = dataPoints[activeIdx] || 0;

  const getSelectedLabel = (idx) => {
    if (timeRange === 'monthly') {
      return `Day ${idx + 1}`;
    }
    return labels[idx] || '';
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkHeaderTitle]}>{getTranslation(language, 'progressTitle')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Modern Segmented Capsule Switcher */}
        <View style={[styles.segmentedControlContainer, isDarkMode && styles.darkSegmentedContainer]}>
          <TouchableOpacity
            style={[styles.segmentBtn, timeRange === 'weekly' && (isDarkMode ? styles.darkSegmentBtnActive : styles.segmentBtnActive)]}
            onPress={() => { setTimeRange('weekly'); setOffset(0); }}
          >
            <Text style={[styles.segmentText, timeRange === 'weekly' && (isDarkMode ? styles.darkSegmentTextActive : styles.segmentTextActive)]}>{getTranslation(language, 'weekly')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, timeRange === 'monthly' && (isDarkMode ? styles.darkSegmentBtnActive : styles.segmentBtnActive)]}
            onPress={() => { setTimeRange('monthly'); setOffset(0); }}
          >
            <Text style={[styles.segmentText, timeRange === 'monthly' && (isDarkMode ? styles.darkSegmentTextActive : styles.segmentTextActive)]}>{getTranslation(language, 'monthly')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, timeRange === 'yearly' && (isDarkMode ? styles.darkSegmentBtnActive : styles.segmentBtnActive)]}
            onPress={() => { setTimeRange('yearly'); setOffset(0); }}
          >
            <Text style={[styles.segmentText, timeRange === 'yearly' && (isDarkMode ? styles.darkSegmentTextActive : styles.segmentTextActive)]}>{getTranslation(language, 'yearly')}</Text>
          </TouchableOpacity>
        </View>

        {/* Date Navigation */}
        <View style={styles.dateNavRow}>
          <TouchableOpacity onPress={() => setOffset(o => o - 1)} style={[styles.navArrowCircle, isDarkMode && styles.darkArrowCircle]}>
            <Text style={[styles.navArrowText, isDarkMode && styles.darkArrowText]}>‹</Text>
          </TouchableOpacity>
          <View style={styles.dateRangeContainer}>
            <Text style={[styles.dateRangeText, isDarkMode && styles.darkDateRangeText]}>{dateRangeText}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setOffset(o => o + 1)}
            disabled={offset === 0}
            style={[styles.navArrowCircle, isDarkMode && styles.darkArrowCircle, offset === 0 && styles.navArrowCircleDisabled]}
          >
            <Text style={[styles.navArrowText, isDarkMode && styles.darkArrowText, offset === 0 && styles.navArrowTextDisabled]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, isDarkMode && styles.darkCardRow]}>
            <Text style={[styles.statValue, isDarkMode && styles.darkStatValue]}>{totalCount}</Text>
            <Text style={[styles.statLabel, isDarkMode && styles.darkStatLabel]}>{getTranslation(language, 'totalPeriod')}</Text>
          </View>
          <View style={[styles.statCard, isDarkMode && styles.darkCardRow]}>
            <Text style={[styles.statValue, isDarkMode && styles.darkStatValue]}>{dailyAverage}</Text>
            <Text style={[styles.statLabel, isDarkMode && styles.darkStatLabel]}>{getTranslation(language, 'dailyAvg')}</Text>
          </View>
          <View style={[styles.statCard, isDarkMode && styles.darkCardRow]}>
            <Text style={[styles.statValue, isDarkMode && styles.darkStatValue]}>{highestDaily}</Text>
            <Text style={[styles.statLabel, isDarkMode && styles.darkStatLabel]}>{getTranslation(language, 'highestDay')}</Text>
          </View>
        </View>

        {/* Toggle between Chart and History views */}
        <View style={[styles.viewSegmentedContainer, isDarkMode && styles.darkSegmentedContainer]}>
          <TouchableOpacity
            style={[styles.viewSegmentBtn, activeView === 'chart' && (isDarkMode ? styles.darkSegmentBtnActive : styles.viewSegmentBtnActive)]}
            onPress={() => setActiveView('chart')}
          >
            <Ionicons
              name="stats-chart-outline"
              size={16}
              color={activeView === 'chart' ? (isDarkMode ? '#000000' : '#FF6B35') : '#7A726A'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.viewSegmentText, activeView === 'chart' && (isDarkMode ? styles.darkSegmentTextActive : styles.viewSegmentTextActive)]}>{getTranslation(language, 'trendChart')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewSegmentBtn, activeView === 'history' && (isDarkMode ? styles.darkSegmentBtnActive : styles.viewSegmentBtnActive)]}
            onPress={() => setActiveView('history')}
          >
            <Ionicons
              name="list-outline"
              size={16}
              color={activeView === 'history' ? (isDarkMode ? '#000000' : '#FF6B35') : '#7A726A'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.viewSegmentText, activeView === 'history' && (isDarkMode ? styles.darkSegmentTextActive : styles.viewSegmentTextActive)]}>{getTranslation(language, 'historyLog')}</Text>
          </TouchableOpacity>
        </View>

        {activeView === 'chart' ? (
          /* Chart Card */
          <View style={[styles.chartCard, isDarkMode && styles.darkCardRow]}>
            {dataPoints.length === 0 || dataPoints.every(v => v === 0) ? (
              <View style={styles.noDataContainer}>
                <Ionicons name="analytics-outline" size={48} color={isDarkMode ? "#333333" : "#FFDDC8"} style={{ marginBottom: 12 }} />
                <Text style={[styles.noDataText, isDarkMode && styles.darkNoDataText]}>{getTranslation(language, 'noChantsPeriod')}</Text>
                <Text style={styles.noDataSubtext}>{getTranslation(language, 'beginJourneyHome')}</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center', width: '100%', position: 'relative' }}>
                <LineChart
                  data={{
                    labels: labels,
                    datasets: [{
                      data: dataPoints
                    }]
                  }}
                  width={screenWidth - 32}
                  height={300}
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
                    backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
                    backgroundGradientFrom: isDarkMode ? '#000000' : '#FFFFFF',
                    backgroundGradientTo: isDarkMode ? '#000000' : '#FFFFFF',
                    decimalPlaces: 0,
                    color: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(255, 107, 53, ${opacity})`,
                    labelColor: (opacity = 1) => isDarkMode ? '#FFFFFF' : '#7A726A',
                    style: {
                      borderRadius: 24
                    },
                    propsForDots: {
                      r: "4",
                      strokeWidth: "2",
                      stroke: isDarkMode ? "#FFFFFF" : "#FF6B35"
                    },
                    fillShadowGradient: isDarkMode ? '#FFFFFF' : '#FF6B35',
                    fillShadowGradientOpacity: 0.2,
                    propsForBackgroundLines: {
                      stroke: isDarkMode ? '#222222' : '#F4EFEA',
                      strokeDasharray: '4',
                      strokeWidth: 1
                    }
                  }}
                  style={{
                    marginVertical: 8,
                    alignSelf: 'center'
                  }}
                />
                
                {/* Tooltip Overlay */}
                {selectedPoint && (
                  <View 
                    style={{
                      position: 'absolute',
                      left: selectedPoint.x, // Centers around the dot
                      top: selectedPoint.y - 10,  // Show slightly above the dot
                      backgroundColor: isDarkMode ? '#FFFFFF' : '#333333',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      transform: [{ translateX: -10 }, { translateY: -10 }],
                      pointerEvents: 'none',
                      shadowColor: isDarkMode ? 'transparent' : '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 4,
                    }}
                  >
                    <Text style={{ color: isDarkMode ? '#000000' : '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>
                      {selectedPoint.value}
                    </Text>
                  </View>
                )}
                <View style={[styles.detailContainer, isDarkMode && { borderTopColor: '#333333' }]}>
                  <Text style={[styles.detailLabel, isDarkMode && styles.darkDetailLabel]}>{getSelectedLabel(activeIdx)}</Text>
                  <Text style={[styles.detailText, isDarkMode && styles.darkDetailText]}>
                    {getTranslation(language, 'count')}: <Text style={[styles.detailHighlight, isDarkMode && styles.darkDetailHighlight]}>{selectedCount}</Text> | {getTranslation(language, 'malas')}: <Text style={[styles.detailHighlight, isDarkMode && styles.darkDetailHighlight]}>{Math.floor(selectedCount / 108)}</Text>
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          /* History Log Section */
          <View style={styles.historySection}>
            <Text style={[styles.sectionHeader, isDarkMode && styles.darkSectionHeader]}>{getTranslation(language, 'historyLog')}</Text>
            {listItems.length === 0 || (timeRange === 'weekly' && listItems.every(item => item.count === 0)) ? (
              <View style={[styles.emptyContainer, isDarkMode && styles.darkCardRow]}>
                <Ionicons name="flower-outline" size={48} color={isDarkMode ? "#333333" : "#FFDDC8"} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyText, isDarkMode && styles.darkNoDataText]}>{getTranslation(language, 'noChantsPeriod')}</Text>
                <Text style={styles.emptySubtext}>{getTranslation(language, 'beginJourneyHome')}</Text>
              </View>
            ) : (
              listItems.map((item) => {
                if (item.count === 0 && timeRange !== 'weekly') return null;

                return (
                  <View key={item.key} style={[styles.historyRow, isDarkMode && styles.darkCardRow]}>
                    <View style={styles.rowLeft}>
                      <View style={[
                        styles.iconCircle,
                        item.count > 0 ? (isDarkMode ? styles.darkIconCircleActive : styles.iconCircleActive) : styles.iconCircleInactive
                      ]}>
                        <Ionicons
                          name={item.count > 0 ? (item.isGoalMet ? "ribbon" : "checkmark") : "ellipse-outline"}
                          size={18}
                          color={item.count > 0 ? (isDarkMode ? "#FFFFFF" : "#FF6B35") : "#A0A0A0"}
                        />
                      </View>
                      <View style={styles.rowTextContainer}>
                        <Text style={[styles.rowTitle, isDarkMode && styles.darkRowTitle]}>{item.title}</Text>
                        {item.count > 0 && !item.isYearly && (
                          <Text style={[styles.rowSubtext, isDarkMode && styles.darkRowSubtext]}>
                            {getTranslation(language, 'dailyGoal')}: {dailyGoal}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={[styles.rowCountText, isDarkMode && styles.darkRowCountText, item.count === 0 && styles.rowCountTextZero]}>
                        {item.count > 0 ? `${item.count}` : '0'}
                      </Text>
                      {item.count > 0 && (
                        <View style={[
                          styles.goalBadge,
                          item.isGoalMet ? (isDarkMode ? styles.darkGoalBadgeMet : styles.goalBadgeMet) : (isDarkMode ? styles.darkGoalBadgeNotMet : styles.goalBadgeNotMet)
                        ]}>
                          <Text style={[
                            styles.goalBadgeText,
                            item.isGoalMet ? (isDarkMode ? styles.darkGoalBadgeTextMet : styles.goalBadgeTextMet) : (isDarkMode ? styles.darkGoalBadgeTextNotMet : styles.goalBadgeTextNotMet)
                          ]}>
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
    marginBottom: 24,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    color: '#7A726A',
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FF6B35',
    fontWeight: 'bold',
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
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  navArrowCircleDisabled: {
    backgroundColor: '#F5F5F5',
    shadowOpacity: 0,
    elevation: 0,
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
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
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
  iconCircleActive: {
    backgroundColor: '#FFF2E6',
  },
  iconCircleInactive: {
    backgroundColor: '#F5F5F5',
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
  rowSubtext: {
    fontSize: 12,
    color: '#8E8E8E',
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
  rowCountTextZero: {
    color: '#A0A0A0',
  },
  goalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  goalBadgeMet: {
    backgroundColor: '#E8F5E9',
  },
  goalBadgeNotMet: {
    backgroundColor: '#FFF2E6',
  },
  goalBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  goalBadgeTextMet: {
    color: '#2E7D32',
  },
  goalBadgeTextNotMet: {
    color: '#FF6B35',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4A423A',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#8E8E8E',
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
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  viewSegmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  viewSegmentText: {
    fontSize: 13,
    color: '#7A726A',
    fontWeight: '600',
  },
  viewSegmentTextActive: {
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataContainer: {
    height: 200,
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
    marginBottom: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F4EFEA',
    width: '90%',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7A726A',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A423A',
  },
  detailHighlight: {
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  // Dark Mode Styles
  darkContainer: {
    backgroundColor: '#000000',
  },
  darkHeaderTitle: {
    color: '#FFFFFF',
  },
  darkSegmentedContainer: {
    backgroundColor: '#111111',
  },
  darkSegmentBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  darkSegmentTextActive: {
    color: '#000000',
    fontWeight: 'bold',
  },
  darkArrowCircle: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowOpacity: 0,
    elevation: 0,
  },
  darkArrowText: {
    color: '#FFFFFF',
  },
  darkDateRangeText: {
    color: '#FFFFFF',
  },
  darkCardRow: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowOpacity: 0,
    elevation: 0,
  },
  darkStatValue: {
    color: '#FFFFFF',
  },
  darkStatLabel: {
    color: '#8E8E8E',
  },
  darkNoDataText: {
    color: '#FFFFFF',
  },
  darkDetailLabel: {
    color: '#FFFFFF',
  },
  darkDetailText: {
    color: '#CCCCCC',
  },
  darkDetailHighlight: {
    color: '#FFFFFF',
  },
  darkSectionHeader: {
    color: '#FFFFFF',
  },
  darkIconCircleActive: {
    backgroundColor: '#222222',
  },
  darkRowTitle: {
    color: '#FFFFFF',
  },
  darkRowSubtext: {
    color: '#8E8E8E',
  },
  darkRowCountText: {
    color: '#FFFFFF',
  },
  darkGoalBadgeMet: {
    backgroundColor: '#FFFFFF',
  },
  darkGoalBadgeNotMet: {
    backgroundColor: '#222222',
  },
  darkGoalBadgeTextMet: {
    color: '#000000',
  },
  darkGoalBadgeTextNotMet: {
    color: '#FFFFFF',
  },
});
