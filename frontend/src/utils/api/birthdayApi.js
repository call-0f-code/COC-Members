import api from './api';

/**
 * Fetch birthday data for a given month/year.
 * Returns members with birthdays in that month.
 */
export const getBirthdaysForMonth = async (month, year) => {
  const response = await api.get(`/birthdays?month=${month}&year=${year}`);
  return response.data; // { success, month, year, data: PublicBirthdayMember[] }
};

/**
 * Fetch today's birthdays (determined server-side in Asia/Kolkata).
 */
export const getTodaysBirthdays = async () => {
  const response = await api.get('/birthdays/today');
  return response.data; // { success, data: PublicBirthdayMember[] }
};

/**
 * Fetch upcoming birthdays within the next `window` days (default 30).
 */
export const getUpcomingBirthdays = async (window = 30) => {
  const response = await api.get(`/birthdays/upcoming?window=${window}`);
  return response.data; // { success, window, data: (PublicBirthdayMember & { daysUntil })[] }
};
