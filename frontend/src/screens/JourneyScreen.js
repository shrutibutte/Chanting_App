import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, getLevelInfo, JOURNEY_LEVELS } from '../store/useStore';

export default function JourneyScreen() {
  const { totalCount } = useStore();
  const levelInfo = getLevelInfo(totalCount);
  const [isLevelsListExpanded, setIsLevelsListExpanded] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Journey</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.journeyCard}>
          <Text style={styles.journeySectionTitle}>SPIRITUAL JOURNEY PROGRESS</Text>

          <View style={styles.currentLevelHeader}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeIcon}>{levelInfo.icon}</Text>
              <Text style={styles.levelBadgeText}>{levelInfo.name}</Text>
            </View>
            <Text style={styles.levelProgressLabel}>
              {totalCount.toLocaleString()} / {levelInfo.nextThreshold.toLocaleString()} Chants
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${levelInfo.progressPercentage}%` }]} />
          </View>

          <Text style={styles.nextLevelGoalText}>
            🌿 Only{' '}
            <Text style={{ fontWeight: 'bold', color: '#FF6B35' }}>
              {levelInfo.remainingCount.toLocaleString()}
            </Text>
            {' '}more chants to become a{' '}
            <Text style={{ fontWeight: 'bold', color: '#FF6B35' }}>
              {levelInfo.nextLevelName}
            </Text>
          </Text>
          {/* Collapsible/Expandable Journey Levels list */}
          <TouchableOpacity
            style={styles.levelsListToggle}
            onPress={() => setIsLevelsListExpanded(!isLevelsListExpanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.levelsListToggleText}>
              {isLevelsListExpanded ? 'Hide All Journey Levels' : 'View All Journey Levels'}
            </Text>
            <Ionicons
              name={isLevelsListExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#FF6B35"
            />
          </TouchableOpacity>

          {isLevelsListExpanded && (
            <View style={styles.levelsListContainer}>
              {JOURNEY_LEVELS.map((lvl, index) => {
                const isCompleted = totalCount >= lvl.minCount;
                const isCurrent = levelInfo.name.startsWith(lvl.name);
                return (
                  <View
                    key={lvl.name}
                    style={[
                      styles.journeyLevelItem,
                      isCurrent && styles.journeyLevelItemActive,
                      !isCompleted && styles.journeyLevelItemLocked
                    ]}
                  >
                    <Text style={styles.journeyLevelIcon}>{lvl.icon}</Text>
                    <Text style={[
                      styles.journeyLevelName,
                      isCompleted ? styles.journeyLevelNameCompleted : styles.journeyLevelNameLocked
                    ]}>
                      {lvl.name} {isCurrent && " (Current)"}
                    </Text>
                    <Text style={styles.journeyLevelMinCount}>
                      {isCurrent ? `${totalCount.toLocaleString()} Chants` : `${lvl.minCount.toLocaleString()} Chants`}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF9',
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
    color: '#FF6B35',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120, // Clear the bottom tab bar properly
  },
  journeyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FFE6D3',
    marginTop: 10,
  },
  journeySectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E8E',
    marginBottom: 16,
    letterSpacing: 1.2,
  },
  currentLevelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2E6',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FFE6D3',
  },
  levelBadgeIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  levelBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  levelProgressLabel: {
    fontSize: 13,
    color: '#8E8E8E',
    fontWeight: '500',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 5,
  },
  nextLevelGoalText: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
    marginBottom: 16,
  },
  levelsListToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  levelsListToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B35',
    marginRight: 4,
  },
  levelsListContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  journeyLevelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  journeyLevelItemActive: {
    backgroundColor: '#FFF2E6',
  },
  journeyLevelItemLocked: {
    opacity: 0.65,
  },
  journeyLevelIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 20,
    textAlign: 'center',
  },
  journeyLevelName: {
    fontSize: 14,
    flex: 1,
  },
  journeyLevelNameCompleted: {
    color: '#333333',
    fontWeight: '600',
  },
  journeyLevelNameLocked: {
    color: '#888888',
  },
  journeyLevelMinCount: {
    fontSize: 12,
    color: '#8E8E8E',
  },
});
