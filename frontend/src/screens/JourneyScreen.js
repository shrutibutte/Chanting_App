import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, getLevelInfo, JOURNEY_LEVELS } from '../store/useStore';
import { getTranslation } from '../utils/translations';

import { getTheme } from '../utils/themes';

function translateLevelName(name, language) {
  if (!name) return '';
  const match = name.match(/^(Ananda Master|Koti Master)\s+Lvl\s+(\d+)$/);
  if (match) {
    const key = match[1] === 'Koti Master' ? 'level_KotiMaster' : 'level_AnandaMaster';
    const base = getTranslation(language, key);
    return `${base} Lvl ${match[2]}`;
  }
  const normalizedKey = 'level_' + name.replace(/\s+/g, '');
  return getTranslation(language, normalizedKey);
}

export default function JourneyScreen() {
  const { totalCount, language, themeId } = useStore();
  const theme = getTheme(themeId);
  const levelInfo = getLevelInfo(totalCount);
  const [isLevelsListExpanded, setIsLevelsListExpanded] = useState(true);

  const renderNextLevelText = () => {
    const remainingText = levelInfo.remainingCount.toLocaleString();
    const nextLevelTranslated = translateLevelName(levelInfo.nextLevelName, language);
    
    if (language === 'hi') {
      return (
        <Text style={[styles.nextLevelGoalText, { color: theme.secondaryText }]}>
          🌿 एक{' '}
          <Text style={{ fontWeight: 'bold', color: theme.accent }}>
            {nextLevelTranslated}
          </Text>
          {' '}बनने के लिए केवल{' '}
          <Text style={{ fontWeight: 'bold', color: theme.accent }}>
            {remainingText}
          </Text>
          {' '}और जाप की आवश्यकता है
        </Text>
      );
    } else if (language === 'mr') {
      return (
        <Text style={[styles.nextLevelGoalText, { color: theme.secondaryText }]}>
          🌿 एक{' '}
          <Text style={{ fontWeight: 'bold', color: theme.accent }}>
            {nextLevelTranslated}
          </Text>
          {' '}बनण्यासाठी फक्त{' '}
          <Text style={{ fontWeight: 'bold', color: theme.accent }}>
            {remainingText}
          </Text>
          {' '}अधिक जाप करावे लागतील
        </Text>
      );
    } else {
      return (
        <Text style={[styles.nextLevelGoalText, { color: theme.secondaryText }]}>
          🌿 Only{' '}
          <Text style={{ fontWeight: 'bold', color: theme.accent }}>
            {remainingText}
          </Text>
          {' '}more chants to become a{' '}
          <Text style={{ fontWeight: 'bold', color: theme.accent }}>
            {nextLevelTranslated}
          </Text>
        </Text>
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>{getTranslation(language, 'journeyTitle')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.journeyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.journeySectionTitle, { color: theme.secondaryText }]}>{getTranslation(language, 'spiritualJourneyProgress')}</Text>

          <View style={styles.currentLevelHeader}>
            <View style={[styles.levelBadge, { backgroundColor: theme.id === 'darkTemple' ? '#111111' : '#FFF2E6', borderColor: theme.id === 'darkTemple' ? '#333333' : '#FFE6D3' }]}>
              <Text style={styles.levelBadgeIcon}>{levelInfo.icon}</Text>
              <Text style={[styles.levelBadgeText, { color: theme.accent }]}>{translateLevelName(levelInfo.name, language)}</Text>
            </View>
            <Text style={[styles.levelProgressLabel, { color: theme.secondaryText }]}>
              {totalCount.toLocaleString()} / {levelInfo.nextThreshold.toLocaleString()} {getTranslation(language, 'counts')}
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressBarBg, { backgroundColor: theme.id === 'darkTemple' ? '#222222' : '#F0F0F0' }]}>
            <View style={[styles.progressBarFill, { backgroundColor: theme.accent, width: `${levelInfo.progressPercentage}%` }]} />
          </View>

          {renderNextLevelText()}
          {/* Collapsible/Expandable Journey Levels list */}
          <TouchableOpacity
            style={[styles.levelsListToggle, { borderTopColor: theme.border }]}
            onPress={() => setIsLevelsListExpanded(!isLevelsListExpanded)}
            activeOpacity={0.7}
          >
            <Text style={[styles.levelsListToggleText, { color: theme.accent }]}>
              {isLevelsListExpanded ? getTranslation(language, 'hideJourneyLevels') : getTranslation(language, 'viewJourneyLevels')}
            </Text>
            <Ionicons
              name={isLevelsListExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={theme.accent}
            />
          </TouchableOpacity>

          {isLevelsListExpanded && (
            <View style={[styles.levelsListContainer, { borderTopColor: theme.border }]}>
              {JOURNEY_LEVELS.map((lvl, index) => {
                const isCompleted = totalCount >= lvl.minCount;
                const isCurrent = levelInfo.name.startsWith(lvl.name);
                return (
                  <View
                    key={lvl.name}
                    style={[
                      styles.journeyLevelItem,
                      isCurrent && { backgroundColor: theme.id === 'darkTemple' ? '#252525' : '#FFF2E6' },
                      !isCompleted && styles.journeyLevelItemLocked
                    ]}
                  >
                    <Text style={styles.journeyLevelIcon}>{lvl.icon}</Text>
                    <Text style={[
                      styles.journeyLevelName,
                      { color: isCompleted ? theme.primaryText : theme.secondaryText, fontWeight: isCompleted ? '600' : 'normal' }
                    ]}>
                      {translateLevelName(lvl.name, language)}{isCurrent && ` ${getTranslation(language, 'currentLabel')}`}
                    </Text>
                    {isCurrent ? (
                      <Text style={[styles.journeyLevelMinCountActive, { color: theme.accent }]}>
                        {getTranslation(language, 'current')}: {totalCount.toLocaleString()} {getTranslation(language, 'counts')}
                      </Text>
                    ) : isCompleted ? (
                      <Text style={[styles.journeyLevelMinCountCompleted, { color: theme.success }]}>
                        {getTranslation(language, 'completedLabel')}
                      </Text>
                    ) : (
                      <Text style={[styles.journeyLevelMinCount, { color: theme.secondaryText }]}>
                        {getTranslation(language, 'requiresChants', { minCount: lvl.minCount.toLocaleString() })}
                      </Text>
                    )}
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
  journeyLevelMinCountActive: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
  },
  journeyLevelMinCountCompleted: {
    fontSize: 12,
    color: '#00BFA5',
    fontWeight: '600',
  },
  // Dark Mode Styles
  darkContainer: {
    backgroundColor: '#000000',
  },
  darkHeaderTitle: {
    color: '#FFFFFF',
  },
  darkCardRow: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowOpacity: 0,
    elevation: 0,
  },
  darkSectionTitle: {
    color: '#8E8E8E',
  },
  darkLevelBadge: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  darkLevelBadgeText: {
    color: '#FFFFFF',
  },
  darkLevelProgressLabel: {
    color: '#CCCCCC',
  },
  darkProgressBarBg: {
    backgroundColor: '#222222',
  },
  darkProgressBarFill: {
    backgroundColor: '#FFFFFF',
  },
  darkNextLevelGoalText: {
    color: '#CCCCCC',
  },
  darkLevelsListToggleText: {
    color: '#FFFFFF',
  },
  darkJourneyLevelItemActive: {
    backgroundColor: '#222222',
  },
  darkJourneyLevelNameCompleted: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  darkJourneyLevelMinCountActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  darkJourneyLevelMinCountCompleted: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
