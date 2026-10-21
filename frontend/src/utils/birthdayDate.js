// Date helpers for the birthday calendar. "Today" is always the date in
// India (Asia/Kolkata), matching the backend.

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TIME_ZONE = 'Asia/Kolkata';

/** Today's date in IST as "YYYY-MM-DD". Useful as a query key that changes at midnight. */
export function todayKeyIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIME_ZONE });
}

/** Today's date in IST as numbers. */
export function getTodayIST() {
  const [year, month, day] = todayKeyIST().split('-').map(Number);
  return { year, month, day };
}

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function firstDayOfMonth(month, year) {
  return new Date(year, month - 1, 1).getDay(); // 0=Sun
}

/** Day numbers for a month grid, padded with nulls to whole weeks. */
export function buildCalendarGrid(month, year) {
  const cells = [];
  for (let i = 0; i < firstDayOfMonth(month, year); i++) cells.push(null);
  for (let d = 1; d <= daysInMonth(month, year); d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function formatDaysUntil(daysUntil) {
  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  return `In ${daysUntil} days`;
}

/** The current IST month as { month, year }. */
export function getCurrentMonthIST() {
  const { month, year } = getTodayIST();
  return { month, year };
}
