import { getLocalDateString } from './date.js';

export function getWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const year = d.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil((((d - start) / 86400000) + 1) / 7);
  return `${year}-W${week}`;
}

export function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export function getYearKey(date = new Date()) {
  return `${date.getFullYear()}`;
}

export function getWeeklyChants(historyRecords, todayCount) {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sun, 1 = Mon ...
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const mondayDate = new Date(today);
  mondayDate.setDate(today.getDate() + diffToMonday);
  mondayDate.setHours(0, 0, 0, 0);

  let total = todayCount;
  const todayStr = getLocalDateString(today);
  historyRecords.forEach(r => {
    const recordDate = new Date(r.date + 'T00:00:00');
    if (recordDate >= mondayDate && r.date !== todayStr) {
      total += r.count;
    }
  });
  return total;
}

export function getMonthlyChants(historyRecords, todayCount) {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  startOfMonth.setHours(0,0,0,0);
  
  let total = todayCount;
  const todayStr = getLocalDateString(today);
  historyRecords.forEach(r => {
    const recordDate = new Date(r.date + 'T00:00:00');
    if (recordDate >= startOfMonth && r.date !== todayStr) {
      total += r.count;
    }
  });
  return total;
}

export function getYearlyChants(historyRecords, todayCount) {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  startOfYear.setHours(0,0,0,0);
  
  let total = todayCount;
  const todayStr = getLocalDateString(today);
  historyRecords.forEach(r => {
    const recordDate = new Date(r.date + 'T00:00:00');
    if (recordDate >= startOfYear && r.date !== todayStr) {
      total += r.count;
    }
  });
  return total;
}
