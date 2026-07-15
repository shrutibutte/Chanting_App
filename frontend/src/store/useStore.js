import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import { getLocalDateString } from '../utils/date.js';
import { getWeekKey, getMonthKey, getYearKey, getWeeklyChants, getMonthlyChants, getYearlyChants } from '../utils/goals.js';

const { JaapWidgetModule } = NativeModules;

export const JOURNEY_LEVELS = [
  { name: "Devotion Seeker", minCount: 0, icon: "🌱" },
  { name: "Dedicated Devotee", minCount: 1000, icon: "🌸" },
  { name: "Bhakti Warrior", minCount: 2500, icon: "🔥" },
  { name: "Divine Practitioner", minCount: 5000, icon: "🙏" },
  { name: "Sacred Chanter", minCount: 10000, icon: "📿" },
  { name: "Mantra Meditator", minCount: 25000, icon: "🧘" },
  { name: "Spiritual Seeker", minCount: 50000, icon: "✨" },
  { name: "Divine Sage", minCount: 100000, icon: "🔱" },
  { name: "Enlightened Soul", minCount: 250000, icon: "☀️" },
  { name: "Ananda Master", minCount: 500000, icon: "🕉️" },
  { name: "Japa Yogi", minCount: 1000000, icon: "🧘‍♂️" },
  { name: "Bhakti Sage", minCount: 2500000, icon: "🏔️" },
  { name: "Siddha Chanter", minCount: 5000000, icon: "👑" },
  { name: "Koti Master", minCount: 10000000, icon: "💎" },
];

export function getLevelInfo(totalCount) {
  let currentLevelIdx = 0;
  for (let i = JOURNEY_LEVELS.length - 1; i >= 0; i--) {
    if (totalCount >= JOURNEY_LEVELS[i].minCount) {
      currentLevelIdx = i;
      break;
    }
  }

  const currentLevel = JOURNEY_LEVELS[currentLevelIdx];
  let nextLevel = null;
  let remainingCount = 0;
  let nextThreshold = 0;
  let progressPercentage = 100;

  if (currentLevelIdx < JOURNEY_LEVELS.length - 1) {
    nextLevel = JOURNEY_LEVELS[currentLevelIdx + 1];
    nextThreshold = nextLevel.minCount;
    const levelRange = nextThreshold - currentLevel.minCount;
    const progressInLevel = totalCount - currentLevel.minCount;
    progressPercentage = Math.min(100, Math.max(0, (progressInLevel / levelRange) * 100));
    remainingCount = nextThreshold - totalCount;
  } else {
    // Dynamically generate next level for Koti Master
    const extraCounts = totalCount - currentLevel.minCount;
    const currentSubLevel = Math.floor(extraCounts / 1000000);
    const nextSubLevel = currentSubLevel + 1;
    
    const currentTitle = currentSubLevel > 0 ? `${currentLevel.name} Lvl ${currentSubLevel + 1}` : currentLevel.name;
    const nextTitle = `${currentLevel.name} Lvl ${nextSubLevel + 1}`;
    
    nextThreshold = currentLevel.minCount + nextSubLevel * 1000000;
    const currentBase = currentLevel.minCount + currentSubLevel * 1000000;
    const progressInLevel = totalCount - currentBase;
    progressPercentage = Math.min(100, Math.max(0, (progressInLevel / 1000000) * 100));
    remainingCount = nextThreshold - totalCount;
    
    return {
      name: currentTitle,
      icon: currentLevel.icon,
      minCount: currentBase,
      levelIndex: currentLevelIdx + currentSubLevel,
      nextLevelName: nextTitle,
      nextLevelIcon: currentLevel.icon,
      nextThreshold,
      progressPercentage,
      remainingCount,
      isMaxLevel: false
    };
  }

  return {
    name: currentLevel.name,
    icon: currentLevel.icon,
    minCount: currentLevel.minCount,
    levelIndex: currentLevelIdx,
    nextLevelName: nextLevel.name,
    nextLevelIcon: nextLevel.icon,
    nextThreshold,
    progressPercentage,
    remainingCount,
    isMaxLevel: false
  };
}

export function calculateCurrentStreak(historyRecords, todayCount) {
  const grouped = {};
  historyRecords.forEach(r => {
    grouped[r.date] = (grouped[r.date] || 0) + r.count;
  });

  const todayStr = getLocalDateString();
  grouped[todayStr] = todayCount;

  let streak = 0;
  let checkDate = new Date();
  let cDateStr = getLocalDateString(checkDate);
  
  if (!grouped[cDateStr] || grouped[cDateStr] === 0) {
    checkDate.setDate(checkDate.getDate() - 1);
    cDateStr = getLocalDateString(checkDate);
  }
  
  while (grouped[cDateStr] > 0) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
    cDateStr = getLocalDateString(checkDate);
  }
  return streak;
}

export function updateWidget(todayCount, dailyGoal, streak) {
  if (JaapWidgetModule && JaapWidgetModule.updateWidgetData) {
    try {
      JaapWidgetModule.updateWidgetData(todayCount, dailyGoal, streak);
    } catch (e) {
      console.log("Failed to update widget", e.message);
    }
  }
}

export const mergeUnsyncedRecords = (backendRecords, unsyncedTapsByDate) => {
  const merged = [...backendRecords];
  if (!unsyncedTapsByDate) return merged;

  for (const [dateStr, unsyncedCount] of Object.entries(unsyncedTapsByDate)) {
    if (unsyncedCount <= 0) continue;
    const existingIdx = merged.findIndex(r => r.date === dateStr);
    if (existingIdx !== -1) {
      merged[existingIdx].count = merged[existingIdx].count + unsyncedCount;
    } else {
      merged.push({
        id: `local-unsynced-${dateStr}`,
        userId: 'local',
        count: unsyncedCount,
        date: dateStr,
        timestamp: new Date(dateStr).toISOString()
      });
    }
  }

  return merged.sort((a, b) => b.date.localeCompare(a.date));
};

export const useStore = create(
  persist(
    (set, get) => ({
      userToken: null,
      email: null,
      totalCount: 0,       // Total all-time taps (synced + unsynced)
      todayCount: 0,       // Today's total taps
      unsyncedTaps: 0,     // Taps waiting to be sent to backend
      unsyncedTapsByDate: {}, // Map of YYYY-MM-DD -> count for offline preservation
      sessionCount: 0,     // Current active session taps
      lastSyncDate: null,
      historyRecords: [],  // Array of raw daily records from backend
      
      // Goals Configuration
      goals: {
        daily: 108,
        weekly: 756,
        monthly: 3240,
        yearly: 38880
      },
      autoCalculateGoals: true,
      setGoals: (newGoals) => set((state) => {
        const nextGoals = { ...state.goals, ...newGoals };
        
        // Push update to Android Widget
        const streak = calculateCurrentStreak(state.historyRecords, state.todayCount);
        updateWidget(state.todayCount, nextGoals.daily, streak);

        return { goals: nextGoals };
      }),
      setAutoCalculateGoals: (status) => set((state) => {
        const daily = state.goals.daily;
        const nextGoals = status ? {
          daily,
          weekly: daily * 7,
          monthly: daily * 30,
          yearly: daily * 365
        } : state.goals;

        return { autoCalculateGoals: status, goals: nextGoals };
      }),

      // Chanting Settings
      currentNaam: { name: 'Krishna', subtitle: 'The Supreme Personality' },
      setNaam: (naam) => set({ currentNaam: naam }),

      // Reminder Settings
      isReminderEnabled: true,
      reminderTime: "05:30", // "HH:mm" format 24-hour style
      setReminderSettings: (enabled, time) => set({ isReminderEnabled: enabled, reminderTime: time }),

      // Daily Goal (Legacy support - updates goals.daily)
      dailyGoal: 108,
      setDailyGoal: (goal) => set((state) => {
        const nextGoals = {
          daily: goal,
          weekly: state.autoCalculateGoals ? goal * 7 : state.goals.weekly,
          monthly: state.autoCalculateGoals ? goal * 30 : state.goals.monthly,
          yearly: state.autoCalculateGoals ? goal * 365 : state.goals.yearly
        };

        const streak = calculateCurrentStreak(state.historyRecords, state.todayCount);
        updateWidget(state.todayCount, goal, streak);

        return { dailyGoal: goal, goals: nextGoals };
      }),

      // Theme System
      themeId: 'peach',
      setThemeId: (id) => set((state) => {
        // Compatibility toggle for isDarkMode
        const isDark = id === 'darkTemple';
        return { themeId: id, isDarkMode: isDark };
      }),
      isDarkMode: false,
      toggleDarkMode: () => set((state) => {
        const nextTheme = state.isDarkMode ? 'peach' : 'darkTemple';
        return { isDarkMode: !state.isDarkMode, themeId: nextTheme };
      }),

      // Language
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),

      // Custom Naams
      customNaams: [],
      fetchCustomNaams: async () => {
        try {
          const { apiCall } = require('../api/client');
          const data = await apiCall('/custom-naams', 'GET');
          if (data && data.success) {
            set({ customNaams: data.naams || [] });
          }
        } catch (err) {
          console.log("Failed to fetch custom naams", err.message);
        }
      },
      addCustomNaam: async (name) => {
        try {
          const { apiCall } = require('../api/client');
          const data = await apiCall('/custom-naams', 'POST', { name });
          if (data && data.success) {
            set((state) => ({
              customNaams: [...state.customNaams, data.naam]
            }));
            return data.naam;
          }
        } catch (err) {
          if (!err.message.includes('already exists')) {
            console.log("Failed to add custom naam", err.message);
          }
          throw err;
        }
      },

      // Celebration and Streak Popup tracking
      lastCelebrationDate: null,
      lastWeeklyGoalCelebrated: null,
      lastMonthlyGoalCelebrated: null,
      lastYearlyGoalCelebrated: null,
      lastStreakMaintainedPopupDate: null,
      showCelebrationModal: false,
      celebrationType: 'daily',
      setShowCelebrationModal: (show) => set({ showCelebrationModal: show }),
      setCelebrationType: (type) => set({ celebrationType: type }),
      setLastStreakMaintainedPopupDate: (date) => set({ lastStreakMaintainedPopupDate: date }),
      
      // Blackout Mode global state
      isBlackoutMode: false,
      setIsBlackoutMode: (status) => set({ isBlackoutMode: status }),

      // Hide Naam global state
      isNaamHidden: false,
      setIsNaamHidden: (status) => set({ isNaamHidden: status }),

      // Journey Levels
      lastUnlockedLevel: 0,
      showLevelModal: false,
      unlockedLevelInfo: null,
      setShowLevelModal: (show) => set({ showLevelModal: show }),

      // Authentication
      login: (token, emailAddr) => set({ userToken: token, email: emailAddr }),
      logout: async () => {
        // Sync any unsynced taps first if there's a token
        const state = get();
        if (state.userToken && state.unsyncedTaps > 0) {
          try {
            const { syncOfflineCounter } = require('../api/client');
            await syncOfflineCounter();
          } catch (e) {
            console.log("Failed to sync before logout", e.message);
          }
        }
        set({ 
          userToken: null, 
          email: null, 
          totalCount: 0, 
          todayCount: 0, 
          unsyncedTaps: 0, 
          unsyncedTapsByDate: {},
          sessionCount: 0, 
          lastSyncDate: null,
          historyRecords: [],
          lastUnlockedLevel: 0,
          showLevelModal: false,
          unlockedLevelInfo: null,
          lastCelebrationDate: null,
          lastStreakMaintainedPopupDate: null,
          customNaams: [],
          isBlackoutMode: false,
          isNaamHidden: false,
          themeId: 'peach',
          isDarkMode: false,
          goals: {
            daily: 108,
            weekly: 756,
            monthly: 3240,
            yearly: 38880
          },
          autoCalculateGoals: true
        });
        updateWidget(0, 108, 0);
      },

      // Reset count action
      resetCount: async () => {
        try {
          const { apiCall } = require('../api/client');
          if (get().userToken) {
            await apiCall('/stats/reset', 'POST');
          }
        } catch (err) {
          console.log("Failed to reset stats on server", err.message);
          throw err;
        } finally {
          set({
            totalCount: 0,
            todayCount: 0,
            unsyncedTaps: 0,
            sessionCount: 0,
            historyRecords: [],
            lastUnlockedLevel: 0,
            showLevelModal: false,
            unlockedLevelInfo: null,
            lastCelebrationDate: null,
            lastStreakMaintainedPopupDate: null,
          });
          const streak = calculateCurrentStreak([], 0);
          updateWidget(0, get().goals?.daily || 108, streak);
        }
      },

      // Session logic
      resetSession: () => set({ sessionCount: 0 }),

      // Daily Reset Check
      checkDailyReset: () => {
        const currentDate = getLocalDateString();
        const state = get();
        if (state.lastSyncDate && state.lastSyncDate !== currentDate) {
          const yesterdayDate = state.lastSyncDate;
          const yesterdayCount = state.todayCount;
          let nextHistoryRecords = [...state.historyRecords];

          if (yesterdayCount > 0) {
            const existingIdx = nextHistoryRecords.findIndex(r => r.date === yesterdayDate);
            if (existingIdx !== -1) {
              nextHistoryRecords[existingIdx].count = Math.max(nextHistoryRecords[existingIdx].count, yesterdayCount);
            } else {
              nextHistoryRecords.push({ date: yesterdayDate, count: yesterdayCount });
            }
          }

          set({
            todayCount: 0,
            lastSyncDate: currentDate,
            sessionCount: 0,
            historyRecords: nextHistoryRecords
          });
          const streak = calculateCurrentStreak(nextHistoryRecords, 0);
          updateWidget(0, state.goals.daily, streak);
          return true;
        } else if (!state.lastSyncDate) {
          set({ lastSyncDate: currentDate });
        }
      },
      // Manual logging logic
      addManualCount: (countToAdd, targetDateStr) => {
        if (countToAdd <= 0) return;
        const currentDate = getLocalDateString();
        const activeDateStr = targetDateStr || currentDate;
        
        const parts = activeDateStr.split('-');
        const targetDateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        const targetWeekKey = getWeekKey(targetDateObj);
        const targetMonthKey = getMonthKey(targetDateObj);
        const targetYearKey = getYearKey(targetDateObj);

        set((state) => {
          let nextHistoryRecords = [...state.historyRecords];
          let nextTodayCount = state.todayCount;

          if (activeDateStr === currentDate) {
            const isNewDay = state.lastSyncDate !== currentDate;
            if (isNewDay && state.lastSyncDate && state.todayCount > 0) {
              const yesterdayDate = state.lastSyncDate;
              const yesterdayCount = state.todayCount;
              const existingIdx = nextHistoryRecords.findIndex(r => r.date === yesterdayDate);
              if (existingIdx !== -1) {
                nextHistoryRecords[existingIdx].count = Math.max(nextHistoryRecords[existingIdx].count, yesterdayCount);
              } else {
                nextHistoryRecords.push({ date: yesterdayDate, count: yesterdayCount });
              }
            }
            nextTodayCount = isNewDay ? countToAdd : state.todayCount + countToAdd;
          } else {
            const existingIdx = nextHistoryRecords.findIndex(r => r.date === activeDateStr);
            if (existingIdx !== -1) {
              nextHistoryRecords[existingIdx].count += countToAdd;
            } else {
              nextHistoryRecords.push({ date: activeDateStr, count: countToAdd });
            }
          }

          const nextTotalCount = state.totalCount + countToAdd;

          // Check all multi-goals
          const weeklyTotal = getWeeklyChants(nextHistoryRecords, nextTodayCount);
          const monthlyTotal = getMonthlyChants(nextHistoryRecords, nextTodayCount);
          const yearlyTotal = getYearlyChants(nextHistoryRecords, nextTodayCount);

          let celebrationUpdates = {};
          if (nextTodayCount >= state.goals.daily && state.lastCelebrationDate !== currentDate) {
            celebrationUpdates = {
              showCelebrationModal: true,
              celebrationType: 'daily',
              lastCelebrationDate: currentDate
            };
          } else if (weeklyTotal >= state.goals.weekly && state.lastWeeklyGoalCelebrated !== targetWeekKey) {
            celebrationUpdates = {
              showCelebrationModal: true,
              celebrationType: 'weekly',
              lastWeeklyGoalCelebrated: targetWeekKey
            };
          } else if (monthlyTotal >= state.goals.monthly && state.lastMonthlyGoalCelebrated !== targetMonthKey) {
            celebrationUpdates = {
              showCelebrationModal: true,
              celebrationType: 'monthly',
              lastMonthlyGoalCelebrated: targetMonthKey
            };
          } else if (yearlyTotal >= state.goals.yearly && state.lastYearlyGoalCelebrated !== targetYearKey) {
            celebrationUpdates = {
              showCelebrationModal: true,
              celebrationType: 'yearly',
              lastYearlyGoalCelebrated: targetYearKey
            };
          }

          let levelUpdates = {};
          const currentLevelInfo = getLevelInfo(nextTotalCount);
          if (currentLevelInfo.levelIndex > state.lastUnlockedLevel) {
            levelUpdates = {
              lastUnlockedLevel: currentLevelInfo.levelIndex,
              showLevelModal: true,
              unlockedLevelInfo: {
                name: currentLevelInfo.name,
                icon: currentLevelInfo.icon,
                target: currentLevelInfo.minCount
              }
            };
          }

          const streak = calculateCurrentStreak(nextHistoryRecords, nextTodayCount);
          updateWidget(nextTodayCount, state.goals.daily, streak);

          const nextUnsynced = { ...state.unsyncedTapsByDate };
          nextUnsynced[activeDateStr] = (nextUnsynced[activeDateStr] || 0) + countToAdd;

          return {
            totalCount: nextTotalCount,
            todayCount: nextTodayCount,
            unsyncedTaps: state.unsyncedTaps + countToAdd,
            unsyncedTapsByDate: nextUnsynced,
            lastSyncDate: currentDate,
            historyRecords: nextHistoryRecords,
            ...celebrationUpdates,
            ...levelUpdates
          };
        });

        // Trigger sync immediately!
        try {
          const { syncOfflineCounter } = require('../api/client');
          syncOfflineCounter();
        } catch (e) {
          console.log("Failed to sync manually added count immediately", e.message);
        }
      },

      // Chanting logic
      incrementTap: () => {
        const currentDate = getLocalDateString();
        const todayDateObj = new Date();
        const currentWeekKey = getWeekKey(todayDateObj);
        const currentMonthKey = getMonthKey(todayDateObj);
        const currentYearKey = getYearKey(todayDateObj);

        set((state) => {
          // If a new day started, reset todayCount locally
          const isNewDay = state.lastSyncDate !== currentDate;
          let nextHistoryRecords = [...state.historyRecords];

          if (isNewDay && state.lastSyncDate && state.todayCount > 0) {
            const yesterdayDate = state.lastSyncDate;
            const yesterdayCount = state.todayCount;
            const existingIdx = nextHistoryRecords.findIndex(r => r.date === yesterdayDate);
            if (existingIdx !== -1) {
              nextHistoryRecords[existingIdx].count = Math.max(nextHistoryRecords[existingIdx].count, yesterdayCount);
            } else {
              nextHistoryRecords.push({ date: yesterdayDate, count: yesterdayCount });
            }
          }

          const nextTodayCount = isNewDay ? 1 : state.todayCount + 1;
          const nextTotalCount = state.totalCount + 1;

          // Check all multi-goals
          const weeklyTotal = getWeeklyChants(nextHistoryRecords, nextTodayCount);
          const monthlyTotal = getMonthlyChants(nextHistoryRecords, nextTodayCount);
          const yearlyTotal = getYearlyChants(nextHistoryRecords, nextTodayCount);

          let celebrationUpdates = {};
          if (nextTodayCount >= state.goals.daily && state.lastCelebrationDate !== currentDate) {
            celebrationUpdates = {
              showCelebrationModal: true,
              celebrationType: 'daily',
              lastCelebrationDate: currentDate
            };
          } else if (weeklyTotal >= state.goals.weekly && state.lastWeeklyGoalCelebrated !== currentWeekKey) {
            celebrationUpdates = {
              showCelebrationModal: true,
              celebrationType: 'weekly',
              lastWeeklyGoalCelebrated: currentWeekKey
            };
          } else if (monthlyTotal >= state.goals.monthly && state.lastMonthlyGoalCelebrated !== currentMonthKey) {
            celebrationUpdates = {
              showCelebrationModal: true,
              celebrationType: 'monthly',
              lastMonthlyGoalCelebrated: currentMonthKey
            };
          } else if (yearlyTotal >= state.goals.yearly && state.lastYearlyGoalCelebrated !== currentYearKey) {
            celebrationUpdates = {
              showCelebrationModal: true,
              celebrationType: 'yearly',
              lastYearlyGoalCelebrated: currentYearKey
            };
          }

          let levelUpdates = {};
          const currentLevelInfo = getLevelInfo(nextTotalCount);
          if (currentLevelInfo.levelIndex > state.lastUnlockedLevel) {
            levelUpdates = {
              lastUnlockedLevel: currentLevelInfo.levelIndex,
              showLevelModal: true,
              unlockedLevelInfo: {
                name: currentLevelInfo.name,
                icon: currentLevelInfo.icon,
                target: currentLevelInfo.minCount
              }
            };
          }

          const streak = calculateCurrentStreak(nextHistoryRecords, nextTodayCount);
          updateWidget(nextTodayCount, state.goals.daily, streak);

          const nextUnsynced = { ...state.unsyncedTapsByDate };
          nextUnsynced[currentDate] = (nextUnsynced[currentDate] || 0) + 1;

          return {
            totalCount: nextTotalCount,
            todayCount: nextTodayCount,
            unsyncedTaps: state.unsyncedTaps + 1,
            unsyncedTapsByDate: nextUnsynced,
            sessionCount: state.sessionCount + 1,
            lastSyncDate: currentDate,
            historyRecords: nextHistoryRecords,
            ...celebrationUpdates,
            ...levelUpdates
          };
        });
      },

      // Called when batch sync is successful
      clearUnsynced: (batchSize) => set((state) => ({
        unsyncedTaps: Math.max(0, state.unsyncedTaps - batchSize)
      })),

      clearUnsyncedForDate: (date, countToClear) => set((state) => {
        const nextUnsynced = { ...state.unsyncedTapsByDate };
        if (nextUnsynced[date]) {
          nextUnsynced[date] = Math.max(0, nextUnsynced[date] - countToClear);
          if (nextUnsynced[date] === 0) {
            delete nextUnsynced[date];
          }
        }
        const totalUnsynced = Object.values(nextUnsynced).reduce((a, b) => a + b, 0);
        return { unsyncedTapsByDate: nextUnsynced, unsyncedTaps: totalUnsynced };
      }),

      // Sync Lock
      isSyncing: false,
      setIsSyncing: (status) => set({ isSyncing: status }),

      // Sync backend stats with local stats
      setStats: (total, today, records = []) => set((state) => {
        const mergedRecords = mergeUnsyncedRecords(records, state.unsyncedTapsByDate);
        const currentLevelInfo = getLevelInfo(total);
        const dailyTarget = state.goals?.daily || state.dailyGoal || 108;
        
        const streak = calculateCurrentStreak(mergedRecords, today);
        updateWidget(today, dailyTarget, streak);

        return { 
          totalCount: total, 
          todayCount: today,
          historyRecords: mergedRecords,
          lastSyncDate: getLocalDateString(),
          lastUnlockedLevel: Math.max(state.lastUnlockedLevel, currentLevelInfo.levelIndex)
        };
      }),
    }),
    {
      name: 'naam-jaap-storage', 
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        // Exclude transient/loading states from being written to AsyncStorage
        const { isSyncing, ...rest } = state;
        return rest;
      },
      onRehydrateStorage: (state) => {
        return (state, error) => {
          if (state && !error) {
            // Force reset isSyncing to false on startup/reload to prevent lockouts
            state.setIsSyncing(false);
            
            if (!state.unsyncedTapsByDate) {
              state.unsyncedTapsByDate = {};
              if (state.unsyncedTaps > 0) {
                const fallbackDate = state.lastSyncDate || getLocalDateString();
                state.unsyncedTapsByDate[fallbackDate] = state.unsyncedTaps;
              }
            }

            // Backward compatibility checks
            const current = state;
            if (!current.goals || typeof current.goals !== 'object') {
              const base = current.dailyGoal || 108;
              current.setGoals({
                daily: base,
                weekly: base * 7,
                monthly: base * 30,
                yearly: base * 365
              });
            }
            if (current.autoCalculateGoals === undefined) {
              current.setAutoCalculateGoals(true);
            }
            if (!current.themeId) {
              current.setThemeId(current.isDarkMode ? 'darkTemple' : 'peach');
            }

            state.checkDailyReset();
            
            // Sync widget status
            const streak = calculateCurrentStreak(state.historyRecords, state.todayCount);
            updateWidget(state.todayCount, state.goals?.daily || 108, streak);
          }
        };
      }
    }
  )
);
