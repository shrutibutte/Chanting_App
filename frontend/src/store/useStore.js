import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useStore = create(
  persist(
    (set, get) => ({
      userToken: null,
      phoneNumber: null,
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
      isReminderEnabled: false,
      reminderTime: "08:00", // "HH:mm" format 24-hour style
      setReminderSettings: (enabled, time) => set({ isReminderEnabled: enabled, reminderTime: time }),

      // Daily Goal
      dailyGoal: 108,
      setDailyGoal: (goal) => set({ dailyGoal: goal }),

      // Authentication
      login: (token, phone) => set({ userToken: token, phoneNumber: phone }),
      logout: () => set({ userToken: null, phoneNumber: null, totalCount: 0, todayCount: 0, unsyncedTaps: 0, sessionCount: 0, historyRecords: [] }),

      // Session logic
      resetSession: () => set({ sessionCount: 0 }),

      // Chanting logic
      incrementTap: () => {
        const currentDate = new Date().toISOString().split('T')[0];
        set((state) => {
          // If a new day started, we could optionally reset todayCount here, 
          // For simplicity we will fetch it periodically, but let's increment local for instant feedback
          const isNewDay = state.lastSyncDate !== currentDate;
          return {
            totalCount: state.totalCount + 1,
            todayCount: isNewDay ? 1 : state.todayCount + 1,
            unsyncedTaps: state.unsyncedTaps + 1,
            sessionCount: state.sessionCount + 1,
            lastSyncDate: currentDate,
          };
        });
      },

      // Called when batch sync is successful
      clearUnsynced: (batchSize) => set((state) => ({
        unsyncedTaps: Math.max(0, state.unsyncedTaps - batchSize)
      })),

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
