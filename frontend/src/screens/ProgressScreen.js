import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Dimensions } from 'react-native';
import { useStore } from '../store/useStore';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function ProgressScreen() {
  const { historyRecords, todayCount } = useStore();

  const { labels, dataPoints, weekTicks, currentStreak } = useMemo(() => {
    const groupedByDate = {};
    historyRecords.forEach(r => {
      groupedByDate[r.date] = (groupedByDate[r.date] || 0) + r.count;
    });

    // Also include today's live unsynced count to make graph realtime
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    groupedByDate[todayStr] = todayCount;

    // Last 7 days chart & ticks
    const last7Days = [];
    const labelsArr = [];
    const dataArr = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      last7Days.push(dateStr);
      labelsArr.push(d.toLocaleDateString('en-US', { weekday: 'narrow' }));
      dataArr.push(groupedByDate[dateStr] || 0);
    }

    const weekTicksArr = last7Days.map((dateStr, i) => ({
       label: labelsArr[i],
       active: (groupedByDate[dateStr] || 0) > 0
    }));

    // Calculate Streak
    let streak = 0;
    let checkDate = new Date();
    let cDateStr = checkDate.toISOString().split('T')[0];
    
    // If today is 0, start checking yesterday
    if (!groupedByDate[cDateStr] || groupedByDate[cDateStr] === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
      cDateStr = checkDate.toISOString().split('T')[0];
    }
    
    while (groupedByDate[cDateStr] > 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
      cDateStr = checkDate.toISOString().split('T')[0];
    }

    return { labels: labelsArr, dataPoints: dataArr, weekTicks: weekTicksArr, currentStreak: streak };
  }, [historyRecords, todayCount]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headerTitle}>Your Progress</Text>
        
        {/* Streak Card */}
        <View style={styles.card}>
          <View style={styles.streakHeader}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakTitle}>Current Streak</Text>
          </View>
          
          <View style={styles.streakInfo}>
            <Text style={styles.streakNumber}>{currentStreak}</Text>
            <Text style={styles.streakDays}>Days</Text>
          </View>
          <Text style={styles.superSub}>Keep it up! 🙏</Text>

          <View style={styles.ticksContainer}>
            {weekTicks.map((tick, index) => (
              <View key={index} style={styles.tickCol}>
                <Text style={styles.tickLabel}>{tick.label}</Text>
                <View style={[styles.tickCircle, tick.active ? styles.tickActive : styles.tickInactive]}>
                  {tick.active && <Text style={styles.tickCheck}>✓</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Chart Card */}
        <View style={[styles.card, { paddingHorizontal: 0, paddingBottom: 16 }]}>
          <Text style={styles.cardHeader}>Weekly Jaap Count</Text>
          <LineChart
            data={{
              labels,
              datasets: [{ data: dataPoints }]
            }}
            width={screenWidth - 48} // from padding
            height={220}
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              decimalPlaces: 0, 
              color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, 0.4)`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: "5",
                strokeWidth: "2",
                stroke: "#FF6B35"
              }
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
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
    paddingBottom: 100, // accommodate bottom tab bar
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35', 
    marginTop: 20,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3, 
  },
  cardHeader: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  streakTitle: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  streakNumber: {
    color: '#FF6B35',
    fontSize: 48,
    fontWeight: 'bold',
    marginRight: 8,
  },
  streakDays: {
    color: '#FF6B35',
    fontSize: 32,
    fontWeight: 'bold',
  },
  superSub: {
    color: '#8E8E8E',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 24,
  },
  ticksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  tickCol: {
    alignItems: 'center',
  },
  tickLabel: {
    color: '#8E8E8E',
    fontSize: 12,
    marginBottom: 8,
  },
  tickCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickActive: {
    backgroundColor: '#FF6B35',
  },
  tickInactive: {
    backgroundColor: '#F0F0F0',
  },
  tickCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  }
});
