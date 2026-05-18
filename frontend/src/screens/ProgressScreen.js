import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useStore } from '../store/useStore';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function ProgressScreen() {
  const { historyRecords, todayCount } = useStore();
  const [timeRange, setTimeRange] = useState('weekly'); // 'weekly', 'monthly', 'yearly'
  const [offset, setOffset] = useState(0);

  const { labels, dataPoints, dateRangeText, totalCount } = useMemo(() => {
    const groupedByDate = {};
    historyRecords.forEach(r => {
      groupedByDate[r.date] = (groupedByDate[r.date] || 0) + r.count;
    });

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    groupedByDate[todayStr] = todayCount;

    let chartLabels = [];
    let chartData = [];
    let dText = '';
    let total = 0;

    if (timeRange === 'weekly') {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (offset * 7));
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);

      dText = `${startDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short'})} - ${endDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short'})}`;

      for (let i = 6; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        chartLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        const count = groupedByDate[dateStr] || 0;
        chartData.push(count);
        total += count;
      }
    } else if (timeRange === 'monthly') {
      const targetMonth = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      
      dText = targetMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric'}); // e.g. "May 2026"
      
      const year = targetMonth.getFullYear();
      const month = targetMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        // Show labels 1, 2, 4, 6... to match screenshot
        if (day === 1 || day % 2 === 0) {
          chartLabels.push(day.toString());
        } else {
          chartLabels.push('');
        }

        const d = new Date(year, month, day);
        // Correct timezone offset to avoid previous day bugs
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        const dateStr = d.toISOString().split('T')[0];
        
        const count = groupedByDate[dateStr] || 0;
        chartData.push(count);
        total += count;
      }
    } else if (timeRange === 'yearly') {
      const year = today.getFullYear() + offset;
      dText = `${year}`;
      
      chartLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      chartData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      
      Object.keys(groupedByDate).forEach(dateStr => {
        const d = new Date(dateStr);
        if (d.getFullYear() === year) {
          const count = groupedByDate[dateStr];
          chartData[d.getMonth()] += count;
          total += count;
        }
      });
    }

    return { 
      labels: chartLabels, 
      dataPoints: chartData,
      dateRangeText: dText,
      totalCount: total
    };
  }, [historyRecords, todayCount, timeRange, offset]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headerTitle}>Naam Jap Stats</Text>
        
        {/* Tabs Row */}
        <View style={styles.tabsRow}>
          <TouchableOpacity 
            style={[styles.tabBtn, timeRange === 'weekly' && styles.tabBtnActive]} 
            onPress={() => { setTimeRange('weekly'); setOffset(0); }}
          >
            <Text style={[styles.tabText, timeRange === 'weekly' && styles.tabTextActive]}>Daily</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, timeRange === 'monthly' && styles.tabBtnActive]} 
            onPress={() => { setTimeRange('monthly'); setOffset(0); }}
          >
            <Text style={[styles.tabText, timeRange === 'monthly' && styles.tabTextActive]}>Monthly</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, timeRange === 'yearly' && styles.tabBtnActive]} 
            onPress={() => { setTimeRange('yearly'); setOffset(0); }}
          >
            <Text style={[styles.tabText, timeRange === 'yearly' && styles.tabTextActive]}>Yearly</Text>
          </TouchableOpacity>
        </View>

        {/* Chart Card */}
        <View style={styles.card}>
          
          {/* Date Navigation */}
          <View style={styles.dateNavRow}>
            <TouchableOpacity onPress={() => setOffset(o => o - 1)} style={styles.arrowBtn}>
              <Text style={styles.arrowText}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.dateRangeText}>{dateRangeText}</Text>
            <TouchableOpacity onPress={() => setOffset(o => o + 1)} disabled={offset === 0} style={styles.arrowBtn}>
              <Text style={[styles.arrowText, offset === 0 && styles.arrowTextDisabled]}>{'>'}</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalCount}</Text>
              <Text style={styles.statLabel}>Total Count</Text>
            </View>
          </View>

          {/* Line Chart */}
          <LineChart
            data={{
              labels: labels.length > 0 ? labels : [''],
              datasets: [{ data: dataPoints.length > 0 ? dataPoints : [0] }]
            }}
            width={screenWidth - 48}
            height={220}
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              decimalPlaces: 0, 
              color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, 0.4)`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: "5",
                strokeWidth: "2",
                stroke: "#FF6B35"
              }
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
            withInnerLines={false}
            withOuterLines={false}
            fromZero={true}
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  scroll: {
    padding: 24,
    paddingBottom: 100,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333', 
    marginTop: 10,
    marginBottom: 20,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D6CB', // subtle line under tabs
  },
  tabBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  tabBtnActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF6B35', // orange underline
  },
  tabText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#333',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 0,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3, 
  },
  dateNavRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  arrowBtn: {
    paddingHorizontal: 20,
  },
  arrowText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  arrowTextDisabled: {
    color: '#CCC',
  },
  dateRangeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    width: 160,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center', // Center since there's only one stat now
    marginBottom: 30,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  }
});
