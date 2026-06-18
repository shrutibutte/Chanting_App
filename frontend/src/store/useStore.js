import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      reminderTime: "08:00", // "HH:mm" format 24-hour style
      setReminderSettings: (enabled, time) => set({ isReminderEnabled: enabled, reminderTime: time }),

      // Daily Goal
      dailyGoal: 108,
      setDailyGoal: (goal) => set({ dailyGoal: goal }),

      // Celebration and Streak Popup tracking
      lastCelebrationDate: null,
      lastStreakMaintainedPopupDate: null,
      showCelebrationModal: false,
      setShowCelebrationModal: (show) => set({ showCelebrationModal: show }),
      setLastStreakMaintainedPopupDate: (date) => set({ lastStreakMaintainedPopupDate: date }),

      // Authentication
      login: (token, emailAddr) => set({ userToken: token, email: emailAddr }),
      logout: () => set({ userToken: null, email: null, totalCount: 0, todayCount: 0, unsyncedTaps: 0, sessionCount: 0, historyRecords: [] }),

      // Session logic
      resetSession: () => set({ sessionCount: 0 }),

      // Manual logging logic
      addManualCount: (countToAdd) => {
        if (countToAdd <= 0) return;
        const currentDate = new Date().toISOString().split('T')[0];
        set((state) => {
          const isNewDay = state.lastSyncDate !== currentDate;
          const nextTodayCount = isNewDay ? countToAdd : state.todayCount + countToAdd;

          let celebrationUpdates = {};
          if (nextTodayCount >= state.dailyGoal && state.lastCelebrationDate !== currentDate) {
            celebrationUpdates = {
              showCelebrationModal: true,
              lastCelebrationDate: currentDate
            };
          }

          return {
            totalCount: state.totalCount + countToAdd,
            todayCount: nextTodayCount,
            unsyncedTaps: state.unsyncedTaps + countToAdd,
            lastSyncDate: currentDate,
            ...celebrationUpdates
          };
        });
      },

      // Chanting logic
      incrementTap: () => {
        const currentDate = new Date().toISOString().split('T')[0];
        set((state) => {
          // If a new day started, reset todayCount locally
          const isNewDay = state.lastSyncDate !== currentDate;
          const nextTodayCount = isNewDay ? 1 : state.todayCount + 1;

          let celebrationUpdates = {};
          // If user crosses the daily goal today for the first time
          if (nextTodayCount >= state.dailyGoal && state.lastCelebrationDate !== currentDate) {
            celebrationUpdates = {
              showCelebrationModal: true,
              lastCelebrationDate: currentDate
            };
          }

          return {
            totalCount: state.totalCount + 1,
            todayCount: nextTodayCount,
            unsyncedTaps: state.unsyncedTaps + 1,
            sessionCount: state.sessionCount + 1,
            lastSyncDate: currentDate,
            ...celebrationUpdates
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
      setStats: (total, today, records = []) => set({ 
        totalCount: total, 
        todayCount: today,
        historyRecords: records
      }),
    }),
    {
      name: 'naam-jaap-storage', 
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
