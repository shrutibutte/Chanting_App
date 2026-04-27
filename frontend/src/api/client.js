import { useStore } from '../store/useStore';
import NetInfo from '@react-native-community/netinfo';

// Set your computer's local IP Address below if testing on physical device on the same Wifi
// Use 'http://10.0.2.2:3030' for standard Android Emulator
// Set your computer's local IP Address below if testing on physical device on the same Wifi
const API_URL = 'http://192.168.1.4:3030'; 

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
      const errorMessage = data.details ? `${data.error}: ${data.details}` : (data.error || 'API Request Failed');
      throw new Error(errorMessage);
    }
    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error.message);
    throw error;
  }
};

// Batch Sync Logic
export const syncOfflineCounter = async () => {
  const state = useStore.getState();
  const tapsToSync = state.unsyncedTaps;

  // Don't sync if internet is out or nothing to sync
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected || tapsToSync <= 0) return;

  // Optimistically clear the taps so concurrent calls don't double count
  state.clearUnsynced(tapsToSync);

  try {
    console.log(`Syncing ${tapsToSync} taps to backend...`);
    await apiCall('/sync-taps', 'POST', { 
      count: tapsToSync, 
      date: new Date().toISOString().split('T')[0] 
    });
    console.log(`Sync successful!`);
  } catch (error) {
    console.log("Sync failed, will retry later.");
    // Put them back if the request failed
    useStore.setState((s) => ({
      unsyncedTaps: s.unsyncedTaps + tapsToSync
    }));
  }
};
