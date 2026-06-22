/**
 * Helper to get local date string in YYYY-MM-DD format
 * matching the user's local device clock/timezone.
 */
export function getLocalDateString(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper to shift a date by N days and return the local YYYY-MM-DD string.
 */
export function getShiftedLocalDateString(daysOffset, baseDate = new Date()) {
  const targetDate = new Date(baseDate);
  targetDate.setDate(targetDate.getDate() + daysOffset);
  return getLocalDateString(targetDate);
}
