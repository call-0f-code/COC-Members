import { useQuery } from '@tanstack/react-query';
import {
  getBirthdaysForMonth,
  getTodaysBirthdays,
  getUpcomingBirthdays,
} from '@/utils/api/birthdayApi';

/**
 * Hook for fetching birthday members for a specific month/year.
 * Caches per month+year key; refetches when month/year changes.
 */
export function useBirthdayMonth(month, year) {
  return useQuery({
    queryKey: ['birthdays', 'month', month, year],
    queryFn: () => getBirthdaysForMonth(month, year),
    select: (data) => data.data ?? [],
    staleTime: 5 * 60 * 1000,
    enabled: month >= 1 && month <= 12 && year >= 2000,
  });
}

/**
 * Hook for today's birthdays (IST). Updates automatically each day
 * because the queryKey contains today's date string.
 */
export function useTodayBirthdays() {
  // Include today's date in the key so the query refreshes at midnight
  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return useQuery({
    queryKey: ['birthdays', 'today', todayKey],
    queryFn: getTodaysBirthdays,
    select: (data) => data.data ?? [],
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook for upcoming birthdays within the next `window` days.
 */
export function useUpcomingBirthdays(window = 30) {
  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return useQuery({
    queryKey: ['birthdays', 'upcoming', window, todayKey],
    queryFn: () => getUpcomingBirthdays(window),
    select: (data) => data.data ?? [],
    staleTime: 10 * 60 * 1000,
  });
}
