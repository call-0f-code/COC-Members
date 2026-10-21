import { useQuery } from '@tanstack/react-query';
import {
  getBirthdaysForMonth,
  getTodaysBirthdays,
  getUpcomingBirthdays,
} from '@/utils/api/birthdayApi';
import { todayKeyIST } from '@/utils/birthdayDate';

/**
 * Members whose birthday falls in the given month/year.
 * Feb 29 birthdays come back on Feb 28 in non-leap years.
 */
export const useBirthdayMonth = (month, year) => {
  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ['birthdays', 'month', month, year],
    queryFn: async () => {
      const response = await getBirthdaysForMonth(month, year);
      return response.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: month >= 1 && month <= 12 && year >= 2000,
  });

  return { members, isLoading, error };
};

/**
 * Today's birthdays (IST). Today's date is in the query key so the
 * query refreshes after midnight.
 */
export const useTodayBirthdays = () => {
  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ['birthdays', 'today', todayKeyIST()],
    queryFn: async () => {
      const response = await getTodaysBirthdays();
      return response.data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  return { members, isLoading, error };
};

/**
 * Birthdays in the next `window` days, soonest first.
 */
export const useUpcomingBirthdays = (window = 30) => {
  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ['birthdays', 'upcoming', window, todayKeyIST()],
    queryFn: async () => {
      const response = await getUpcomingBirthdays(window);
      return response.data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  return { members, isLoading, error };
};
