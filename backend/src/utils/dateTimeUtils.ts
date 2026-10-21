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
 * Calculate the next UTC Date when the target timezone reaches the specified targetHour:targetMinute.
 * Handles rollover to next day and timezone offset accurately.
 */
export function getNextFireTimeUtc(
  targetHour = 9,
  targetMinute = 0,
  timeZone = "Asia/Kolkata",
  now = new Date()
): Date {
  const current = getZonedDateParts(now, timeZone);

  // Determine if target time has already passed today in the target timezone
  const alreadyPassed =
    current.hour > targetHour ||
    (current.hour === targetHour && current.minute >= targetMinute);

  // Compute target calendar day in the target timezone
  let targetYear = current.year;
  let targetMonth = current.month;
  let targetDay = current.day;

  if (alreadyPassed) {
    targetDay += 1;
    const maxDays = daysInMonth(targetYear, targetMonth);
    if (targetDay > maxDays) {
      targetDay = 1;
      targetMonth += 1;
      if (targetMonth > 12) {
        targetMonth = 1;
        targetYear += 1;
      }
    }
  }

  // To find the exact UTC epoch timestamp for targetYear-targetMonth-targetDay targetHour:targetMinute:00 in timeZone:
  // For Asia/Kolkata, UTC offset is fixed at +05:30 (+19800000 ms).
  // For general timezone support:
  // Approximate UTC by assuming target timestamp, then refine offset.
  const initialUtc = new Date(Date.UTC(targetYear, targetMonth - 1, targetDay, targetHour, targetMinute, 0, 0));
  const zonedCheck = getZonedDateParts(initialUtc, timeZone);

  // Calculate difference in milliseconds
  const diffHours = (targetHour - zonedCheck.hour);
  const diffMinutes = (targetMinute - zonedCheck.minute);
  const diffDays = (targetDay - zonedCheck.day);

  const offsetCorrectionMs = (diffDays * 24 + diffHours) * 3600000 + diffMinutes * 60000;
  return new Date(initialUtc.getTime() + offsetCorrectionMs);
}
