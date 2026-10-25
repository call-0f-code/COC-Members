import { useEffect, useState } from 'react';
import { todayKeyIST } from '@/utils/birthdayDate';

/** Refresh at midnight in India, and catch up when a sleeping tab resumes. */
export function useTodayIST() {
  const [dateKey, setDateKey] = useState(todayKeyIST);

  useEffect(() => {
    let timeout;

    const refresh = () => {
      clearTimeout(timeout);
      const nextDateKey = todayKeyIST();
      setDateKey(nextDateKey);

      const nextMidnight = new Date(`${nextDateKey}T00:00:00+05:30`).getTime()
        + 24 * 60 * 60 * 1000;
      timeout = setTimeout(refresh, Math.max(1, nextMidnight - Date.now()));
    };

    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const [year, month, day] = dateKey.split('-').map(Number);
  return { year, month, day, dateKey };
}
