import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
let Notifications = null;

try {
  if (!isWeb) {
    Notifications = require('expo-notifications');
    
    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch (e) {
  console.warn("expo-notifications native modules not available:", e.message);
  Notifications = null;
}

export async function requestNotificationPermissions() {
  if (isWeb || !Notifications) {
    console.warn("Notifications not supported in this environment.");
    return false;
  }
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (err) {
    console.error("Error requesting notification permission:", err);
    return false;
  }
}

export async function scheduleDailyReminder(timeStr) {
  if (isWeb || !Notifications) return;
  try {
    // Cancel all existing scheduled notifications first to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    const [hours, minutes] = timeStr.split(':').map(Number);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🌸 Time for Naam Jaap!",
        body: "Start your daily Naam Jaap to maintain your streak of devotion 🙏",
        sound: true,
      },
      trigger: {
        type: 'daily',
        hour: hours,
        minute: minutes,
      },
    });
  } catch (err) {
    console.error("Error scheduling notification:", err);
  }
}

export async function cancelAllReminders() {
  if (isWeb || !Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.error("Error canceling notifications:", err);
  }
}

export async function updateTargetReminder(todayCount, dailyGoal) {
  if (isWeb || !Notifications) return;
  try {
    // Cancel any existing target completion reminder to avoid duplicates
    try {
      await Notifications.cancelScheduledNotificationAsync("target-completion-reminder");
    } catch (e) {
      // Ignore if no scheduled notification found with this ID
    }

    const now = new Date();
    const targetTime = new Date();
    // For testing, you can change these numbers to match your current time (e.g., setHours(17, 59, 0, 0))
    targetTime.setHours(18, 0, 0, 0); // 6:00 PM (18:00) today

    // If goal is completed today, or if it is already past 8:00 PM today,
    // schedule the target reminder for tomorrow at 8:00 PM.
    if (todayCount >= dailyGoal || now.getTime() >= targetTime.getTime()) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      identifier: "target-completion-reminder",
      content: {
        title: "🎯 Daily Goal Reminder",
        body: "You haven't completed your daily chanting target yet. Keep your streak alive! 🙏",
        sound: true,
      },
      trigger: {
        type: 'date',
        date: targetTime.getTime(),
      },
    });
    
    console.log(`[Notification] Target completion reminder scheduled for: ${targetTime.toString()}`);
  } catch (err) {
    console.error("Error scheduling target reminder:", err);
  }
}
