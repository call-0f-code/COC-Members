import api from './api';
import { UPCOMING_BIRTHDAY_WINDOW_DAYS } from '@/constants/birthdayConstants';

/**
 * Fetch birthday data for a given month/year.
 * Returns members with birthdays in that month.
 */
export const getBirthdaysForMonth = async (month, year) => {
  const response = await api.get(`/birthdays?month=${month}&year=${year}`);
  return response.data; // { success, month, year, data: PublicBirthdayMember[] }
};

/**
 * Fetch upcoming birthdays within the next `window` days (default 30).
 */
export const getUpcomingBirthdays = async (window = UPCOMING_BIRTHDAY_WINDOW_DAYS) => {
  const response = await api.get(`/birthdays/upcoming?window=${window}`);
  return response.data; // { success, window, data: (PublicBirthdayMember & { daysUntil })[] }
};
