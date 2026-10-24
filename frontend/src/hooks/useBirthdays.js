import { useEffect } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBirthdaysForMonth,
  getUpcomingBirthdays,
} from '@/utils/api/birthdayApi';
import { shiftMonth, todayKeyIST } from '@/utils/birthdayDate';
import { UPCOMING_BIRTHDAY_WINDOW_DAYS } from '@/constants/birthdayConstants';

const birthdayMonthOptions = (month, year) => ({
  queryKey: ['birthdays', 'month', month, year],
  queryFn: async () => {
    const response = await getBirthdaysForMonth(month, year);
    return response.data ?? [];
  },
  staleTime: 5 * 60 * 1000,
});

/**
 * Members whose birthday falls in the given month/year.
 * Feb 29 birthdays come back on Feb 28 in non-leap years.
 */
export const useBirthdayMonth = (month, year) => {
  const queryClient = useQueryClient();
  const { data: members = [], isLoading, isFetching, isPlaceholderData, error, refetch } = useQuery({
    ...birthdayMonthOptions(month, year),
    placeholderData: keepPreviousData,
    enabled: month >= 1 && month <= 12 && year >= 2000,
  });

  useEffect(() => {
    for (const offset of [-1, 1]) {
      const adjacent = shiftMonth({ month, year }, offset);
      if (adjacent.year >= 2000) {
        void queryClient.prefetchQuery(birthdayMonthOptions(adjacent.month, adjacent.year));
      }
    }
  }, [month, year, queryClient]);

  return { members, isLoading, isFetching, isPlaceholderData, error, refetch };
};

/**
 * Birthdays in the next `window` days, soonest first.
 */
export const useUpcomingBirthdays = (window = UPCOMING_BIRTHDAY_WINDOW_DAYS, dateKey = todayKeyIST()) => {
  const { data: members = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['birthdays', 'upcoming', window, dateKey],
    queryFn: async () => {
      const response = await getUpcomingBirthdays(window);
      return response.data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  return { members, isLoading, isFetching, error, refetch };
};
