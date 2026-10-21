/**
 * dateTimeUtils.ts
 * Timezone-aware date calculations for birthday processing using Asia/Kolkata.
 * Strictly uses Intl.DateTimeFormat without relying on locale-dependent formatting strings like en-CA.
 */

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
  hour: number;  // 0-23
  minute: number;// 0-59
  second: number;// 0-59
}

/**
 * Returns integer date/time components for a given instant in the specified timezone.
 */
export function getZonedDateParts(
  date = new Date(),
  timeZone = "Asia/Kolkata"
): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, number> = {};

  for (const p of parts) {
    if (p.type !== "literal") {
      partMap[p.type] = parseInt(p.value, 10);
    }
  }

  return {
    year: partMap.year ?? 1970,
    month: partMap.month ?? 1,
    day: partMap.day ?? 1,
    hour: partMap.hour ?? 0,
    minute: partMap.minute ?? 0,
    second: partMap.second ?? 0,
  };
}

/**
 * Check if a calendar year is a leap year in the Gregorian calendar.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the number of days in a specific month (1-12) of a given year.
 */
export function daysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 0;
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }
  return 31;
}

/**
 * Validate that a year, month, and day form a real, valid calendar date.
 */
export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  const maxDay = daysInMonth(year, month);
  return day >= 1 && day <= maxDay;
}

/**
 * Parse an ISO or YYYY-MM-DD birth_date string into month (1-12) and day (1-31).
 * Extracts YYYY, MM, DD directly to avoid local machine timezone shifting.
 */
export function parseBirthDate(
  birth_date: string
): { year: number; month: number; day: number } | null {
  if (!birth_date || typeof birth_date !== "string") return null;

  const match = birth_date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (!isValidCalendarDate(year, month, day)) {
    return null;
  }

  return { year, month, day };
}

/**
 * The day a birthday is celebrated in a given year.
 * Feb 29 birthdays are celebrated on Feb 28 in non-leap years.
 */
export function observedBirthday(
  birth: { month: number; day: number },
  year: number
): { month: number; day: number } {
  if (birth.month === 2 && birth.day === 29 && !isLeapYear(year)) {
    return { month: 2, day: 28 };
  }
  return { month: birth.month, day: birth.day };
}

/** True when the birthday is celebrated on the given calendar date. */
export function isBirthdayOn(
  birth: { month: number; day: number },
  date: { year: number; month: number; day: number }
): boolean {
  const observed = observedBirthday(birth, date.year);
  return observed.month === date.month && observed.day === date.day;
}

/** True when the wall-clock time in `parts` is at or after hour:minute. */
export function hasTimePassed(
  parts: Pick<ZonedParts, "hour" | "minute">,
  hour: number,
  minute: number
): boolean {
  return parts.hour > hour || (parts.hour === hour && parts.minute >= minute);
}
