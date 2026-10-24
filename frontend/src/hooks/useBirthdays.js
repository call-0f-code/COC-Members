import { useEffect } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBirthdaysForMonth,
  getUpcomingBirthdays,
} from '@/utils/api/birthdayApi';
import { shiftMonth } from '@/utils/birthdayDate';
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
  const query = useQuery({
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

  return query;
};

/**
 * Upcoming birthdays in the configured window, soonest first.
 * The reactive IST date key refreshes the query at midnight.
 */
export const useUpcomingBirthdays = (dateKey) => {
  return useQuery({
    queryKey: ['birthdays', 'upcoming', UPCOMING_BIRTHDAY_WINDOW_DAYS, dateKey],
    queryFn: async () => {
      const response = await getUpcomingBirthdays();
      return response.data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });
};
