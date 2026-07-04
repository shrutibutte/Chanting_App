const getStore = () => require('../store/useStore').useStore;
import { getLocalDateString } from '../utils/date.js';

// Set your computer's local IP Address below if testing on physical device on the same Wifi
// Use 'http://10.0.2.2:3030' for standard Android Emulator
// Set your computer's local IP Address below if testing on physical device on the same Wifi
const API_URL = 'http://192.168.77.129:3030';
// const API_URL = "https://naam-jaap-app-backend.vercel.app"

export const apiCall = async (endpoint, method = 'GET', body = null) => {
  const { userToken } = getStore().getState();
  const headers = {};
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  if (userToken) {
    headers['Authorization'] = `Bearer ${userToken}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();
    if (!response.ok) {
      // If the token is invalid or missing, clear the store to force a re-login
      if (response.status === 401 || response.status === 403) {
        getStore().getState().logout();
      }

      const errorMessage = data.details ? `${data.error}: ${data.details}` : (data.error || 'API Request Failed');
      throw new Error(errorMessage);
    }
    return data;
  } catch (error) {
    if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
      console.error(`[API Error] ${endpoint}:`, error.message);
    }
    throw error;
  }
};

let syncPromise = null;

// Batch Sync Logic
export const syncOfflineCounter = async () => {
  const state = getStore().getState();

  // Prevent concurrent syncs using the global lock
  if (state.isSyncing || syncPromise) return syncPromise;

  syncPromise = (async () => {
    // Wait for the local store to finish rehydrating from AsyncStorage on startup
    let attempts = 0;
    while (getStore().persist && !getStore().persist.hasHydrated() && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 50));
      attempts++;
    }

    const unsynced = getStore().getState().unsyncedTapsByDate || {};
    const entriesToSync = Object.entries(unsynced).filter(([_, count]) => count > 0);

    // Don't sync if nothing to sync. 
    // If the device is offline, the apiCall fetch request will fail and be caught safely in the try-catch block.
    if (entriesToSync.length === 0) {
      syncPromise = null;
      return;
    }

    state.setIsSyncing(true);

    try {
      for (const [date, count] of entriesToSync) {
        console.log(`Syncing ${count} taps for date ${date} to backend...`);
        await apiCall('/sync-taps', 'POST', {
          count: count,
          date: date
        });

        // ONLY clear taps from local storage after a successful HTTP 200 response
        getStore().getState().clearUnsyncedForDate(date, count);
        console.log(`Sync successful for ${date}! Cleared ${count} taps.`);
      }
    } catch (error) {
      console.error("Sync failed error:", error);
      console.log("Sync failed. Taps safely kept in local storage. Will retry automatically.");
    } finally {
      getStore().getState().setIsSyncing(false);
      syncPromise = null;
    }
  })();

  return syncPromise;
};

export const fetchCustomNaamsApi = async () => {
  return await apiCall('/custom-naams', 'GET');
};

export const addCustomNaamApi = async (name) => {
  return await apiCall('/custom-naams', 'POST', { name });
};

