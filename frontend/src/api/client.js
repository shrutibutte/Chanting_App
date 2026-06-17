import { useStore } from '../store/useStore';
import NetInfo from '@react-native-community/netinfo';

// Set your computer's local IP Address below if testing on physical device on the same Wifi
// Use 'http://10.0.2.2:3030' for standard Android Emulator
// Set your computer's local IP Address below if testing on physical device on the same Wifi
const API_URL = 'http://192.168.129.129:3030';

export const apiCall = async (endpoint, method = 'GET', body = null) => {
  const { userToken } = useStore.getState();
  const headers = {
    'Content-Type': 'application/json',
  };

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
        useStore.getState().logout();
      }
      
      const errorMessage = data.details ? `${data.error}: ${data.details}` : (data.error || 'API Request Failed');
      throw new Error(errorMessage);
    }
    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error.message);
    throw error;
  }
};

let syncPromise = null;

// Batch Sync Logic
export const syncOfflineCounter = async () => {
  const state = useStore.getState();
  
  // Prevent concurrent syncs using the global lock
  if (state.isSyncing || syncPromise) return syncPromise;

  syncPromise = (async () => {
    const tapsToSync = state.unsyncedTaps;

    // Don't sync if internet is out or nothing to sync
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected || tapsToSync <= 0) {
      syncPromise = null;
      return;
    }

    state.setIsSyncing(true);

    try {
      console.log(`Syncing ${tapsToSync} taps to backend...`);
      await apiCall('/sync-taps', 'POST', {
        count: tapsToSync,
        date: new Date().toISOString().split('T')[0]
      });
      
      // ONLY clear taps from local storage after a successful HTTP 200 response
      useStore.getState().clearUnsynced(tapsToSync);
      console.log(`Sync successful! Cleared ${tapsToSync} taps from local storage.`);
    } catch (error) {
      console.log("Sync failed. Taps safely kept in local storage. Will retry automatically.");
      // Taps were never cleared, so no need to put them back!
    } finally {
      useStore.getState().setIsSyncing(false);
      syncPromise = null;
    }
  })();

  return syncPromise;
};

