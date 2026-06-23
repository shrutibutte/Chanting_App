import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateString } from '../utils/date.js';

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
    // Dynamically generate next level for Ananda Master
    const extraCounts = totalCount - currentLevel.minCount;
    const currentSubLevel = Math.floor(extraCounts / 100000);
    const nextSubLevel = currentSubLevel + 1;
    
    const currentTitle = currentSubLevel > 0 ? `${currentLevel.name} Lvl ${currentSubLevel + 1}` : currentLevel.name;
    const nextTitle = `${currentLevel.name} Lvl ${nextSubLevel + 1}`;
    
    nextThreshold = currentLevel.minCount + nextSubLevel * 100000;
    const currentBase = currentLevel.minCount + currentSubLevel * 100000;
    const progressInLevel = totalCount - currentBase;
    progressPercentage = Math.min(100, Math.max(0, (progressInLevel / 100000) * 100));
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

export const useStore = create(
  persist(
    (set, get) => ({
      userToken: null,
      email: null,
      totalCount: 0,       // Total all-time taps (synced + unsynced)
      todayCount: 0,       // Today's total taps
      unsyncedTaps: 0,     // Taps waiting to be sent to backend
      sessionCount: 0,     // Current active session taps
      lastSyncDate: null,
      historyRecords: [],  // Array of raw daily records from backend
      
      // Chanting Settings
      currentNaam: { name: 'Krishna', subtitle: 'The Supreme Personality' },
      setNaam: (naam) => set({ currentNaam: naam }),

      // Reminder Settings
      isReminderEnabled: true,
      reminderTime: "05:30", // "HH:mm" format 24-hour style
      setReminderSettings: (enabled, time) => set({ isReminderEnabled: enabled, reminderTime: time }),

      // Daily Goal
      dailyGoal: 108,
      setDailyGoal: (goal) => set({ dailyGoal: goal }),

      // Theme Mode
      isDarkMode: false,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

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
      lastStreakMaintainedPopupDate: null,
      showCelebrationModal: false,
      setShowCelebrationModal: (show) => set({ showCelebrationModal: show }),
      setLastStreakMaintainedPopupDate: (date) => set({ lastStreakMaintainedPopupDate: date }),
      
      // Blackout Mode global state
      isBlackoutMode: false,
      setIsBlackoutMode: (status) => set({ isBlackoutMode: status }),

      // Journey Levels
      lastUnlockedLevel: 0,
      showLevelModal: false,
      unlockedLevelInfo: null,
      setShowLevelModal: (show) => set({ showLevelModal: show }),

      // Authentication
      login: (token, emailAddr) => set({ userToken: token, email: emailAddr }),
      logout: () => set({ 
        userToken: null, 
        email: null, 
        totalCount: 0, 
        todayCount: 0, 
        unsyncedTaps: 0, 
        sessionCount: 0, 
        lastSyncDate: null,
        historyRecords: [],
        lastUnlockedLevel: 0,
        showLevelModal: false,
        unlockedLevelInfo: null,
        lastCelebrationDate: null,
        lastStreakMaintainedPopupDate: null,
        customNaams: [],
        isBlackoutMode: false
      }),

      // Session logic
      resetSession: () => set({ sessionCount: 0 }),

      // Daily Reset Check
      checkDailyReset: () => {
        const currentDate = getLocalDateString();
        const state = get();
        if (state.lastSyncDate && state.lastSyncDate !== currentDate) {
          set({
            todayCount: 0,
            lastSyncDate: currentDate,
            sessionCount: 0
          });
          return true;
        } else if (!state.lastSyncDate) {
          set({ lastSyncDate: currentDate });
        }
        return false;
      },

      // Manual logging logic
      addManualCount: (countToAdd) => {
        if (countToAdd <= 0) return;
        const currentDate = getLocalDateString();
        set((state) => {
          const isNewDay = state.lastSyncDate !== currentDate;
          const nextTodayCount = isNewDay ? countToAdd : state.todayCount + countToAdd;
          const nextTotalCount = state.totalCount + countToAdd;

          let celebrationUpdates = {};
          if (nextTodayCount >= state.dailyGoal && state.lastCelebrationDate !== currentDate) {
            celebrationUpdates = {
              showCelebrationModal: true,
              lastCelebrationDate: currentDate
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

          return {
            totalCount: nextTotalCount,
            todayCount: nextTodayCount,
            unsyncedTaps: state.unsyncedTaps + countToAdd,
            lastSyncDate: currentDate,
            ...celebrationUpdates,
            ...levelUpdates
          };
        });
      },

      // Chanting logic
      incrementTap: () => {
        const currentDate = getLocalDateString();
        set((state) => {
          // If a new day started, reset todayCount locally
          const isNewDay = state.lastSyncDate !== currentDate;
          const nextTodayCount = isNewDay ? 1 : state.todayCount + 1;
          const nextTotalCount = state.totalCount + 1;

          let celebrationUpdates = {};
          // If user crosses the daily goal today for the first time
          if (nextTodayCount >= state.dailyGoal && state.lastCelebrationDate !== currentDate) {
            celebrationUpdates = {
              showCelebrationModal: true,
              lastCelebrationDate: currentDate
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

          return {
            totalCount: nextTotalCount,
            todayCount: nextTodayCount,
            unsyncedTaps: state.unsyncedTaps + 1,
            sessionCount: state.sessionCount + 1,
            lastSyncDate: currentDate,
            ...celebrationUpdates,
            ...levelUpdates
          };
        });
      },

      // Called when batch sync is successful
      clearUnsynced: (batchSize) => set((state) => ({
        unsyncedTaps: Math.max(0, state.unsyncedTaps - batchSize)
      })),

      // Sync Lock
      isSyncing: false,
      setIsSyncing: (status) => set({ isSyncing: status }),

      // Sync backend stats with local stats
      setStats: (total, today, records = []) => set((state) => {
        const currentLevelInfo = getLevelInfo(total);
        return { 
          totalCount: total, 
          todayCount: today,
          historyRecords: records,
          lastSyncDate: getLocalDateString(),
          lastUnlockedLevel: Math.max(state.lastUnlockedLevel, currentLevelInfo.levelIndex)
        };
      }),
    }),
    {
      name: 'naam-jaap-storage', 
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: (state) => {
        return (state, error) => {
          if (state && !error) {
            state.checkDailyReset();
          }
        };
      }
    }
  )
);
